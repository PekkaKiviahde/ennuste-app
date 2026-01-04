import { NextResponse } from "next/server";
import { loadStagingSummary } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { getSessionFromRequest } from "../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }
    const batchId = params.batchId;
    if (!batchId) {
      return NextResponse.json({ error: "batchId puuttuu." }, { status: 400 });
    }

    const services = createServices();
    const summary = await loadStagingSummary(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      batchId
    });

    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
