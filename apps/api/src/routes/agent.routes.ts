import { Router } from "express";
import { requireInternalToken } from "../middleware/requireInternalToken";
import { checkEnv } from "../config/env";
import { runMission0 } from "../agent/mission0";
import { runChange } from "../agent/orchestrator";
import { runCleanup, runPreflight } from "../agent/preflight";
import { getRepoRootFromGit } from "../agent/config";

type AgentRunBody = {
  mode?: "mission0" | "change";
  task?: string;
  projectId?: string;
  dryRun?: boolean;
};

const router = Router();

router.get("/health", requireInternalToken, (req, res) => {
  return res.json({ ok: true });
});

router.post("/run", requireInternalToken, async (req, res) => {
  const body: AgentRunBody = (req.body ?? {}) as any;
  const mode = body.mode ?? "mission0";

  if (mode === "mission0") {
    const env = checkEnv(["AGENT_INTERNAL_TOKEN"]);
    if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

    const repoRoot = getRepoRootFromGit();
    const sessionId = `mission0-${new Date().toISOString()}`;

    let preflight = null;
    let cleanup = null;
    let response: any = null;

    try {
      preflight = await runPreflight(repoRoot, sessionId);
      if (!preflight.ok) {
        response = {
          status: "failed",
          mode: "mission0",
          sessionId,
          branchName: null,
          changedFiles: [],
          gateCommands: [],
          error: preflight.error ?? "preflight failed",
          preflight,
        };
      } else {
        const report = runMission0();
        response = {
          status: "ok",
          mode: "mission0",
          sessionId,
          branchName: null,
          changedFiles: [],
          gateCommands: report.gateCandidates ?? [],
          preflight,
          report,
        };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "mission0 failed";
      response = {
        status: "failed",
        mode: "mission0",
        sessionId,
        branchName: null,
        changedFiles: [],
        gateCommands: [],
        error: message,
        preflight,
      };
    } finally {
      cleanup = await runCleanup(repoRoot);
      if (response) response.cleanup = cleanup;
    }

    const status = response?.status === "ok" ? 200 : 500;
    return res.status(status).json(response);
  }

  if (mode === "change") {
    const projectId = body.projectId?.trim();
    if (!projectId) {
      return res.status(400).json({ error: "Missing field", missing: ["projectId"] });
    }

    const task = body.task?.trim();
    if (!task) return res.status(400).json({ error: "Missing task" });

    const env = checkEnv(["AGENT_INTERNAL_TOKEN", "OPENAI_API_KEY", "DATABASE_URL"]);
    if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

    try {
      const result = await runChange({
        projectId,
        task,
        dryRun: !!body.dryRun,
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "runChange failed";
      return res.status(500).json({
        status: "failed",
        mode: "change",
        sessionId: null,
        branchName: null,
        changedFiles: [],
        gateCommands: [],
        preflight: null,
        cleanup: null,
        error: message,
      });
    }
  }

  return res.status(400).json({ error: "Unknown mode" });
});

export default router;
