type GitHubFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type CreateOrFindPullRequestParams = {
  cwd: string;
  branchName: string;
  title: string;
  body: string;
  fetch?: GitHubFetch;
  exec?: (commandLine: string, opts: { cwd: string }) => { ok: boolean; stdout: string; stderr: string };
};

type PullSummary = {
  html_url: string;
};

const DEFAULT_BASE_BRANCH = "main";

function resolveGitHubToken(): string | null {
  const raw = process.env.GH_TOKEN;
  const token = raw?.trim();
  if (!token) return null;
  return token;
}

function buildHeaders(token: string): HeadersInit {
  return {
    authorization: `token ${token}`,
    accept: "application/vnd.github+json",
    "user-agent": "ennuste-app-agent-api",
  };
}

async function readJsonOrThrow<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (res.ok) return JSON.parse(text || "null") as T;

  const hint = text?.trim() ? `: ${text.trim()}` : "";
  throw new Error(`GitHub API error ${res.status}${hint}`);
}

export function parseGithubOwnerRepo(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const https = /^https:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;
  const ssh = /^git@github\.com:([^/]+)\/([^/]+?)(?:\.git)?$/;

  let match = https.exec(trimmed);
  if (!match) match = ssh.exec(trimmed);
  if (!match) return null;

  const owner = match[1]?.trim() ?? "";
  const repo = match[2]?.trim() ?? "";
  if (!owner || !repo) return null;
  return { owner, repo };
}

export function resolveBaseBranchFromOriginHead(
  exec: (commandLine: string, opts: { cwd: string }) => { ok: boolean; stdout: string; stderr: string },
  cwd: string,
): string | null {
  const result = exec("git symbolic-ref --quiet --short refs/remotes/origin/HEAD", { cwd });
  if (!result.ok) return null;

  const ref = (result.stdout ?? "").trim();
  const match = /^origin\/(.+)$/.exec(ref);
  return match?.[1]?.trim() || null;
}

export function resolveRepoTarget(
  cwd: string,
  exec: (commandLine: string, opts: { cwd: string }) => { ok: boolean; stdout: string; stderr: string },
): { owner: string; repo: string; base: string; warnings: string[] } {
  const warnings: string[] = [];

  const originUrlRes = exec("git remote get-url origin", { cwd });
  const originUrl = (originUrlRes.stdout ?? "").trim();
  const parsed = parseGithubOwnerRepo(originUrl);
  if (!originUrlRes.ok || !parsed) {
    throw new Error("cannot derive github owner/repo from origin url");
  }

  const baseResolved = resolveBaseBranchFromOriginHead(exec, cwd);
  const base = baseResolved ?? DEFAULT_BASE_BRANCH;
  if (!baseResolved) warnings.push(`origin/HEAD not found; defaulting base branch to ${DEFAULT_BASE_BRANCH}`);
  if (warnings.length) console.warn(`[githubPr] ${warnings.join("; ")}`);

  return { owner: parsed.owner, repo: parsed.repo, base, warnings };
}

function headRef(owner: string, branchName: string): string {
  return `${owner}:${branchName}`;
}

export async function createOrFindPullRequest(params: CreateOrFindPullRequestParams): Promise<string | null> {
  const fetchImpl = params.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("fetch missing");

  const exec = params.exec;
  if (!exec) throw new Error("exec missing");

  const token = resolveGitHubToken();
  if (!token) {
    console.warn("[githubPr] GH_TOKEN missing; skipping PR creation (compareLink fallback stays in response)");
    return null;
  }

  const headers = buildHeaders(token);
  const target = resolveRepoTarget(params.cwd, exec);
  const head = headRef(target.owner, params.branchName);

  const listUrl = new URL(`https://api.github.com/repos/${target.owner}/${target.repo}/pulls`);
  listUrl.searchParams.set("state", "open");
  listUrl.searchParams.set("head", head);

  const existingRes = await fetchImpl(listUrl.toString(), { method: "GET", headers });
  const existing = await readJsonOrThrow<PullSummary[]>(existingRes);
  const found = existing[0]?.html_url;
  if (found) return found;

  const createUrl = `https://api.github.com/repos/${target.owner}/${target.repo}/pulls`;
  const createRes = await fetchImpl(createUrl, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      title: params.title,
      head,
      base: target.base,
      body: params.body,
    }),
  });
  const created = await readJsonOrThrow<{ html_url: string }>(createRes);
  if (!created?.html_url) throw new Error("GitHub PR create: missing html_url");
  return created.html_url;
}
