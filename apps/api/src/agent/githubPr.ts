type GitHubFetch = (input: string, init?: RequestInit) => Promise<Response>;

export type CreateOrFindPullRequestParams = {
  branchName: string;
  title: string;
  body: string;
  fetch?: GitHubFetch;
};

type PullSummary = {
  html_url: string;
};

const OWNER = "PekkaKiviahde";
const REPO = "ennuste-app";
const BASE = "main";

function buildHeaders(): HeadersInit {
  const token = process.env.GH_TOKEN;
  if (!token) throw new Error("GH_TOKEN missing");

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

function headRef(branchName: string): string {
  return `${OWNER}:${branchName}`;
}

export async function createOrFindPullRequest(params: CreateOrFindPullRequestParams): Promise<string> {
  const fetchImpl = params.fetch ?? globalThis.fetch;
  if (!fetchImpl) throw new Error("fetch missing");

  const headers = buildHeaders();
  const head = headRef(params.branchName);

  const listUrl = new URL(`https://api.github.com/repos/${OWNER}/${REPO}/pulls`);
  listUrl.searchParams.set("state", "open");
  listUrl.searchParams.set("head", head);

  const existingRes = await fetchImpl(listUrl.toString(), { method: "GET", headers });
  const existing = await readJsonOrThrow<PullSummary[]>(existingRes);
  const found = existing[0]?.html_url;
  if (found) return found;

  const createUrl = `https://api.github.com/repos/${OWNER}/${REPO}/pulls`;
  const createRes = await fetchImpl(createUrl, {
    method: "POST",
    headers: { ...headers, "content-type": "application/json" },
    body: JSON.stringify({
      title: params.title,
      head,
      base: BASE,
      body: params.body,
    }),
  });
  const created = await readJsonOrThrow<{ html_url: string }>(createRes);
  if (!created?.html_url) throw new Error("GitHub PR create: missing html_url");
  return created.html_url;
}

