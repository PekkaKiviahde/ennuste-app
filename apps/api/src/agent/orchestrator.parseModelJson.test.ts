import test from "node:test";
import assert from "node:assert/strict";

import { __test_parseModelJson } from "./orchestrator";

test("parseModelJson tolerates invalid JSON escapes like \\${...}", () => {
  const raw = JSON.stringify({
    commitMessage: "test",
    patch:
      "line1\ncurl -H \"x-internal-token: \\${AGENT_INTERNAL_TOKEN}\"\nline3\n",
  });

  // Introduce the common model mistake: `\${` (invalid JSON escape) inside the JSON string.
  const broken = raw.replace("\\\\${AGENT_INTERNAL_TOKEN}", "\\${AGENT_INTERNAL_TOKEN}");

  const parsed = __test_parseModelJson(broken);
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;

  assert.equal(parsed.value.commitMessage, "test");
  assert.ok(parsed.value.patch.includes("${AGENT_INTERNAL_TOKEN}"));
});

