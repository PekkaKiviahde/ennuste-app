const COST_HEADER_CONFIG = [
  { name: "Työ €", costType: "LABOR" },
  { name: "Aine €", costType: "MATERIAL" },
  { name: "Alih €", costType: "SUBCONTRACT" },
  { name: "Vmiehet €", costType: "RENTAL" },
  { name: "Muu €", costType: "OTHER" },
  { name: "Summa", costType: "OTHER" },
];

export function parseFiNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const raw = String(value).trim();
  if (!raw) {
    return null;
  }
  let normalized = raw.replace(/\u00a0/g, " ").replace(/ /g, "");
  if (normalized.includes(",") && normalized.includes(".")) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(",", ".");
  }
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

export function buildHeaderLookup(headers) {
  const map = new Map();
  headers.forEach((header) => {
    map.set(String(header || "").trim().toLowerCase(), header);
  });
  return map;
}

export function selectActiveCostHeaders(headerLookup) {
  const hasDetailed = COST_HEADER_CONFIG
    .filter((entry) => entry.name !== "Summa")
    .some((entry) => headerLookup.has(entry.name.toLowerCase()));

  const activeCostHeaders = COST_HEADER_CONFIG.filter((entry) => {
    if (!headerLookup.has(entry.name.toLowerCase())) {
      return false;
    }
    if (hasDetailed && entry.name === "Summa") {
      return false;
    }
    return true;
  });

  return { activeCostHeaders, hasDetailed };
}

export function computeBudgetAggregates({
  lines,
  codeHeader,
  titleHeader,
  activeCostHeaders,
  issueLineIds,
}) {
  const totalsByCostTypeAll = new Map();
  const totalsByCostTypeClean = new Map();
  const totalsByCodeAll = new Map();
  const totalsByCodeClean = new Map();
  const totalsByCodeTypeAll = new Map();
  const totalsByCodeTypeClean = new Map();
  const titlesByCode = new Map();
  const codes = new Set();
  let skippedRows = 0;
  let skippedValues = 0;

  for (const row of lines) {
    const effective = {
      ...(row.raw_json || {}),
      ...(row.edit_json || {}),
    };
    const hasIssue = issueLineIds?.has(row.staging_line_id) || false;
    const code = String(effective[codeHeader] || "").trim();
    if (!code || !/^\d{4}$/.test(code)) {
      skippedRows += 1;
      continue;
    }
    codes.add(code);
    if (titleHeader && !titlesByCode.has(code)) {
      const title = String(effective[titleHeader] || "").trim();
      if (title) {
        titlesByCode.set(code, title);
      }
    }

    let hasAmount = false;
    for (const header of activeCostHeaders) {
      const rawValue = String(effective[header.name] || "").trim();
      if (!rawValue) {
        continue;
      }
      const num = parseFiNumber(rawValue);
      if (num === null || num < 0) {
        skippedValues += 1;
        continue;
      }
      if (num === 0) {
        continue;
      }
      hasAmount = true;
      const costKey = header.costType;
      totalsByCostTypeAll.set(costKey, (totalsByCostTypeAll.get(costKey) || 0) + num);
      totalsByCodeAll.set(code, (totalsByCodeAll.get(code) || 0) + num);
      const lineKey = `${code}:${header.costType}`;
      totalsByCodeTypeAll.set(lineKey, (totalsByCodeTypeAll.get(lineKey) || 0) + num);
      if (!hasIssue) {
        totalsByCostTypeClean.set(costKey, (totalsByCostTypeClean.get(costKey) || 0) + num);
        totalsByCodeClean.set(code, (totalsByCodeClean.get(code) || 0) + num);
        totalsByCodeTypeClean.set(lineKey, (totalsByCodeTypeClean.get(lineKey) || 0) + num);
      }
    }
    if (!hasAmount) {
      skippedRows += 1;
    }
  }

  return {
    totalsByCostTypeAll,
    totalsByCostTypeClean,
    totalsByCodeAll,
    totalsByCodeClean,
    totalsByCodeTypeAll,
    totalsByCodeTypeClean,
    titlesByCode,
    codes,
    skippedRows,
    skippedValues,
  };
}
