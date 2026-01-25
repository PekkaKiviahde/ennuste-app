import { cookies } from "next/headers";
import type { SessionUser } from "@ennuste/shared";
import { DEFAULT_MAX_AGE_SECONDS } from "./session";
import { decodeSignedPayload, encodeSignedPayload } from "./signedCookie";

export const ADMIN_SESSION_COOKIE = "ennuste_admin_session";

type AdminSessionPayload = {
  admin: true;
  exp: number;
};

export const isAdminModeEnabled = () => process.env.ADMIN_MODE === "true";

export const isAdminUser = (session: SessionUser) =>
  session.permissions.includes("MEMBERS_MANAGE") || (session.roles ?? []).includes("ORG_ADMIN");

export const setAdminSessionCookie = (enabled: boolean) => {
  if (!enabled) {
    cookies().set(ADMIN_SESSION_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    return;
  }
  const exp = Date.now() + DEFAULT_MAX_AGE_SECONDS * 1000;
  const value = encodeSignedPayload({ admin: true, exp } as AdminSessionPayload);
  cookies().set(ADMIN_SESSION_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEFAULT_MAX_AGE_SECONDS
  });
};

export const hasAdminSessionCookie = () => {
  const value = cookies().get(ADMIN_SESSION_COOKIE)?.value;
  if (!value) {
    return false;
  }
  try {
    const payload = decodeSignedPayload<AdminSessionPayload>(value);
    if (payload.admin !== true) {
      return false;
    }
    if (!payload.exp || Date.now() > payload.exp) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
};
