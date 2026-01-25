import { NextResponse } from "next/server";
import { loadAdminOverview } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";
import { isAdminModeEnabled } from "../../../server/adminSession";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request) {
  try {
    if (!isAdminModeEnabled()) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const services = createServices();
    const overview = await loadAdminOverview(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username
    });

    return NextResponse.json({ overview });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
