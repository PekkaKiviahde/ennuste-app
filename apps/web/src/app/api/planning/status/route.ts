import { NextResponse } from "next/server";
import { loadPlanningStatus } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { getSessionFromRequest } from "../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const targetLitteraId = searchParams.get("targetLitteraId");
    if (!targetLitteraId) {
      return NextResponse.json({ error: "Tavoitearvio-littera puuttuu" }, { status: 400 });
    }

    const services = createServices();
    const status = await loadPlanningStatus(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      targetLitteraId
    });

    return NextResponse.json({ status });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
