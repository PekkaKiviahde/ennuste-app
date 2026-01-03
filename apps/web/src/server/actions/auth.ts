"use server";

import { login, ensureDemoRoleSwitchAllowed } from "@ennuste/application";
import { createServices } from "../services";
import { clearSessionCookie, setSessionCookie } from "../session";
import { redirect } from "next/navigation";

export const loginAction = async (formData: FormData) => {
  const username = String(formData.get("username") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();
  const projectId = formData.get("projectId") ? String(formData.get("projectId")) : undefined;

  const services = createServices();
  const result = await login(services, { username, pin, projectId });
  setSessionCookie(result.session);
  redirect("/ylataso");
};

export const logoutAction = async () => {
  clearSessionCookie();
  redirect("/login");
};

export const quickRoleLoginAction = async (formData: FormData) => {
  const isDemo = process.env.DEMO_MODE === "true";
  ensureDemoRoleSwitchAllowed(isDemo);

  const username = String(formData.get("username") ?? "");
  const pin = String(formData.get("pin") ?? "");
  const projectId = formData.get("projectId") ? String(formData.get("projectId")) : undefined;

  const services = createServices();
  const result = await login(services, { username, pin, projectId });
  setSessionCookie(result.session);

  await services.audit.recordEvent({
    projectId: result.session.projectId,
    actor: result.session.username,
    action: "auth.quick_login",
    payload: {
      role: username
    }
  });

  redirect("/ylataso");
};
