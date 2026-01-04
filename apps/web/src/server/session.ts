import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "@ennuste/shared";
import { AuthError } from "@ennuste/shared";
import { createServices } from "./services";

export const COOKIE_NAME = "ennuste_session";
export const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET puuttuu");
  }
  return secret;
};

const sign = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

const encode = (sessionId: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  const payload = {
    sessionId,
    exp: Date.now() + maxAgeSeconds * 1000
  };
  const json = JSON.stringify(payload);
  const b64 = Buffer.from(json, "utf8").toString("base64url");
  const signature = sign(b64, getSecret());
  return `${b64}.${signature}`;
};

const decode = (value: string) => {
  const [b64, signature] = value.split(".");
  if (!b64 || !signature) {
    throw new AuthError("Istunto ei kelpaa");
  }
  const expected = sign(b64, getSecret());
  if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new AuthError("Istunnon allekirjoitus ei kelpaa");
  }
  const json = Buffer.from(b64, "base64url").toString("utf8");
  const payload = JSON.parse(json) as { sessionId: string; exp: number };
  if (Date.now() > payload.exp) {
    throw new AuthError("Istunto on vanhentunut");
  }
  return payload.sessionId;
};

export const setSessionCookie = (sessionId: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  const value = encode(sessionId, maxAgeSeconds);
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  });
};

export const createSessionToken = (sessionId: string, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  return encode(sessionId, maxAgeSeconds);
};

export const clearSessionCookie = () => {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
};

const getSessionIdFromCookies = (): string | null => {
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  return decode(value);
};

const getSessionIdFromRequest = (request: Request): string | null => {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  const parts = cookieHeader.split(";").map((part) => part.trim());
  const match = parts.find((part) => part.startsWith(`${COOKIE_NAME}=`));
  if (!match) {
    return null;
  }
  const value = match.slice(COOKIE_NAME.length + 1);
  return decode(value);
};

export const getSessionFromCookies = async (): Promise<SessionUser | null> => {
  let sessionId: string | null = null;
  try {
    sessionId = getSessionIdFromCookies();
  } catch {
    return null;
  }
  if (!sessionId) {
    return null;
  }
  const services = createServices();
  return services.auth.getSession(sessionId);
};

export const getSessionFromRequest = async (request: Request): Promise<SessionUser | null> => {
  let sessionId: string | null = null;
  try {
    sessionId = getSessionIdFromRequest(request);
  } catch {
    return null;
  }
  if (!sessionId) {
    return null;
  }
  const services = createServices();
  return services.auth.getSession(sessionId);
};

export const requireSession = async (): Promise<SessionUser> => {
  const sessionId = getSessionIdFromCookies();
  if (!sessionId) {
    throw new AuthError("Kirjaudu sisaan");
  }
  const services = createServices();
  const session = await services.auth.getSession(sessionId);
  if (!session) {
    throw new AuthError("Istunto ei ole voimassa");
  }
  return session;
};

export const getSessionIdForLogout = (): string | null => {
  try {
    return getSessionIdFromCookies();
  } catch {
    return null;
  }
};
