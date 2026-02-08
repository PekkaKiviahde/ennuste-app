import type {
  AdminPort,
  AuditPort,
  AuthPort,
  BillingWebhookPort,
  ForecastEventInput,
  ForecastPort,
  HealthPort,
  ImportStagingPort,
  SaasPort,
  PlanningEventInput,
  PlanningPort,
  RbacPort,
  ReportPort,
  TargetEstimateMappingPort,
  WorkPackagePort
} from "./ports";
import { AppError } from "@ennuste/shared";

export type AppServices = {
  auth: AuthPort;
  health: HealthPort;
  rbac: RbacPort;
  planning: PlanningPort;
  forecast: ForecastPort;
  report: ReportPort;
  importStaging: ImportStagingPort;
  saas: SaasPort;
  admin: AdminPort;
  workPackages: WorkPackagePort;
  targetEstimateMapping: TargetEstimateMappingPort;
  audit: AuditPort;
  billingWebhook: BillingWebhookPort;
};

export const checkHealth = async (services: AppServices) => {
  return services.health.check();
};

export const login = async (services: AppServices, input: { username: string; pin: string; projectId?: string }) => {
  const result = await services.auth.loginWithPin(input);
  await services.audit.recordEvent({
    projectId: result.session.projectId,
    tenantId: result.session.tenantId,
    actor: result.session.username,
    action: "auth.login",
    payload: {
      projectSelected: Boolean(input.projectId)
    }
  });
  return result;
};

export const switchProject = async (
  services: AppServices,
  input: { username: string; projectId: string }
) => {
  const result = await services.auth.switchProject({
    username: input.username,
    projectId: input.projectId
  });
  await services.audit.recordEvent({
    projectId: result.session.projectId,
    tenantId: result.session.tenantId,
    actor: result.session.username,
    action: "auth.switch_project",
    payload: {
      projectId: result.session.projectId
    }
  });
  return result;
};

export const listUserProjects = async (
  services: AppServices,
  input: { username: string }
) => {
  return services.auth.listUserProjects(input.username);
};

export const consumeBillingWebhook = async (
  services: AppServices,
  input: { provider: string; rawBody: Uint8Array; headers: Record<string, string> }
) => {
  return services.billingWebhook.consumeWebhook(input);
};

export const createPlanningEvent = async (services: AppServices, input: PlanningEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.createdBy, "PLANNING_WRITE");
  const result = await services.planning.createPlanningEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.createdBy,
    action: "planning.create",
    payload: {
      planningEventId: result.planningEventId,
      targetLitteraId: input.targetLitteraId,
      status: input.status,
      summary: input.summary ?? null
    }
  });
  return result;
};

export const createForecastEvent = async (services: AppServices, input: ForecastEventInput) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.createdBy, "FORECAST_WRITE");
  const planning = await services.planning.getLatestPlanningStatus(
    input.projectId,
    input.tenantId,
    input.targetLitteraId
  );
  if (!planning) {
    throw new AppError("Suunnitelma puuttuu tavoitearvio-litteralta.", "PLANNING_MISSING", 409);
  }
  if (planning.status !== "READY_FOR_FORECAST" && planning.status !== "LOCKED") {
    throw new AppError(
      `Suunnitelman tila on ${planning.status}. Ennustaminen vaatii tilan READY_FOR_FORECAST tai LOCKED.`,
      "PLANNING_NOT_READY",
      409
    );
  }
  const result = await services.forecast.createForecastEvent(input);
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.createdBy,
    action: "forecast.create",
    payload: {
      forecastEventId: result.forecastEventId,
      targetLitteraId: input.targetLitteraId,
      lineCount: input.lines.length,
      summary: input.comment ?? null
    }
  });
  return result;
};

export const loadDashboard = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getDashboard(input.projectId, input.tenantId);
};

export const loadWorkPackageReport = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getWorkPackageReport(input.projectId, input.tenantId);
};

export const loadWorkPackageComposition = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getWorkPackageComposition(input.projectId, input.tenantId);
};

export const loadForecastReport = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getForecastReport(input.projectId, input.tenantId);
};

export const loadForecastSnapshot = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; targetLitteraId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.forecast.getForecastSnapshot(input.projectId, input.tenantId, input.targetLitteraId);
};

export const loadPlanningReport = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getPlanningReport(input.projectId, input.tenantId);
};

