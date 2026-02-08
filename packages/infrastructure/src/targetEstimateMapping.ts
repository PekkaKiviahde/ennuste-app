import type { TargetEstimateMappingPort } from "@ennuste/application";
import { AppError } from "@ennuste/shared";
import { dbForTenant } from "./db";

const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);

type TargetEstimateItemRow = Awaited<ReturnType<TargetEstimateMappingPort["listItems"]>>[number];
type ProcPackageRow = Awaited<ReturnType<TargetEstimateMappingPort["listProcPackages"]>>[number];

export const targetEstimateMappingRepository = (): TargetEstimateMappingPort => ({
  async listItems(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<TargetEstimateItemRow>(
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
    const result = await tenantDb.query<ProcPackageRow>(
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
    const defaultWorkPackageId = input.defaultWorkPackageId ?? null;
    if (!defaultWorkPackageId) {
      throw new AppError(
        "Hankintapaketti vaatii linkitetyn tyopaketin.",
        "DEFAULT_WORK_PACKAGE_REQUIRED",
        400
      );
    }

    const workPackageCheck = await tenantDb.query<{ id: string }>(
      "SELECT id FROM work_packages WHERE project_id = $1::uuid AND id = $2::uuid",
      [input.projectId, defaultWorkPackageId]
    );
    if (workPackageCheck.rowCount === 0) {
      throw new AppError(
        "Valittu tyopaketti ei kuulu projektiin.",
        "WORK_PACKAGE_NOT_FOUND",
        400,
        { defaultWorkPackageId }
      );
    }

    const existingLinkedProc = await tenantDb.query<{ id: string; code: string; name: string }>(
      `SELECT id, code, name
       FROM proc_packages
       WHERE project_id = $1::uuid
         AND default_work_package_id = $2::uuid
       LIMIT 1`,
      [input.projectId, defaultWorkPackageId]
    );
    if (existingLinkedProc.rowCount > 0) {
      const current = existingLinkedProc.rows[0];
      throw new AppError(
        "Valitulla tyopaketilla on jo hankintapaketti (1:1 MVP).",
        "WORK_PACKAGE_ALREADY_LINKED",
        409,
        {
          defaultWorkPackageId,
          existingProcPackageId: current.id,
          existingProcPackageCode: current.code
        }
      );
    }

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
        defaultWorkPackageId,
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
         WHERE m.project_id = $1::uuid
           AND m.import_batch_id = $2::uuid
           AND m.target_estimate_item_id = ANY($3::uuid[])`,
        [input.projectId, latestBatchId, targetEstimateItemIds]
      );
      const existingByItem = new Map(existingResult.rows.map((row) => [row.target_estimate_item_id, row]));

      const procPackageIds = Array.from(
        new Set(
          input.updates
            .map((update) => {
              if (hasOwn(update, "procPackageId")) {
                return update.procPackageId ?? null;
              }
              return existingByItem.get(update.targetEstimateItemId)?.proc_package_id ?? null;
            })
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
        if (procResult.rowCount !== procPackageIds.length) {
          const foundIds = new Set(procResult.rows.map((row) => row.id));
          const missingProcPackageId = procPackageIds.find((procPackageId) => !foundIds.has(procPackageId));
          throw new AppError(
            "Hankintapakettia ei loytynyt projektilta.",
            "PROC_PACKAGE_NOT_FOUND",
            404,
            { procPackageId: missingProcPackageId ?? null }
          );
        }
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

        if (procPackageId) {
          const defaultWorkPackage = procDefaults.get(procPackageId) ?? null;
          if (!defaultWorkPackage) {
            throw new AppError(
              "Hankintapaketti ei ole linkitetty tyopakettiin.",
              "PROC_PACKAGE_WORK_PACKAGE_MISSING",
              400,
              { procPackageId }
            );
          }
          if (!workPackageId) {
            workPackageId = defaultWorkPackage;
          }
          if (workPackageId !== defaultWorkPackage) {
            throw new AppError(
              "Valittu tyopaketti ei vastaa hankintapaketin linkitysta.",
              "WORK_PROC_LINK_MISMATCH",
              409,
              {
                procPackageId,
                workPackageId,
                expectedWorkPackageId: defaultWorkPackage,
                targetEstimateItemId: update.targetEstimateItemId
              }
            );
          }
        }

        if (!workPackageId) {
          throw new AppError(
            "Tyopaketti puuttuu. Valitse tyopaketti ennen tallennusta.",
            "WORK_PACKAGE_REQUIRED",
            400,
            { targetEstimateItemId: update.targetEstimateItemId }
          );
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
