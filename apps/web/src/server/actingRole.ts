import { cookies } from "next/headers";
import type { SessionUser } from "@ennuste/shared";
import { DEFAULT_MAX_AGE_SECONDS } from "./session";
import { decodeSignedPayload, encodeSignedPayload } from "./signedCookie";
import { hasAdminSessionCookie, isAdminModeEnabled, isAdminUser } from "./adminSession";

export const ACTING_ROLE_COOKIE = "ennuste_acting_role";

export const actingRoleOptions = [
  { roleCode: "SELLER", label: "Myyjä" },
  { roleCode: "SITE_FOREMAN", label: "Tyonjohtaja" },
  { roleCode: "GENERAL_FOREMAN", label: "Vastaava mestari" },
  { roleCode: "PROJECT_MANAGER", label: "Tyopaallikko" },
  { roleCode: "PRODUCTION_MANAGER", label: "Tuotantojohtaja" },
  { roleCode: "OPERATIONS", label: "Toiminta" },
  { roleCode: "PROCUREMENT", label: "Hankinta" },
  { roleCode: "EXEC_READONLY", label: "Johto" },
  { roleCode: "ORG_ADMIN", label: "Org-admin" }
] as const;

export type ActingRoleCode = (typeof actingRoleOptions)[number]["roleCode"];

type ActingRolePayload = {
  roleCode: ActingRoleCode;
  exp: number;
};

const actingRoleByCode = new Map<ActingRoleCode, (typeof actingRoleOptions)[number]>(
  actingRoleOptions.map((option) => [option.roleCode, option])
);

export const getActingRoleMeta = (roleCode: string | null | undefined) => {
  if (!roleCode) {
    return null;
  }
  return actingRoleByCode.get(roleCode as ActingRoleCode) ?? null;
};

export const setActingRoleCookie = (roleCode: ActingRoleCode | null) => {
  if (!roleCode) {
    cookies().set(ACTING_ROLE_COOKIE, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 0
    });
    return;
  }
  const roleMeta = getActingRoleMeta(roleCode);
  if (!roleMeta) {
    return;
  }
  const exp = Date.now() + DEFAULT_MAX_AGE_SECONDS * 1000;
  const value = encodeSignedPayload({ roleCode: roleMeta.roleCode, exp } as ActingRolePayload);
  cookies().set(ACTING_ROLE_COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DEFAULT_MAX_AGE_SECONDS
  });
};

export const getActingRoleFromCookies = () => {
  const value = cookies().get(ACTING_ROLE_COOKIE)?.value;
  if (!value) {
    return null;
  }
  try {
    const payload = decodeSignedPayload<ActingRolePayload>(value);
    if (!payload.exp || Date.now() > payload.exp) {
      return null;
    }
    return getActingRoleMeta(payload.roleCode);
  } catch {
    return null;
  }
};

export const getActingRoleForSession = (session: SessionUser) => {
  if (!isAdminModeEnabled() || !isAdminUser(session) || !hasAdminSessionCookie()) {
    return null;
  }
  return getActingRoleFromCookies();
};
