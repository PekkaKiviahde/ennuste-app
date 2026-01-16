import type { SessionUser } from "@ennuste/shared";
import { AuthError, ForbiddenError } from "@ennuste/shared";
import { getSessionFromRequest } from "./session";

export type TenantContext = {
  userId: string;
  username: string;
  displayName?: string | null;
  organizationId: string;
  tenantId: string;
  projectId: string;
  permissions: SessionUser["permissions"];
  roles: NonNullable<SessionUser["roles"]>;
};

export const requireTenantContextFromRequest = async (request: Request): Promise<TenantContext> => {
  const session = await getSessionFromRequest(request);
  if (!session) {
    throw new AuthError("Kirjaudu ensin sisaan");
  }

  const tenantId = (session.tenantId ?? "").trim();
  const organizationId = (session.organizationId ?? "").trim();
  const projectId = (session.projectId ?? "").trim();
  if (!tenantId || !organizationId || !projectId) {
    throw new ForbiddenError("Tenant-konteksti puuttuu");
  }

  return {
    userId: session.userId,
    username: session.username,
    displayName: session.displayName ?? null,
    organizationId,
    tenantId,
    projectId,
    permissions: session.permissions,
    roles: session.roles ?? []
  };
};
