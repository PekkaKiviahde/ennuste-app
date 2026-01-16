import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { runMission0 } from "./mission0";
import { getRepoRootFromGit, loadAgentConfig, resolveModel } from "./config";
import { execShell } from "./tools/exec";
import { isPathAllowed } from "./tools/paths";
import { AgentMemoryRepo } from "../memory/agentMemoryRepo";
import { createOpenAIClient, callModelText } from "./openaiClient";
import { runCleanup } from "./preflight";
import { createWorktree, removeWorktree } from "./worktree";

export type ChangeRequest = {
  projectId: string;
  task: string;
  dryRun?: boolean;
};

type DiagGateEntry = {
  cmd: string;
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

type ModelPatchResponse = {
  commitMessage: string;
  patch: string;
  notes?: string;
};

const ALLOWED_CHANGE_PATHS = [
  "apps/api/src",
  "apps/api/agent.config.json",
  "docs/runbooks",
  "Dockerfile.agent-api",
  "docker-compose.agent-api.yml",
];

const REQUIRED_GATE_COMMANDS = ["npm run lint", "npm run typecheck", "npm test"];

function shellDetail(result: { stdout: string; stderr: string }): string {
  return (result.stderr || result.stdout || "unknown error").trim() || "unknown error";
}

function truncate8000(value: string): string {
  const maxChars = 8000;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars);
}

function truncate2000(value: string): string {
  const maxChars = 2000;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars);
}

function buildPatchPreview(patch: string): string {
  return truncate8000(patch.split("\n").slice(0, 60).join("\n").trimEnd());
}

function sanitizePatch(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\u0000/g, "");
  if (!normalized.trim()) return "";

  if (!normalized.includes("```")) {
    const trimmed = normalized.trim();
    return trimmed.endsWith("\n") ? trimmed : `${trimmed}\n`;
  }

  const lines = normalized.split("\n");
  while (lines.length > 0 && lines[0].trim().startsWith("```")) lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "```") lines.pop();

  const cleaned = lines.join("\n").trim();
  if (!cleaned) return "";
  return cleaned.endsWith("\n") ? cleaned : `${cleaned}\n`;
}

function parseModelJson(text: string):
  | { ok: true; value: ModelPatchResponse }
  | { ok: false; error: string; rawPreview: string } {
  const trimmed = text.trim();
  const rawPreview = truncate2000(trimmed);

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid JSON";
    return { ok: false, error: `Invalid JSON: ${message}`, rawPreview };
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, error: "Invalid JSON: expected object", rawPreview };
  }

  const obj = parsed as Record<string, unknown>;
  const allowedKeys = new Set(["commitMessage", "patch", "notes"]);
  const keys = Object.keys(obj);
  const unknown = keys.filter((k) => !allowedKeys.has(k));
  if (unknown.length > 0) {
    return { ok: false, error: `Invalid JSON keys: ${unknown.sort().join(",")}`, rawPreview };
  }

  if (typeof obj.commitMessage !== "string") {
    return { ok: false, error: "Invalid JSON: commitMessage must be string", rawPreview };
  }
  if (typeof obj.patch !== "string") {
    return { ok: false, error: "Invalid JSON: patch must be string", rawPreview };
  }
  if (obj.notes !== undefined && typeof obj.notes !== "string") {
    return { ok: false, error: "Invalid JSON: notes must be string (optional)", rawPreview };
  }

  return {
    ok: true,
    value: {
      commitMessage: obj.commitMessage,
      patch: obj.patch,
      ...(obj.notes !== undefined ? { notes: obj.notes } : {}),
    },
  };
}

function extractDiff(patch: string): { ok: true; patch: string } | { ok: false; error: string } {
  if (patch.startsWith("diff --git")) return { ok: true, patch };

  const match = /(^|\n)diff --git /m.exec(patch);
  if (!match) return { ok: false, error: "patch missing diff --git" };

  const start = match.index + (match[1] === "\n" ? 1 : 0);
  const sliced = patch.slice(start);
  if (!sliced.trim()) return { ok: false, error: "patch missing diff --git" };
  return { ok: true, patch: sliced.endsWith("\n") ? sliced : `${sliced}\n` };
}

