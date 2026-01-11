import { Router } from "express";
import { requireInternalToken } from "../middleware/requireInternalToken";
import { checkEnv } from "../config/env";
import { runMission0 } from "../agent/mission0";
import { runChange } from "../agent/orchestrator";

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

    const report = runMission0();
    return res.json({ status: "ok", mode: "mission0", report });
  }

  if (mode === "change") {
    const env = checkEnv(["AGENT_INTERNAL_TOKEN", "OPENAI_API_KEY", "DATABASE_URL"]);
    if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

    const task = body.task?.trim();
    if (!task) return res.status(400).json({ error: "Missing task" });

    try {
      const result = await runChange({
        projectId: body.projectId,
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
