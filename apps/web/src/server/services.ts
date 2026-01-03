import { adminRepository, auditRepository, authRepository, forecastRepository, planningRepository, rbacRepository, reportRepository, workPhaseRepository } from "@ennuste/infrastructure";
import type { AppServices } from "@ennuste/application";

export const createServices = (): AppServices => ({
  auth: authRepository(),
  rbac: rbacRepository(),
  planning: planningRepository(),
  forecast: forecastRepository(),
  report: reportRepository(),
  admin: adminRepository(),
  workPhases: workPhaseRepository(),
  audit: auditRepository()
});
