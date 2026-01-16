export type RoleCode =
  | "SITE_FOREMAN"
  | "GENERAL_FOREMAN"
  | "PROJECT_MANAGER"
  | "PROJECT_OWNER"
  | "PRODUCTION_MANAGER"
  | "PROCUREMENT"
  | "EXEC_READONLY"
  | "ORG_ADMIN"
  | "SELLER"
  | "GROUP_ADMIN"
  | "GROUP_VIEWER";

export type PermissionCode =
  | "REPORT_READ"
  | "PLANNING_WRITE"
  | "FORECAST_WRITE"
  | "WORK_PHASE_WEEKLY_UPDATE_CREATE"
  | "WORK_PHASE_WEEKLY_UPDATE_APPROVE"
  | "GHOST_ENTRY_CREATE"
  | "CORRECTION_PROPOSE"
  | "CORRECTION_APPROVE_PM"
  | "CORRECTION_APPROVE_FINAL"
  | "BASELINE_LOCK"
  | "MEMBERS_MANAGE"
  | "TERMINOLOGY_MANAGE"
  | "SELLER_UI"
  | "SAAS_ONBOARDING_MANAGE"
  | "GROUP_READ";

export type SessionUser = {
  userId: string;
  username: string;
  displayName?: string | null;
  organizationId: string;
  tenantId: string;
  projectId: string;
  permissions: PermissionCode[];
};
