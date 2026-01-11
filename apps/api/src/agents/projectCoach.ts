import { runTextPrompt } from "../lib/openai/client";
import { type AllowedOpenAIModel } from "../lib/openai/models";

export interface ProjectCoachResult {
  message: string;
  aiUsed: boolean;
}

export interface ProjectCoachInput {
  useAI: boolean;
  question?: string;
}

const FALLBACK_MESSAGE =
  "ProjectCoach: project is running, no blockers detected.";

const PROJECT_COACH_MODEL: AllowedOpenAIModel = "gpt-4.1-mini";

export async function runProjectCoach(
  input: ProjectCoachInput
): Promise<ProjectCoachResult> {
  if (!input.useAI) {
    return { message: FALLBACK_MESSAGE, aiUsed: false };
  }

  try {
    const prompt =
      input.question?.trim() ||
      "Anna lyhyt projektin tilanne: mika on tehty, mika on seuraava askel, ja mika on suurin riski.";

    const result = await runTextPrompt({
      prompt,
      model: PROJECT_COACH_MODEL,
      source: "projectCoach",
    });

    const message = result.message.trim() || FALLBACK_MESSAGE;
    return { message, aiUsed: true };
  } catch {
    return { message: FALLBACK_MESSAGE, aiUsed: false };
  }
}
