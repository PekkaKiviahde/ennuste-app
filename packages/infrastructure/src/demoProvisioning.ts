import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { PoolClient } from "pg";
import { AppError } from "@ennuste/shared";

type CostType = "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
type AllocationRule = "FULL" | "PERCENT";

type DemoExport = {
  workPackages: Array<{ code: string; name: string }>;
  procPackages?: Array<{ code: string; name: string; defaultWorkPackageCode?: string | null }>;
  litteras: Array<{ code: string; title?: string | null }>;
  budgetLines: Array<{ code: string; title?: string | null; costs: Partial<Record<CostType, number>> }>;
  targetEstimateItems?: Array<{
    itemCode?: string | null;
    litteraCode: string;
    description?: string | null;
    qty?: number | null;
    unit?: string | null;
    sumEur?: number | null;
    breakdown?: Record<string, number>;
  }>;
  itemMappings?: Array<{ itemCode?: string | null; workPackageCode: string; procPackageCode?: string | null }>;
  mappingLines?: Array<{
    workCode: string;
    targetCode: string;
    allocationRule: AllocationRule;
    allocationValue: number;
    costType: CostType | null;
  }>;
  actuals?: Array<{
    postingDate: string;
    amountEur: number;
    account?: string | null;
    costCenter?: string | null;
    vendor?: string | null;
    invoiceNo?: string | null;
    description?: string | null;
    litteraCode: string;
  }>;
  actualsMappingRules?: Array<{
    match: Record<string, unknown>;
    workPackageCode: string;
    procPackageCode?: string | null;
    priority?: number | null;
  }>;
  planningEvents?: Array<{
    targetCode: string;
    status: string;
    summary?: string | null;
    observations?: string | null;
    risks?: string | null;
    decisions?: string | null;
    createdBy?: string | null;
  }>;
  forecastEvents?: Array<{
    targetCode: string;
    mappingVersionCode?: string | null;
    comment?: string | null;
    technicalProgress?: number | null;
    financialProgress?: number | null;
    createdBy?: string | null;
    lines: Array<{
      costType: CostType;
      forecastValue: number;
      memoGeneral?: string | null;
      memoProcurement?: string | null;
      memoCalculation?: string | null;
    }>;
  }>;
};

const hashPayload = (seedKey: string, label: string, payload: unknown) =>
  crypto.createHash("sha256").update(`${seedKey}:${label}:${JSON.stringify(payload)}`, "utf8").digest("hex");

const costTypeOrder: CostType[] = ["LABOR", "MATERIAL", "SUBCONTRACT", "RENTAL", "OTHER"];

// Hash payload sisältää sekä targetEstimateItems että budgetLines → budjettimuutos ei jää vanhaan batchiin onboarding-uusintajossa.
const buildTargetEstimateHashPayload = (data: DemoExport) => {
  const normalizeBreakdown = (breakdown: Record<string, number> | undefined | null) =>
    Object.entries(breakdown ?? {})
      .map(([key, value]) => ({ key, value: Number(value) }))
      .filter((entry) => Number.isFinite(entry.value))
      .sort((a, b) => a.key.localeCompare(b.key));

  const items = (data.targetEstimateItems ?? [])
    .map((item) => ({
      itemCode: item.itemCode ?? null,
      litteraCode: item.litteraCode,
      qty: item.qty ?? null,
      unit: item.unit ?? null,
      sumEur: item.sumEur ?? null,
      breakdown: normalizeBreakdown(item.breakdown)
    }))
    .sort((a, b) => `${a.litteraCode}:${a.itemCode ?? ""}`.localeCompare(`${b.litteraCode}:${b.itemCode ?? ""}`));

  const budgetLines = (data.budgetLines ?? [])
    .flatMap((line) => {
      const costs = line.costs ?? {};
      return costTypeOrder
        .map((costType) => ({ code: line.code, costType, amount: Number(costs[costType]) }))
        .filter((row) => Number.isFinite(row.amount));
    })
    .sort((a, b) =>
      a.code === b.code
        ? costTypeOrder.indexOf(a.costType) - costTypeOrder.indexOf(b.costType)
        : a.code.localeCompare(b.code)
    );

  return { items, budgetLines };
};

