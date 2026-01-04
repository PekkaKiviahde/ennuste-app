export type CostType = "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";

export type StagingLine = {
  staging_line_id: string;
  raw_json: Record<string, unknown>;
  edit_json?: Record<string, unknown> | null;
};

export type CostHeader = { name: string; costType: CostType };

const COST_HEADER_CONFIG: CostHeader[] = [
  { name: "Työ €", costType: "LABOR" },
  { name: "Aine €", costType: "MATERIAL" },
  { name: "Alih €", costType: "SUBCONTRACT" },
  { name: "Vmiehet €", costType: "RENTAL" },
  { name: "Muu €", costType: "OTHER" },
  { name: "Summa", costType: "OTHER" }
];

export const parseFiNumber = (value: unknown): number | null => {
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
  const num = Number(normalized);
  return Number.isFinite(num) ? num : null;
};

export const csvEscape = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  if (/[",\n]/.test(escaped)) {
    return `"${escaped}"`;
  }
  return escaped;
};

export const parseCsvRows = (text: string, delimiter = ";"): { headers: string[]; rows: string[][] } => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === "\"") {
        if (text[i + 1] === "\"") {
          field += "\"";
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === "\"") {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = "";
      continue;
    }
    if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }
    if (ch === "\r") {
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  if (rows.length === 0) {
    return { headers: [], rows: [] };
  }

  const headerRow = rows.shift() || [];
  const headers = headerRow.map((value, idx) => {
    let clean = String(value || "").trim();
    if (idx === 0 && clean.startsWith("\ufeff")) {
      clean = clean.slice(1);
    }
    return clean;
  });

  const dataRows = rows.filter((r) => r.some((value) => String(value || "").trim() !== ""));
  return { headers, rows: dataRows };
};

export const buildHeaderLookup = (headers: string[]): Map<string, string> => {
  const map = new Map<string, string>();
  headers.forEach((header) => {
    map.set(String(header || "").trim().toLowerCase(), header);
  });
  return map;
};

export const selectActiveCostHeaders = (
  headerLookup: Map<string, string>
): { activeCostHeaders: CostHeader[]; hasDetailed: boolean } => {
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
};

export type BudgetAggregates = {
  totalsByCostTypeAll: Map<CostType, number>;
  totalsByCostTypeClean: Map<CostType, number>;
  totalsByCodeAll: Map<string, number>;
  totalsByCodeClean: Map<string, number>;
  totalsByCodeTypeAll: Map<string, number>;
  totalsByCodeTypeClean: Map<string, number>;
  titlesByCode: Map<string, string>;
  codes: Set<string>;
  skippedRows: number;
  skippedValues: number;
};

export const computeBudgetAggregates = ({
  lines,
  codeHeader,
  titleHeader,
  activeCostHeaders,
  issueLineIds
}: {
  lines: StagingLine[];
  codeHeader: string;
  titleHeader?: string | null;
  activeCostHeaders: CostHeader[];
  issueLineIds?: Set<string>;
}): BudgetAggregates => {
  const totalsByCostTypeAll = new Map<CostType, number>();
  const totalsByCostTypeClean = new Map<CostType, number>();
  const totalsByCodeAll = new Map<string, number>();
  const totalsByCodeClean = new Map<string, number>();
  const totalsByCodeTypeAll = new Map<string, number>();
  const totalsByCodeTypeClean = new Map<string, number>();
  const titlesByCode = new Map<string, string>();
  const codes = new Set<string>();
  let skippedRows = 0;
  let skippedValues = 0;

  for (const row of lines) {
    const effective = {
      ...(row.raw_json || {}),
      ...(row.edit_json || {})
    };
    const hasIssue = issueLineIds?.has(row.staging_line_id) || false;
    const code = String((effective as Record<string, unknown>)[codeHeader] || "").trim();
    if (!code || !/^\d{4}$/.test(code)) {
      skippedRows += 1;
      continue;
    }
    codes.add(code);
    if (titleHeader && !titlesByCode.has(code)) {
      const title = String((effective as Record<string, unknown>)[titleHeader] || "").trim();
      if (title) {
        titlesByCode.set(code, title);
      }
    }

    let hasAmount = false;
    for (const header of activeCostHeaders) {
      const rawValue = String((effective as Record<string, unknown>)[header.name] || "").trim();
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
    skippedValues
  };
};
