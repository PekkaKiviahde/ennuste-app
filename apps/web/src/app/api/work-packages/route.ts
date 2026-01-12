import { NextResponse } from "next/server";
import { createWorkPackage, loadWorkPackages } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { getSessionFromRequest } from "../../../server/session";
import { AppError } from "@ennuste/shared";

export async function GET(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const services = createServices();
    const rows = await loadWorkPackages(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username
    });

    return NextResponse.json({ rows });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }

    const body = await request.json();
    const code = String(body?.code ?? "").trim();
    const name = String(body?.name ?? "").trim();
    if (!code) {
      return NextResponse.json({ error: "Tyopaketin koodi puuttuu" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(code)) {
      return NextResponse.json({ error: "Tyopaketin koodi on oltava 4 numeroa." }, { status: 400 });
    }
    if (!name) {
      return NextResponse.json({ error: "Tyopaketin nimi puuttuu" }, { status: 400 });
    }

    const services = createServices();
    const result = await createWorkPackage(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      code,
      name,
      responsibleUserId: body?.responsibleUserId ?? null,
      status: body?.status ?? null
    });

    return NextResponse.json({ workPackageId: result.workPackageId }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
