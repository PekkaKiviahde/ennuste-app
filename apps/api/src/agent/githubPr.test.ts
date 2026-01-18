import test, { mock } from "node:test";
import assert from "node:assert/strict";

import {
  createOrFindPullRequest,
  parseGithubOwnerRepo,
  resolveBaseBranchFromOriginHead,
  resolveRepoTarget,
} from "./githubPr";

test("createOrFindPullRequest returns null when GH_TOKEN missing (compareLink fallback)", async () => {
  const prev = process.env.GH_TOKEN;
  delete (process.env as any).GH_TOKEN;

  const execMock = mock.fn(() => {
    throw new Error("exec should not be called");
  });
  const fetchMock = mock.fn(async () => {
    throw new Error("fetch should not be called");
  });

  const warnMock = mock.method(console, "warn", () => {});

  const prUrl = await createOrFindPullRequest({
    cwd: "/tmp",
    branchName: "agent/session-0",
    title: "t",
    body: "b",
    fetch: fetchMock,
    exec: execMock as any,
  });

  assert.equal(prUrl, null);
  assert.equal(fetchMock.mock.calls.length, 0);
  assert.equal(execMock.mock.calls.length, 0);
  assert.ok(warnMock.mock.calls.length >= 1);

  if (prev === undefined) delete (process.env as any).GH_TOKEN;
  else process.env.GH_TOKEN = prev;
  mock.restoreAll();
});

test("createOrFindPullRequest returns existing PR url (idempotent)", async () => {
  const prev = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "test-token";

  const execMock = mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: "https://github.com/acme/test-repo.git\n", stderr: "" };
    }
    if (commandLine === "git symbolic-ref --quiet --short refs/remotes/origin/HEAD") {
      return { ok: true, stdout: "origin/main\n", stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });

  const fetchMock = mock.fn(async (input: string, init?: RequestInit) => {
    assert.equal(init?.method, "GET");
    assert.ok(input.includes("/repos/acme/test-repo/pulls?"));
    assert.ok(input.includes("state=open"));
    assert.ok(input.includes("head=acme%3Aagent%2Fsession-1"));

    return new Response(JSON.stringify([{ html_url: "https://github.com/x/y/pull/123" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  const prUrl = await createOrFindPullRequest({
    cwd: "/tmp",
    branchName: "agent/session-1",
    title: "t",
    body: "b",
    fetch: fetchMock,
    exec: execMock as any,
  });

  assert.equal(prUrl, "https://github.com/x/y/pull/123");
  assert.equal(fetchMock.mock.calls.length, 1);

  process.env.GH_TOKEN = prev;
  mock.restoreAll();
});

test("createOrFindPullRequest creates PR when none exists", async () => {
  const prev = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "test-token";

  const execMock = mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: "git@github.com:acme/test-repo.git\n", stderr: "" };
    }
    if (commandLine === "git symbolic-ref --quiet --short refs/remotes/origin/HEAD") {
      return { ok: true, stdout: "origin/develop\n", stderr: "" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });

  const fetchMock = mock.fn(async (input: string, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    assert.equal(init?.method, "POST");
    assert.equal(input, "https://api.github.com/repos/acme/test-repo/pulls");

    const body = JSON.parse(String(init?.body ?? "{}"));
    assert.deepEqual(body, {
      title: "commit title",
      head: "acme:agent/session-2",
      base: "develop",
      body: "pr body",
    });

    return new Response(JSON.stringify({ html_url: "https://github.com/x/y/pull/999" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  });

  const prUrl = await createOrFindPullRequest({
    cwd: "/tmp",
    branchName: "agent/session-2",
    title: "commit title",
    body: "pr body",
    fetch: fetchMock,
    exec: execMock as any,
  });

  assert.equal(prUrl, "https://github.com/x/y/pull/999");
  assert.equal(fetchMock.mock.calls.length, 2);

  process.env.GH_TOKEN = prev;
  mock.restoreAll();
});

test("parseGithubOwnerRepo parses https remote url (+.git)", () => {
  assert.deepEqual(parseGithubOwnerRepo("https://github.com/aa/bb.git"), { owner: "aa", repo: "bb" });
});

test("parseGithubOwnerRepo parses ssh remote url (+.git)", () => {
  assert.deepEqual(parseGithubOwnerRepo("git@github.com:aa/bb.git"), { owner: "aa", repo: "bb" });
});

test("parseGithubOwnerRepo parses without .git suffix", () => {
  assert.deepEqual(parseGithubOwnerRepo("https://github.com/aa/bb"), { owner: "aa", repo: "bb" });
});

test("resolveBaseBranchFromOriginHead returns base name", () => {
  const execMock = (commandLine: string) => {
    assert.equal(commandLine, "git symbolic-ref --quiet --short refs/remotes/origin/HEAD");
    return { ok: true, stdout: "origin/main\n", stderr: "" };
  };
  assert.equal(resolveBaseBranchFromOriginHead(execMock as any, "/tmp"), "main");
});

test("resolveRepoTarget falls back to main when origin/HEAD missing", () => {
  const execMock = mock.fn((commandLine: string) => {
    if (commandLine === "git remote get-url origin") {
      return { ok: true, stdout: "https://github.com/aa/bb.git\n", stderr: "" };
    }
    if (commandLine === "git symbolic-ref --quiet --short refs/remotes/origin/HEAD") {
      return { ok: false, stdout: "", stderr: "missing" };
    }
    return { ok: false, stdout: "", stderr: "unknown command" };
  });

  const target = resolveRepoTarget("/tmp", execMock as any);
  assert.equal(target.owner, "aa");
  assert.equal(target.repo, "bb");
  assert.equal(target.base, "main");
  assert.equal(target.warnings.length, 1);
});
