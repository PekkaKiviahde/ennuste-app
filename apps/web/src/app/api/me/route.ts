import { NextResponse } from "next/server";
import { requireTenantContextFromRequest } from "../../../server/tenantContext";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request) {
  try {
    const ctx = await requireTenantContextFromRequest(request);

    return NextResponse.json({
      user: {
        userId: ctx.userId,
        username: ctx.username,
        displayName: ctx.displayName ?? null,
        organizationId: ctx.organizationId,
        tenantId: ctx.tenantId,
        projectId: ctx.projectId,
        permissions: ctx.permissions,
        roles: ctx.roles
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
