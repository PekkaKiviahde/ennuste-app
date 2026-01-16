import { NextResponse } from "next/server";
import { archiveDemoProject } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { requireTenantContextFromRequest } from "../../../../server/tenantContext";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const ctx = await requireTenantContextFromRequest(request);

    const body = await request.json();
    const demoProjectId = String(body.demoProjectId || "").trim();
    if (!demoProjectId) {
      return NextResponse.json({ error: "demoProjectId puuttuu." }, { status: 400 });
    }

    const services = createServices();
    const result = await archiveDemoProject(services, {
      projectId: ctx.projectId,
      tenantId: ctx.tenantId,
      username: ctx.username,
      demoProjectId
    });

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
