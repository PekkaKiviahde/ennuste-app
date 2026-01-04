import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHeaderLookup,
  computeBudgetAggregates,
  parseFiNumber,
  selectActiveCostHeaders,
} from "../import-staging.js";

test("parseFiNumber handles Finnish number formats", () => {
  assert.equal(parseFiNumber("1 234,56"), 1234.56);
  assert.equal(parseFiNumber("1.234,00"), 1234);
  assert.equal(parseFiNumber("10"), 10);
  assert.equal(parseFiNumber(""), null);
  assert.equal(parseFiNumber("abc"), null);
});

test("selectActiveCostHeaders prefers detailed columns over Summa", () => {
  const withDetailed = buildHeaderLookup(["Litterakoodi", "Työ €", "Summa"]);
  const detailed = selectActiveCostHeaders(withDetailed);
  assert.equal(detailed.activeCostHeaders.length, 1);
  assert.equal(detailed.activeCostHeaders[0].name, "Työ €");

  const withOnlySumma = buildHeaderLookup(["Litterakoodi", "Summa"]);
  const onlySumma = selectActiveCostHeaders(withOnlySumma);
  assert.equal(onlySumma.activeCostHeaders.length, 1);
  assert.equal(onlySumma.activeCostHeaders[0].name, "Summa");
});

test("computeBudgetAggregates sums clean and all lines separately", () => {
  const headers = ["Litterakoodi", "Litteraselite", "Työ €", "Aine €"];
  const headerLookup = buildHeaderLookup(headers);
  const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
  const issueLineIds = new Set(["line-2"]);

  const lines = [
    {
      staging_line_id: "line-1",
      raw_json: {
        Litterakoodi: "0100",
        Litteraselite: "Kaivuu",
        "Työ €": "100",
        "Aine €": "50",
      },
    },
    {
      staging_line_id: "line-2",
      raw_json: {
        Litterakoodi: "0200",
        Litteraselite: "Runko",
        "Työ €": "200",
      },
    },
    {
      staging_line_id: "line-3",
      raw_json: {
        Litterakoodi: "",
        "Työ €": "10",
      },
    },
    {
      staging_line_id: "line-4",
      raw_json: {
        Litterakoodi: "0300",
        "Työ €": "-10",
      },
    },
  ];

  const aggregates = computeBudgetAggregates({
    lines,
    codeHeader: "Litterakoodi",
    titleHeader: "Litteraselite",
    activeCostHeaders,
    issueLineIds,
  });

  assert.equal(aggregates.totalsByCostTypeAll.get("LABOR"), 300);
  assert.equal(aggregates.totalsByCostTypeAll.get("MATERIAL"), 50);
  assert.equal(aggregates.totalsByCostTypeClean.get("LABOR"), 100);
  assert.equal(aggregates.totalsByCostTypeClean.get("MATERIAL"), 50);
  assert.equal(aggregates.totalsByCodeAll.get("0100"), 150);
  assert.equal(aggregates.totalsByCodeAll.get("0200"), 200);
  assert.equal(aggregates.totalsByCodeClean.get("0100"), 150);
  assert.equal(aggregates.totalsByCodeClean.get("0200"), undefined);
  assert.equal(aggregates.titlesByCode.get("0100"), "Kaivuu");
  assert.equal(aggregates.titlesByCode.get("0200"), "Runko");
  assert.equal(aggregates.skippedRows, 2);
  assert.equal(aggregates.skippedValues, 1);
});
