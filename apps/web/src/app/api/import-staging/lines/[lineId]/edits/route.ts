import { NextResponse } from "next/server";
import { editStagingLine } from "@ennuste/application";
import { createServices } from "../../../../../../server/services";
import { getSessionFromRequest } from "../../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request, { params }: { params: { lineId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }
    const lineId = params.lineId;
    if (!lineId) {
      return NextResponse.json({ error: "lineId puuttuu." }, { status: 400 });
    }

    const body = await request.json();
    const edit = body.edit;
    if (!edit || typeof edit !== "object") {
      return NextResponse.json({ error: "edit puuttuu tai on virheellinen." }, { status: 400 });
    }

    const services = createServices();
    const result = await editStagingLine(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      lineId,
      edit,
      reason: body.reason ? String(body.reason) : null
    });

    return NextResponse.json({ staging_line_edit_id: result.stagingLineEditId });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