type DiffBlock = { aPath: string; bPath: string; content: string };

function listDiffBlocks(patch: string): DiffBlock[] {
  const regex = /^diff --git a\/(.+?) b\/(.+)$/gm;
  const starts: Array<{ index: number; aPath: string; bPath: string }> = [];
  let match: RegExpExecArray | null;
  while ((match = regex.exec(patch)) !== null) {
    starts.push({ index: match.index, aPath: match[1] ?? "", bPath: match[2] ?? "" });
  }

  const blocks: DiffBlock[] = [];
  for (let i = 0; i < starts.length; i++) {
    const start = starts[i];
    const end = i + 1 < starts.length ? starts[i + 1]!.index : patch.length;
    blocks.push({ aPath: start.aPath, bPath: start.bPath, content: patch.slice(start.index, end) });
  }
  return blocks;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateNewFileBlocks(patch: string): { ok: true } | { ok: false; error: string; details?: string } {
  const blocks = listDiffBlocks(patch);
  for (const block of blocks) {
    const isNewFile = /^new file mode /m.test(block.content);
    if (!isNewFile) continue;

    if (block.aPath !== block.bPath) {
      return { ok: false, error: "invalid new-file patch", details: `path mismatch: ${block.aPath} -> ${block.bPath}` };
    }

    const pathB = block.bPath;
    if (!/^new file mode 100644$/m.test(block.content)) {
      return { ok: false, error: "invalid new-file patch", details: "missing: new file mode 100644" };
    }
    if (!/^--- \/dev\/null$/m.test(block.content)) {
      return { ok: false, error: "invalid new-file patch", details: "missing: --- /dev/null" };
    }
    if (!new RegExp(`^\\+\\+\\+ b\\/${escapeRegex(pathB)}$`, "m").test(block.content)) {
      return { ok: false, error: "invalid new-file patch", details: `missing: +++ b/${pathB}` };
    }
    if (!/^@@ -0,0 \+[0-9]+(,[0-9]+)? @@/m.test(block.content)) {
      return { ok: false, error: "invalid new-file patch", details: "missing: @@ -0,0 +<n> @@" };
    }
  }

  return { ok: true };
}

function validateDocsPatchSmall(patch: string): { ok: true } | { ok: false; error: string; details?: string } {
  const blocks = listDiffBlocks(patch);
  for (const block of blocks) {
    const filePath = block.bPath === "/dev/null" ? block.aPath : block.bPath;
    if (!filePath.startsWith("docs/runbooks/")) continue;

    const lines = block.content.split("\n");
    let inHunk = false;
    let plus = 0;
    let minus = 0;

    const check = () => {
      if (!inHunk) return { ok: true as const };
      if (Math.max(plus, minus) > 3) {
        return {
          ok: false as const,
          error: "docs change too broad",
          details: `${filePath}: hunk too large (+${plus}/-${minus})`,
        };
      }
      return { ok: true as const };
    };

    for (const line of lines) {
      if (line.startsWith("@@ ")) {
        const res = check();
        if (!res.ok) return res;
        inHunk = true;
        plus = 0;
        minus = 0;
        continue;
      }
      if (!inHunk) continue;
      if (line.startsWith("+++ ") || line.startsWith("--- ")) continue;
      if (line.startsWith("+")) plus += 1;
      else if (line.startsWith("-")) minus += 1;
    }

    const last = check();
    if (!last.ok) return last;
  }

  return { ok: true };
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "unknown";
}

function safeBranchPart(value: string): string {
  return value.replace(/[^a-zA-Z0-9._/-]+/g, "-").replace(/\/{2,}/g, "/").slice(0, 120) || "change";
}

function makeBranchName(prefix: string, sessionId: string): string {
  const safeSession = safeBranchPart(sessionId.replace(/^change-/, ""));
  const normalizedPrefix = prefix.endsWith("/") ? prefix : `${prefix}/`;
  return `${normalizedPrefix}${safeSession}`;
}

function writeTempPatch(sessionId: string, patch: string): string {
  const dir = "/tmp/agent_patches";
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `patch-${safeFilenamePart(sessionId)}-${crypto.randomUUID()}.diff`);
  fs.writeFileSync(file, patch, "utf-8");
  return file;
}

