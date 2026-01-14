import OpenAI from "openai";
import { setDefaultOpenAIKey } from "@openai/agents";
import { assertAllowedOpenAIModel, type AllowedOpenAIModel } from "./models";
import { logOpenAIUsage } from "./logging";

type RunTextPromptInput = {
  prompt: string;
  model: AllowedOpenAIModel;
  source: string;
};

type RunTextPromptResult = {
  message: string;
  tokensEstimate: number | null;
};

let client: OpenAI | null = null;
let agentsConfigured = false;

function getOpenAIKey(): string {
  const isProd = process.env.NODE_ENV === "production";
  const devKey = process.env.OPENAI_API_KEY;
  const prodKey = process.env.OPENAI_API_KEY_PROD;

  if (isProd) {
    if (!prodKey) {
      throw new Error("OPENAI_API_KEY_PROD missing in production");
    }
    if (devKey) {
      throw new Error("OPENAI_API_KEY must not be set in production");
    }
    return prodKey;
  }

  if (prodKey) {
    throw new Error("OPENAI_API_KEY_PROD must not be set outside production");
  }
  if (!devKey) {
    throw new Error("OPENAI_API_KEY missing in development");
  }
  return devKey;
}

export function getOpenAIClient(): OpenAI {
  if (!client) {
    client = new OpenAI({ apiKey: getOpenAIKey() });
  }
  return client;
}

export function initOpenAI(): void {
  if (!agentsConfigured) {
    setDefaultOpenAIKey(getOpenAIKey());
    agentsConfigured = true;
  }
}

export async function runTextPrompt(
  input: RunTextPromptInput
): Promise<RunTextPromptResult> {
  assertAllowedOpenAIModel(input.model);
  const openai = getOpenAIClient();

  try {
    const response = await openai.responses.create({
      model: input.model,
      input: input.prompt,
    });

    const message =
      typeof response.output_text === "string" ? response.output_text : "";
    const tokensEstimate = response.usage?.total_tokens ?? null;

    logOpenAIUsage({
      source: input.source,
      model: input.model,
      tokensEstimate,
      ok: true,
    });

    return { message, tokensEstimate };
  } catch (error) {
    logOpenAIUsage({
      source: input.source,
      model: input.model,
      tokensEstimate: null,
      ok: false,
    });
    throw error;
  }
}
