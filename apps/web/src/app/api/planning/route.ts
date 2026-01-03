import { NextResponse } from "next/server";
import { createPlanningEvent } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";

export async function POST(request: Request) {
  const session = getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const services = createServices();
  const result = await createPlanningEvent(services, {
    projectId: session.projectId,
    targetLitteraId: body.targetLitteraId,
    status: body.status,
    summary: body.summary ?? null,
    observations: body.observations ?? null,
    risks: body.risks ?? null,
    decisions: body.decisions ?? null,
    createdBy: session.username
  });

  return NextResponse.json(result, { status: 201 });
}
