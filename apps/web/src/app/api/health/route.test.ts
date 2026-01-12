import test from "node:test";
import assert from "node:assert/strict";

test("GET returns ok", async () => {
  const { GET } = await import("./route.js");
  const response = await GET();

  assert.deepEqual(await response.json(), { ok: true });
});
