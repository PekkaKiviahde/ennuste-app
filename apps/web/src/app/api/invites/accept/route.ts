import { NextResponse } from "next/server";
import { acceptInvite } from "@ennuste/application";
import { createServices } from "../../../../server/services";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = String(body.token || "").trim();
    const pin = String(body.pin || "").trim();
    const displayName = body.displayName ? String(body.displayName).trim() : null;
    if (!token || !pin) {
      return NextResponse.json({ error: "Token ja PIN vaaditaan." }, { status: 400 });
    }

    const services = createServices();
    const result = await acceptInvite(services, { token, pin, displayName });

    return NextResponse.json({
      organization_id: result.organizationId,
      project_id: result.projectId,
      user_id: result.userId
    });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
