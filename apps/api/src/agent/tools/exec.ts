import { spawnSync } from "node:child_process";

const MAX_LOG_CHARS = 20000;

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

export function execShell(commandLine: string, opts: { cwd: string }): ExecResult {
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
