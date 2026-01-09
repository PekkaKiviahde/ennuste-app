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
        SELECT import_batch_id
        FROM import_batches
        WHERE project_id = $1::uuid AND source_system = 'TARGET_ESTIMATE'
        ORDER BY imported_at DESC
        LIMIT 1
      )
      SELECT
        bi.budget_item_id,
        l.code AS littera_code,
        bi.item_code,
        bi.item_desc,
        bi.qty,
        bi.unit,
        bi.total_eur,
        (COALESCE(bi.total_eur, 0) <> 0) AS is_leaf,
        m.work_phase_id,
        wp.name AS work_phase_name,
        m.proc_package_id,
        pp.name AS proc_package_name
      FROM budget_items bi
      JOIN litteras l
        ON l.project_id = bi.project_id
       AND l.littera_id = bi.littera_id
      LEFT JOIN v_current_item_mappings m
        ON m.budget_item_id = bi.budget_item_id
      LEFT JOIN work_phases wp
        ON wp.work_phase_id = m.work_phase_id
      LEFT JOIN proc_packages pp
        ON pp.proc_package_id = m.proc_package_id
      WHERE bi.project_id = $1::uuid
        AND (
          NOT EXISTS (SELECT 1 FROM latest_batch)
          OR bi.import_batch_id IN (SELECT import_batch_id FROM latest_batch)
        )
      ORDER BY l.code, bi.item_code
      `,
      [projectId]
    );
    return result.rows;
  },
  async listProcPackages(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query(
      "SELECT proc_package_id, name, description, default_work_package_id FROM proc_packages WHERE project_id = $1::uuid ORDER BY name",
      [projectId]
    );
    return result.rows;
  },
  async createProcPackage(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    const result = await tenantDb.query<{ proc_package_id: string }>(
      "INSERT INTO proc_packages (project_id, name, description, default_work_package_id, created_by, updated_by) VALUES ($1::uuid, $2, $3, $4::uuid, $5, $5) RETURNING proc_package_id",
      [
        input.projectId,
        input.name,
        input.description ?? null,
        input.defaultWorkPackageId ?? null,
        input.createdBy
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
    const budgetItemIds = input.updates.map((update) => update.budgetItemId);

    return tenantDb.transaction(async (client) => {
      const existingResult = await client.query<{
        budget_item_id: string;
        work_phase_id: string | null;
        proc_package_id: string | null;
      }>(
        "SELECT budget_item_id, work_phase_id, proc_package_id FROM v_current_item_mappings WHERE budget_item_id = ANY($1::uuid[])",
        [budgetItemIds]
      );
      const existingByItem = new Map(existingResult.rows.map((row) => [row.budget_item_id, row]));

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
          proc_package_id: string;
          default_work_package_id: string | null;
        }>(
          "SELECT proc_package_id, default_work_package_id FROM proc_packages WHERE project_id = $1::uuid AND proc_package_id = ANY($2::uuid[])",
          [input.projectId, procPackageIds]
        );
        procDefaults = new Map(
          procResult.rows.map((row) => [row.proc_package_id, row.default_work_package_id])
        );
      }

      let updatedCount = 0;
      for (const update of input.updates) {
        const hasWorkPhase = hasOwn(update, "workPhaseId");
        const hasProcPackage = hasOwn(update, "procPackageId");
        const currentMapping = existingByItem.get(update.budgetItemId) ?? null;
        const currentWorkPhase = currentMapping?.work_phase_id ?? null;
        const currentProcPackage = currentMapping?.proc_package_id ?? null;

        let workPhaseId = hasWorkPhase ? update.workPhaseId ?? null : currentWorkPhase;
        let procPackageId = hasProcPackage ? update.procPackageId ?? null : currentProcPackage;

        if (!hasWorkPhase && hasProcPackage && !currentWorkPhase) {
          const defaultWorkPackage = procPackageId
            ? procDefaults.get(procPackageId) ?? null
            : null;
          if (defaultWorkPackage) {
            workPhaseId = defaultWorkPackage;
          }
        }

        await client.query(
          `
          INSERT INTO row_mappings (
            mapping_version_id,
            budget_item_id,
            work_phase_id,
            proc_package_id,
            created_by
          )
          VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5)
          `,
          [
            input.mappingVersionId,
            update.budgetItemId,
            workPhaseId,
            procPackageId,
            input.updatedBy
          ]
        );
        updatedCount += 1;
      }
      return { updatedCount };
    });
  },
  async getOrCreateActiveItemMappingVersion(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    return tenantDb.transaction(async (client) => {
      const latestBatchResult = await client.query<{ import_batch_id: string }>(
        `SELECT import_batch_id
         FROM import_batches
         WHERE project_id = $1::uuid AND source_system = 'TARGET_ESTIMATE'
         ORDER BY imported_at DESC
         LIMIT 1`,
        [input.projectId]
      );
      if (latestBatchResult.rowCount === 0) {
        throw new Error("Tavoitearvion importtia ei löydy projektilta.");
      }
      const importBatchId = latestBatchResult.rows[0].import_batch_id;

      const existingVersion = await client.query<{ mapping_version_id: string }>(
        `SELECT mapping_version_id
         FROM mapping_versions
         WHERE project_id = $1::uuid
           AND import_batch_id = $2::uuid
           AND status = 'ACTIVE'
         ORDER BY created_at DESC
         LIMIT 1`,
        [input.projectId, importBatchId]
      );
      if (existingVersion.rowCount > 0) {
        return { mappingVersionId: existingVersion.rows[0].mapping_version_id, importBatchId };
      }

      const created = await client.query<{ mapping_version_id: string }>(
        `INSERT INTO mapping_versions (
          project_id,
          import_batch_id,
          status,
          reason,
          created_by,
          activated_at,
          valid_from
        )
        VALUES ($1::uuid, $2::uuid, 'ACTIVE', 'item mapping', $3, now(), current_date)
        RETURNING mapping_version_id`,
        [input.projectId, importBatchId, input.createdBy]
      );
      return { mappingVersionId: created.rows[0].mapping_version_id, importBatchId };
    });
  }
});
