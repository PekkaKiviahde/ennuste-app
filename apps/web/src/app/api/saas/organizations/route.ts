import { NextResponse } from "next/server";
import { createOrganizationWithInvite } from "@ennuste/application";
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
    const slug = String(body.slug || "").trim();
    const adminEmail = String(body.adminEmail || "").trim();
    if (!name || !slug || !adminEmail) {
      return NextResponse.json({ error: "Nimi, slug ja email vaaditaan." }, { status: 400 });
    }

    const services = createServices();
    const result = await createOrganizationWithInvite(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username,
      groupId: body.groupId ? String(body.groupId) : null,
      name,
      slug,
      adminEmail
    });

    return NextResponse.json(
      {
        organization_id: result.organizationId,
        tenant_id: result.tenantId,
        project_id: result.projectId,
        invite_id: result.inviteId,
        invite_token: result.inviteToken
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
