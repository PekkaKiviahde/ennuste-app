import { exportStagingBatch } from "@ennuste/application";
import { createServices } from "../../../../../server/services";
import { getSessionFromRequest } from "../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request, { params }: { params: { batchId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return new Response(JSON.stringify({ error: "Kirjaudu ensin sisaan" }), { status: 401 });
    }
    const batchId = params.batchId;
    if (!batchId) {
      return new Response(JSON.stringify({ error: "batchId puuttuu." }), { status: 400 });
    }

    const url = new URL(request.url);
    const modeRaw = url.searchParams.get("mode") || "clean";
    if (!["clean", "all"].includes(modeRaw)) {
      return new Response(JSON.stringify({ error: "mode on virheellinen (clean|all)." }), { status: 400 });
    }

    const services = createServices();
    const result = await exportStagingBatch(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      batchId,
      mode: modeRaw as "clean" | "all"
    });

    return new Response(result.csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename=\"${result.fileName}\"`
      }
    });
  } catch (error) {
    if (error instanceof AppError) {
      return new Response(JSON.stringify({ error: error.message }), { status: error.status });
    }
    return new Response(JSON.stringify({ error: "Tapahtui odottamaton virhe" }), { status: 500 });
  }
}