function parseChangedFiles(cwd: string): string[] {
  const res = execShell("git diff --name-only", { cwd });
  if (!res.ok) return [];
  return res.stdout
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function enforceAllowedPaths(repoRoot: string, files: string[], allowed: string[]): { ok: boolean; denied: string[] } {
  const denied = files.filter((file) => !isPathAllowed(repoRoot, file, allowed));
  return { ok: denied.length === 0, denied };
}

function hashValue(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function safeErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const replacements = [process.env.OPENAI_API_KEY, process.env.DATABASE_URL, process.env.AGENT_INTERNAL_TOKEN];
  let cleaned = raw;
  for (const value of replacements) {
    if (value && value.length > 4) {
      cleaned = cleaned.split(value).join("[redacted]");
    }
  }
  if (cleaned.length > 2000) return cleaned.slice(0, 2000);
  return cleaned;
}

function validatePatchFormat(patch: string): { ok: boolean; error?: string } {
  if (!patch.trim()) return { ok: false, error: "patch empty" };
  if (!/^diff --git a\/.+ b\/.+$/m.test(patch)) {
    return { ok: false, error: "patch missing diff --git headers" };
  }

  const lines = patch.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("diff --git ")) continue;

    let hasNewFileMode = false;
    let hasDevNullOld = false;
    let hasPlusB = false;

    for (i = i + 1; i < lines.length; i++) {
      const next = lines[i];
      if (next.startsWith("diff --git ")) {
        i -= 1;
        break;
      }
      if (next.trim() === "new file mode 100644") hasNewFileMode = true;
      if (next.trim() === "--- /dev/null") hasDevNullOld = true;
      if (next.startsWith("+++ b/")) hasPlusB = true;
    }

    if (hasDevNullOld && !hasNewFileMode) {
      return { ok: false, error: "new file diff missing: new file mode 100644" };
    }
    if (hasDevNullOld && !hasPlusB) {
      return { ok: false, error: "new file diff missing: +++ b/<path>" };
    }
  }

  if (!patch.endsWith("\n")) return { ok: false, error: "patch missing trailing newline" };
  return { ok: true };
}

function buildPatchPrompt(task: string, mission0: any): string {
  return [
    "Olet Backend/Debug-agentti. Tuota MUUTOSPATCH deterministisesti ilman korjailukierroksia.",
    "",
    "PATCH-PROTOKOLLA (pakollinen):",
    "Palauta TASMALLEEN tama JSON (ei muuta):",
    '{"commitMessage":"…","patch":"…unified diff…","notes":"…optional…"}',
    "",
    "JSON-VAATIMUKSET:",
    "- Ei markdownia, ei ```-aitoja.",
    "- Arvot ovat merkkijonoja.",
    "- patch-kentassa rivinvaihdot ovat \\n (valid JSON); client parsii sen takaisin oikeiksi riveiksi.",
    "- Ei ylimaaraisia kenttia.",
    "",
    "PATCH-VAATIMUKSET:",
    "- Patch on unified diff.",
    "- Patch alkaa rivilla: diff --git ...",
    "- Patch sisaltaa diff --git -headerit (a/... b/...).",
    "- Uusille tiedostoille on mukana: new file mode 100644, --- /dev/null, +++ b/<path>.",
    "- Patch paattyy aina rivinvaihtoon (\\n).",
    "",
    "POLKURAJAT (pakollinen): Patch saa muuttaa vain naita polkuja:",
    ...ALLOWED_CHANGE_PATHS.map((p) => `- ${p}`),
    "",
    "TEHTAVA:",
    task,
    "",
    "REPO-KONTEKSTI (Mission0):",
    JSON.stringify(mission0).slice(0, 200000),
  ].join("\n");
}

