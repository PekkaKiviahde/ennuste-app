import { test } from "node:test";
import assert from "node:assert/strict";
import { calculateWorkPhaseKpi } from "./workPhase";

test("calculateWorkPhaseKpi returns nulls when BAC or percent missing", () => {
  const result = calculateWorkPhaseKpi({
    bacTotal: null,
    percentComplete: 50,
    acTotal: 100,
    ghostOpenTotal: 10
  });

  assert.deepEqual(result, { evValue: null, acStarTotal: null, cpi: null });
});

test("calculateWorkPhaseKpi computes EV, AC* and CPI", () => {
  const result = calculateWorkPhaseKpi({
    bacTotal: 1000,
    percentComplete: 25,
    acTotal: 150,
    ghostOpenTotal: 50
  });

  assert.equal(result.evValue, 250);
  assert.equal(result.acStarTotal, 200);
  assert.equal(result.cpi, 1.25);
});

test("calculateWorkPhaseKpi keeps CPI null when AC* is zero", () => {
  const result = calculateWorkPhaseKpi({
    bacTotal: 1000,
    percentComplete: 50,
    acTotal: 0,
    ghostOpenTotal: 0
  });

  assert.equal(result.evValue, 500);
  assert.equal(result.acStarTotal, 0);
  assert.equal(result.cpi, null);
});