export const loadPlanningStatus = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; targetLitteraId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.planning.getLatestPlanningStatus(input.projectId, input.tenantId, input.targetLitteraId);
};

export const loadTargetEstimate = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getTargetEstimate(input.projectId, input.tenantId);
};

export const loadMappingVersions = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getMappingVersions(input.projectId, input.tenantId);
};

export const loadMappingLines = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getMappingLines(input.projectId, input.tenantId);
};

export const loadTargetEstimateMapping = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const [items, workPackages, procPackages] = await Promise.all([
    services.targetEstimateMapping.listItems(input.projectId, input.tenantId),
    services.workPackages.listWorkPackages(input.projectId, input.tenantId),
    services.targetEstimateMapping.listProcPackages(input.projectId, input.tenantId)
  ]);
  return { items, workPackages, procPackages };
};

export const loadProcPackages = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.targetEstimateMapping.listProcPackages(input.projectId, input.tenantId);
};

export const loadAuditLog = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getAuditLog(input.projectId, input.tenantId);
};

export const createWorkPackage = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; code: string; name: string; responsibleUserId?: string | null; status?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "PLANNING_WRITE");
  const result = await services.workPackages.createWorkPackage({
    projectId: input.projectId,
    tenantId: input.tenantId,
    code: input.code,
    name: input.name,
    responsibleUserId: input.responsibleUserId ?? null,
    status: input.status ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.create",
    payload: {
      workPackageId: result.workPackageId,
      code: input.code,
      name: input.name
    }
  });
  return result;
};

export const createProcPackage = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    code: string;
    name: string;
    description?: string | null;
    defaultWorkPackageId: string;
    ownerType?: string | null;
    vendorName?: string | null;
    contractRef?: string | null;
    status?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "PLANNING_WRITE");
  const defaultWorkPackageId = input.defaultWorkPackageId;
  const result = await services.targetEstimateMapping.createProcPackage({
    projectId: input.projectId,
    tenantId: input.tenantId,
    code: input.code,
    name: input.name,
    description: input.description ?? null,
    defaultWorkPackageId,
    ownerType: input.ownerType ?? null,
    vendorName: input.vendorName ?? null,
    contractRef: input.contractRef ?? null,
    status: input.status ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "proc_package.create",
    payload: {
      procPackageId: result.procPackageId,
      code: input.code,
      name: input.name
    }
  });
  return result;
};

export const assignTargetEstimateMappings = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    updates: Array<{ targetEstimateItemId: string; workPackageId?: string | null; procPackageId?: string | null }>;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "PLANNING_WRITE");
  const result = await services.targetEstimateMapping.upsertItemMappings({
    projectId: input.projectId,
    tenantId: input.tenantId,
    updatedBy: input.username,
    updates: input.updates
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "target_estimate.mapping_upsert",
    payload: {
      updatedCount: result.updatedCount,
      targetEstimateItemCount: input.updates.length
    }
  });
  return result;
};

export const loadFilteredAuditLog = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; actionFilter?: string[] | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getAuditLog(input.projectId, input.tenantId, input.actionFilter ?? null);
};

export const loadWorkflowStatus = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.report.getWorkflowStatus(input.projectId, input.tenantId);
};

export const createBudgetStaging = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; importedBy: string; fileName?: string | null; csvText: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.createBudgetStagingBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    importedBy: input.importedBy,
    fileName: input.fileName ?? null,
    csvText: input.csvText
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.importedBy,
    action: "import_staging.create",
    payload: {
      staging_batch_id: result.stagingBatchId,
      file_name: input.fileName ?? null,
      warnings: result.warnings
    }
  });
  return result;
};

export const loadStagingBatches = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.listBatches(input.projectId, input.tenantId);
};

export const loadStagingLines = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    batchId: string;
    mode: "issues" | "clean" | "all";
    severity?: "ERROR" | "WARN" | "INFO" | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.listLines({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    mode: input.mode,
    severity: input.severity ?? null
  });
};

export const editStagingLine = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    lineId: string;
    edit: Record<string, unknown>;
    reason?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.editLine({
    projectId: input.projectId,
    tenantId: input.tenantId,
    lineId: input.lineId,
    editedBy: input.username,
    edit: input.edit,
    reason: input.reason ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.edit",
    payload: { staging_line_id: input.lineId, reason: input.reason ?? null }
  });
  return result;
};

