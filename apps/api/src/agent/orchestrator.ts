import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { runMission0 } from "./mission0";
import { getRepoRootFromGit, loadAgentConfig, resolveGateCommands, resolveModel } from "./config";
import { execShell } from "./tools/exec";
import { isPathAllowed } from "./tools/paths";
import { AgentMemoryRepo } from "../memory/agentMemoryRepo";
import { createOpenAIClient, callModelText } from "./openaiClient";
import { runCleanup, runPreflight } from "./preflight";

export type ChangeRequest = {
  projectId: string;
  task: string;
  dryRun?: boolean;
};

type GateResult = { cmd: string; ok: boolean; code: number | null };

type DiagGateEntry = {
  cmd: string;
  ok: boolean;
  code: number | null;
  stdout: string;
  stderr: string;
};

function shellDetail(result: { stdout: string; stderr: string }): string {
  return (result.stderr || result.stdout || "unknown error").trim() || "unknown error";
}

function truncate8000(value: string): string {
  const maxChars = 8000;
  if (value.length <= maxChars) return value;
  return value.slice(0, maxChars);
}

function buildPatchPreview(patch: string): string {
  return truncate8000(patch.split("\n").slice(0, 60).join("\n").trimEnd());
}

function sanitizePatch(raw: string): string {
  const normalized = raw.replace(/\r\n/g, "\n").trim();
  if (!normalized) return "";

  if (!normalized.includes("```")) return normalized;

  const lines = normalized.split("\n");
  while (lines.length > 0 && lines[0].trim().startsWith("```")) lines.shift();
  while (lines.length > 0 && lines[lines.length - 1]?.trim() === "```") lines.pop();

  return lines.join("\n").trim();
}

function safeFilenamePart(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 80) || "unknown";
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
}

function makeBranchName(prefix: string, task: string): string {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  return `${prefix}${ts}-${slug(task) || "change"}`;
}

function writeTempPatch(sessionId: string, patch: string): string {
  const dir = "/tmp/agent_patches";
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `patch-${safeFilenamePart(sessionId)}-${crypto.randomUUID()}.diff`);
  fs.writeFileSync(file, patch, "utf-8");
  return file;
}

