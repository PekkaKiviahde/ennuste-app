import { Router } from "express";
import { requireInternalToken } from "../middleware/requireInternalToken";
import { checkEnv } from "../config/env";
import { runMission0 } from "../agent/mission0";

type AgentRunBody = {
  mode?: "mission0" | "change";
  task?: string;
  projectId?: string;
  dryRun?: boolean;
};

const router = Router();

// (valinnainen) helppo smoke: onko token ok ja server elossa
router.get("/health", requireInternalToken, (req, res) => {
  return res.json({ ok: true });
});

router.post("/run", requireInternalToken, async (req, res) => {
  const body: AgentRunBody = (req.body ?? {}) as any;
  const mode = body.mode ?? "mission0";

  if (mode === "mission0") {
    // Mission 0 on read-only, ei vaadi OpenAI/DB-yhteyttä
    const env = checkEnv(["AGENT_INTERNAL_TOKEN"]);
    if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

    const report = runMission0();
    return res.json({ status: "ok", mode: "mission0", report });
  }

  // change-mode toteutetaan PR2:ssa
  const env = checkEnv(["AGENT_INTERNAL_TOKEN", "OPENAI_API_KEY", "DATABASE_URL"]);
  if (!env.ok) return res.status(500).json({ error: "Missing env", missing: env.missing });

  return res.status(501).json({
    status: "not_implemented",
    message: "mode=change toteutetaan PR2:ssa (agentit + git-loop + muisti).",
  });
});

export default router;
