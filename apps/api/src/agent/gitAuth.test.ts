import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { ensureOriginUsesToken } from "./tools/gitAuth";

function buildExecMock(fetchUrl: string, pushUrl: string, prevHeaders: string[] = []) {
  return mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: `${fetchUrl}\n`, stderr: "" };
    }
    if (commandLine === "git remote get-url --push origin") {
      return { ok: true, stdout: `${pushUrl}\n`, stderr: "" };
    }
    if (commandLine === "git config --global --get credential.helper") {
      return { ok: true, stdout: "", stderr: "" };
    }
    if (commandLine === "git config --local --get-all http.https://github.com/.extraheader") {
      return { ok: true, stdout: `${prevHeaders.join("\n")}\n`, stderr: "" };
    }
    if (commandLine === "git config --local --unset-all http.https://github.com/.extraheader") {
      return { ok: true, stdout: "", stderr: "" };
    }
    if (commandLine.startsWith("git config --local http.https://github.com/.extraheader ")) {
      return { ok: true, stdout: "", stderr: "" };
    }
    if (commandLine.startsWith("git config --local --add http.https://github.com/.extraheader ")) {
      return { ok: true, stdout: "", stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });
}

test("ensureOriginUsesToken asettaa extraheaderin ja palauttaa aiemmat arvot", () => {
  const prevHeaders = ["AUTHORIZATION: basic old1", "AUTHORIZATION: basic old2"];
  const execMock = buildExecMock("https://github.com/acme/test-repo", "https://github.com/acme/test-repo", prevHeaders);

  const res = ensureOriginUsesToken("/tmp", { token: "test-token", remote: "origin", exec: execMock as any });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);

  const header = `AUTHORIZATION: basic ${Buffer.from("x-access-token:test-token").toString("base64")}`;
  assert.ok(
    execMock.mock.calls.some(
      (c) => c.arguments[0] === `git config --local http.https://github.com/.extraheader ${JSON.stringify(header)}`,
    ),
  );
  assert.equal(execMock.mock.calls.some((c) => c.arguments[0].startsWith("git remote set-url ")), false);

  res.restore?.();

  for (const prev of prevHeaders) {
    assert.ok(
      execMock.mock.calls.some(
        (c) => c.arguments[0] === `git config --local --add http.https://github.com/.extraheader ${JSON.stringify(prev)}`,
      ),
    );
  }

  mock.restoreAll();
});

test("ensureOriginUsesToken toimii vaikka push-url on eri tai ssh", () => {
  const execMock = buildExecMock("https://github.com/upstream/test-repo", "git@github.com:my-fork/test-repo.git");

  const res = ensureOriginUsesToken("/tmp", { token: "test-token", remote: "origin", exec: execMock as any });
  assert.equal(res.ok, true);
  assert.equal(res.changed, true);

  assert.equal(execMock.mock.calls.some((c) => c.arguments[0].startsWith("git remote set-url ")), false);
  mock.restoreAll();
});

test("ensureOriginUsesToken ohittaa extraheaderin kun netrc-helper on kaytossa", () => {
  const execMock = mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: "https://github.com/acme/test-repo\n", stderr: "" };
    }
    if (commandLine === "git remote get-url --push origin") {
      return { ok: true, stdout: "https://github.com/acme/test-repo\n", stderr: "" };
    }
    if (commandLine === "git config --global --get credential.helper") {
      return { ok: true, stdout: "git-credential-github-netrc\n", stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });

  const res = ensureOriginUsesToken("/tmp", { token: "test-token", remote: "origin", exec: execMock as any });
  assert.equal(res.ok, true);
  assert.equal(res.changed, false);
  assert.equal(execMock.mock.calls.some((c) => c.arguments[0].includes("extraheader")), false);

  mock.restoreAll();
});