export const approveStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; message?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.addBatchEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    status: "APPROVED",
    message: input.message ?? null,
    actor: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.approve",
    payload: { staging_batch_id: input.batchId, message: input.message ?? null }
  });
  return result;
};

export const rejectStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; message?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.addBatchEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    status: "REJECTED",
    message: input.message ?? null,
    actor: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.reject",
    payload: { staging_batch_id: input.batchId, message: input.message ?? null }
  });
  return result;
};

export const loadStagingSummary = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.getSummary({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId
  });
};

export const commitStagingBatch = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    batchId: string;
    message?: string | null;
    allowDuplicate?: boolean;
    force?: boolean;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  const result = await services.importStaging.commitBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    committedBy: input.username,
    message: input.message ?? null,
    allowDuplicate: input.allowDuplicate ?? false,
    force: input.force ?? false
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "import_staging.commit",
    payload: {
      staging_batch_id: input.batchId,
      import_batch_id: result.importBatchId,
      inserted_rows: result.insertedRows,
      message: input.message ?? null
    }
  });
  return result;
};

export const exportStagingBatch = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; batchId: string; mode: "clean" | "all" }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.importStaging.exportBatch({
    projectId: input.projectId,
    tenantId: input.tenantId,
    batchId: input.batchId,
    mode: input.mode
  });
};

export const createGroup = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; name: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createGroup({
    name: input.name,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "group.created",
    payload: { group_id: result.groupId, name: input.name }
  });
  return result;
};

export const createOrganizationWithInvite = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    groupId?: string | null;
    name: string;
    slug: string;
    adminEmail: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createOrganizationWithInvite({
    groupId: input.groupId ?? null,
    name: input.name,
    slug: input.slug,
    adminEmail: input.adminEmail,
    createdBy: input.username
  });

  if (result.created.groupCreated) {
    await services.audit.recordEvent({
      projectId: input.projectId,
      tenantId: input.tenantId,
      actor: input.username,
      action: "group.created",
      payload: {
        group_id: result.groupId,
        is_implicit: true,
        organization_slug: input.slug
      }
    });
  }

  if (result.created.organizationCreated) {
    await services.audit.recordEvent({
      projectId: input.projectId,
      tenantId: input.tenantId,
      actor: input.username,
      action: "org.created",
      payload: {
        organization_id: result.organizationId,
        tenant_id: result.tenantId,
        group_id: result.groupId,
        slug: input.slug,
        name: input.name
      }
    });
  }

  if (result.created.demoProjectCreated) {
    await services.audit.recordEvent({
      projectId: input.projectId,
      tenantId: input.tenantId,
      actor: input.username,
      action: "project.created",
      payload: {
        project_id: result.projectId,
        organization_id: result.organizationId,
        tenant_id: result.tenantId,
        is_demo: true
      }
    });
  }

  for (const revokedInviteId of result.revokedInviteIds) {
    await services.audit.recordEvent({
      projectId: input.projectId,
      tenantId: input.tenantId,
      actor: input.username,
      action: "invite.revoked",
      payload: {
        organization_id: result.organizationId,
        invite_id: revokedInviteId,
        reason: "resend"
      }
    });
  }
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "invite.created",
    payload: {
      organization_id: result.organizationId,
      invite_id: result.inviteId,
      admin_email: input.adminEmail
    }
  });
  return result;
};

export const createOrganizationInvite = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    username: string;
    organizationId: string;
    email: string;
    roleCode?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "SAAS_ONBOARDING_MANAGE");
  const result = await services.saas.createOrgInvite({
    organizationId: input.organizationId,
    email: input.email,
    roleCode: input.roleCode ?? null,
    createdBy: input.username
  });

  for (const revokedInviteId of result.revokedInviteIds) {
    await services.audit.recordEvent({
      projectId: input.projectId,
      tenantId: input.tenantId,
      actor: input.username,
      action: "invite.revoked",
      payload: { organization_id: input.organizationId, invite_id: revokedInviteId, reason: "resend" }
    });
  }
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "invite.created",
    payload: { organization_id: input.organizationId, invite_id: result.inviteId }
  });
  return result;
};

export const acceptInvite = async (
  services: AppServices,
  input: { token: string; pin: string; displayName?: string | null }
) => {
  const result = await services.saas.acceptInvite({
    token: input.token,
    pin: input.pin,
    displayName: input.displayName ?? null
  });
  return result;
};

