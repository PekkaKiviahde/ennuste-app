import { execShell } from "./tools/exec";

export type PreflightResult = {
  ok: boolean;
  offline?: boolean;
  dirty: boolean;
  autostashed: boolean;
  stashRef?: string;
  stashMessage?: string;
  error?: string;
};

export type CleanupResult = {
  policy: { enabled: boolean; prefix: string; keep: number };
  found: number;
  kept: number;
  dropped: number;
  keptRefs?: string[];
  droppedRefs?: string[];
  cleanupError?: string;
};

function stashIndex(ref: string): number {
  const match = ref.match(/stash@\{(\d+)\}/);
  return match ? Number(match[1]) : -1;
}

function detailFrom(result: { stdout: string; stderr: string }): string {
  const detail = (result.stderr || result.stdout || "unknown error").trim();
  return detail || "unknown error";
}

export async function runPreflight(
  repoRoot: string,
  sessionId: string,
  opts?: { offline?: boolean },
): Promise<PreflightResult> {
  const offline = opts?.offline === true;
  const preflight: PreflightResult = {
    ok: true,
    dirty: false,
    autostashed: false,
    ...(offline ? { offline: true } : {}),
  };

  const status = execShell("git status --porcelain", { cwd: repoRoot });
  if (!status.ok) {
    return { ...preflight, ok: false, error: `git status failed: ${detailFrom(status)}` };
  }

  const dirty = status.stdout.trim().length > 0;
  preflight.dirty = dirty;

  const prefix = "agent-autostash";

  if (dirty) {
    const message = `${prefix} ${sessionId} ${new Date().toISOString()}`;
    preflight.stashMessage = message;
    const stash = execShell(`git stash push -u -m ${JSON.stringify(message)}`, { cwd: repoRoot });
    if (!stash.ok) {
      return { ...preflight, ok: false, error: `git stash failed: ${detailFrom(stash)}` };
    }
    preflight.autostashed = true;
    const ref = execShell("git stash list -n 1 --format=%gd", { cwd: repoRoot });
    if (ref.ok) {
      const refLine = ref.stdout.trim().split("\n")[0];
      if (refLine) preflight.stashRef = refLine;
    }
  }

  const reset = execShell("git reset --hard", { cwd: repoRoot });
  if (!reset.ok) {
    return { ...preflight, ok: false, error: `git reset --hard failed: ${detailFrom(reset)}` };
  }

  const clean = execShell("git clean -fd", { cwd: repoRoot });
  if (!clean.ok) {
    return { ...preflight, ok: false, error: `git clean -fd failed: ${detailFrom(clean)}` };
  }

  if (offline) return preflight;

  const fetch = execShell("git fetch origin", { cwd: repoRoot });
  if (!fetch.ok) {
    return { ...preflight, ok: false, error: `git fetch origin failed: ${detailFrom(fetch)}` };
  }

  const checkout = execShell("git checkout main", { cwd: repoRoot });
  if (!checkout.ok) {
    return {
      ...preflight,
      ok: false,
      error: `git checkout main failed: ${detailFrom(checkout)}`,
    };
  }

  const resetBase = execShell("git reset --hard origin/main", { cwd: repoRoot });
  if (!resetBase.ok) {
    return {
      ...preflight,
      ok: false,
      error: `git reset --hard origin/main failed: ${detailFrom(resetBase)}`,
    };
  }

  return preflight;
}

export async function runCleanup(repoRoot: string): Promise<CleanupResult> {
  const policy = { enabled: true, prefix: "agent-autostash", keep: 5 };
  const cleanup: CleanupResult = {
    policy,
    found: 0,
    kept: 0,
    dropped: 0,
  };

  const list = execShell("git stash list --format=\"%gd%x09%s\"", { cwd: repoRoot });
  if (!list.ok) {
    return { ...cleanup, cleanupError: `git stash list failed: ${detailFrom(list)}` };
  }

  const lines = list.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const entries = lines
    .map((line) => {
      const [ref, ...rest] = line.split("\t");
      const subject = rest.join("\t");
      const message = subject.replace(/^(On|WIP on) [^:]+: /, "").trim();
      return { ref, subject, message };
    })
    .filter((entry) => entry.message.startsWith(policy.prefix));

  cleanup.found = entries.length;

  const keep = entries.slice(0, policy.keep);
  const drop = entries.slice(policy.keep).sort((a, b) => stashIndex(b.ref) - stashIndex(a.ref));

  cleanup.kept = keep.length;
  cleanup.dropped = drop.length;
  cleanup.keptRefs = keep.map((entry) => entry.ref);
  cleanup.droppedRefs = [];

  for (const entry of drop) {
    const res = execShell(`git stash drop ${entry.ref}`, { cwd: repoRoot });
    if (!res.ok) {
      cleanup.cleanupError = cleanup.cleanupError
        ? `${cleanup.cleanupError}; git stash drop ${entry.ref} failed: ${detailFrom(res)}`
        : `git stash drop ${entry.ref} failed: ${detailFrom(res)}`;
      continue;
    }
    cleanup.droppedRefs.push(entry.ref);
  }

  return cleanup;
}
