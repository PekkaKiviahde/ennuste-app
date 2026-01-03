import { NextResponse } from "next/server";
import { createForecastEvent } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const services = createServices();
  const result = await createForecastEvent(services, {
    projectId: session.projectId,
    targetLitteraId: body.targetLitteraId,
    mappingVersionId: body.mappingVersionId ?? null,
    comment: body.comment ?? null,
    technicalProgress: body.technicalProgress ?? null,
    financialProgress: body.financialProgress ?? null,
    kpiValue: body.kpiValue ?? null,
    createdBy: session.username,
    lines: body.lines ?? []
  });

  return NextResponse.json(result, { status: 201 });
}