function parseChangedFiles(repoRoot: string): string[] {
  const res = execShell("git diff --name-only", { cwd: repoRoot });
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

function buildPatchPrompt(task: string, mission0: any, lastError: string | null): string {
  return [
    "Olet Backend/Debug-agentti. Tuota MUUTOSPATCH yhtena unified-diff -patchina.",
    "VAATIMUKSET:",
    "- Palauta pelkka JSON (ei selityksia).",
    "- Patch saa muuttaa vain pakollisia tiedostoja tehtavan toteuttamiseksi.",
    "- Aina JSON: {commitMessage, patch, notes}.",
    "- Aseta commitMessage lyhyeksi (max 72 merkki).",
    "- Aseta notes lyhyeksi.",
    "",
    "TEHTAVA:",
    task,
    lastError ? `\nEDELLINEN VIRHE: ${lastError}` : "",
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

function tryParseJson(raw: string): any | null {
  try {
    return JSON.parse(raw);
  } catch {
    // fallthrough
  }

  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = raw.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  }

  return null;
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

function runGateCommands(repoRoot: string, commands: string[]): { gateOk: boolean; results: GateResult[] } {
  const results: GateResult[] = [];
  for (const cmd of commands) {
    const res = execShell(cmd, { cwd: repoRoot });
    results.push({ cmd, ok: res.ok, code: res.code });
    if (!res.ok) return { gateOk: false, results };
  }
  return { gateOk: true, results };
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

function clearWorkingTree(repoRoot: string): void {
  execShell("git restore --staged --worktree .", { cwd: repoRoot });
  execShell("git clean -fd", { cwd: repoRoot });
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

export async function runChange(req: ChangeRequest) {
  if (!req.projectId?.trim()) throw new Error("projectId missing");
  if (!req.task?.trim()) throw new Error("task missing");

  // Manuaalitesti:
  // curl -sS -H "x-internal-token: dev-token" -H "content-type: application/json" \
  //   -d '{"mode":"change","projectId":"demo","dryRun":true,"task":"DIAG: gate smoke"}' \
  //   http://127.0.0.1:3011/agent/run
  if (req.task.trimStart().startsWith("DIAG:")) {
    const repoRoot = findRepoRootFromFs(process.cwd());
    const gateCommands = ["npm run lint", "npm run typecheck", "npm test"];
    const { status, gate } = runDiagGate(repoRoot, gateCommands);
    return {
      status,
      mode: "change",
      diag: true,
      gate,
      changedFiles: [],
    };
  }

  ensureGitSafeDirectory();
  const repoRoot = getRepoRootFromGit();

  let memory: AgentMemoryRepo | null = null;
  let sessionId = `change-${new Date().toISOString()}`;

  let preflight = null;
  let cleanup = null;
  let response: any = null;

  let lastError: string | null = null;
  let lastChanged: string[] = [];
  let lastCommitMessage = "";
  let lastApplyDebug:
    | { applyStdout: string; applyStderr: string; patchPreview: string; applyPatchPath: string }
    | null = null;

  let branchName: string | null = null;
  let gateCommands: string[] = [];
  let model = "";
  let mission0: any = null;

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

    preflight = await runPreflight(repoRoot, sessionId, req.dryRun === true ? { offline: true } : undefined);
    if (!preflight.ok) {
      throw new Error(preflight.error ?? "preflight failed");
    }

    const { config } = loadAgentConfig();
    mission0 = runMission0();
    gateCommands = resolveGateCommands(config, mission0.gateCandidates);
    model = resolveModel(config);
    branchName = makeBranchName(config.git.branchPrefix, req.task);

    if (!req.dryRun) {
      const checkoutBranch = execShell(`git checkout -B ${branchName}`, { cwd: repoRoot });
      if (!checkoutBranch.ok) {
        throw new Error(`git checkout -B ${branchName} failed: ${shellDetail(checkoutBranch)}`);
      }
    }

    const openai = createOpenAIClient();

    const maxIterations = Math.max(1, config.openai.maxIterations || 1);

    for (let i = 0; i < maxIterations; i++) {
      const prompt = buildPatchPrompt(req.task, mission0, lastError);
      const promptSummary = summarizePrompt(prompt);

      await addEvent("MODEL_PROMPT", {
        iteration: i + 1,
        model,
        ...promptSummary,
      });

      const raw = await callModelText(openai, model, prompt);

      const parsed = tryParseJson(raw);
      if (!parsed) {
        lastError = "Model did not return valid JSON";
        continue;
      }

      const patch = sanitizePatch(String(parsed.patch ?? ""));
      const commitMessage = String(parsed.commitMessage ?? "agent: change").trim() || "agent: change";

      if (patch.trim().length < 10) {
        lastError = "Patch empty or too short";
        continue;
      }

      if (req.dryRun) {
        const changed = parseChangedFilesFromPatch(patch);
        lastChanged = changed;
        lastCommitMessage = commitMessage;
        await addEvent("DONE", {
          status: "ok",
          branchName,
          commitMessage,
          changedFiles: changed,
          dryRun: true,
        });
        response = {
          status: "ok",
          mode: "change",
          sessionId,
          branchName,
          commitMessage,
          changedFiles: changed,
          gateCommands,
          dryRun: true,
        };
        return response;
      }

      const patchFile = writeTempPatch(sessionId, patch);
      const apply = execShell(`git apply --whitespace=nowarn ${patchFile}`, { cwd: repoRoot });

      if (!apply.ok) {
        lastApplyDebug = {
          applyStdout: truncate8000(apply.stdout ?? ""),
          applyStderr: truncate8000(apply.stderr ?? ""),
          patchPreview: buildPatchPreview(patch),
          applyPatchPath: patchFile,
        };
        clearWorkingTree(repoRoot);
        lastError = "git apply failed";
        continue;
      }

      const changed = parseChangedFiles(repoRoot);
      lastChanged = changed;
      lastCommitMessage = commitMessage;

      const allowedCheck = enforceAllowedPaths(repoRoot, changed, config.allowedPaths.debug);
      if (!allowedCheck.ok) {
        clearWorkingTree(repoRoot);
        lastError = `Changed files outside allowed paths: ${allowedCheck.denied.join(", ")}`;
        continue;
      }

      const gateResult = runGateCommands(repoRoot, gateCommands);
      await addEvent("GATE_RESULT", {
        gateOk: gateResult.gateOk,
        results: gateResult.results,
      });

      if (!gateResult.gateOk) {
        clearWorkingTree(repoRoot);
        lastError = "Gate commands failed";
        continue;
      }

      const add = execShell("git add -A", { cwd: repoRoot });
      if (!add.ok) {
        lastError = "git add failed";
        clearWorkingTree(repoRoot);
        continue;
      }

      const commit = execShell(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: repoRoot });
      if (!commit.ok) {
        lastError = "git commit failed";
        clearWorkingTree(repoRoot);
        continue;
      }

      if (!req.dryRun) {
        const push = execShell(`git push -u ${config.git.remote} ${branchName}`, { cwd: repoRoot });
        if (!push.ok) {
          lastError = "git push failed";
          await addEvent("DONE", {
            status: "failed",
            branchName,
            commitMessage,
            changedFiles: changed,
            reason: lastError,
          });
          response = {
            status: "failed",
            mode: "change",
            sessionId,
            branchName,
            commitMessage,
            changedFiles: changed,
            gateCommands,
            error: lastError,
          };
          return response;
        }
      }

      await addEvent("DONE", {
        status: "ok",
        branchName,
        commitMessage,
        changedFiles: changed,
      });

      response = {
        status: "ok",
        mode: "change",
        sessionId,
        branchName,
        commitMessage,
        changedFiles: changed,
        gateCommands,
      };
      return response;
    }

    await addEvent("DONE", {
      status: "failed",
      branchName,
      commitMessage: lastCommitMessage,
      changedFiles: lastChanged,
      reason: lastError ?? "max iterations exceeded",
    });

    response = {
      status: "failed",
      mode: "change",
      sessionId,
      branchName,
      commitMessage: lastCommitMessage,
      changedFiles: lastChanged,
      gateCommands,
      error: lastError ?? "max iterations exceeded",
      ...(lastError === "git apply failed" && lastApplyDebug ? lastApplyDebug : {}),
    };
    return response;
  } catch (error) {
    const message = safeErrorMessage(error);
    await addEvent("DONE", {
      status: "failed",
      branchName,
      commitMessage: lastCommitMessage,
      changedFiles: lastChanged,
      reason: message,
    });
    response = {
      status: "failed",
      mode: "change",
      sessionId,
      branchName,
      commitMessage: lastCommitMessage,
      changedFiles: lastChanged,
      gateCommands,
      error: message,
      ...(message === "git apply failed" && lastApplyDebug ? lastApplyDebug : {}),
    };
    return response;
  } finally {
    cleanup = await runCleanup(repoRoot);
    if (!response) {
      response = {
        status: "failed",
        mode: "change",
        sessionId,
        branchName,
        changedFiles: lastChanged,
        gateCommands,
        error: safeErrorMessage(lastError ?? "runChange failed"),
        ...(lastError === "git apply failed" && lastApplyDebug ? lastApplyDebug : {}),
      };
    }
    response.preflight = preflight;
    response.cleanup = cleanup;
    if (memory) {
      try {
        await memory.close();
      } catch {
        // ignore
      }
    }
  }
}
