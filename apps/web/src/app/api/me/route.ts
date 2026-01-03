import { NextResponse } from "next/server";
import { getSessionFromRequest } from "../../../server/session";

export async function GET(request: Request) {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return NextResponse.json({ error: "Kirjaudu ensin sisaan" }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      userId: session.userId,
      username: session.username,
      displayName: session.displayName ?? null,
      organizationId: session.organizationId,
      tenantId: session.tenantId,
      projectId: session.projectId,
      permissions: session.permissions
    }
  });
}
