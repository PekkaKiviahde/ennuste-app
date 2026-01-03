import { NextResponse } from "next/server";
import { login } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { setSessionCookie } from "../../../server/session";
import { AppError } from "@ennuste/shared";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const services = createServices();
    const result = await login(services, {
      username: body.username,
      pin: body.pin,
      projectId: body.projectId
    });
    setSessionCookie(result.session);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
