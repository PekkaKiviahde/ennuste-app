import { execShell, type ExecResult } from "./exec";

type ExecLike = (commandLine: string, opts: { cwd: string }) => ExecResult;

type EnsureOriginUsesTokenResult =
  | { ok: false; error: string }
  | { ok: true; changed: boolean; fetchUrl: string; pushUrl: string; restore: (() => void) | null };

function parseGithubHttpsOrigin(value: string): { ownerRepo: string } | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "github.com") return null;
    const ownerRepo = url.pathname.replace(/^\/+/, "").replace(/\.git$/i, "");
    if (!ownerRepo) return null;
    return { ownerRepo };
  } catch {
    return null;
  }
}

export function ensureOriginUsesToken(
  repoRoot: string,
  opts: { token: string; remote?: string; exec?: ExecLike },
): EnsureOriginUsesTokenResult {
  const remote = opts.remote ?? "origin";
  const exec = opts.exec ?? (execShell as unknown as ExecLike);

  const fetchUrlRes = exec(`git remote get-url ${remote}`, { cwd: repoRoot });
  const fetchUrl = (fetchUrlRes.stdout ?? "").trim();
  if (!fetchUrlRes.ok || !fetchUrl) {
    return { ok: false, error: `git remote get-url ${remote} failed` };
  }

  const pushUrlRes = exec(`git remote get-url --push ${remote}`, { cwd: repoRoot });
  const pushUrl = ((pushUrlRes.ok ? pushUrlRes.stdout : fetchUrlRes.stdout) ?? "").trim() || fetchUrl;

  // Only handle GitHub HTTPS remotes. For SSH or non-GitHub, do nothing.
  const parsedFetch = parseGithubHttpsOrigin(fetchUrl);
  if (!parsedFetch) {
    return { ok: true, changed: false, fetchUrl, pushUrl, restore: null };
  }

  const token = opts.token?.trim();
  if (!token) return { ok: false, error: "GH_TOKEN missing" };

  const helperRes = exec("git config --global --get credential.helper", { cwd: repoRoot });
  const helperValue = helperRes.ok ? (helperRes.stdout ?? "").trim() : "";
  if (helperValue.includes("git-credential-github-netrc")) {
    return { ok: true, changed: false, fetchUrl, pushUrl, restore: null };
  }

  // Prefer NOT embedding tokens into remote URLs.
  // Instead, configure a per-repo HTTP header for GitHub that Git will use for fetch/push.
  // This avoids URL-format issues and keeps remotes clean.
  const header = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;

  const prevAll = exec(`git config --local --get-all http.https://github.com/.extraheader`, { cwd: repoRoot });
  const prevValues = prevAll.ok
    ? (prevAll.stdout ?? "")
        .split("\n")
        .map((prevLine) => prevLine.trim())
        .filter(Boolean)
    : [];

  exec(`git config --local --unset-all http.https://github.com/.extraheader`, { cwd: repoRoot });

  const set = exec(`git config --local http.https://github.com/.extraheader ${JSON.stringify(header)}`, { cwd: repoRoot });
  if (!set.ok) return { ok: false, error: "git config extraheader failed" };

  const restore = () => {
    exec(`git config --local --unset-all http.https://github.com/.extraheader`, { cwd: repoRoot });
    for (const prevValue of prevValues) {
      exec(`git config --local --add http.https://github.com/.extraheader ${JSON.stringify(prevValue)}`, { cwd: repoRoot });
    }
  };

  return { ok: true, changed: true, fetchUrl, pushUrl, restore };
}
