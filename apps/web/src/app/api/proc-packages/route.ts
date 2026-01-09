import { NextResponse } from "next/server";
import { createProcPackage, loadProcPackages } from "@ennuste/application";
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
    const rows = await loadProcPackages(services, {
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
    const name = String(body?.name ?? "").trim();
    if (!name) {
      return NextResponse.json({ error: "Hankintapaketin nimi puuttuu" }, { status: 400 });
    }

    const services = createServices();
    const result = await createProcPackage(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      name,
      description: body?.description ?? null,
      defaultWorkPackageId: body?.defaultWorkPackageId ?? null
    });

    return NextResponse.json({ procPackageId: result.procPackageId }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
