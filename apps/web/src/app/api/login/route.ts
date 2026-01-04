import { NextResponse } from "next/server";
import { login } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { COOKIE_NAME, DEFAULT_MAX_AGE_SECONDS, createSessionToken } from "../../../server/session";
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
    const sessionId = await services.auth.createSession(result.session);
    const token = createSessionToken(sessionId, DEFAULT_MAX_AGE_SECONDS);
    const response = NextResponse.json({ ok: true });
    response.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEFAULT_MAX_AGE_SECONDS
    });
    return response;
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: "Tapahtui odottamaton virhe" }, { status: 500 });
  }
}
