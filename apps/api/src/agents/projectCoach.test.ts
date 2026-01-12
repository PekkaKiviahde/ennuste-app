import test, { mock } from "node:test";
import assert from "node:assert/strict";

async function importFresh<T>(specifier: string): Promise<T> {
  const url = new URL(specifier, import.meta.url);
  url.searchParams.set("cacheBust", `${Date.now()}-${Math.random()}`);
  return import(url.href) as Promise<T>;
}

test("runProjectCoach ai=0 returns fallback without calling OpenAI", async () => {
  const runTextPrompt = mock.fn(async () => {
    return { message: "AI OK", tokensEstimate: 10 };
  });

  await mock.module("../lib/openai/client", {
    namedExports: { runTextPrompt },
  });

  const { runProjectCoach } = await importFresh<{ runProjectCoach: Function }>(
    "./projectCoach"
  );
  const result = await runProjectCoach({ useAI: false });

  assert.deepEqual(result, {
    message: "ProjectCoach: project is running, no blockers detected.",
    aiUsed: false,
  });
  assert.equal(runTextPrompt.mock.calls.length, 0);

  mock.restoreAll();
});

test("runProjectCoach ai=1 falls back on OpenAI error", async () => {
  const runTextPrompt = mock.fn(async () => {
    throw new Error("OPENAI_API_KEY missing");
  });

  await mock.module("../lib/openai/client", {
    namedExports: { runTextPrompt },
  });

  const { runProjectCoach } = await importFresh<{ runProjectCoach: Function }>(
    "./projectCoach"
  );
  const result = await runProjectCoach({ useAI: true, question: "hei" });

  assert.deepEqual(result, {
    message: "ProjectCoach: project is running, no blockers detected.",
    aiUsed: false,
  });
  assert.equal(runTextPrompt.mock.calls.length, 1);

  mock.restoreAll();
});
