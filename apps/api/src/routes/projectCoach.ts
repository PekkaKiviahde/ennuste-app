import type { Request, Response } from "express";
import { runProjectCoach } from "../agents/projectCoach";

function parseQueryBool(value: unknown): boolean {
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return false;
  const v = raw.trim().toLowerCase();
  if (["1", "true", "yes", "y", "on"].includes(v)) return true;
  if (["0", "false", "no", "n", "off"].includes(v)) return false;
  return false;
}

const FALLBACK_MESSAGE =
  "ProjectCoach: project is running, no blockers detected.";

export async function handleProjectCoach(
  request: Request,
  response: Response
): Promise<void> {
  try {
    const useAI = parseQueryBool(request.query.ai);

    const question =
      typeof request.query.q === "string" ? request.query.q : undefined;

    const result = await runProjectCoach({ useAI, question });
    response.json(result);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "openai_project_coach_error",
        ok: false,
        ts: new Date().toISOString(),
      })
    );
    response.json({ message: FALLBACK_MESSAGE, aiUsed: false });
  }
}
