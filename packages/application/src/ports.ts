import type { PermissionCode, SessionUser } from "@ennuste/shared";

export type LoginInput = {
  username: string;
  pin: string;
  projectId?: string;
};

export type LoginResult = {
  session: SessionUser;
};

export type UserProject = {
  projectId: string;
  projectName: string;
  organizationId: string;
  organizationName: string;
};

export type AuthPort = {
  loginWithPin(input: LoginInput): Promise<LoginResult>;
  switchProject(input: { username: string; projectId: string }): Promise<LoginResult>;
  listUserProjects(username: string): Promise<UserProject[]>;
  getSession(sessionId: string): Promise<SessionUser | null>;
  createSession(session: SessionUser): Promise<string>;
  deleteSession(sessionId: string): Promise<void>;
};

export type HealthPort = {
  check(): Promise<{ ok: boolean }>;
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
  getLatestPlanningStatus(
    projectId: string,
    tenantId: string,
    targetLitteraId: string
  ): Promise<{ status: "DRAFT" | "READY_FOR_FORECAST" | "LOCKED" } | null>;
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
  getAuditLog(
    projectId: string,
    tenantId: string,
    actionFilter?: string[] | null
  ): Promise<unknown[]>;
  getWorkflowStatus(projectId: string, tenantId: string): Promise<WorkflowStatus>;
};

export type ImportStagingPort = {
  createBudgetStagingBatch(input: {
    projectId: string;
    tenantId: string;
    importedBy: string;
    fileName: string | null;
    csvText: string;
  }): Promise<{
    stagingBatchId: string;
    lineCount: number;
    issueCount: number;
    warnings: string[];
  }>;
  listBatches(projectId: string, tenantId: string): Promise<unknown[]>;
  listLines(input: {
    projectId: string;
    tenantId: string;
    batchId: string;
    mode: "issues" | "clean" | "all";
    severity?: "ERROR" | "WARN" | "INFO" | null;
  }): Promise<{
    lines: Array<{
      staging_line_id: string;
      row_no: number;
      raw_json: Record<string, unknown>;
      edit_json: Record<string, unknown> | null;
      issues: Array<{
        issue_code: string;
        issue_message: string | null;
        severity: string;
        created_at: string;
      }>;
    }>;
  }>;
  editLine(input: {
    projectId: string;
    tenantId: string;
    lineId: string;
    editedBy: string;
    edit: Record<string, unknown>;
    reason?: string | null;
  }): Promise<{ stagingLineEditId: string }>;
  addBatchEvent(input: {
    projectId: string;
    tenantId: string;
    batchId: string;
    status: "APPROVED" | "REJECTED" | "COMMITTED";
    message?: string | null;
    actor: string;
  }): Promise<{ stagingBatchEventId: string }>;
  getSummary(input: {
    projectId: string;
    tenantId: string;
    batchId: string;
  }): Promise<{
    staging_batch_id: string;
    line_count: number;
    skipped_rows: number;
    skipped_values: number;
    error_issues: number;
    codes_count: number;
    totals_by_cost_type: Record<string, number>;
    totals_by_cost_type_all: Record<string, number>;
    top_codes: Array<{ code: string; title: string | null; total: number }>;
    top_lines: Array<{ code: string; title: string | null; cost_type: string; total: number }>;
  }>;
  commitBatch(input: {
    projectId: string;
    tenantId: string;
    batchId: string;
    committedBy: string;
    message?: string | null;
    allowDuplicate?: boolean;
    force?: boolean;
  }): Promise<{
    importBatchId: string;
    insertedRows: number;
    skippedRows: number;
    skippedValues: number;
    errorIssues: number;
  }>;
  exportBatch(input: {
    projectId: string;
    tenantId: string;
    batchId: string;
    mode: "clean" | "all";
  }): Promise<{ fileName: string; csv: string }>;
};

export type WorkflowStatus = {
  planning: {
    target_littera_id: string | null;
    status: string | null;
    event_time: string | null;
    created_by: string | null;
    summary: string | null;
  } | null;
  forecast: {
    target_littera_id: string | null;
    event_time: string | null;
    created_by: string | null;
  } | null;
  audit: {
    action: string | null;
    actor: string | null;
    event_time: string | null;
  } | null;
  isLocked: boolean;
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

export type SaasPort = {
  createGroup(input: { name: string; createdBy: string }): Promise<{ groupId: string }>;
  createOrganizationWithInvite(input: {
    groupId?: string | null;
    name: string;
    slug: string;
    adminEmail: string;
    createdBy: string;
  }): Promise<{
    organizationId: string;
    tenantId: string;
    projectId: string;
    inviteId: string;
    inviteToken: string;
  }>;
  createOrgInvite(input: {
    organizationId: string;
    email: string;
    roleCode?: string | null;
    createdBy: string;
  }): Promise<{ inviteId: string; inviteToken: string }>;
  acceptInvite(input: {
    token: string;
    pin: string;
    displayName?: string | null;
  }): Promise<{ organizationId: string; projectId: string; userId: string }>;
};

export type WorkPhasePort = {
  listWorkPhases(projectId: string, tenantId: string): Promise<Array<{
    work_phase_id: string;
    code: string;
    name: string;
    status: string | null;
    created_at: string;
  }>>;
  createWorkPhase(input: {
    projectId: string;
    tenantId: string;
    code: string;
    name: string;
    responsibleUserId?: string | null;
    status?: string | null;
    createdBy: string;
  }): Promise<{ workPhaseId: string }>;
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

export type TargetEstimateMappingPort = {
  listItems(projectId: string, tenantId: string): Promise<Array<{
    budget_item_id: string;
    littera_code: string;
    item_code: string;
    item_desc: string | null;
    qty: number | null;
    unit: string | null;
    total_eur: number | null;
    is_leaf: boolean;
    work_phase_id: string | null;
    work_phase_name: string | null;
    proc_package_id: string | null;
    proc_package_name: string | null;
  }>>;
  listProcPackages(projectId: string, tenantId: string): Promise<Array<{
    proc_package_id: string;
    name: string;
    description: string | null;
    default_work_package_id: string | null;
  }>>;
  createProcPackage(input: {
    projectId: string;
    tenantId: string;
    code: string;
    name: string;
    description?: string | null;
    defaultWorkPackageId?: string | null;
    ownerType?: string | null;
    vendorName?: string | null;
    contractRef?: string | null;
    status?: string | null;
    createdBy: string;
  }): Promise<{ procPackageId: string }>;
  upsertItemMappings(input: {
    projectId: string;
    tenantId: string;
    updatedBy: string;
    updates: Array<{
      budgetItemId: string;
      workPhaseId?: string | null;
      procPackageId?: string | null;
    }>;
  }): Promise<{ updatedCount: number }>;
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
