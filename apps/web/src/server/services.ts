import { adminRepository, auditRepository, authRepository, forecastRepository, healthRepository, importStagingRepository, planningRepository, rbacRepository, reportRepository, saasRepository, workPhaseRepository } from "@ennuste/infrastructure";
import type { AppServices } from "@ennuste/application";
import { assertDemoModeSafe } from "./env";

export const createServices = (): AppServices => ({
  ...(() => {
    assertDemoModeSafe();
    return {};
  })(),
  auth: authRepository(),
  health: healthRepository(),
  rbac: rbacRepository(),
  planning: planningRepository(),
  forecast: forecastRepository(),
  report: reportRepository(),
  importStaging: importStagingRepository(),
  saas: saasRepository(),
  admin: adminRepository(),
  workPhases: workPhaseRepository(),
  audit: auditRepository()
});