const resolveDemoDataFile = (seedKey: string) => {
  const findFrom = (startDir: string): string | null => {
    let current = startDir;
    while (true) {
      const candidate = path.resolve(current, seedKey, "data.json");
      if (fs.existsSync(candidate)) {
        return candidate;
      }
      const parent = path.dirname(current);
      if (parent === current) {
        return null;
      }
      current = parent;
    }
  };

  for (const root of [process.cwd(), __dirname]) {
    const found = findFrom(root);
    if (found) {
      return found;
    }
  }
  throw new AppError(`Demo-export ${seedKey} puuttuu (data.json ei löydy).`);
};

const loadDemoExport = (seedKey: string): DemoExport => {
  const filePath = resolveDemoDataFile(seedKey);
  const raw = fs.readFileSync(filePath, "utf8");
  const parsed = JSON.parse(raw);
  if (!parsed || typeof parsed !== "object") {
    throw new AppError(`Demo-export ${seedKey} on virheellinen JSON.`);
  }
  const data = parsed as DemoExport;
  if (!Array.isArray(data.workPackages) || data.workPackages.length === 0) {
    throw new AppError(`Demo-export ${seedKey} ei sisällä workPackages-listaa.`);
  }
  if (!Array.isArray(data.litteras) || data.litteras.length === 0) {
    throw new AppError(`Demo-export ${seedKey} ei sisällä litteras-listaa.`);
  }
  if (!Array.isArray(data.budgetLines) || data.budgetLines.length === 0) {
    throw new AppError(`Demo-export ${seedKey} ei sisällä budgetLines-listaa.`);
  }
  return data;
};

const ensureProjectFlags = async (client: PoolClient, projectId: string, seedKey: string) => {
  await client.query(
    "UPDATE projects SET is_demo = true, project_details = COALESCE(project_details, '{}'::jsonb) || $1::jsonb WHERE project_id = $2::uuid",
    [JSON.stringify({ demo: true, demo_seed_key: seedKey }), projectId]
  );
};

const ensureLitteras = async (client: PoolClient, projectId: string, data: DemoExport, actor: string) => {
  const map = new Map<string, string>();
  for (const entry of data.litteras) {
    const code = String(entry.code).trim();
    if (!/^\d{4}$/.test(code)) {
      throw new AppError(`Littera ${code} ei ole 4-numeroa (seed).`);
    }
    const existing = await client.query<{ littera_id: string }>(
      "SELECT littera_id FROM litteras WHERE project_id = $1::uuid AND code = $2",
      [projectId, code]
    );
    if (existing.rowCount === 0) {
      const inserted = await client.query<{ littera_id: string }>(
        "INSERT INTO litteras (project_id, code, title, created_by) VALUES ($1::uuid, $2, $3, $4) RETURNING littera_id",
        [projectId, code, entry.title ?? null, actor]
      );
      map.set(code, inserted.rows[0].littera_id);
    } else {
      map.set(code, existing.rows[0].littera_id);
    }
  }
  return map;
};

const ensureWorkPackages = async (client: PoolClient, projectId: string, data: DemoExport, actor: string) => {
  const map = new Map<string, string>();
  for (const wp of data.workPackages) {
    const code = String(wp.code).trim();
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM work_packages WHERE project_id = $1::uuid AND code = $2",
      [projectId, code]
    );
    if (existing.rowCount === 0) {
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO work_packages (project_id, code, name, status, created_at) VALUES ($1::uuid, $2, $3, 'ACTIVE', now()) RETURNING id",
        [projectId, code, wp.name]
      );
      map.set(code, inserted.rows[0].id);
    } else {
      map.set(code, existing.rows[0].id);
    }
  }
  return map;
};

