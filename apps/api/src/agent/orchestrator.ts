import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

import { runMission0 } from "./mission0";
import { loadAgentConfig, resolveGateCommands, resolveModel } from "./config";
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

function writeTempPatch(repoRoot: string, patch: string): string {
  const dir = path.join(repoRoot, ".agent_tmp");
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `patch-${crypto.randomUUID()}.diff`);
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

function resetRepo(repoRoot: string): void {
  execShell("git reset --hard", { cwd: repoRoot });
  execShell("git clean -fd", { cwd: repoRoot });
}

export async function runChange(req: ChangeRequest) {
  const { config, repoRoot } = loadAgentConfig();
  const mission0 = runMission0();

  const gateCommands = resolveGateCommands(config, mission0.gateCandidates);
  const model = resolveModel(config);

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL missing");

  const memory = new AgentMemoryRepo(databaseUrl);
  const sessionId = await memory.createSession(req.projectId);

  await memory.addEvent(sessionId, "SESSION_START", {
    projectId: req.projectId,
    dryRun: !!req.dryRun,
    ...summarizeTask(req.task),
  });

  const branchName = makeBranchName(config.git.branchPrefix, req.task);

  let preflight = null;
  let cleanup = null;
  let response: any = null;

  let lastError: string | null = null;
  let lastChanged: string[] = [];
  let lastCommitMessage = "";

  try {
    preflight = await runPreflight(repoRoot, sessionId, config.git);
    if (!preflight.ok) {
      throw new Error(preflight.error ?? "preflight failed");
    }

    const openai = createOpenAIClient();

    const checkoutBranch = execShell(`git checkout -b ${branchName}`, { cwd: repoRoot });
    if (!checkoutBranch.ok) {
      const detail = (checkoutBranch.stderr || checkoutBranch.stdout || "unknown error").trim();
      throw new Error(`git checkout -b failed: ${detail}`);
    }

    const maxIterations = Math.max(1, config.openai.maxIterations || 1);

    for (let i = 0; i < maxIterations; i++) {
      const prompt = buildPatchPrompt(req.task, mission0, lastError);
      const promptSummary = summarizePrompt(prompt);

      await memory.addEvent(sessionId, "MODEL_PROMPT", {
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

      const patch = String(parsed.patch ?? "");
      const commitMessage = String(parsed.commitMessage ?? "agent: change").trim() || "agent: change";

      if (!patch.includes("diff --git")) {
        lastError = "Patch missing diff --git header";
        continue;
      }

      if (req.dryRun) {
        const changed = parseChangedFilesFromPatch(patch);
        lastChanged = changed;
        lastCommitMessage = commitMessage;
        await memory.addEvent(sessionId, "DONE", {
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

      const patchFile = writeTempPatch(repoRoot, patch);
      const apply = execShell(`git apply --whitespace=nowarn ${patchFile}`, { cwd: repoRoot });
      try {
        fs.unlinkSync(patchFile);
      } catch {
        // ignore
      }

      if (!apply.ok) {
        resetRepo(repoRoot);
        lastError = "git apply failed";
        continue;
      }

      const changed = parseChangedFiles(repoRoot);
      lastChanged = changed;
      lastCommitMessage = commitMessage;

      const allowedCheck = enforceAllowedPaths(repoRoot, changed, config.allowedPaths.debug);
      if (!allowedCheck.ok) {
        resetRepo(repoRoot);
        lastError = `Changed files outside allowed paths: ${allowedCheck.denied.join(", ")}`;
        continue;
      }

      const gateResult = runGateCommands(repoRoot, gateCommands);
      await memory.addEvent(sessionId, "GATE_RESULT", {
        gateOk: gateResult.gateOk,
        results: gateResult.results,
      });

      if (!gateResult.gateOk) {
        resetRepo(repoRoot);
        lastError = "Gate commands failed";
        continue;
      }

      const add = execShell("git add -A", { cwd: repoRoot });
      if (!add.ok) {
        lastError = "git add failed";
        resetRepo(repoRoot);
        continue;
      }

      const commit = execShell(`git commit -m ${JSON.stringify(commitMessage)}`, { cwd: repoRoot });
      if (!commit.ok) {
        lastError = "git commit failed";
        resetRepo(repoRoot);
        continue;
      }

      if (!req.dryRun) {
        const push = execShell(`git push -u ${config.git.remote} ${branchName}`, { cwd: repoRoot });
        if (!push.ok) {
          lastError = "git push failed";
          await memory.addEvent(sessionId, "DONE", {
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

      await memory.addEvent(sessionId, "DONE", {
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

    await memory.addEvent(sessionId, "DONE", {
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
    };
    return response;
  } catch (error) {
    const message = safeErrorMessage(error);
    await memory.addEvent(sessionId, "DONE", {
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
    };
    return response;
  } finally {
    cleanup = await runCleanup(repoRoot);
    if (response) {
      response.preflight = preflight;
      response.cleanup = cleanup;
    }
    await memory.close();
  }
}
