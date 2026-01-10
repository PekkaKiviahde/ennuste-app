import type { WorkPackagePort } from "@ennuste/application";
import { AppError } from "@ennuste/shared";
import { dbForTenant } from "./db";

export const workPackageRepository = (): WorkPackagePort => ({
  async listWorkPackages(projectId, tenantId) {
    const tenantDb = dbForTenant(tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<{
      work_package_id: string;
      code: string;
      name: string;
      status: string | null;
      created_at: string;
    }>(
      `SELECT id AS work_package_id, code, name, status, created_at
       FROM work_packages
       WHERE project_id = $1::uuid
       ORDER BY created_at DESC`,
      [projectId]
    );
    return result.rows;
  },
  async createWorkPackage(input) {
    const tenantDb = dbForTenant(input.tenantId);
    await tenantDb.requireProject(input.projectId);
    const result = await tenantDb.query<{ work_package_id: string }>(
      `INSERT INTO work_packages (project_id, code, name, responsible_user_id, status)
       VALUES ($1::uuid, $2, $3, $4::uuid, $5)
       RETURNING id AS work_package_id`,
      [
        input.projectId,
        input.code,
        input.name,
        input.responsibleUserId ?? null,
        input.status ?? "ACTIVE"
      ]
    );
    return { workPackageId: result.rows[0].work_package_id };
  },
  async createWeeklyUpdate() {
    throw new AppError("Viikkopaivitys ei ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  },
  async createGhostEntry() {
    throw new AppError("Ghost-kirjaukset eivat ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  },
  async lockBaseline() {
    throw new AppError("Baseline-lukitus ei ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  },
  async proposeCorrection() {
    throw new AppError("Korjausehdotukset eivat ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  },
  async approveCorrectionPm() {
    throw new AppError("Korjausten hyväksyntä ei ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  },
  async approveCorrectionFinal() {
    throw new AppError("Korjausten hyväksyntä ei ole viela tuettu uudessa baseline-skeemassa.", "NOT_IMPLEMENTED", 501);
  }
});
