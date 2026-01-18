import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { ensureOriginUsesToken } from "./tools/gitAuth";

test("ensureOriginUsesToken rewrites https GitHub origin to x-access-token URL (and can restore)", () => {
  const execMock = mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: "https://github.com/acme/test-repo\n", stderr: "" };
    }
    if (commandLine === "git remote get-url --push origin") {
      return { ok: true, stdout: "https://github.com/acme/test-repo\n", stderr: "" };
    }
    if (commandLine.startsWith("git remote set-url ")) {
      return { ok: true, stdout: "", stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });

  const res = ensureOriginUsesToken("/tmp", { token: "test-token", remote: "origin", exec: execMock as any });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);

  const tokenUrl = "https://x-access-token:test-token@github.com/acme/test-repo.git";
  assert.ok(execMock.mock.calls.some((c) => c.arguments[0] === `git remote set-url origin ${JSON.stringify(tokenUrl)}`));
  assert.ok(
    execMock.mock.calls.some((c) => c.arguments[0] === `git remote set-url --push origin ${JSON.stringify(tokenUrl)}`),
  );

  assert.ok(res.restore);
  res.restore?.();

  assert.ok(
    execMock.mock.calls.some(
      (c) => c.arguments[0] === `git remote set-url origin ${JSON.stringify("https://github.com/acme/test-repo")}`,
    ),
  );
  assert.ok(
    execMock.mock.calls.some(
      (c) =>
        c.arguments[0] === `git remote set-url --push origin ${JSON.stringify("https://github.com/acme/test-repo")}`,
    ),
  );

  mock.restoreAll();
});

