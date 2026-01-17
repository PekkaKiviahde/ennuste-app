import { NextResponse } from "next/server";
import { dbForTenant } from "@ennuste/infrastructure";
import { createServices } from "../../../../server/services";
import { requireTenantContextFromRequest } from "../../../../server/tenantContext";
import { AppError, ForbiddenError, assertAnyPermission } from "@ennuste/shared";

export async function GET(request: Request, { params }: { params: { projectId: string } }) {
  try {
    const ctx = await requireTenantContextFromRequest(request);
    assertAnyPermission(ctx.permissions, ["REPORT_READ", "SELLER_UI"], "Ei oikeutta lukea projektia");

    const projectId = String(params.projectId || "").trim();
    if (!projectId) {
      return NextResponse.json({ error: "projectId puuttuu." }, { status: 400 });
    }

    // Tenant-scope: projectId pitää kuulua sessio-tenanttiin, ja käyttäjällä pitää olla jokin permission projektiin.
    const services = createServices();
    const permissions = await services.rbac.listPermissions(projectId, ctx.tenantId, ctx.username);
    if (permissions.length === 0) {
      throw new ForbiddenError("Ei oikeutta projektiin");
    }

    const tenantDb = dbForTenant(ctx.tenantId);
    await tenantDb.requireProject(projectId);
    const result = await tenantDb.query<{
      project_id: string;
      name: string;
      customer: string | null;
      organization_id: string;
      tenant_id: string;
      project_state: string;
      is_demo: boolean;
      archived_at: string | null;
      created_at: string;
    }>(
      "SELECT project_id, name, customer, organization_id, tenant_id, project_state, is_demo, archived_at, created_at FROM projects WHERE project_id = $1::uuid AND tenant_id = $2::uuid",
      [projectId, ctx.tenantId]
    );

    const project = result.rows[0] ?? null;
    if (!project) {
      return NextResponse.json({ error: "Projektia ei loydy." }, { status: 404 });
    }

    return NextResponse.json({ project, permissions }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      try {
        if (error.status === 403) {
          const ctx = await requireTenantContextFromRequest(request);
          const services = createServices();
          await services.audit.recordEvent({
            projectId: ctx.projectId,
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            action: "rbac.access_denied",
            payload: { path: "/api/projects/[projectId]", target_project_id: params.projectId }
          });
        }
      } catch {
        // ignore
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}

