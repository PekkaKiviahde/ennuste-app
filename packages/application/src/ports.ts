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
  requirePermission(projectId: string, username: string, permission: PermissionCode): Promise<void>;
  listPermissions(projectId: string, username: string): Promise<PermissionCode[]>;
};

export type PlanningEventInput = {
  projectId: string;
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
  listPlanningCurrent(projectId: string): Promise<unknown[]>;
};

export type ForecastPort = {
  createForecastEvent(input: ForecastEventInput): Promise<{ forecastEventId: string }>;
  listForecastCurrent(projectId: string): Promise<unknown[]>;
};

export type ReportPort = {
  getDashboard(projectId: string): Promise<unknown>;
  getWorkPhaseReport(projectId: string): Promise<unknown[]>;
  getForecastReport(projectId: string): Promise<unknown[]>;
  getPlanningReport(projectId: string): Promise<unknown[]>;
  getTargetEstimate(projectId: string): Promise<unknown[]>;
  getMappingLines(projectId: string): Promise<unknown[]>;
  getAuditLog(projectId: string): Promise<unknown[]>;
};

export type AdminPort = {
  getAdminOverview(projectId: string): Promise<{
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
  listWorkPhases(projectId: string): Promise<unknown[]>;
  createWeeklyUpdate(input: {
    projectId: string;
    workPhaseId: string;
    weekEnding: string;
    percentComplete: number;
    progressNotes?: string | null;
    risks?: string | null;
    createdBy: string;
  }): Promise<{ workPhaseWeeklyUpdateId: string }>;
  createGhostEntry(input: {
    projectId: string;
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
    username: string;
    notes?: string | null;
  }): Promise<{ workPhaseBaselineId: string }>;
  proposeCorrection(input: {
    workPhaseId: string;
    itemCode: string;
    username: string;
    notes?: string | null;
  }): Promise<{ correctionId: string }>;
  approveCorrectionPm(input: {
    correctionId: string;
    username: string;
    comment?: string | null;
  }): Promise<void>;
  approveCorrectionFinal(input: {
    correctionId: string;
    username: string;
    comment?: string | null;
  }): Promise<{ baselineId: string }>;
};

export type AuditPort = {
  recordEvent(input: {
    projectId: string;
    actor: string;
    action: string;
    payload: Record<string, unknown>;
  }): Promise<void>;
};
