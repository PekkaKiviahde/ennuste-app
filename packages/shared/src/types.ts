export type RoleCode =
  | "SITE_FOREMAN"
  | "GENERAL_FOREMAN"
  | "PROJECT_MANAGER"
  | "PRODUCTION_MANAGER"
  | "PROCUREMENT"
  | "EXEC_READONLY"
  | "ORG_ADMIN";

export type PermissionCode =
  | "REPORT_READ"
  | "WORK_PHASE_WEEKLY_UPDATE_CREATE"
  | "WORK_PHASE_WEEKLY_UPDATE_APPROVE"
  | "GHOST_ENTRY_CREATE"
  | "CORRECTION_PROPOSE"
  | "CORRECTION_APPROVE_PM"
  | "CORRECTION_APPROVE_FINAL"
  | "BASELINE_LOCK"
  | "MEMBERS_MANAGE"
  | "TERMINOLOGY_MANAGE";

export type SessionUser = {
  userId: string;
  username: string;
  displayName?: string | null;
  organizationId: string;
  tenantId: string;
  projectId: string;
  permissions: PermissionCode[];
};
