import type { TargetEstimateMappingPort } from "@ennuste/application";
import { dbForTenant } from "./db";

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

export const targetEstimateMappingRepository = (): TargetEstimateMappingPort => ({
  async listItems(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      `
      WITH latest_batch AS (
        SELECT id
        FROM import_batches
        WHERE project_id = $1::uuid AND kind = 'TARGET_ESTIMATE'
        ORDER BY created_at DESC
        LIMIT 1
      )
      SELECT
        tei.id AS target_estimate_item_id,
        tei.littera_code,
        tei.item_code,
        tei.description AS item_desc,
        tei.qty,
        tei.unit,
        tei.sum_eur AS total_eur,
        (COALESCE(tei.sum_eur, 0) <> 0) AS is_leaf,
        m.work_package_id,
        wp.name AS work_package_name,
        m.proc_package_id,
        pp.name AS proc_package_name
      FROM target_estimate_items tei
      LEFT JOIN v_current_item_mappings m
        ON m.target_estimate_item_id = tei.id
       AND m.project_id = $1::uuid
       AND m.import_batch_id = tei.import_batch_id
      LEFT JOIN work_packages wp
        ON wp.id = m.work_package_id
      LEFT JOIN proc_packages pp
        ON pp.id = m.proc_package_id
      WHERE tei.import_batch_id IN (
        SELECT id FROM latest_batch
      )
      ORDER BY tei.littera_code, tei.item_code
      `,
      [projectId]
    );
    return result.rows;
  },
  async listProcPackages(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      `SELECT id AS proc_package_id,
              name,
              NULL::text AS description,
              default_work_package_id
       FROM proc_packages
       WHERE project_id = $1::uuid
       ORDER BY name`,
      [projectId]
    );
    return result.rows;
  },
  async createProcPackage(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    const result = await tenantDb.query<{ proc_package_id: string }>(
      `INSERT INTO proc_packages (
        project_id,
        code,
        name,
        owner_type,
        vendor_name,
        contract_ref,
        default_work_package_id,
        status
      ) VALUES ($1::uuid, $2, $3, $4, $5, $6, $7::uuid, $8)
      RETURNING id AS proc_package_id`,
      [
        input.projectId,
        input.code,
        input.name,
        input.ownerType ?? "VENDOR",
        input.vendorName ?? null,
        input.contractRef ?? null,
        input.defaultWorkPackageId ?? null,
        input.status ?? "ACTIVE"
      ]
    );
    return { procPackageId: result.rows[0].proc_package_id };
  },
  async upsertItemMappings(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    if (input.updates.length === 0) {
      return { updatedCount: 0 };
    }
    const targetEstimateItemIds = input.updates.map((update) => update.targetEstimateItemId);

    return tenantDb.transaction(async (client) => {
      const latestBatchResult = await client.query<{ id: string }>(
        "SELECT id FROM import_batches WHERE project_id = $1::uuid AND kind = 'TARGET_ESTIMATE' ORDER BY created_at DESC LIMIT 1",
        [input.projectId]
      );
      const latestBatchId = latestBatchResult.rows[0]?.id;
      if (!latestBatchId) {
        throw new Error("Tavoitearvion tuontia ei loytynyt projektilta.");
      }
      const versionResult = await client.query<{ id: string }>(
        "SELECT id FROM item_mapping_versions WHERE project_id = $1::uuid AND import_batch_id = $2::uuid AND status = 'ACTIVE' ORDER BY created_at DESC LIMIT 1",
        [input.projectId, latestBatchId]
      );
      if (versionResult.rowCount === 0) {
        throw new Error("Aktiivinen item-mappaysversio puuttuu projektilta.");
      }
      const mappingVersionId = versionResult.rows[0].id;
      const existingResult = await client.query<{
        target_estimate_item_id: string;
        work_package_id: string | null;
        proc_package_id: string | null;
      }>(
        `SELECT m.target_estimate_item_id,
                m.work_package_id,
                m.proc_package_id
         FROM v_current_item_mappings m
         JOIN item_mapping_versions imv ON imv.id = m.item_mapping_version_id
         WHERE imv.project_id = $1::uuid
           AND imv.import_batch_id = $2::uuid
           AND m.target_estimate_item_id = ANY($3::uuid[])`,
        [input.projectId, latestBatchId, targetEstimateItemIds]
      );
      const existingByItem = new Map(existingResult.rows.map((row) => [row.target_estimate_item_id, row]));

      const procPackageIds = Array.from(
        new Set(
          input.updates
            .map((update) => update.procPackageId)
            .filter((value): value is string => Boolean(value))
        )
      );
      let procDefaults = new Map<string, string | null>();
      if (procPackageIds.length > 0) {
        const procResult = await client.query<{
          id: string;
          default_work_package_id: string | null;
        }>(
          "SELECT id, default_work_package_id FROM proc_packages WHERE project_id = $1::uuid AND id = ANY($2::uuid[])",
          [input.projectId, procPackageIds]
        );
        procDefaults = new Map(procResult.rows.map((row) => [row.id, row.default_work_package_id]));
      }

      let updatedCount = 0;
      for (const update of input.updates) {
        const hasWorkPackage = hasOwn(update, "workPackageId");
        const hasProcPackage = hasOwn(update, "procPackageId");
        const currentMapping = existingByItem.get(update.targetEstimateItemId) ?? null;
        const currentWorkPackage = currentMapping?.work_package_id ?? null;
        const currentProcPackage = currentMapping?.proc_package_id ?? null;

        let workPackageId = hasWorkPackage ? update.workPackageId ?? null : currentWorkPackage;
        let procPackageId = hasProcPackage ? update.procPackageId ?? null : currentProcPackage;

        if (!hasWorkPackage && hasProcPackage && !currentWorkPackage) {
          const defaultWorkPackage = procPackageId ? procDefaults.get(procPackageId) ?? null : null;
          if (defaultWorkPackage) {
            workPackageId = defaultWorkPackage;
          }
        }

        await client.query(
          `
          INSERT INTO item_row_mappings (
            item_mapping_version_id,
            target_estimate_item_id,
            work_package_id,
            proc_package_id,
            created_by
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
          `,
          [
            mappingVersionId,
            update.targetEstimateItemId,
            workPackageId,
            procPackageId,
            input.updatedBy
          ]
        );
        updatedCount += 1;
      }
      return { updatedCount };
    });
  }
});