function summarizeTask(task: string): { taskChars: number; taskHash: string } {
  return { taskChars: task.length, taskHash: hashValue(task) };
}

function summarizePrompt(prompt: string): { promptChars: number; promptHash: string } {
  return { promptChars: prompt.length, promptHash: hashValue(prompt) };
}

function parseChangedFilesFromPatch(patch: string): string[] {
  const files: string[] = [];
  const regex = /^diff --git a\/(.+?) b\/(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(patch)) !== null) {
    const next = match[2] === "/dev/null" ? match[1] : match[2];
    if (next && !files.includes(next)) files.push(next);
  }
  if (files.length > 0) return files;

  // Fallback for unified diffs that don't include "diff --git" headers.
  let currentOld: string | null = null;
  for (const line of patch.split("\n")) {
    if (line.startsWith("--- ")) {
      const token = line.slice(4).trim().split(/\s+/)[0] ?? "";
      if (token && token !== "/dev/null") {
        currentOld = token.startsWith("a/") ? token.slice(2) : token;
      } else {
        currentOld = null;
      }
      continue;
    }
    if (line.startsWith("+++ ")) {
      const token = line.slice(4).trim().split(/\s+/)[0] ?? "";
      const normalized = token === "/dev/null" ? currentOld : token.startsWith("b/") ? token.slice(2) : token;
      if (normalized && normalized !== "/dev/null" && !files.includes(normalized)) files.push(normalized);
      currentOld = null;
    }
  }

  return files;
}