const ensureProcPackages = async (
  client: PoolClient,
  projectId: string,
  data: DemoExport,
  workPackageIds: Map<string, string>
) => {
  const map = new Map<string, string>();
  for (const proc of data.procPackages ?? []) {
    const code = String(proc.code).trim();
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM proc_packages WHERE project_id = $1::uuid AND code = $2",
      [projectId, code]
    );
    const defaultWorkPackageCode = String(proc.defaultWorkPackageCode ?? "").trim();
    if (!defaultWorkPackageCode) {
      throw new AppError(
        `Demo-exportin hankintapaketilta ${code} puuttuu defaultWorkPackageCode (1:1 MVP).`
      );
    }
    const defaultWorkPackageId = workPackageIds.get(defaultWorkPackageCode) ?? null;
    if (!defaultWorkPackageId) {
      throw new AppError(
        `Demo-exportin hankintapaketin ${code} defaultWorkPackageCode ${defaultWorkPackageCode} ei loydy workPackages-listasta.`
      );
    }
    if (existing.rowCount === 0) {
      const existingLinked = await client.query<{ id: string; code: string }>(
        `SELECT id, code
         FROM proc_packages
         WHERE project_id = $1::uuid
           AND default_work_package_id = $2::uuid
         LIMIT 1`,
        [projectId, defaultWorkPackageId]
      );
      if (existingLinked.rowCount > 0) {
        throw new AppError(
          `Tyopaketilla ${defaultWorkPackageCode} on jo hankintapaketti ${existingLinked.rows[0].code} (1:1 MVP).`
        );
      }
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO proc_packages (
          project_id, code, name, owner_type, vendor_name, contract_ref, default_work_package_id, status
        ) VALUES ($1::uuid, $2, $3, 'VENDOR', 'Demo export', 'DEMO-EXPORT', $4::uuid, 'ACTIVE')
        RETURNING id`,
        [projectId, code, proc.name, defaultWorkPackageId]
      );
      map.set(code, inserted.rows[0].id);
    } else {
      map.set(code, existing.rows[0].id);
    }
  }
  return map;
};

const ensureImportBatch = async (
  client: PoolClient,
  projectId: string,
  kind: "TARGET_ESTIMATE" | "ACTUALS",
  seedKey: string,
  label: string,
  payload: unknown,
  actor: string
) => {
  const fileHash = hashPayload(seedKey, label, payload);
  const existing = await client.query<{ id: string }>(
    "SELECT id FROM import_batches WHERE project_id = $1::uuid AND kind = $2 AND file_hash = $3 LIMIT 1",
    [projectId, kind, fileHash]
  );
  if (existing.rowCount > 0) {
    return existing.rows[0].id;
  }
  const inserted = await client.query<{ id: string }>(
    "INSERT INTO import_batches (project_id, kind, source_system, file_name, file_hash, created_by) VALUES ($1::uuid, $2, $3, $4, $5, $6) RETURNING id",
    [projectId, kind, "DEMO_EXPORT", `${seedKey}/${label}.json`, fileHash, actor]
  );
  return inserted.rows[0].id;
};

const ensureTargetEstimateItems = async (
  client: PoolClient,
  importBatchId: string,
  items: NonNullable<DemoExport["targetEstimateItems"]>
) => {
  const map = new Map<string, string>();
  for (const item of items) {
    const itemCode = item.itemCode ?? null;
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM target_estimate_items WHERE import_batch_id = $1::uuid AND item_code IS NOT DISTINCT FROM $2 AND littera_code = $3 LIMIT 1",
      [importBatchId, itemCode, item.litteraCode]
    );
    if (existing.rowCount === 0) {
      const inserted = await client.query<{ id: string }>(
        `INSERT INTO target_estimate_items (
          import_batch_id,
          item_code,
          littera_code,
          description,
          qty,
          unit,
          sum_eur,
          cost_breakdown_json,
          row_type
        ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7, $8::jsonb, 'LEAF')
        RETURNING id`,
        [
          importBatchId,
          itemCode,
          item.litteraCode,
          item.description ?? null,
          item.qty ?? null,
          item.unit ?? null,
          item.sumEur ?? null,
          JSON.stringify(item.breakdown ?? {})
        ]
      );
      map.set(itemCode ?? item.litteraCode, inserted.rows[0].id);
    } else {
      map.set(itemCode ?? item.litteraCode, existing.rows[0].id);
    }
  }
  return map;
};

const ensureItemMappings = async (
  client: PoolClient,
  projectId: string,
  importBatchId: string,
  data: DemoExport,
  targetItemIds: Map<string, string>,
  workPackageIds: Map<string, string>,
  procPackageIds: Map<string, string>,
  actor: string
) => {
  if (!data.itemMappings || data.itemMappings.length === 0) {
    return;
  }
  const existingVersion = await client.query<{ id: string }>(
    "SELECT id FROM item_mapping_versions WHERE project_id = $1::uuid AND import_batch_id = $2::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
    [projectId, importBatchId]
  );
  let versionId = existingVersion.rows[0]?.id;
  if (!versionId) {
    const inserted = await client.query<{ id: string }>(
      "INSERT INTO item_mapping_versions (project_id, import_batch_id, status, created_by, activated_at) VALUES ($1::uuid, $2::uuid, 'ACTIVE', $3, now()) RETURNING id",
      [projectId, importBatchId, actor]
    );
    versionId = inserted.rows[0].id;
  }

  for (const mapping of data.itemMappings) {
    const itemKey = mapping.itemCode ?? null;
    const targetId = itemKey ? targetItemIds.get(itemKey) : null;
    if (!targetId) {
      continue;
    }
    const workPackageId = workPackageIds.get(mapping.workPackageCode) ?? null;
    const procPackageId = mapping.procPackageCode ? procPackageIds.get(mapping.procPackageCode) ?? null : null;
    await client.query(
      `INSERT INTO item_row_mappings (
        item_mapping_version_id,
        target_estimate_item_id,
        work_package_id,
        proc_package_id,
        created_by
      )
      SELECT $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM item_row_mappings
        WHERE item_mapping_version_id = $1::uuid
          AND target_estimate_item_id = $2::uuid
          AND work_package_id IS NOT DISTINCT FROM $3::uuid
          AND proc_package_id IS NOT DISTINCT FROM $4::uuid
      )`,
      [versionId, targetId, workPackageId, procPackageId, actor]
    );
  }
};

const ensureBudgetLines = async (
  client: PoolClient,
  projectId: string,
  importBatchId: string,
  data: DemoExport,
  litteraIds: Map<string, string>,
  actor: string
) => {
  const budgetLineIds: Array<{ budgetLineId: string; litteraCode: string }> = [];
  for (const row of data.budgetLines) {
    const code = row.code;
    const litteraId = litteraIds.get(code);
    if (!litteraId) {
      continue;
    }
    const costEntries = Object.entries(row.costs || {});
    for (const [costType, amount] of costEntries) {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount)) {
        continue;
      }
      const existing = await client.query<{ budget_line_id: string }>(
        `SELECT budget_line_id
         FROM budget_lines
         WHERE project_id = $1::uuid
           AND target_littera_id = $2::uuid
           AND cost_type = $3::cost_type
           AND import_batch_id = $4::uuid
         LIMIT 1`,
        [projectId, litteraId, costType, importBatchId]
      );
      if (existing.rowCount === 0) {
        const inserted = await client.query<{ budget_line_id: string }>(
          `INSERT INTO budget_lines (
            project_id,
            target_littera_id,
            cost_type,
            amount,
            source,
            import_batch_id,
            created_by
          ) VALUES ($1::uuid, $2::uuid, $3::cost_type, $4, 'IMPORT'::budget_source, $5::uuid, $6)
          RETURNING budget_line_id`,
          [projectId, litteraId, costType, numericAmount, importBatchId, actor]
        );
        budgetLineIds.push({ budgetLineId: inserted.rows[0].budget_line_id, litteraCode: code });
      } else {
        budgetLineIds.push({ budgetLineId: existing.rows[0].budget_line_id, litteraCode: code });
      }
    }
  }
  return budgetLineIds;
};

const ensurePackageBudgetLinks = async (
  client: PoolClient,
  projectId: string,
  budgetLines: Array<{ budgetLineId: string; litteraCode: string }>,
  workPackageIds: Map<string, string>,
  procPackageIds: Map<string, string>,
  actor: string
) => {
  for (const line of budgetLines) {
    const workPackageId = workPackageIds.get(line.litteraCode);
    if (!workPackageId) {
      continue;
    }
    const procPackageId = procPackageIds.get(line.litteraCode) ?? null;
    await client.query(
      `INSERT INTO package_budget_line_links (
        package_budget_line_link_id,
        project_id,
        work_package_id,
        proc_package_id,
        budget_line_id,
        created_by
      )
      SELECT gen_random_uuid(), $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM package_budget_line_links WHERE budget_line_id = $4::uuid
      )`,
      [projectId, workPackageId, procPackageId, line.budgetLineId, actor]
    );
  }
};

const ensureWorkPackageBaselines = async (
  client: PoolClient,
  workPackageIds: Map<string, string>,
  note: string,
  actor: string
) => {
  for (const [, workPackageId] of workPackageIds) {
    const existing = await client.query<{ work_package_baseline_id: string }>(
      "SELECT work_package_baseline_id FROM work_package_baselines WHERE work_package_id = $1::uuid LIMIT 1",
      [workPackageId]
    );
    if (existing.rowCount > 0) {
      continue;
    }
    const hasLinks = await client.query("SELECT 1 FROM package_budget_line_links WHERE work_package_id = $1::uuid LIMIT 1", [
      workPackageId
    ]);
    if (hasLinks.rowCount === 0) {
      continue;
    }
    const fnExists = await client.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM pg_proc p
         JOIN pg_namespace n ON n.oid = p.pronamespace
         WHERE n.nspname = 'public' AND p.proname = 'work_package_lock_baseline'
       ) AS exists`
    );
    if (!fnExists.rows[0]?.exists) {
      continue;
    }
    await client.query("SELECT work_package_lock_baseline($1::uuid, $2, $3)", [workPackageId, actor, note]);
  }
};