export const loadAdminOverview = async (services: AppServices, input: { projectId: string; tenantId: string; username: string }) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "MEMBERS_MANAGE");
  return services.admin.getAdminOverview(input.projectId, input.tenantId);
};

export const archiveDemoProject = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string; demoProjectId: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "MEMBERS_MANAGE");
  return services.admin.archiveDemoProject({
    projectId: input.projectId,
    tenantId: input.tenantId,
    username: input.username,
    demoProjectId: input.demoProjectId
  });
};

export const loadWorkPackages = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; username: string }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "REPORT_READ");
  return services.workPackages.listWorkPackages(input.projectId, input.tenantId);
};

export const createWeeklyUpdate = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    workPackageId: string;
    weekEnding: string;
    percentComplete: number;
    progressNotes?: string | null;
    risks?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "WORK_PHASE_WEEKLY_UPDATE_CREATE");
  const result = await services.workPackages.createWeeklyUpdate({
    projectId: input.projectId,
    tenantId: input.tenantId,
    workPackageId: input.workPackageId,
    weekEnding: input.weekEnding,
    percentComplete: input.percentComplete,
    progressNotes: input.progressNotes ?? null,
    risks: input.risks ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.weekly_update",
    payload: { workPackageId: input.workPackageId, updateId: result.workPackageWeeklyUpdateId }
  });
  return result;
};

export const createGhostEntry = async (
  services: AppServices,
  input: {
    projectId: string;
    tenantId: string;
    workPackageId: string;
    weekEnding: string;
    costType: "LABOR" | "MATERIAL" | "SUBCONTRACT" | "RENTAL" | "OTHER";
    amount: number;
    description?: string | null;
    username: string;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "GHOST_ENTRY_CREATE");
  const result = await services.workPackages.createGhostEntry({
    projectId: input.projectId,
    tenantId: input.tenantId,
    workPackageId: input.workPackageId,
    weekEnding: input.weekEnding,
    costType: input.costType,
    amount: input.amount,
    description: input.description ?? null,
    createdBy: input.username
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.ghost_entry",
    payload: { workPackageId: input.workPackageId, ghostId: result.ghostCostEntryId }
  });
  return result;
};

export const lockBaseline = async (
  services: AppServices,
  input: {
    workPackageId: string;
    workPackageVersionId: string;
    targetImportBatchId: string;
    projectId: string;
    tenantId: string;
    username: string;
    notes?: string | null;
  }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "BASELINE_LOCK");
  const result = await services.workPackages.lockBaseline({
    workPackageId: input.workPackageId,
    workPackageVersionId: input.workPackageVersionId,
    targetImportBatchId: input.targetImportBatchId,
    tenantId: input.tenantId,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.baseline_lock",
    payload: { workPackageId: input.workPackageId, baselineId: result.workPackageBaselineId }
  });
  return result;
};

export const proposeCorrection = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; workPackageId: string; itemCode: string; username: string; notes?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_PROPOSE");
  const result = await services.workPackages.proposeCorrection({
    workPackageId: input.workPackageId,
    itemCode: input.itemCode,
    tenantId: input.tenantId,
    username: input.username,
    notes: input.notes ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.correction_proposed",
    payload: { workPackageId: input.workPackageId, correctionId: result.correctionId }
  });
  return result;
};

export const approveCorrectionPm = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_APPROVE_PM");
  await services.workPackages.approveCorrectionPm({
    correctionId: input.correctionId,
    tenantId: input.tenantId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.correction_pm_approved",
    payload: { correctionId: input.correctionId }
  });
};

export const approveCorrectionFinal = async (
  services: AppServices,
  input: { projectId: string; tenantId: string; correctionId: string; username: string; comment?: string | null }
) => {
  await services.rbac.requirePermission(input.projectId, input.tenantId, input.username, "CORRECTION_APPROVE_FINAL");
  const result = await services.workPackages.approveCorrectionFinal({
    correctionId: input.correctionId,
    tenantId: input.tenantId,
    username: input.username,
    comment: input.comment ?? null
  });
  await services.audit.recordEvent({
    projectId: input.projectId,
    tenantId: input.tenantId,
    actor: input.username,
    action: "work_package.correction_final_approved",
    payload: { correctionId: input.correctionId, baselineId: result.baselineId }
  });
  return result;
};
