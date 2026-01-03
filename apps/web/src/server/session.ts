import crypto from "node:crypto";
import { cookies } from "next/headers";
import type { SessionUser } from "@ennuste/shared";
import { AuthError } from "@ennuste/shared";

const COOKIE_NAME = "ennuste_session";
const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 8; // 8h

const getSecret = () => {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET puuttuu");
  }
  return secret;
};

const sign = (payload: string, secret: string) =>
  crypto.createHmac("sha256", secret).update(payload).digest("base64url");

const encode = (session: SessionUser, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  const payload = {
    session,
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
  const payload = JSON.parse(json) as { session: SessionUser; exp: number };
  if (Date.now() > payload.exp) {
    throw new AuthError("Istunto on vanhentunut");
  }
  return payload.session;
};

export const setSessionCookie = (session: SessionUser, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  const value = encode(session, maxAgeSeconds);
  cookies().set(COOKIE_NAME, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds
  });
};

export const createSessionToken = (session: SessionUser, maxAgeSeconds = DEFAULT_MAX_AGE_SECONDS) => {
  return encode(session, maxAgeSeconds);
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

export const getSessionFromCookies = (): SessionUser | null => {
  const value = cookies().get(COOKIE_NAME)?.value;
  if (!value) {
    return null;
  }
  return decode(value);
};

export const getSessionFromRequest = (request: Request): SessionUser | null => {
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

export const requireSession = (): SessionUser => {
  const session = getSessionFromCookies();
  if (!session) {
    throw new AuthError("Kirjaudu sisaan");
  }
  return session;
};