const ensureChangeRequests = async (
  client: PoolClient,
  projectId: string,
  workPackageIds: Map<string, string>,
  seedKey: string,
  actor: string
) => {
  const fnRows = await client.query<{ proname: string }>(
    `SELECT p.proname
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND p.proname = ANY($1::text[])`,
    [["change_request_create", "change_request_set_status"]]
  );
  const fnNames = new Set(fnRows.rows.map((row) => row.proname));
  if (!fnNames.has("change_request_create") || !fnNames.has("change_request_set_status")) {
    return;
  }

  const statusViewExists = await client.query<{ exists: boolean }>(
    "SELECT to_regclass('public.v_change_request_current_status') IS NOT NULL AS exists"
  );
  if (!statusViewExists.rows[0]?.exists) {
    return;
  }

  const pickWorkPackage = (preferredCodes: string[]) => {
    for (const code of preferredCodes) {
      const id = workPackageIds.get(code);
      if (id) {
        return { code, id };
      }
    }
    const first = workPackageIds.entries().next();
    if (first.done) {
      return undefined;
    }
    const [code, id] = first.value;
    return { code, id };
  };

  const mtTarget = pickWorkPackage(["0310", "2100"]);
  const ltTarget = pickWorkPackage(["4100", "5200"]);
  if (!mtTarget || !ltTarget) {
    return;
  }

  const titlePrefix = `[${seedKey}]`;
  const definitions = [
    {
      changeType: "MT" as const,
      title: `${titlePrefix} MT demo`,
      scheduleNote: "Aikataulu +2 pv",
      description: `${seedKey} MT seed`,
      target: mtTarget,
      costType: "LABOR" as const,
      costEur: 1200,
      revenueEur: 1500,
      note: `${seedKey} MT line`
    },
    {
      changeType: "LT" as const,
      title: `${titlePrefix} LT demo`,
      scheduleNote: null,
      description: `${seedKey} LT seed`,
      target: ltTarget,
      costType: "MATERIAL" as const,
      costEur: 900,
      revenueEur: 1200,
      note: `${seedKey} LT line`
    }
  ];

  for (const def of definitions) {
    const existing = await client.query<{ change_request_id: string; status: string | null }>(
      `SELECT r.change_request_id, s.status::text AS status
       FROM change_requests r
       LEFT JOIN v_change_request_current_status s ON s.change_request_id = r.change_request_id
       WHERE r.project_id = $1::uuid
         AND r.change_type = $2::change_type
         AND r.title = $3
         AND COALESCE(s.status::text, '') <> 'CANCELLED'
       ORDER BY r.created_at DESC, r.change_request_id DESC
       LIMIT 1`,
      [projectId, def.changeType, def.title]
    );

    let changeRequestId = existing.rows[0]?.change_request_id;
    let status = existing.rows[0]?.status ?? "DRAFT";

    if (!changeRequestId) {
      const created = await client.query<{ change_request_id: string }>(
        `SELECT change_request_id
         FROM change_request_create($1::uuid, $2::change_type, $3, $4, $5, $6)`,
        [projectId, def.changeType, def.title, def.scheduleNote, actor, def.description]
      );
      changeRequestId = created.rows[0]?.change_request_id;
      status = "DRAFT";
    }

    if (!changeRequestId) {
      continue;
    }

    await client.query(
      `INSERT INTO change_request_lines (
        change_request_id,
        project_id,
        littera_code,
        work_package_id,
        cost_type,
        cost_eur,
        revenue_eur,
        created_by,
        note
      )
      SELECT $1::uuid, $2::uuid, $3, $4::uuid, $5::cost_type, $6, $7, $8, $9
      WHERE NOT EXISTS (
        SELECT 1
        FROM change_request_lines
        WHERE change_request_id = $1::uuid
          AND littera_code = $3
          AND work_package_id = $4::uuid
          AND cost_eur = $6
          AND revenue_eur = $7
      )`,
      [
        changeRequestId,
        projectId,
        def.target.code,
        def.target.id,
        def.costType,
        def.costEur,
        def.revenueEur,
        actor,
        def.note
      ]
    );

    if (status === "DRAFT") {
      await client.query("SELECT change_request_set_status($1::uuid, $2::change_status, $3, $4)", [
        changeRequestId,
        "SUBMITTED",
        actor,
        `${seedKey} submitted`
      ]);
      status = "SUBMITTED";
    }
    if (status === "SUBMITTED") {
      await client.query("SELECT change_request_set_status($1::uuid, $2::change_status, $3, $4)", [
        changeRequestId,
        "APPROVED",
        actor,
        `${seedKey} approved`
      ]);
    }
  }
};

