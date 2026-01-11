import { Router } from "express";
import { requireInternalToken } from "../middleware/requireInternalToken";
import { checkEnv } from "../config/env";
import { runMission0 } from "../agent/mission0";
import { runChange } from "../agent/orchestrator";
import { runCleanup, runPreflight } from "../agent/preflight";
import { loadAgentConfig } from "../agent/config";

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

    const { config, repoRoot } = loadAgentConfig();
    const sessionLabel = `mission0-${new Date().toISOString()}`;

    let preflight = null;
    let cleanup = null;
    let response: any = null;

    try {
      preflight = await runPreflight(repoRoot, sessionLabel, config.git);
      if (!preflight.ok) {
        response = {
          status: "error",
          mode: "mission0",
          error: "Preflight failed",
          details: preflight.error ?? "preflight failed",
          preflight,
        };
      } else {
        const report = runMission0();
        response = { status: "ok", mode: "mission0", report, preflight };
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "mission0 failed";
      response = { status: "error", mode: "mission0", error: "mission0 failed", details: message, preflight };
    } finally {
      cleanup = await runCleanup(repoRoot);
      if (response) response.cleanup = cleanup;
    }

    const status = response?.status === "ok" ? 200 : 500;
    return res.status(status).json(response);
  }

  if (mode === "change") {
    const env = checkEnv(["AGENT_INTERNAL_TOKEN", "OPENAI_API_KEY", "DATABASE_URL"]);
    if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

    const projectId = body.projectId?.trim();
    if (!projectId) {
      return res.status(400).json({ error: "Missing field", missing: ["projectId"] });
    }

    const task = body.task?.trim();
    if (!task) return res.status(400).json({ error: "Missing task" });

    try {
      const result = await runChange({
        projectId,
        task,
        dryRun: !!body.dryRun,
      });
      return res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "runChange failed";
      return res.status(500).json({ status: "error", error: "runChange failed", details: message });
    }
  }

  return res.status(400).json({ error: "Unknown mode" });
});

export default router;
