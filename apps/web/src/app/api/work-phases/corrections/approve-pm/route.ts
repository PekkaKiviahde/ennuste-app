import { NextResponse } from "next/server";
import { approveCorrectionPm } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { getSessionFromRequest } from "../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const session = getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const body = await request.json();
    const services = createServices();
    await approveCorrectionPm(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      correctionId: body.correctionId,
      comment: body.comment ?? null,
      username: session.username
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