function findRepoRootFromFs(startDir: string): string {
  let dir = startDir;
  while (true) {
    if (fs.existsSync(path.join(dir, ".git"))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("repo root not found (.git missing)");
}

function limitDiagLog(value: string): string {
  const normalized = value.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const tailLines = lines.length > 80 ? lines.slice(lines.length - 80) : lines;
  const joined = tailLines.join("\n");
  if (joined.length <= 8000) return joined;
  return joined.slice(joined.length - 8000);
}

function runDiagGate(repoRoot: string, commands: string[]): { status: "ok" | "failed"; gate: DiagGateEntry[] } {
  const gate: DiagGateEntry[] = [];
  for (const cmd of commands) {
    const res = execShell(cmd, { cwd: repoRoot });
    const entry: DiagGateEntry = {
      cmd,
      ok: res.ok,
      code: res.code,
      stdout: limitDiagLog(res.stdout),
      stderr: limitDiagLog(res.stderr),
    };
    gate.push(entry);
    if (!res.ok) return { status: "failed", gate };
  }
  return { status: "ok", gate };
}

function clearWorkingTree(cwd: string): void {
  execShell("git reset --hard", { cwd });
  // Worktree-ajossa `node_modules` on symlink/peili repoRootista; ilman -e se poistuu ja gate hajoaa.
  execShell("git clean -fd -e node_modules", { cwd });
}

function ensureGitSafeDirectory(): void {
  const repoPath = "/app";
  const gitDir = path.join(repoPath, ".git");
  if (!fs.existsSync(gitDir)) return;

  const cwd = "/";
  const list = execShell("git config --global --get-all safe.directory", { cwd });
  const entries = (list.ok ? list.stdout : "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  if (entries.includes(repoPath)) return;
  execShell(`git config --global --add safe.directory ${repoPath}`, { cwd });
}

function runReadOnlyPreflight(repoRoot: string): any {
  const status = execShell("git status --porcelain", { cwd: repoRoot });
  if (!status.ok) {
    return {
      ok: false,
      dirty: false,
      autostashed: false,
      error: `git status failed: ${shellDetail(status)}`,
      policy: "worktree-readonly",
    };
  }

  return {
    ok: true,
    dirty: status.stdout.trim().length > 0,
    autostashed: false,
    policy: "worktree-readonly",
  };
}

function hasGitHubTokenFromEnvOrDotEnv(repoRoot: string): boolean {
  if (process.env.GH_TOKEN?.trim()) return true;

  const envPath = path.join(repoRoot, ".env");
  if (!fs.existsSync(envPath)) return false;

  try {
    const raw = fs.readFileSync(envPath, "utf-8");
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const match = trimmed.match(/^GH_TOKEN\s*=\s*(.+)\s*$/);
      if (!match) continue;
      const value = match[1]?.trim() ?? "";
      if (value && value !== '""' && value !== "''") return true;
    }
  } catch {
    return false;
  }

  return false;
}

function buildCompareLink(branchName: string): string {
  return `https://github.com/PekkaKiviahde/ennuste-app/compare/main...${branchName}?expand=1`;
}

export async function runChange(req: ChangeRequest) {
  if (!req.projectId?.trim()) throw new Error("projectId missing");
  if (!req.task?.trim()) throw new Error("task missing");

  // Manuaalitesti:
  // curl -sS -H "x-internal-token: dev-token" -H "content-type: application/json" \
  //   -d '{"mode":"change","projectId":"demo","dryRun":true,"task":"DIAG: gate smoke"}' \
  //   http://127.0.0.1:3011/agent/run
  if (req.task.trimStart().startsWith("DIAG:")) {
    const repoRoot = findRepoRootFromFs(process.cwd());
    const gateLog = runDiagGate(repoRoot, REQUIRED_GATE_COMMANDS);
    if (gateLog.status === "ok") {
      return { status: "ok", branchName: null, changedFiles: [], baseSha: null };
    }
    return {
      status: "failed",
      branchName: null,
      changedFiles: [],
      baseSha: null,
      applyStdout: "",
      applyStderr: "",
      patchPreview: "",
      gateLog,
    };
  }

  ensureGitSafeDirectory();
  const repoRoot = getRepoRootFromGit();

  let memory: AgentMemoryRepo | null = null;
  let sessionId = `change-${new Date().toISOString()}`;

  let preflight = null;
  let response: any = null;
  let lastGateLog: { status: "ok" | "failed"; gate: DiagGateEntry[] } | null = null;
  let applyStdout = "";
  let applyStderr = "";
  let patchPreview = "";
  let applyPatchPath: string | null = null;
  let rawPreview: string | null = null;

  let branchName: string | null = null;
  let model = "";
  let mission0: any = null;
  let worktreeDir = "";
  let baseSha: string | null = null;

  const addEvent = async (eventType: string, payload: unknown) => {
    if (!memory) return;
    try {
      await memory.addEvent(sessionId, eventType, payload);
    } catch {
      // ignore event-store errors (response must still succeed)
    }
  };

  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) throw new Error("DATABASE_URL missing");

    try {
      memory = new AgentMemoryRepo(databaseUrl);
      sessionId = await memory.createSession(req.projectId);
      await addEvent("SESSION_START", {
        projectId: req.projectId,
        dryRun: !!req.dryRun,
        ...summarizeTask(req.task),
      });
    } catch {
      memory = null;
    }

    preflight = runReadOnlyPreflight(repoRoot);
    if (!preflight.ok) throw new Error(preflight.error ?? "preflight failed");

    const { config } = loadAgentConfig();
    mission0 = runMission0();
    model = resolveModel(config);
    branchName = makeBranchName(config.git.branchPrefix, sessionId);

    if (!hasGitHubTokenFromEnvOrDotEnv(repoRoot)) {
      applyStderr = "GH_TOKEN missing";
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      return response;
    }

    const worktree = createWorktree({
      repoRoot,
      sessionId,
      branchName,
      remote: "origin",
      baseBranch: "main",
    });
    if (!worktree.ok) throw new Error(worktree.error);
    worktreeDir = worktree.worktreeDir;
    baseSha = worktree.baseSha;

    const openai = createOpenAIClient();

    clearWorkingTree(worktreeDir);
    const prompt = buildPatchPrompt(req.task, mission0);
    const promptSummary = summarizePrompt(prompt);

    await addEvent("MODEL_PROMPT", {
      iteration: 1,
      model,
      ...promptSummary,
    });

    const raw = await callModelText(openai, model, prompt);
    const parsed = parseModelJson(raw);
    if (!parsed.ok) {
      rawPreview = parsed.rawPreview;
      const rawAsPatch = sanitizePatch(raw);
      patchPreview = buildPatchPreview(rawAsPatch || raw);
      applyStderr = truncate8000(parsed.error);
      applyPatchPath = writeTempPatch(sessionId, rawAsPatch || raw);
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        error: "strict_json_parse_failed",
        applyStdout,
        applyStderr,
        patchPreview,
        rawPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      return response;
    }

    const commitMessage = parsed.value.commitMessage?.trim() ?? "";
    const notes = parsed.value.notes ?? "";
    let patch = sanitizePatch(parsed.value.patch ?? "");
    patchPreview = buildPatchPreview(patch);

    if (!commitMessage || !patch) {
      applyStderr = "commitMessage or patch missing";
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "NO_PATCH", notes });
      return response;
    }

    const extracted = extractDiff(patch);
    if (!extracted.ok) {
      applyStderr = truncate8000(extracted.error);
      applyPatchPath = writeTempPatch(sessionId, patch);
      response = {
        status: "failed",
        error: extracted.error,
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "PATCH_MISSING_DIFF", notes });
      return response;
    }
    patch = extracted.patch;
    patchPreview = buildPatchPreview(patch);

    const newFileCheck = validateNewFileBlocks(patch);
    if (!newFileCheck.ok) {
      applyStderr = truncate8000(newFileCheck.details ? `${newFileCheck.error}: ${newFileCheck.details}` : newFileCheck.error);
      applyPatchPath = writeTempPatch(sessionId, patch);
      response = {
        status: "failed",
        error: newFileCheck.error,
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "PATCH_NEW_FILE_INVALID", notes });
      return response;
    }

    const docsCheck = validateDocsPatchSmall(patch);
    if (!docsCheck.ok) {
      applyStderr = truncate8000(docsCheck.details ? `${docsCheck.error}: ${docsCheck.details}` : docsCheck.error);
      applyPatchPath = writeTempPatch(sessionId, patch);
      response = {
        status: "failed",
        error: docsCheck.error,
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "PATCH_DOCS_TOO_BROAD", notes });
      return response;
    }

    applyPatchPath = writeTempPatch(sessionId, patch);

    const patchFiles = parseChangedFilesFromPatch(patch);
    const preAllowed = enforceAllowedPaths(worktreeDir, patchFiles, ALLOWED_CHANGE_PATHS);
    if (!preAllowed.ok) {
      applyStderr = truncate8000(`Changed files outside allowed paths: ${preAllowed.denied.join(", ")}`);
      response = {
        status: "failed",
        branchName,
        changedFiles: patchFiles,
        deniedFiles: preAllowed.denied,
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "DENIED_PATHS" });
      return response;
    }

    const formatCheck = validatePatchFormat(patch);
    if (!formatCheck.ok) {
      applyStderr = truncate8000(`Patch format invalid: ${formatCheck.error ?? "unknown"}`);
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "PATCH_FORMAT" });
      return response;
    }

    if (!applyPatchPath) throw new Error("applyPatchPath missing");
    const apply = execShell(`git apply --whitespace=nowarn ${JSON.stringify(applyPatchPath)}`, { cwd: worktreeDir });

    if (!apply.ok) {
      applyStdout = truncate8000(apply.stdout ?? "");
      applyStderr = truncate8000(apply.stderr ?? "");
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "APPLY_FAILED" });
      return response;
    }

    const changedAfterApply = parseChangedFiles(worktreeDir);
    const allowedCheck = enforceAllowedPaths(worktreeDir, changedAfterApply, ALLOWED_CHANGE_PATHS);
    if (!allowedCheck.ok) {
      clearWorkingTree(worktreeDir);
      response = {
        status: "failed",
        branchName,
        changedFiles: changedAfterApply,
        deniedFiles: allowedCheck.denied,
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "DENIED_PATHS" });
      return response;
    }

    const gateLog = runDiagGate(worktreeDir, REQUIRED_GATE_COMMANDS);
    lastGateLog = gateLog;
    await addEvent("GATE_RESULT", gateLog);

    if (gateLog.status !== "ok") {
      response = {
        status: "failed",
        branchName,
        changedFiles: changedAfterApply,
        gateLog,
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "GATE_FAILED" });
      return response;
    }

    if (req.dryRun) {
      response = {
        status: "ok",
        branchName,
        changedFiles: changedAfterApply,
      };
      await addEvent("DONE", { status: "ok", branchName, dryRun: true, changedFiles: changedAfterApply });
      return response;
    }

    const changedBeforeCommit = parseChangedFiles(worktreeDir);
    const allowedBeforeCommit = enforceAllowedPaths(worktreeDir, changedBeforeCommit, ALLOWED_CHANGE_PATHS);
    if (!allowedBeforeCommit.ok) {
      clearWorkingTree(worktreeDir);
      response = {
        status: "failed",
        branchName,
        changedFiles: changedBeforeCommit,
        deniedFiles: allowedBeforeCommit.denied,
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
        ...(lastGateLog ? { gateLog: lastGateLog } : {}),
      };
      await addEvent("DONE", { status: "failed", branchName, reason: "DENIED_PATHS" });
      return response;
    }

    const add = execShell("git add -A", { cwd: worktreeDir });
    if (!add.ok) throw new Error("git add failed");

    const commit = execShell(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: worktreeDir });
    if (!commit.ok) throw new Error("git commit failed");

    const push = execShell(`git push -u origin ${JSON.stringify(branchName)}`, { cwd: worktreeDir });
    if (!push.ok) throw new Error("git push failed");

    response = {
      status: "ok",
      branchName,
      changedFiles: changedBeforeCommit,
      compareLink: buildCompareLink(branchName),
    };
    await addEvent("DONE", { status: "ok", branchName, changedFiles: changedBeforeCommit });
    return response;
  } catch (error) {
    const message = safeErrorMessage(error);
    await addEvent("DONE", {
      status: "failed",
      branchName,
      reason: message,
    });
    response = {
      status: "failed",
      branchName,
      changedFiles: [],
      applyStdout,
      applyStderr: truncate8000(applyStderr || message),
      patchPreview,
      ...(applyPatchPath ? { applyPatchPath } : {}),
      ...(rawPreview ? { rawPreview } : {}),
      ...(lastGateLog ? { gateLog: lastGateLog } : {}),
    };
    return response;
  } finally {
    if (worktreeDir) {
      try {
        removeWorktree({ repoRoot, worktreeDir });
      } catch {
        // ignore cleanup errors
      }
    }
    await runCleanup(repoRoot);
    if (!response) {
      response = {
        status: "failed",
        branchName,
        changedFiles: [],
        applyStdout,
        applyStderr,
        patchPreview,
        ...(applyPatchPath ? { applyPatchPath } : {}),
        ...(rawPreview ? { rawPreview } : {}),
        ...(lastGateLog ? { gateLog: lastGateLog } : {}),
      };
    }
    if (memory) {
      try {
        await memory.close();
      } catch {
        // ignore
      }
    }

    if (response && typeof response === "object" && !("baseSha" in response)) {
      response.baseSha = baseSha;
    }
  }
}
