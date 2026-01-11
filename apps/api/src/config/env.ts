export type EnvCheckResult = {
  ok: boolean;
  missing: string[];
};

export function checkEnv(required: string[]): EnvCheckResult {
  const missing = required.filter((k) => !process.env[k] || String(process.env[k]).trim() === "");
  return { ok: missing.length === 0, missing };
}
