import { NextResponse } from "next/server";
import { createGroup } from "@ennuste/application";
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
    const name = String(body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Nimi puuttuu." }, { status: 400 });
    }

    const services = createServices();
    const result = await createGroup(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      name
    });

    return NextResponse.json({ group_id: result.groupId }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
