type OpenAIUsageLog = {
  source: string;
  model: string;
  tokensEstimate?: number | null;
  ok: boolean;
};

export function logOpenAIUsage(entry: OpenAIUsageLog): void {
  const env = process.env.NODE_ENV || "development";
  const payload = {
    event: "openai_usage",
    env,
    source: entry.source,
    model: entry.model,
    tokens_estimate: entry.tokensEstimate ?? null,
    ok: entry.ok,
    ts: new Date().toISOString(),
  };

  if (env === "production") {
    console.log(JSON.stringify(payload));
  } else {
    console.info(JSON.stringify(payload));
  }
}