const ensureMappingVersion = async (
  client: PoolClient,
  projectId: string,
  data: DemoExport,
  litteraIds: Map<string, string>,
  actor: string,
  seedKey: string
) => {
  if (!data.mappingLines || data.mappingLines.length === 0) {
    return;
  }
  const existing = await client.query<{ mapping_version_id: string; reason: string | null }>(
    "SELECT mapping_version_id, reason FROM mapping_versions WHERE project_id = $1::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
    [projectId]
  );
  let mappingVersionId = existing.rows[0]?.mapping_version_id;
  if (!mappingVersionId) {
    const inserted = await client.query<{ mapping_version_id: string }>(
      `INSERT INTO mapping_versions (project_id, status, reason, created_by, approved_by, approved_at)
       VALUES ($1::uuid, 'ACTIVE', $2, $3, $3, now())
       RETURNING mapping_version_id`,
      [projectId, seedKey, actor]
    );
    mappingVersionId = inserted.rows[0].mapping_version_id;
  }

  for (const line of data.mappingLines) {
    const workId = litteraIds.get(line.workCode);
    const targetId = litteraIds.get(line.targetCode);
    if (!workId || !targetId) {
      continue;
    }
    await client.query(
      `INSERT INTO mapping_lines (
        project_id,
        mapping_version_id,
        work_littera_id,
        target_littera_id,
        allocation_rule,
        allocation_value,
        cost_type,
        note
      )
      SELECT $1::uuid, $2::uuid, $3::uuid, $4::uuid, $5::allocation_rule, $6, $7::cost_type, $8
      WHERE NOT EXISTS (
        SELECT 1 FROM mapping_lines
        WHERE mapping_version_id = $2::uuid
          AND work_littera_id = $3::uuid
          AND target_littera_id = $4::uuid
          AND allocation_rule = $5::allocation_rule
          AND allocation_value = $6
          AND cost_type IS NOT DISTINCT FROM $7::cost_type
      )`,
      [
        projectId,
        mappingVersionId,
        workId,
        targetId,
        line.allocationRule,
        line.allocationValue,
        line.costType,
        seedKey
      ]
    );
  }
};

