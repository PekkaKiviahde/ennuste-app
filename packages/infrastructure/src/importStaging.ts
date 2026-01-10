import { createHash } from "node:crypto";
import type { ImportStagingPort } from "@ennuste/application";
import { AppError, NotFoundError } from "@ennuste/shared";
import {
  buildHeaderLookup,
  computeBudgetAggregates,
  csvEscape,
  parseCsvRows,
  parseFiNumber,
  selectActiveCostHeaders
} from "@ennuste/shared";
import { groupCodeFromLitteraCode } from "@ennuste/domain";
import { dbForTenant } from "./db";

type StagingLineRow = {
  staging_line_id: string;
  row_no: number;
  raw_json: Record<string, unknown>;
  edit_json: Record<string, unknown> | null;
};

export const importStagingRepository = (): ImportStagingPort => ({
  async createBudgetStagingBatch(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const safeName = input.fileName ? input.fileName.replace(/[^\w.\-]/g, "_") : "budget.csv";
    const fileHash = createHash("sha256").update(String(input.csvText)).digest("hex");
    const { headers, rows } = parseCsvRows(String(input.csvText), ";");
    if (headers.length === 0) {
      throw new AppError("CSV-otsikkorivi puuttuu.");
    }

    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    if (!codeHeader) {
      throw new AppError("CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
    if (activeCostHeaders.length === 0) {
      throw new AppError("CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const warnings: string[] = [];
    const dupImport = await tenantDb.query(
      `SELECT 1
       FROM import_batches
       WHERE project_id=$1::uuid AND kind='TARGET_ESTIMATE' AND file_hash=$2
       LIMIT 1`,
      [input.projectId, fileHash]
    );
    if (dupImport.rowCount > 0) {
      warnings.push("Duplikaatti: sama tiedosto on jo importoitu.");
    }
    const dupStaging = await tenantDb.query(
      `SELECT 1
       FROM import_staging_batches
       WHERE project_id=$1::uuid AND import_type='BUDGET' AND signature=$2
       LIMIT 1`,
      [input.projectId, fileHash]
    );
    if (dupStaging.rowCount > 0) {
      warnings.push("Duplikaatti: sama tiedosto on jo stagingissa.");
    }

    const result = await tenantDb.transaction(async (client) => {
      const batchRows = await client.query<{ staging_batch_id: string }>(
        `INSERT INTO import_staging_batches
         (project_id, import_type, source_system, file_name, signature, created_by)
         VALUES ($1, 'BUDGET', 'CSV', $2, $3, $4)
         RETURNING staging_batch_id`,
        [input.projectId, safeName, fileHash, input.importedBy]
      );
      const batchId = batchRows.rows[0].staging_batch_id;

      await client.query(
        `INSERT INTO import_staging_batch_events
         (staging_batch_id, status, message, created_by)
         VALUES ($1, 'DRAFT', 'Staging luotu', $2)`,
        [batchId, input.importedBy]
      );

      let lineCount = 0;
      let issueCount = 0;

      for (let idx = 0; idx < rows.length; idx += 1) {
        const row = rows[idx];
        const raw: Record<string, unknown> = {};
        for (let i = 0; i < headers.length; i += 1) {
          raw[headers[i]] = row[i] ?? "";
        }

        const rowNo = idx + 2;
        const lineRows = await client.query<{ staging_line_id: string }>(
          `INSERT INTO import_staging_lines_raw
           (staging_batch_id, row_no, raw_json, created_by)
           VALUES ($1, $2, $3, $4)
           RETURNING staging_line_id`,
          [batchId, rowNo, raw, input.importedBy]
        );
        lineCount += 1;
        const stagingLineId = lineRows.rows[0].staging_line_id;

        const issues: Array<{ code: string; message: string; severity: string }> = [];
        const codeValue = String(raw[codeHeader] || "").trim();
        if (!codeValue) {
          issues.push({ code: "MISSING_CODE", message: "Litterakoodi puuttuu.", severity: "ERROR" });
        } else if (!/^\d{4}$/.test(codeValue)) {
          issues.push({ code: "INVALID_CODE", message: "Litterakoodi ei ole 4 numeroa.", severity: "ERROR" });
        }

        let hasBudgetValue = false;
        for (const header of activeCostHeaders) {
          const rawValue = String(raw[header.name] || "").trim();
          if (!rawValue) {
            continue;
          }
          hasBudgetValue = true;
          const num = parseFiNumber(rawValue);
          if (num === null) {
            issues.push({ code: "NON_NUMERIC", message: `${header.name} ei ole numero.`, severity: "ERROR" });
            continue;
          }
          if (num < 0) {
            issues.push({ code: "NEGATIVE_VALUE", message: `${header.name} on negatiivinen.`, severity: "ERROR" });
          }
        }

        if (!hasBudgetValue) {
          issues.push({ code: "MISSING_AMOUNT", message: "Kustannusarvo puuttuu.", severity: "ERROR" });
        }

        for (const issue of issues) {
          await client.query(
            `INSERT INTO import_staging_issues
             (staging_line_id, issue_code, issue_message, severity, created_by)
             VALUES ($1, $2, $3, $4, $5)`,
            [stagingLineId, issue.code, issue.message, issue.severity, input.importedBy]
          );
          issueCount += 1;
        }
      }

      return { batchId, lineCount, issueCount };
    });

    return {
      stagingBatchId: result.batchId,
      lineCount: result.lineCount,
      issueCount: result.issueCount,
      warnings
    };
  },

  async listBatches(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      `SELECT b.staging_batch_id,
              b.project_id,
              b.import_type,
              b.source_system,
              b.file_name,
              b.signature,
              b.created_at,
              b.created_by,
              (
                SELECT status
                FROM import_staging_batch_events e
                WHERE e.staging_batch_id=b.staging_batch_id
                ORDER BY e.created_at DESC
                LIMIT 1
              ) AS status,
              (
                SELECT count(*)::int
                FROM import_staging_issues i
                JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
                WHERE l.staging_batch_id=b.staging_batch_id
              ) AS issue_count
       FROM import_staging_batches b
       WHERE b.project_id=$1::uuid
       ORDER BY b.created_at DESC`,
      [projectId]
    );
    return result.rows;
  },

  async listLines(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const batchRows = await tenantDb.query<{ project_id: string }>(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [input.batchId]
    );
    if (batchRows.rowCount === 0 || batchRows.rows[0].project_id !== input.projectId) {
      throw new NotFoundError("Staging-batchia ei loydy.");
    }

    const lineRows = await tenantDb.query<StagingLineRow>(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [input.batchId]
    );

    const issueLineRowsAll = await tenantDb.query<{ staging_line_id: string }>(
      `SELECT DISTINCT l.staging_line_id
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1`,
      [input.batchId]
    );
    const issueLineIdsAll = new Set(issueLineRowsAll.rows.map((row) => row.staging_line_id));

    const issueParams: unknown[] = [input.batchId];
    let severitySql = "";
    if (input.severity) {
      issueParams.push(input.severity);
      severitySql = " AND i.severity=$2";
    }

    const issueRows = await tenantDb.query<{
      staging_line_id: string;
      issue_code: string;
      issue_message: string | null;
      severity: string;
      created_at: string;
    }>(
      `SELECT i.staging_line_id,
              i.issue_code,
              i.issue_message,
              i.severity,
              i.created_at
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1${severitySql}
       ORDER BY l.row_no ASC, i.created_at ASC`,
      issueParams
    );

    const issuesByLine = new Map<string, typeof issueRows.rows>();
    for (const issue of issueRows.rows) {
      if (!issuesByLine.has(issue.staging_line_id)) {
        issuesByLine.set(issue.staging_line_id, []);
      }
      issuesByLine.get(issue.staging_line_id)?.push(issue);
    }

    const filtered = lineRows.rows.filter((line) => {
      if (input.mode === "all") {
        return true;
      }
      if (input.mode === "clean") {
        return !issueLineIdsAll.has(line.staging_line_id);
      }
      return issuesByLine.has(line.staging_line_id);
    });

    return {
      lines: filtered.map((line) => ({
        staging_line_id: line.staging_line_id,
        row_no: line.row_no,
        raw_json: line.raw_json,
        edit_json: line.edit_json ?? null,
        issues: issuesByLine.get(line.staging_line_id) || []
      }))
    };
  },

  async editLine(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const lineRows = await tenantDb.query<{ project_id: string }>(
      `SELECT b.project_id
       FROM import_staging_lines_raw l
       JOIN import_staging_batches b ON b.staging_batch_id=l.staging_batch_id
       WHERE l.staging_line_id=$1`,
      [input.lineId]
    );
    if (lineRows.rowCount === 0 || lineRows.rows[0].project_id !== input.projectId) {
      throw new NotFoundError("Staging-rivia ei loydy.");
    }

    const result = await tenantDb.query<{ staging_line_edit_id: string }>(
      `INSERT INTO import_staging_line_edits
       (staging_line_id, edit_json, reason, edited_by)
       VALUES ($1, $2, $3, $4)
       RETURNING staging_line_edit_id`,
      [input.lineId, input.edit, input.reason ?? null, input.editedBy]
    );
    return { stagingLineEditId: result.rows[0].staging_line_edit_id };
  },

  async addBatchEvent(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const batchRows = await tenantDb.query<{ project_id: string }>(
      "SELECT project_id FROM import_staging_batches WHERE staging_batch_id=$1",
      [input.batchId]
    );
    if (batchRows.rowCount === 0 || batchRows.rows[0].project_id !== input.projectId) {
      throw new NotFoundError("Staging-batchia ei loydy.");
    }

    const result = await tenantDb.query<{ staging_batch_event_id: string }>(
      `INSERT INTO import_staging_batch_events
       (staging_batch_id, status, message, created_by)
       VALUES ($1, $2, $3, $4)
       RETURNING staging_batch_event_id`,
      [input.batchId, input.status, input.message ?? null, input.actor]
    );
    return { stagingBatchEventId: result.rows[0].staging_batch_event_id };
  },

  async getSummary(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const batchRows = await tenantDb.query<{ project_id: string; import_type: string }>(
      `SELECT project_id, import_type
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [input.batchId]
    );
    const batch = batchRows.rows[0];
    if (!batch || batch.project_id !== input.projectId) {
      throw new NotFoundError("Staging-batchia ei loydy.");
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      throw new AppError("Vain BUDGET staging voidaan esikatsella.");
    }

    const issueRows = await tenantDb.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1 AND i.severity='ERROR'`,
      [input.batchId]
    );
    const errorCount = issueRows.rows[0]?.cnt || 0;

    const issueLineRows = await tenantDb.query<{ staging_line_id: string }>(
      `SELECT DISTINCT l.staging_line_id
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1`,
      [input.batchId]
    );
    const issueLineIds = new Set(issueLineRows.rows.map((row) => row.staging_line_id));

    const lineRows = await tenantDb.query<StagingLineRow>(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [input.batchId]
    );
    if (lineRows.rowCount === 0) {
      throw new AppError("Staging-batchissa ei ole riveja.");
    }

    const headers = Object.keys(lineRows.rows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      throw new AppError("CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
    if (activeCostHeaders.length === 0) {
      throw new AppError("CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows.rows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds
    });

    const totalsByCostType: Record<string, number> = {};
    for (const [key, value] of aggregates.totalsByCostTypeClean.entries()) {
      totalsByCostType[key] = value;
    }
    const totalsByCostTypeAll: Record<string, number> = {};
    for (const [key, value] of aggregates.totalsByCostTypeAll.entries()) {
      totalsByCostTypeAll[key] = value;
    }

    const topCodes = [...aggregates.totalsByCodeClean.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([code, total]) => ({
        code,
        title: aggregates.titlesByCode.get(code) || null,
        total
      }));
    const topLines = [...aggregates.totalsByCodeTypeClean.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, total]) => {
        const [code, costType] = key.split(":");
        return {
          code,
          title: aggregates.titlesByCode.get(code) || null,
          cost_type: costType,
          total
        };
      });

    return {
      staging_batch_id: input.batchId,
      line_count: lineRows.rowCount,
      skipped_rows: aggregates.skippedRows,
      skipped_values: aggregates.skippedValues,
      error_issues: errorCount,
      codes_count: aggregates.codes.size,
      totals_by_cost_type: totalsByCostType,
      totals_by_cost_type_all: totalsByCostTypeAll,
      top_codes: topCodes,
      top_lines: topLines
    };
  },

  async commitBatch(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const batchRows = await tenantDb.query<{
      project_id: string;
      import_type: string;
      signature: string | null;
      file_name: string | null;
    }>(
      `SELECT project_id, import_type, signature, file_name
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [input.batchId]
    );
    const batch = batchRows.rows[0];
    if (!batch || batch.project_id !== input.projectId) {
      throw new NotFoundError("Staging-batchia ei loydy.");
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      throw new AppError("Vain BUDGET staging voidaan siirtaa.");
    }

    const statusRows = await tenantDb.query<{ status: string }>(
      `SELECT status
       FROM import_staging_batch_events
       WHERE staging_batch_id=$1
       ORDER BY created_at DESC
       LIMIT 1`,
      [input.batchId]
    );
    const latestStatus = statusRows.rows[0]?.status || null;
    if (latestStatus !== "APPROVED") {
      throw new AppError("Staging-batch ei ole hyvaksytty.");
    }

    const issueRows = await tenantDb.query<{ cnt: number }>(
      `SELECT count(*)::int AS cnt
       FROM import_staging_issues i
       JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
       WHERE l.staging_batch_id=$1 AND i.severity='ERROR'`,
      [input.batchId]
    );
    const errorCount = issueRows.rows[0]?.cnt || 0;
    if (errorCount > 0 && !input.force) {
      throw new AppError("Staging-batchissa on ERROR-issueita. Korjaa tai kayta force=true.");
    }

    const lineRows = await tenantDb.query<StagingLineRow>(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [input.batchId]
    );
    if (lineRows.rowCount === 0) {
      throw new AppError("Staging-batchissa ei ole riveja.");
    }

    const headers = Object.keys(lineRows.rows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      throw new AppError("CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
    if (activeCostHeaders.length === 0) {
      throw new AppError("CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows.rows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds: new Set()
    });

    if (aggregates.totalsByCodeTypeAll.size === 0) {
      throw new AppError("Ei kelvollisia kustannusriveja siirtoon.");
    }

    const result = await tenantDb.transaction(async (client) => {
      if (!input.allowDuplicate && batch.signature) {
        const dupRows = await client.query(
          `SELECT 1
           FROM import_batches
           WHERE project_id=$1::uuid AND kind='TARGET_ESTIMATE' AND file_hash=$2
           LIMIT 1`,
          [input.projectId, batch.signature]
        );
        if (dupRows.rowCount > 0) {
          throw new AppError("Tama tiedosto on jo importattu (file_hash).");
        }
      }

      const codes = [...aggregates.codes.values()];
      for (const code of codes) {
        const title = aggregates.titlesByCode.get(code) || null;
        const groupCode = groupCodeFromLitteraCode(code);
        await client.query(
          `INSERT INTO litteras (project_id, code, title, group_code)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (project_id, code) DO NOTHING`,
          [input.projectId, code, title, groupCode]
        );
      }

      const litteraRows = await client.query<{ code: string; littera_id: string }>(
        `SELECT code, littera_id
         FROM litteras
         WHERE project_id=$1::uuid AND code = ANY($2)`,
        [input.projectId, codes]
      );
      const litteraByCode = new Map(litteraRows.rows.map((row) => [row.code, row.littera_id]));

      const batchInsertRows = await client.query<{ id: string }>(
        `INSERT INTO import_batches
         (project_id, kind, source_system, file_name, file_hash, created_by)
         VALUES ($1, 'TARGET_ESTIMATE', $2, $3, $4, $5)
         RETURNING id`,
        [input.projectId, "CSV", batch.file_name || "budget.csv", batch.signature, input.committedBy]
      );
      const importBatchId = batchInsertRows.rows[0].id;

      let inserted = 0;
      for (const [key, amount] of aggregates.totalsByCodeTypeAll.entries()) {
        const [code, costType] = key.split(":");
        const litteraId = litteraByCode.get(code);
        if (!litteraId) {
          continue;
        }
        await client.query(
          `INSERT INTO budget_lines
           (project_id, target_littera_id, cost_type, amount, source, import_batch_id, created_by)
           VALUES ($1, $2, $3::cost_type, $4, 'IMPORT'::budget_source, $5, $6)`,
          [input.projectId, litteraId, costType, amount, importBatchId, input.committedBy]
        );
        inserted += 1;
      }

      await client.query(
        `INSERT INTO import_staging_batch_events
         (staging_batch_id, status, message, created_by)
         VALUES ($1, 'COMMITTED', $2, $3)`,
        [input.batchId, input.message ?? "Siirretty budget_lines-tauluun", input.committedBy]
      );

      return { importBatchId, inserted };
    });

    return {
      importBatchId: result.importBatchId,
      insertedRows: result.inserted,
      skippedRows: aggregates.skippedRows,
      skippedValues: aggregates.skippedValues,
      errorIssues: errorCount
    };
  },

  async exportBatch(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);

    const batchRows = await tenantDb.query<{ project_id: string; import_type: string }>(
      `SELECT project_id, import_type
       FROM import_staging_batches
       WHERE staging_batch_id=$1`,
      [input.batchId]
    );
    const batch = batchRows.rows[0];
    if (!batch || batch.project_id !== input.projectId) {
      throw new NotFoundError("Staging-batchia ei loydy.");
    }
    if (String(batch.import_type).toUpperCase() !== "BUDGET") {
      throw new AppError("Vain BUDGET staging voidaan exportata.");
    }

    const lineRows = await tenantDb.query<StagingLineRow>(
      `SELECT l.staging_line_id,
              l.row_no,
              l.raw_json,
              (
                SELECT e.edit_json
                FROM import_staging_line_edits e
                WHERE e.staging_line_id=l.staging_line_id
                ORDER BY e.edited_at DESC
                LIMIT 1
              ) AS edit_json
       FROM import_staging_lines_raw l
       WHERE l.staging_batch_id=$1
       ORDER BY l.row_no ASC`,
      [input.batchId]
    );
    if (lineRows.rowCount === 0) {
      throw new AppError("Staging-batchissa ei ole riveja.");
    }

    let issueLineIds = new Set<string>();
    if (input.mode === "clean") {
      const issueLineRows = await tenantDb.query<{ staging_line_id: string }>(
        `SELECT DISTINCT l.staging_line_id
         FROM import_staging_issues i
         JOIN import_staging_lines_raw l ON l.staging_line_id=i.staging_line_id
         WHERE l.staging_batch_id=$1`,
        [input.batchId]
      );
      issueLineIds = new Set(issueLineRows.rows.map((row) => row.staging_line_id));
    }

    const headers = Object.keys(lineRows.rows[0].raw_json || {});
    const headerLookup = buildHeaderLookup(headers);
    const codeHeader = headerLookup.get("litterakoodi");
    const titleHeader = headerLookup.get("litteraselite");
    if (!codeHeader) {
      throw new AppError("CSV: Litterakoodi-sarake puuttuu.");
    }

    const { activeCostHeaders } = selectActiveCostHeaders(headerLookup);
    if (activeCostHeaders.length === 0) {
      throw new AppError("CSV: kustannussarakkeet puuttuvat (Työ/Aine/Alih/Vmiehet/Muu/Summa).");
    }

    const aggregates = computeBudgetAggregates({
      lines: lineRows.rows,
      codeHeader,
      titleHeader,
      activeCostHeaders,
      issueLineIds
    });

    const totalsMap =
      input.mode === "clean" ? aggregates.totalsByCodeTypeClean : aggregates.totalsByCodeTypeAll;
    if (totalsMap.size === 0) {
      throw new AppError("Ei kelvollisia riveja exportiin.");
    }

    const perCode = new Map<string, { LABOR: number; MATERIAL: number; SUBCONTRACT: number; RENTAL: number; OTHER: number }>();
    for (const [key, amount] of totalsMap.entries()) {
      const [code, costType] = key.split(":");
      if (!perCode.has(code)) {
        perCode.set(code, { LABOR: 0, MATERIAL: 0, SUBCONTRACT: 0, RENTAL: 0, OTHER: 0 });
      }
      const entry = perCode.get(code)!;
      entry[costType as keyof typeof entry] = amount;
    }

    const header = ["Litterakoodi", "Litteraselite", "Työ €", "Aine €", "Alih €", "Vmiehet €", "Muu €"];
    const lines = [header.join(";")];
    const sortedCodes = [...perCode.keys()].sort();
    for (const code of sortedCodes) {
      const row = perCode.get(code)!;
      const title = aggregates.titlesByCode.get(code) || "";
      lines.push(
        [code, title, row.LABOR, row.MATERIAL, row.SUBCONTRACT, row.RENTAL, row.OTHER]
          .map((value) => csvEscape(value))
          .join(";")
      );
    }

    return {
      fileName: `budget-staging-${input.batchId}-${input.mode}.csv`,
      csv: `${lines.join("\n")}\n`
    };
  }
});
