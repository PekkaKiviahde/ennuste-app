const ALLOWED_OPENAI_MODELS = ["gpt-4.1-mini", "gpt-4.1"] as const;

export type AllowedOpenAIModel = (typeof ALLOWED_OPENAI_MODELS)[number];

export function assertAllowedOpenAIModel(
  model: string
): asserts model is AllowedOpenAIModel {
  if (!ALLOWED_OPENAI_MODELS.includes(model as AllowedOpenAIModel)) {
    throw new Error(`OpenAI model not allowed: ${model}`);
  }
}

export function listAllowedOpenAIModels(): readonly AllowedOpenAIModel[] {
  return ALLOWED_OPENAI_MODELS;
}
