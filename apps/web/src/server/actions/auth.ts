"use server";

import { login } from "@ennuste/application";
import { createServices } from "../services";
import { clearSessionCookie, getSessionFromCookies, getSessionIdForLogout, setSessionCookie } from "../session";
import { redirect } from "next/navigation";

export type LoginFormState = {
  error?: string | null;
};

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
    redirect(resolvePostLoginRedirect(result.session.permissions));
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
