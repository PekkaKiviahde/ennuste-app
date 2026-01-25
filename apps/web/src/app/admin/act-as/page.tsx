import { notFound, redirect } from "next/navigation";
import { actingRoleOptions, getActingRoleFromCookies } from "../../../server/actingRole";
import { hasAdminSessionCookie, isAdminModeEnabled, isAdminUser } from "../../../server/adminSession";
import { getSessionFromCookies } from "../../../server/session";
import ActAsClient from "./act-as-client";

export default async function AdminActAsPage() {
  if (!isAdminModeEnabled()) {
    notFound();
  }

  const session = await getSessionFromCookies();
  if (!session) {
    redirect("/admin/login");
  }
  if (!isAdminUser(session) || !hasAdminSessionCookie()) {
    redirect("/admin/login");
  }

  const actingRole = getActingRoleFromCookies();

  return (
    <ActAsClient
      roleOptions={actingRoleOptions}
      currentRoleCode={actingRole?.roleCode ?? null}
      currentRoleLabel={actingRole?.label ?? null}
    />
  );
}
