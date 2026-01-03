import { NextResponse } from "next/server";
import { login } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { setSessionCookie } from "../../../server/session";

export async function POST(request: Request) {
  const body = await request.json();
  const services = createServices();
  const result = await login(services, {
    username: body.username,
    pin: body.pin,
    projectId: body.projectId
  });
  setSessionCookie(result.session);
  return NextResponse.json({ ok: true });
}
