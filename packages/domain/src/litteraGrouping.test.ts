import { test } from "node:test";
import assert from "node:assert/strict";
import { groupCodeFromLitteraCode } from "./litteraGrouping";

test("groupCodeFromLitteraCode returns first digit as group", () => {
  assert.equal(groupCodeFromLitteraCode("1100"), 1);
  assert.equal(groupCodeFromLitteraCode("0123"), 0);
  assert.equal(groupCodeFromLitteraCode("9000"), 9);
});

test("groupCodeFromLitteraCode handles whitespace", () => {
  assert.equal(groupCodeFromLitteraCode(" 7001 "), 7);
});

test("groupCodeFromLitteraCode returns null on invalid input", () => {
  assert.equal(groupCodeFromLitteraCode(""), null);
  assert.equal(groupCodeFromLitteraCode(" A100"), null);
  assert.equal(groupCodeFromLitteraCode(null), null);
  assert.equal(groupCodeFromLitteraCode(undefined), null);
});
