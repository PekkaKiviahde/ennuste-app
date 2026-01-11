import "server-only";

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

function getApiBaseUrl(): string {
  const baseUrl = process.env.API_BASE_URL;
  if (baseUrl) {
    return baseUrl;
  }
  const port = process.env.APP_PORT || process.env.PORT || "3001";
  return `http://localhost:${port}`;
}

export async function runProjectCoach(
  input: ProjectCoachInput
): Promise<ProjectCoachResult> {
  const url = new URL("/api/project-coach", getApiBaseUrl());
  if (input.useAI) {
    url.searchParams.set("ai", "1");
  }
  if (input.question) {
    url.searchParams.set("q", input.question);
  }

  try {
    const response = await fetch(url, { method: "GET" });
    if (!response.ok) {
      throw new Error("Backend response not ok");
    }
    const data = (await response.json()) as ProjectCoachResult | null;
    if (!data || typeof data.message !== "string") {
      throw new Error("Invalid backend response");
    }
    return { message: data.message, aiUsed: Boolean(data.aiUsed) };
  } catch {
    return { message: FALLBACK_MESSAGE, aiUsed: false };
  }
}
