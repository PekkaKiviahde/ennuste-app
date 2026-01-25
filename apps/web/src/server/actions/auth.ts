"use server";

import { login, switchProject } from "@ennuste/application";
import { AppError, AuthError } from "@ennuste/shared";
import { createServices } from "../services";
import { clearSessionCookie, getSessionFromCookies, getSessionIdForLogout, requireSession, setSessionCookie } from "../session";
import { redirect } from "next/navigation";
import { setAdminSessionCookie } from "../adminSession";
import { setActingRoleCookie } from "../actingRole";

export type LoginFormState = {
  error?: string | null;
  errorLog?: string | null;
};

const INVALID_MESSAGE = "Vaara kayttajatunnus tai PIN.";

const resolvePostLoginRedirect = (permissions: string[]) => {
  if (permissions.includes("SELLER_UI") && !permissions.includes("REPORT_READ")) {
    return "/sales";
  }
  return "/ylataso";
};

export const loginAction = async (_state: LoginFormState, formData: FormData): Promise<LoginFormState> => {
  const username = String(formData.get("username") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const projectId = formData.get("projectId") ? String(formData.get("projectId")) : undefined;

  const services = createServices();
  try {
    const result = await login(services, { username, pin, projectId });
    const sessionId = await services.auth.createSession(result.session);
    setSessionCookie(sessionId);
    setAdminSessionCookie(false);
    setActingRoleCookie(null);
    redirect(resolvePostLoginRedirect(result.session.permissions));
  } catch (error) {
    if (error instanceof Error) {
      const digest = (error as { digest?: string }).digest;
      if (error.message === "NEXT_REDIRECT" || (digest && digest.startsWith("NEXT_REDIRECT"))) {
        throw error;
      }
    }
    const rawMessage = error instanceof Error ? error.message : "Kirjautuminen epaonnistui";
    const message = error instanceof AuthError ? INVALID_MESSAGE : rawMessage;
    const details: string[] = [];
    details.push(`time=${new Date().toISOString()}`);
    details.push(`username=${username || "-"}`);
    details.push(`projectId=${projectId ?? "-"}`);
    details.push(`error=${rawMessage}`);
    if (error instanceof AppError) {
      details.push(`code=${error.code}`);
      details.push(`status=${error.status}`);
      if (error.details) {
        details.push(`details=${JSON.stringify(error.details)}`);
      }
    } else if (error instanceof Error) {
      details.push(`type=${error.name}`);
    }
    return { error: message, errorLog: details.join("\n") };
  }
};

export const logoutAction = async () => {
  const services = createServices();
  const sessionId = getSessionIdForLogout();
  const session = await getSessionFromCookies();
  if (sessionId) {
    await services.auth.deleteSession(sessionId);
  }
  clearSessionCookie();
  setAdminSessionCookie(false);
  setActingRoleCookie(null);
  if (session) {
    await services.audit.recordEvent({
      projectId: session.projectId,
      tenantId: session.tenantId,
      actor: session.username,
      action: "auth.logout",
      payload: {}
    });
  }
  redirect("/login?loggedOut=1");
};

export const switchProjectAction = async (formData: FormData) => {
  const projectId = String(formData.get("projectId") ?? "").trim();
  if (!projectId) {
    return;
  }
  const session = await requireSession();
  const services = createServices();
  const result = await switchProject(services, {
    username: session.username,
    projectId
  });
  const sessionId = getSessionIdForLogout();
  if (sessionId) {
    await services.auth.deleteSession(sessionId);
  }
  const newSessionId = await services.auth.createSession(result.session);
  setSessionCookie(newSessionId);
  redirect(resolvePostLoginRedirect(result.session.permissions));
};
