import test, { mock } from "node:test";
import assert from "node:assert/strict";

test("GET toggles AI by query param and returns JSON", async () => {
  const runProjectCoach = mock.fn(async (args: any) => {
    const useAI = Boolean(args?.useAI);
    return {
      message: useAI ? "AI OK" : "Stub OK",
      aiUsed: useAI,
    };
  });

  // Mock BEFORE importing the route
  await mock.module("../../../agents/projectCoach", {
    namedExports: { runProjectCoach },
  });

  const { GET } = await import("./route.js");

  // 1) AI off (default)
  const res1 = await GET(
    new Request("http://localhost:3000/api/project-coach")
  );
  assert.deepEqual(await res1.json(), { message: "Stub OK", aiUsed: false });

  // 2) AI on
  const res2 = await GET(
    new Request("http://localhost:3000/api/project-coach?ai=1&q=hei")
  );
  assert.deepEqual(await res2.json(), { message: "AI OK", aiUsed: true });

  assert.equal(runProjectCoach.mock.calls.length, 2);

  const call1Args = runProjectCoach.mock.calls[0].arguments[0];
  const call2Args = runProjectCoach.mock.calls[1].arguments[0];

  assert.deepEqual(call1Args, { useAI: false, question: undefined });
  assert.deepEqual(call2Args, { useAI: true, question: "hei" });

  mock.restoreAll();
});
