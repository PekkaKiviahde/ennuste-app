import test from "node:test";
import assert from "node:assert/strict";

test("runChange DIAG: fast runs only lint+typecheck (no npm test)", async (t) => {
  const calls: string[] = [];

  await t.mock.module("./tools/exec", {
    namedExports: {
      execShell: (cmd: string) => {
        calls.push(cmd);
        return { ok: true, code: 0, stdout: "", stderr: "" };
      },
    },
  });

  const { runChange } = await import("./orchestrator");
  const result1 = await runChange({
    projectId: "demo",
    task: "DIAG: fast gate smoke",
    dryRun: true,
  });

  assert.equal(result1.status, "ok");
  assert.deepEqual(calls, ["npm run lint", "npm run typecheck"]);

  calls.length = 0;

  const result2 = await runChange({
    projectId: "demo",
    task: "DIAG: gate smoke",
    dryRun: true,
  });

  assert.equal(result2.status, "ok");
  assert.deepEqual(calls, ["npm run lint", "npm run typecheck", "npm test"]);
});
