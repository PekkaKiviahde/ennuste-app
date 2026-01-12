import { spawnSync } from "node:child_process";
import fs from "node:fs";

const MAX_LOG_CHARS = 20000;
const DOCKER_REPO_PATH = "/app";
const DOCKER_GIT_DIR = "/app/.git";

let ensuredSafeDir = false;

export type ExecResult = {
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

function truncate(value: string): string {
  if (value.length <= MAX_LOG_CHARS) return value;
  return value.slice(0, MAX_LOG_CHARS);
}

function ensureGitSafeDirectory(): void {
  if (ensuredSafeDir) return;
  ensuredSafeDir = true;

  if (!fs.existsSync(DOCKER_GIT_DIR)) return;

  const list = spawnSync("git", ["config", "--global", "--get-all", "safe.directory"], {
    cwd: "/",
    encoding: "utf-8",
  });
  const existing = (list.status === 0 ? (list.stdout ?? "") : "")
    .toString()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (existing.includes(DOCKER_REPO_PATH) || existing.includes("*")) return;

  spawnSync("git", ["config", "--global", "--add", "safe.directory", DOCKER_REPO_PATH], {
    cwd: "/",
    encoding: "utf-8",
  });
}

export function execShell(commandLine: string, opts: { cwd: string }): ExecResult {
  if (/^git(\s|$)/.test(commandLine.trimStart())) {
    ensureGitSafeDirectory();
  }

  const res = spawnSync(commandLine, {
    cwd: opts.cwd,
    encoding: "utf-8",
    shell: true,
  });

  const code = res.status;
  const ok = code === 0;

  return {
    ok,
    code,
    stdout: truncate(res.stdout ?? ""),
    stderr: truncate(res.stderr ?? ""),
  };
}
