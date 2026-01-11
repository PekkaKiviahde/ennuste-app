import { execShell } from "./tools/exec";

type GitConfig = {
  remote: string;
  baseBranch: string;
};

export type PreflightResult = {
  ok: boolean;
  dirty: boolean;
  autostashed: boolean;
  stashRef?: string;
  stashMessage?: string;
  remote: string;
  baseBranch: string;
  error?: string;
};

export type CleanupResult = {
  policy: string;
  found: number;
  kept: number;
  dropped: number;
  keptRefs: string[];
  droppedRefs: string[];
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

export async function runPreflight(repoRoot: string, sessionId: string, git: GitConfig): Promise<PreflightResult> {
  const preflight: PreflightResult = {
    ok: true,
    dirty: false,
    autostashed: false,
    remote: git.remote,
    baseBranch: git.baseBranch,
  };

  const status = execShell("git status --porcelain", { cwd: repoRoot });
  if (!status.ok) {
    return { ...preflight, ok: false, error: `git status failed: ${detailFrom(status)}` };
  }

  const dirty = status.stdout.trim().length > 0;
  preflight.dirty = dirty;

  if (dirty) {
    const message = `agent-autostash ${sessionId} ${new Date().toISOString()}`;
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

  const fetch = execShell(`git fetch ${git.remote}`, { cwd: repoRoot });
  if (!fetch.ok) {
    return { ...preflight, ok: false, error: `git fetch ${git.remote} failed: ${detailFrom(fetch)}` };
  }

  const checkout = execShell(`git checkout ${git.baseBranch}`, { cwd: repoRoot });
  if (!checkout.ok) {
    return {
      ...preflight,
      ok: false,
      error: `git checkout ${git.baseBranch} failed: ${detailFrom(checkout)}`,
    };
  }

  const resetBase = execShell(`git reset --hard ${git.remote}/${git.baseBranch}`, { cwd: repoRoot });
  if (!resetBase.ok) {
    return {
      ...preflight,
      ok: false,
      error: `git reset --hard ${git.remote}/${git.baseBranch} failed: ${detailFrom(resetBase)}`,
    };
  }

  return preflight;
}

export async function runCleanup(repoRoot: string): Promise<CleanupResult> {
  const cleanup: CleanupResult = {
    policy: "agent-autostash keep=5",
    found: 0,
    kept: 0,
    dropped: 0,
    keptRefs: [],
    droppedRefs: [],
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
      return { ref, subject: rest.join("\t") };
    })
    .filter((entry) => entry.subject.includes("agent-autostash"));

  cleanup.found = entries.length;

  const keep = entries.slice(0, 5);
  const drop = entries.slice(5).sort((a, b) => stashIndex(b.ref) - stashIndex(a.ref));

  cleanup.kept = keep.length;
  cleanup.dropped = drop.length;
  cleanup.keptRefs = keep.map((entry) => entry.ref);

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
