import { NextResponse } from "next/server";
import { createPlanningEvent, loadPlanningReport } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const body = await request.json();
    const services = createServices();
    const result = await createPlanningEvent(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      targetLitteraId: body.targetLitteraId,
      status: body.status,
      summary: body.summary ?? null,
      observations: body.observations ?? null,
      risks: body.risks ?? null,
      decisions: body.decisions ?? null,
      createdBy: session.username
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const services = createServices();
    const rows = await loadPlanningReport(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username
    });

    return NextResponse.json({ rows });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
