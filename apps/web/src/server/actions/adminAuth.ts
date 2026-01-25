"use server";

import { login } from "@ennuste/application";
import { AppError, AuthError } from "@ennuste/shared";
import { redirect } from "next/navigation";
import { createServices } from "../services";
import { requireSession, setSessionCookie } from "../session";
import { clearAdminRateLimit, getAdminRateLimitStatus, registerAdminRateLimitAttempt } from "../adminRateLimit";
import { hasAdminSessionCookie, isAdminModeEnabled, isAdminUser, setAdminSessionCookie } from "../adminSession";
import { getActingRoleFromCookies, getActingRoleMeta, setActingRoleCookie } from "../actingRole";

export type AdminLoginFormState = {
  error?: string | null;
  errorLog?: string | null;
};

const INVALID_MESSAGE = "Vaara kayttajatunnus tai PIN.";
const RATE_LIMIT_MESSAGE = "Liian monta yritysta. Yrita hetken paasta uudelleen.";

const ensureRedirectErrorsAreRethrown = (error: unknown) => {
  if (error instanceof Error) {
    const digest = (error as { digest?: string }).digest;
    if (error.message === "NEXT_REDIRECT" || (digest && digest.startsWith("NEXT_REDIRECT"))) {
      throw error;
    }
  }
};

const buildErrorLog = (username: string, error: unknown) => {
  const message = error instanceof Error ? error.message : "Kirjautuminen epaonnistui";
  const details: string[] = [];
  details.push(`time=${new Date().toISOString()}`);
  details.push(`username=${username || "-"}`);
  details.push(`error=${message}`);
  if (error instanceof AppError) {
    details.push(`code=${error.code}`);
    details.push(`status=${error.status}`);
    if (error.details) {
      details.push(`details=${JSON.stringify(error.details)}`);
    }
  } else if (error instanceof Error) {
    details.push(`type=${error.name}`);
  }
  return details.join("\n");
};

export const adminLoginAction = async (
  _state: AdminLoginFormState,
  formData: FormData
): Promise<AdminLoginFormState> => {
  const username = String(formData.get("username") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const services = createServices();

  if (!isAdminModeEnabled()) {
    console.warn("admin_login_blocked_mode_disabled", { username });
    return { error: "Admin-tila ei ole kaytossa." };
  }

  const rateLimit = getAdminRateLimitStatus();
  if (rateLimit.blocked) {
    console.warn("admin_login_blocked_rate_limit", { username, retryAt: rateLimit.retryAt });
    return { error: RATE_LIMIT_MESSAGE };
  }

  console.info("admin_login_attempt", { username });

  try {
    const result = await login(services, { username, pin });
    const adminUser = isAdminUser(result.session);

    await services.audit.recordEvent({
      projectId: result.session.projectId,
      tenantId: result.session.tenantId,
      actor: result.session.username,
      action: "admin_login_attempt",
      payload: {
        adminMode: true,
        adminUser
      }
    });

    if (!adminUser) {
      registerAdminRateLimitAttempt("fail");
      await services.audit.recordEvent({
        projectId: result.session.projectId,
        tenantId: result.session.tenantId,
        actor: result.session.username,
        action: "admin_login_fail",
        payload: {
          reason: "NOT_ADMIN"
        }
      });
      console.warn("admin_login_fail_not_admin", { username });
      return { error: INVALID_MESSAGE };
    }

    const sessionId = await services.auth.createSession(result.session);
    setSessionCookie(sessionId);
    setAdminSessionCookie(true);
    setActingRoleCookie(null);
    clearAdminRateLimit();

    await services.audit.recordEvent({
      projectId: result.session.projectId,
      tenantId: result.session.tenantId,
      actor: result.session.username,
      action: "admin_login_success",
      payload: {
        adminMode: true
      }
    });

    redirect("/admin/act-as");
  } catch (error) {
    ensureRedirectErrorsAreRethrown(error);
    registerAdminRateLimitAttempt("fail");
    const logMessage = error instanceof Error ? error.message : String(error);
    if (error instanceof AuthError) {
      console.warn("admin_login_fail_auth", { username });
    } else {
      console.warn("admin_login_fail_error", { username, error: logMessage });
    }
    return { error: INVALID_MESSAGE, errorLog: buildErrorLog(username, error) };
  }
};

const requireAdminSessionContext = async () => {
  if (!isAdminModeEnabled()) {
    redirect("/login");
  }
  const session = await requireSession();
  if (!isAdminUser(session) || !hasAdminSessionCookie()) {
    redirect("/admin/login");
  }
  return session;
};

export const setAdminActingRoleAction = async (formData: FormData) => {
  const session = await requireAdminSessionContext();
  const roleCode = String(formData.get("roleCode") ?? "").trim();
  const roleMeta = getActingRoleMeta(roleCode);
  if (!roleMeta) {
    redirect("/admin/act-as");
  }
  const previousRole = getActingRoleFromCookies();
  setActingRoleCookie(roleMeta.roleCode);
  const services = createServices();
  await services.audit.recordEvent({
    projectId: session.projectId,
    tenantId: session.tenantId,
    actor: session.username,
    action: "admin_act_as_set",
    payload: {
      roleCode: roleMeta.roleCode,
      roleLabel: roleMeta.label,
      previousRoleCode: previousRole?.roleCode ?? null
    }
  });
  redirect("/admin/act-as");
};

export const clearAdminActingRoleAction = async () => {
  const session = await requireAdminSessionContext();
  const previousRole = getActingRoleFromCookies();
  setActingRoleCookie(null);
  const services = createServices();
  await services.audit.recordEvent({
    projectId: session.projectId,
    tenantId: session.tenantId,
    actor: session.username,
    action: "admin_act_as_clear",
    payload: {
      previousRoleCode: previousRole?.roleCode ?? null
    }
  });
  redirect("/admin/act-as");
};
