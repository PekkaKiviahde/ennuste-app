import fs from "node:fs";
import path from "node:path";

import { execShell } from "./tools/exec";

function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\"'\"'`)}'`;
}

function worktreeKey(sessionId: string): string {
  return sessionId.replace(/[\\/]/g, "-");
}

export function getWorktreeDir(sessionId: string): string {
  return path.join("/tmp/agent_worktrees", worktreeKey(sessionId));
}

export type WorktreeCreateResult =
  | { ok: true; worktreeDir: string }
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

  const fetch = execShell(`git fetch ${shellQuote(opts.remote)} --prune`, { cwd: opts.repoRoot });
  if (!fetch.ok) {
    return {
      ok: false,
      worktreeDir,
      error: `git fetch ${opts.remote} --prune failed: ${(fetch.stderr || fetch.stdout || "unknown error").trim()}`,
    };
  }

  const baseRef = `${opts.remote}/${opts.baseBranch}`;
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

  return { ok: true, worktreeDir };
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

