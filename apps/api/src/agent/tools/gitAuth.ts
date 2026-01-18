import fs from "node:fs";
import path from "node:path";

import { execShell } from "./exec";

type ExecLike = (commandLine: string, opts: { cwd: string }) => { ok: boolean; stdout: string; stderr: string };

function stripOuterQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'") && trimmed.length >= 2)
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function resolveGitHubTokenFromEnvOrDotEnv(repoRoot: string): string | null {
  const fromEnv = process.env.GH_TOKEN?.trim();
  if (fromEnv) return fromEnv;

  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return null;

  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^GH_TOKEN\s*=\s*(.+)\s*$/);
      if (!match) continue;
      const value = stripOuterQuotes(match[1] ?? "");
      if (!value) return null;
      return value;
    }
  } catch {
    return null;
  }

  return null;
}

function parseGithubHttpsOrigin(remoteUrl: string): { owner: string; repo: string } | null {
  const trimmed = remoteUrl.trim().replace(/\/+$/, "");
  if (!trimmed) return null;

  const https = /^https:\/\/(?:[^@/]+@)?github\.com\/([^/]+)\/([^/]+?)(?:\.git)?$/;
  const match = https.exec(trimmed);
  if (!match) return null;

  const owner = match[1]?.trim() ?? "";
  const repo = match[2]?.trim() ?? "";
  if (!owner || !repo) return null;
  return { owner, repo };
}

function buildTokenOriginUrl(owner: string, repo: string, token: string): string {
  const encoded = encodeURIComponent(token);
  return `https://x-access-token:${encoded}@github.com/${owner}/${repo}.git`;
}

export type EnsureOriginUsesTokenResult =
  | {
      ok: true;
      changed: boolean;
      fetchUrl: string;
      pushUrl: string;
      restore: null | (() => void);
    }
  | { ok: false; error: string };

export function ensureOriginUsesToken(repoRoot: string, opts: { token: string; remote?: string; exec?: ExecLike }): EnsureOriginUsesTokenResult {
  const remote = opts.remote ?? "origin";
  const exec = opts.exec ?? (execShell as unknown as ExecLike);

  const fetchUrlRes = exec(`git remote get-url ${remote}`, { cwd: repoRoot });
  const fetchUrl = (fetchUrlRes.stdout ?? "").trim();
  if (!fetchUrlRes.ok || !fetchUrl) {
    return { ok: false, error: `git remote get-url ${remote} failed` };
  }

  const pushUrlRes = exec(`git remote get-url --push ${remote}`, { cwd: repoRoot });
  const pushUrl = ((pushUrlRes.ok ? pushUrlRes.stdout : fetchUrlRes.stdout) ?? "").trim() || fetchUrl;

  const parsed = parseGithubHttpsOrigin(fetchUrl);
  if (!parsed) {
    // Keep SSH remotes untouched; they might work if keys exist. For non-GitHub HTTPS, do nothing.
    return { ok: true, changed: false, fetchUrl, pushUrl, restore: null };
  }

  const token = opts.token?.trim();
  if (!token) return { ok: false, error: "GH_TOKEN missing" };

  const tokenUrl = buildTokenOriginUrl(parsed.owner, parsed.repo, token);

  const setFetch = exec(`git remote set-url ${remote} ${JSON.stringify(tokenUrl)}`, { cwd: repoRoot });
  if (!setFetch.ok) {
    return { ok: false, error: `git remote set-url ${remote} failed` };
  }

  const setPush = exec(`git remote set-url --push ${remote} ${JSON.stringify(tokenUrl)}`, { cwd: repoRoot });
  if (!setPush.ok) {
    exec(`git remote set-url ${remote} ${JSON.stringify(fetchUrl)}`, { cwd: repoRoot });
    return { ok: false, error: `git remote set-url --push ${remote} failed` };
  }

  const restore = () => {
    exec(`git remote set-url ${remote} ${JSON.stringify(fetchUrl)}`, { cwd: repoRoot });
    exec(`git remote set-url --push ${remote} ${JSON.stringify(pushUrl)}`, { cwd: repoRoot });
  };

  return { ok: true, changed: true, fetchUrl, pushUrl, restore };
}
