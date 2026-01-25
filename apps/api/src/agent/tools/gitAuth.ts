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

  // Prefer NOT embedding tokens into remote URLs.
  // Instead, configure a per-repo HTTP header for GitHub that Git will use for fetch/push.
  // This avoids URL-format issues and keeps remotes clean.
  const header = `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`;

  // Read previous value (if any) so we can restore it.
  const prev = exec(`git config --local --get http.https://github.com/.extraheader`, { cwd: repoRoot });
  const prevValue = prev.ok ? (prev.stdout ?? "").trim() : "";

  const set = exec(`git config --local http.https://github.com/.extraheader ${JSON.stringify(header)}`, { cwd: repoRoot });
  if (!set.ok) return { ok: false, error: "git config extraheader failed" };

  const restore = () => {
    if (prevValue) {
      exec(`git config --local http.https://github.com/.extraheader ${JSON.stringify(prevValue)}`, { cwd: repoRoot });
    } else {
      exec(`git config --local --unset-all http.https://github.com/.extraheader`, { cwd: repoRoot });
    }
  };

  return { ok: true, changed: true, fetchUrl, pushUrl, restore };
}
