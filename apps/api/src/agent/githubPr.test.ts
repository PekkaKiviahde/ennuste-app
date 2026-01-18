import test, { mock } from "node:test";
import assert from "node:assert/strict";

import { createOrFindPullRequest } from "./githubPr";

test("createOrFindPullRequest returns existing PR url (idempotent)", async () => {
  const prev = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "test-token";

  const fetchMock = mock.fn(async (input: string, init?: RequestInit) => {
    assert.equal(init?.method, "GET");
    assert.ok(input.includes("/repos/PekkaKiviahde/ennuste-app/pulls?"));
    assert.ok(input.includes("state=open"));
    assert.ok(input.includes("head=PekkaKiviahde%3Aagent%2Fsession-1"));

    return new Response(JSON.stringify([{ html_url: "https://github.com/x/y/pull/123" }]), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  const prUrl = await createOrFindPullRequest({
    branchName: "agent/session-1",
    title: "t",
    body: "b",
    fetch: fetchMock,
  });

  assert.equal(prUrl, "https://github.com/x/y/pull/123");
  assert.equal(fetchMock.mock.calls.length, 1);

  process.env.GH_TOKEN = prev;
  mock.restoreAll();
});

test("createOrFindPullRequest creates PR when none exists", async () => {
  const prev = process.env.GH_TOKEN;
  process.env.GH_TOKEN = "test-token";

  const fetchMock = mock.fn(async (input: string, init?: RequestInit) => {
    if ((init?.method ?? "GET") === "GET") {
      return new Response(JSON.stringify([]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }

    assert.equal(init?.method, "POST");
    assert.equal(input, "https://api.github.com/repos/PekkaKiviahde/ennuste-app/pulls");

    const body = JSON.parse(String(init?.body ?? "{}"));
    assert.deepEqual(body, {
      title: "commit title",
      head: "PekkaKiviahde:agent/session-2",
      base: "main",
      body: "pr body",
    });

    return new Response(JSON.stringify({ html_url: "https://github.com/x/y/pull/999" }), {
      status: 201,
      headers: { "content-type": "application/json" },
    });
  });

  const prUrl = await createOrFindPullRequest({
    branchName: "agent/session-2",
    title: "commit title",
    body: "pr body",
    fetch: fetchMock,
  });

  assert.equal(prUrl, "https://github.com/x/y/pull/999");
  assert.equal(fetchMock.mock.calls.length, 2);

  process.env.GH_TOKEN = prev;
  mock.restoreAll();
});

