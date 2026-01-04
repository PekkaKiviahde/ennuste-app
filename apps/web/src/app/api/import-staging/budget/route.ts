import { NextResponse } from "next/server";
import { createBudgetStaging } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { getSessionFromRequest } from "../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const body = await request.json();
    const importedBy = String(body.importedBy || "").trim() || session.username;
    const csvText = String(body.csvText || "");
    if (!csvText.trim()) {
      return NextResponse.json({ error: "CSV-teksti puuttuu." }, { status: 400 });
    }

    const services = createServices();
    const result = await createBudgetStaging(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      importedBy,
      fileName: body.filename ? String(body.filename) : null,
      csvText
    });

    return NextResponse.json({
      staging_batch_id: result.stagingBatchId,
      line_count: result.lineCount,
      issue_count: result.issueCount,
      warnings: result.warnings
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