const ensureActuals = async (
  client: PoolClient,
  importBatchId: string,
  actuals: NonNullable<DemoExport["actuals"]>
) => {
  for (const row of actuals) {
    await client.query(
      `INSERT INTO actuals_lines (
        import_batch_id,
        posting_date,
        amount_eur,
        account,
        cost_center,
        vendor,
        invoice_no,
        description,
        dimensions_json
      )
      SELECT $1::uuid, $2::date, $3, $4, $5, $6, $7, $8, $9::jsonb
      WHERE NOT EXISTS (
        SELECT 1 FROM actuals_lines
        WHERE import_batch_id = $1::uuid
          AND invoice_no IS NOT DISTINCT FROM $7
          AND amount_eur = $3
          AND description IS NOT DISTINCT FROM $8
      )`,
      [
        importBatchId,
        row.postingDate,
        row.amountEur,
        row.account ?? null,
        row.costCenter ?? null,
        row.vendor ?? null,
        row.invoiceNo ?? null,
        row.description ?? null,
        JSON.stringify({ littera_code: row.litteraCode })
      ]
    );
  }
};

const ensureActualsMapping = async (
  client: PoolClient,
  projectId: string,
  rules: NonNullable<DemoExport["actualsMappingRules"]>,
  workPackageIds: Map<string, string>,
  procPackageIds: Map<string, string>,
  seedKey: string,
  actualsMinDate: string | null
) => {
  const desiredValidFrom = actualsMinDate ?? new Date().toISOString().slice(0, 10);
  const existingVersion = await client.query<{ id: string }>(
    `SELECT id
     FROM actuals_mapping_versions
     WHERE project_id = $1::uuid
       AND status = 'ACTIVE'
       AND valid_from <= $2::date
     ORDER BY valid_from DESC, id DESC
     LIMIT 1`,
    [projectId, desiredValidFrom]
  );
  let versionId = existingVersion.rows[0]?.id;
  if (!versionId) {
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO actuals_mapping_versions (project_id, status, valid_from, created_by)
       VALUES ($1::uuid, 'ACTIVE', $2::date, $3)
       RETURNING id`,
      [projectId, desiredValidFrom, seedKey]
    );
    versionId = inserted.rows[0].id;
  }

  for (const rule of rules) {
    const workPackageId = workPackageIds.get(rule.workPackageCode) ?? null;
    if (!workPackageId) {
      continue;
    }
    const procPackageId = rule.procPackageCode ? procPackageIds.get(rule.procPackageCode) ?? null : null;
    await client.query(
      `INSERT INTO actuals_mapping_rules (
        actuals_mapping_version_id,
        match_json,
        work_package_id,
        proc_package_id,
        priority
      )
      SELECT $1::uuid, $2::jsonb, $3::uuid, $4::uuid, $5
      WHERE NOT EXISTS (
        SELECT 1 FROM actuals_mapping_rules
        WHERE actuals_mapping_version_id = $1::uuid
          AND match_json = $2::jsonb
          AND work_package_id = $3::uuid
          AND proc_package_id IS NOT DISTINCT FROM $4::uuid
      )`,
      [versionId, JSON.stringify(rule.match), workPackageId, procPackageId, rule.priority ?? 100]
    );
  }
};

const ensurePlanning = async (
  client: PoolClient,
  projectId: string,
  events: NonNullable<DemoExport["planningEvents"]>,
  litteraIds: Map<string, string>
) => {
  for (const event of events) {
    const litteraId = litteraIds.get(event.targetCode);
    if (!litteraId) {
      continue;
    }
    await client.query(
      `INSERT INTO planning_events (
        project_id,
        target_littera_id,
        status,
        summary,
        observations,
        risks,
        decisions,
        created_by
      )
      SELECT $1::uuid, $2::uuid, $3::plan_status, $4, $5, $6, $7, $8
      WHERE NOT EXISTS (
        SELECT 1 FROM planning_events
        WHERE project_id = $1::uuid
          AND target_littera_id = $2::uuid
          AND status = $3::plan_status
      )`,
      [
        projectId,
        litteraId,
        event.status,
        event.summary ?? null,
        event.observations ?? null,
        event.risks ?? null,
        event.decisions ?? null,
        event.createdBy ?? "demo.seed"
      ]
    );
  }
};

const ensureForecast = async (
  client: PoolClient,
  projectId: string,
  events: NonNullable<DemoExport["forecastEvents"]>,
  workPackageIds: Map<string, string>,
  procPackageIds: Map<string, string>
) => {
  for (const event of events) {
    const existing = await client.query<{ id: string }>(
      "SELECT id FROM forecast_events WHERE project_id = $1::uuid AND note IS NOT DISTINCT FROM $2 LIMIT 1",
      [projectId, event.comment ?? null]
    );
    let forecastEventId = existing.rows[0]?.id;
    if (!forecastEventId) {
      const inserted = await client.query<{ id: string }>(
        "INSERT INTO forecast_events (project_id, forecast_date, created_by, note) VALUES ($1::uuid, current_date, $2, $3) RETURNING id",
        [projectId, event.createdBy ?? "demo.seed", event.comment ?? null]
      );
      forecastEventId = inserted.rows[0].id;
    }
    for (const line of event.lines) {
      const workPackageId = workPackageIds.get(event.targetCode) ?? null;
      const procPackageId = procPackageIds.get(event.targetCode) ?? null;
      if (!workPackageId) {
        continue;
      }
      await client.query(
        `INSERT INTO forecast_event_rows (
          forecast_event_id,
          work_package_id,
          proc_package_id,
          forecast_eur,
          explanation
        )
        SELECT $1::uuid, $2::uuid, $3::uuid, $4, $5
        WHERE NOT EXISTS (
          SELECT 1 FROM forecast_event_rows
          WHERE forecast_event_id = $1::uuid
            AND work_package_id = $2::uuid
            AND proc_package_id IS NOT DISTINCT FROM $3::uuid
            AND forecast_eur = $4
        )`,
        [forecastEventId, workPackageId, procPackageId, line.forecastValue, line.memoGeneral ?? null]
      );
    }
  }
};

export const provisionDemoProjectAndData = async (
  client: PoolClient,
  input: { projectId: string; tenantId: string; organizationId: string; createdBy: string; seedKey?: string }
) => {
  const seedKey = input.seedKey ?? "demo_exports/v1";
  const actor = input.createdBy || "demo.seed";
  const data = loadDemoExport(seedKey);

  await ensureProjectFlags(client, input.projectId, seedKey);
  const litteraIds = await ensureLitteras(client, input.projectId, data, actor);
  const workPackageIds = await ensureWorkPackages(client, input.projectId, data, actor);
  const procPackageIds = await ensureProcPackages(client, input.projectId, data, workPackageIds);

  const targetBatchId = await ensureImportBatch(
    client,
    input.projectId,
    "TARGET_ESTIMATE",
    seedKey,
    "target",
    buildTargetEstimateHashPayload(data),
    actor
  );
  const targetItems = data.targetEstimateItems ? await ensureTargetEstimateItems(client, targetBatchId, data.targetEstimateItems) : new Map<string, string>();
  await ensureItemMappings(client, input.projectId, targetBatchId, data, targetItems, workPackageIds, procPackageIds, actor);

  const budgetLineIds = await ensureBudgetLines(
    client,
    input.projectId,
    targetBatchId,
    data,
    litteraIds,
    actor
  );
  await ensurePackageBudgetLinks(client, input.projectId, budgetLineIds, workPackageIds, procPackageIds, actor);
  await ensureWorkPackageBaselines(client, workPackageIds, seedKey, actor);
  await ensureChangeRequests(client, input.projectId, workPackageIds, seedKey, actor);

  await ensureMappingVersion(client, input.projectId, data, litteraIds, actor, seedKey);

  if (data.actuals && data.actuals.length > 0) {
    const actualsBatchId = await ensureImportBatch(client, input.projectId, "ACTUALS", seedKey, "actuals", data.actuals, actor);
    await ensureActuals(client, actualsBatchId, data.actuals);
  }
  const actualsMinDate = (data.actuals ?? []).reduce<string | null>((minDate, row) => {
    const postingDate = row.postingDate;
    if (!postingDate) {
      return minDate;
    }
    return !minDate || postingDate < minDate ? postingDate : minDate;
  }, null);
  if (data.actualsMappingRules && data.actualsMappingRules.length > 0) {
    await ensureActualsMapping(client, input.projectId, data.actualsMappingRules, workPackageIds, procPackageIds, seedKey, actualsMinDate);
  }

  if (data.planningEvents && data.planningEvents.length > 0) {
    await ensurePlanning(client, input.projectId, data.planningEvents, litteraIds);
  }
  if (data.forecastEvents && data.forecastEvents.length > 0) {
    await ensureForecast(client, input.projectId, data.forecastEvents, workPackageIds, procPackageIds);
  }
};
