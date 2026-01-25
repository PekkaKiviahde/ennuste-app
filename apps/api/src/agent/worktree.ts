import fs from "node:fs";
import path from "node:path";

import { execShell } from "./tools/exec";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function worktreeKey(sessionId: string): string {
  return sessionId.replace(/[\\/]/g, "-");
}

function getGithubExtraHeader(repoRoot: string): string | null {
  const res = execShell("git config --local --get http.https://github.com/.extraheader", { cwd: repoRoot });
  const value = (res.ok ? res.stdout : "").trim();
  return value ? value : null;
}

function withGithubExtraHeader(repoRoot: string, gitCommand: string): string {
  const header = getGithubExtraHeader(repoRoot);
  if (!header) return gitCommand;
  return `git -c http.https://github.com/.extraheader=${shellQuote(header)} ${gitCommand.replace(/^git\s+/, "")}`;
}

export function getWorktreeDir(sessionId: string): string {
  return path.join("/tmp/agent_worktrees", worktreeKey(sessionId));
}

export type WorktreeCreateResult =
  | { ok: true; worktreeDir: string; baseSha: string }
  | { ok: false; worktreeDir: string; error: string };

export function createWorktree(opts: {
  repoRoot: string;
  sessionId: string;
  branchName: string;
  remote: string;
  baseBranch: string;
}): WorktreeCreateResult {
  const worktreeDir = getWorktreeDir(opts.sessionId);
  fs.mkdirSync("/tmp/agent_worktrees", { recursive: true });

  execShell(`git worktree remove --force ${shellQuote(worktreeDir)}`, { cwd: opts.repoRoot });
  execShell("git worktree prune", { cwd: opts.repoRoot });
  fs.rmSync(worktreeDir, { recursive: true, force: true });

  const repoNodeModules = path.join(opts.repoRoot, "node_modules");
  const worktreeNodeModules = path.join(worktreeDir, "node_modules");
  const repoWebNodeModules = path.join(opts.repoRoot, "apps", "web", "node_modules");
  const worktreeWebNodeModules = path.join(worktreeDir, "apps", "web", "node_modules");

  // NOTE(first delivery lock): always base worktree on origin/main (ignore config/baseBranch for now).
  const baseRef = `${opts.remote}/main`;

  const fetch = execShell(withGithubExtraHeader(opts.repoRoot, `git fetch ${shellQuote(opts.remote)} --prune`), {
    cwd: opts.repoRoot,
  });
  if (!fetch.ok) {
    return {
      ok: false,
      worktreeDir,
      error: `git fetch ${opts.remote} --prune failed: ${(fetch.stderr || fetch.stdout || "unknown error").trim()}`,
    };
  }

  const verifyBase = execShell(`git rev-parse --verify ${shellQuote(`${baseRef}^{commit}`)}`, { cwd: opts.repoRoot });
  if (!verifyBase.ok) {
    const fetchMain = execShell(withGithubExtraHeader(opts.repoRoot, `git fetch ${shellQuote(opts.remote)} main`), {
      cwd: opts.repoRoot,
    });
    if (!fetchMain.ok) {
      return {
        ok: false,
        worktreeDir,
        error: `git fetch ${opts.remote} main failed: ${(fetchMain.stderr || fetchMain.stdout || "unknown error").trim()}`,
      };
    }

    const verifyAfter = execShell(`git rev-parse --verify ${shellQuote(`${baseRef}^{commit}`)}`, { cwd: opts.repoRoot });
    if (!verifyAfter.ok) {
      return {
        ok: false,
        worktreeDir,
        error: `baseRef missing after fetch: ${(verifyAfter.stderr || verifyAfter.stdout || "unknown error").trim()}`,
      };
    }
  }

  const add = execShell(
    `git worktree add -B ${shellQuote(opts.branchName)} ${shellQuote(worktreeDir)} ${shellQuote(baseRef)}`,
    { cwd: opts.repoRoot },
  );
  if (!add.ok) {
    execShell(`git worktree remove --force ${shellQuote(worktreeDir)}`, { cwd: opts.repoRoot });
    execShell("git worktree prune", { cwd: opts.repoRoot });
    fs.rmSync(worktreeDir, { recursive: true, force: true });
    return {
      ok: false,
      worktreeDir,
      error: `git worktree add failed: ${(add.stderr || add.stdout || "unknown error").trim()}`,
    };
  }

  const baseSha = execShell("git rev-parse HEAD", { cwd: worktreeDir });
  if (!baseSha.ok) {
    execShell(`git worktree remove --force ${shellQuote(worktreeDir)}`, { cwd: opts.repoRoot });
    execShell("git worktree prune", { cwd: opts.repoRoot });
    fs.rmSync(worktreeDir, { recursive: true, force: true });
    return {
      ok: false,
      worktreeDir,
      error: `git rev-parse HEAD failed: ${(baseSha.stderr || baseSha.stdout || "unknown error").trim()}`,
    };
  }

  if (fs.existsSync(repoNodeModules) && !fs.existsSync(worktreeNodeModules)) {
    try {
      fs.symlinkSync(repoNodeModules, worktreeNodeModules, "dir");
    } catch {
      // ignore; gate will surface missing deps if this fails
    }
  }

  if (fs.existsSync(repoWebNodeModules) && !fs.existsSync(worktreeWebNodeModules)) {
    try {
      fs.mkdirSync(path.dirname(worktreeWebNodeModules), { recursive: true });
      fs.symlinkSync(repoWebNodeModules, worktreeWebNodeModules, "dir");
    } catch {
      // ignore; gate will surface missing deps if this fails
    }
  }

  return { ok: true, worktreeDir, baseSha: baseSha.stdout.trim() };
}

export function removeWorktree(opts: { repoRoot: string; worktreeDir: string }): { ok: boolean; error?: string } {
  if (!opts.worktreeDir) return { ok: true };

  const remove = execShell(`git worktree remove --force ${shellQuote(opts.worktreeDir)}`, { cwd: opts.repoRoot });
  execShell("git worktree prune", { cwd: opts.repoRoot });
  fs.rmSync(opts.worktreeDir, { recursive: true, force: true });

  if (!remove.ok) {
    return { ok: false, error: (remove.stderr || remove.stdout || "unknown error").trim() || "unknown error" };
  }

  return { ok: true };
}
