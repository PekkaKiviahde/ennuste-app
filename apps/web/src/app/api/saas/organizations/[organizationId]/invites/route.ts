import { NextResponse } from "next/server";
import { createOrganizationInvite } from "@ennuste/application";
import { createServices } from "../../../../../../server/services";
import { getSessionFromRequest } from "../../../../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request, { params }: { params: { organizationId: string } }) {
  try {
    const session = await getSessionFromRequest(request);
    if (!session) {
      return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
    }
    const organizationId = params.organizationId;
    if (!organizationId) {
      return NextResponse.json({ error: "organizationId puuttuu." }, { status: 400 });
    }
    const body = await request.json();
    const email = String(body.email || "").trim();
    if (!email) {
      return NextResponse.json({ error: "Email puuttuu." }, { status: 400 });
    }

    const services = createServices();
    const result = await createOrganizationInvite(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      organizationId,
      email,
      roleCode: body.roleCode ? String(body.roleCode) : null
    });

    return NextResponse.json({ invite_id: result.inviteId, invite_token: result.inviteToken }, { status: 201 });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
