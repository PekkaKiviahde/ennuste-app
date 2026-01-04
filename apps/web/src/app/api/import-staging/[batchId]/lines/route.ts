import { NextResponse } from "next/server";
import { loadStagingLines } from "@ennuste/application";
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

    const url = new URL(request.url);
    const modeRaw = url.searchParams.get("mode") || "issues";
    const severityRaw = url.searchParams.get("severity");
    const mode = ["issues", "clean", "all"].includes(modeRaw) ? (modeRaw as "issues" | "clean" | "all") : "issues";
    const severity = severityRaw ? severityRaw.toUpperCase() : null;
    const severityValue = ["ERROR", "WARN", "INFO"].includes(severity || "")
      ? (severity as "ERROR" | "WARN" | "INFO")
      : null;

    const services = createServices();
    const result = await loadStagingLines(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      batchId,
      mode,
      severity: severityValue
    });

    return NextResponse.json({ lines: result.lines });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
