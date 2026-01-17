import { NextResponse } from "next/server";
import { createServices } from "../../../server/services";
import { requireTenantContextFromRequest } from "../../../server/tenantContext";
import { AppError, assertAnyPermission } from "@ennuste/shared";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContextFromRequest(request);
    assertAnyPermission(ctx.permissions, ["REPORT_READ", "SELLER_UI"], "Ei oikeutta listata projekteja");

    const services = createServices();
    const projects = await services.auth.listUserProjects(ctx.username);

    return NextResponse.json({ projects }, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      try {
        // best-effort audit; ei PII:tä (actor=userId)
        if (error.status === 403) {
          const ctx = await requireTenantContextFromRequest(request);
          const services = createServices();
          await services.audit.recordEvent({
            projectId: ctx.projectId,
            tenantId: ctx.tenantId,
            actor: ctx.userId,
            action: "rbac.access_denied",
            payload: { path: "/api/projects", required_permissions: ["REPORT_READ", "SELLER_UI"] }
          });
        }
      } catch {
        // ignore audit failures
      }
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}

