import { NextResponse } from "next/server";
import { commitStagingBatch } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { getSessionFromRequest } from "../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }
    const batchId = params.batchId;
    if (!batchId) {
      return NextResponse.json({ error: "batchId puuttuu." }, { status: 400 });
    }

    const body = await request.json().catch(() => ({}));
    const services = createServices();
    const result = await commitStagingBatch(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      batchId,
      message: body.message ? String(body.message) : null,
      allowDuplicate: Boolean(body.allowDuplicate),
      force: Boolean(body.force)
    });

    return NextResponse.json({
      import_batch_id: result.importBatchId,
      inserted_rows: result.insertedRows,
      skipped_rows: result.skippedRows,
      skipped_values: result.skippedValues,
      error_issues: result.errorIssues
    }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
