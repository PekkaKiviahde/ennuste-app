import type { PermissionCode, SessionUser } from "@ennuste/shared";

export type LoginInput = {
  username: string;
  pin: string;
  projectId?: string;
};

export type LoginResult = {
  session: SessionUser;
};

export type AuthPort = {
  loginWithPin(input: LoginInput): Promise<LoginResult>;
  getSession(sessionId: string): Promise<SessionUser | null>;
  createSession(session: SessionUser): Promise<string>;
  deleteSession(sessionId: string): Promise<void>;
};

export type RbacPort = {
  requirePermission(projectId: string, tenantId: string, username: string, permission: PermissionCode): Promise<void>;
  listPermissions(projectId: string, tenantId: string, username: string): Promise<PermissionCode[]>;
};

export type PlanningEventInput = {
  projectId: string;
  tenantId: string;
  targetLitteraId: string;
  status: "DRAFT" | "READY_FOR_FORECAST" | "LOCKED";
  summary?: string | null;
  observations?: string | null;
  risks?: string | null;
  decisions?: string | null;
  createdBy: string;
};

export type ForecastEventInput = {
  projectId: string;
  tenantId: string;
  targetLitteraId: string;
  mappingVersionId?: string | null;
  comment?: string | null;
  technicalProgress?: number | null;
  financialProgress?: number | null;
  kpiValue?: number | null;
  createdBy: string;
  lines: Array<{
    costType: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
    forecastValue: number;
    memoGeneral?: string | null;
    memoProcurement?: string | null;
    memoCalculation?: string | null;
  }>;
};

export type PlanningPort = {
  createPlanningEvent(input: PlanningEventInput): Promise<{ planningEventId: string }>;
  listPlanningCurrent(projectId: string, tenantId: string): Promise<unknown[]>;
};

export type ForecastPort = {
  createForecastEvent(input: ForecastEventInput): Promise<{ forecastEventId: string }>;
  listForecastCurrent(projectId: string, tenantId: string): Promise<unknown[]>;
  getForecastSnapshot(
    projectId: string,
    tenantId: string,
    targetLitteraId: string
  ): Promise<{
    event: {
      forecast_event_id: string;
      mapping_version_id: string | null;
      comment: string | null;
      technical_progress: number | null;
      financial_progress: number | null;
      kpi_value: number | null;
    } | null;
    lines: Array<{
      cost_type: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
      forecast_value: number;
      memo_general: string | null;
      memo_procurement: string | null;
      memo_calculation: string | null;
    }>;
  }>;
};

export type ReportPort = {
  getDashboard(projectId: string, tenantId: string): Promise<unknown>;
  getWorkPhaseReport(projectId: string, tenantId: string): Promise<unknown[]>;
  getForecastReport(projectId: string, tenantId: string): Promise<unknown[]>;
  getPlanningReport(projectId: string, tenantId: string): Promise<unknown[]>;
  getTargetEstimate(projectId: string, tenantId: string): Promise<unknown[]>;
  getMappingVersions(projectId: string, tenantId: string): Promise<unknown[]>;
  getMappingLines(projectId: string, tenantId: string): Promise<unknown[]>;
  getAuditLog(projectId: string, tenantId: string): Promise<unknown[]>;
};

export type AdminPort = {
  getAdminOverview(projectId: string, tenantId: string): Promise<{
    users: Array<{ username: string; display_name: string | null }>;
    roles: Array<{ role_code: string; role_name_fi: string }>;
    assignments: Array<{
      scope: "project" | "organization";
      username: string;
      role_code: string;
      granted_at: string;
    }>;
  }>;
};

export type WorkPhasePort = {
  listWorkPhases(projectId: string, tenantId: string): Promise<Array<{
    work_phase_id: string;
    name: string;
    status: string | null;
    created_at: string;
  }>>;
  createWeeklyUpdate(input: {
    projectId: string;
    tenantId: string;
    workPhaseId: string;
    weekEnding: string;
    percentComplete: number;
    progressNotes?: string | null;
    risks?: string | null;
    createdBy: string;
  }): Promise<{ workPhaseWeeklyUpdateId: string }>;
  createGhostEntry(input: {
    projectId: string;
    tenantId: string;
    workPhaseId: string;
    weekEnding: string;
    costType: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
    amount: number;
    description?: string | null;
    createdBy: string;
  }): Promise<{ ghostCostEntryId: string }>;
  lockBaseline(input: {
    workPhaseId: string;
    workPhaseVersionId: string;
    targetImportBatchId: string;
    tenantId: string;
    username: string;
    notes?: string | null;
  }): Promise<{ workPhaseBaselineId: string }>;
  proposeCorrection(input: {
    workPhaseId: string;
    itemCode: string;
    tenantId: string;
    username: string;
    notes?: string | null;
  }): Promise<{ correctionId: string }>;
  approveCorrectionPm(input: {
    correctionId: string;
    tenantId: string;
    username: string;
    comment?: string | null;
  }): Promise<void>;
  approveCorrectionFinal(input: {
    correctionId: string;
    tenantId: string;
    username: string;
    comment?: string | null;
  }): Promise<{ baselineId: string }>;
};

export type AuditPort = {
  recordEvent(input: {
    projectId: string;
    tenantId: string;
    actor: string;
    action: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
};
