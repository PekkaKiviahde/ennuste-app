"use server";

import { login, ensureDemoRoleSwitchAllowed } from "@ennuste/application";
import { createServices } from "../services";
import { clearSessionCookie, getSessionFromCookies, getSessionIdForLogout, setSessionCookie } from "../session";
import { redirect } from "next/navigation";

export type LoginFormState = {
  error?: string | null;
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
    redirect("/ylataso");
  } catch (error) {
    const message = error instanceof Error ? error.message : "Kirjautuminen epaonnistui";
    return { error: message };
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

export const quickRoleLoginAction = async (formData: FormData) => {
  const isDemo = process.env.DEMO_MODE === "true";
  ensureDemoRoleSwitchAllowed(isDemo);

  const username = String(formData.get("username") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const projectId = formData.get("projectId") ? String(formData.get("projectId")) : undefined;

  const services = createServices();
  const result = await login(services, { username, pin, projectId });
  const sessionId = await services.auth.createSession(result.session);
  setSessionCookie(sessionId);

  await services.audit.recordEvent({
    projectId: result.session.projectId,
    tenantId: result.session.tenantId,
    actor: result.session.username,
    action: "auth.quick_login",
    payload: {
      role: username
    }
  });

  redirect("/ylataso");
};
