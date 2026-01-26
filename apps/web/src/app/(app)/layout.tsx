import type { ReactNode } from "react";
import Link from "next/link";
import { listUserProjects } from "@ennuste/application";
import { getSessionFromCookies } from "../../server/session";
import { redirect } from "next/navigation";
import { logoutAction, switchProjectAction } from "../../server/actions/auth";
import { clearAdminActingRoleAction } from "../../server/actions/adminAuth";
import { getActingRoleFromCookies } from "../../server/actingRole";
import { hasAdminSessionCookie, isAdminModeEnabled, isAdminUser } from "../../server/adminSession";
import { createServices } from "../../server/services";

export default async function AuthedLayout({ children }: { children: ReactNode }) {
  let session = null;
  try {
    session = await getSessionFromCookies();
  } catch (error) {
    console.warn("Session lookup failed, redirecting to login.", error);
  }
  if (!session) {
    redirect("/login");
  }
  const hasReportRead = session.permissions.includes("REPORT_READ");
  const hasSellerUi = session.permissions.includes("SELLER_UI");
  const hasMembersManage = session.permissions.includes("MEMBERS_MANAGE");
  const adminModeEnabled = isAdminModeEnabled();
  const adminUser = isAdminUser(session);
  const hasAdminSession = adminModeEnabled && adminUser && hasAdminSessionCookie();
  const actingRole = hasAdminSession ? getActingRoleFromCookies() : null;
  if (!hasReportRead) {
    redirect(hasSellerUi ? "/sales" : "/login");
  }

  const services = createServices();
  const projects = await listUserProjects(services, { username: session.username });
  const currentProject = projects.find((project) => project.projectId === session.projectId) ?? null;
  const hasMultipleProjects = projects.length > 1;
  const contextLabel = currentProject
    ? `${currentProject.organizationName} · ${currentProject.projectName}`
    : `${session.organizationId} · ${session.projectId}`;

  return (
    <div>
      <nav className="navbar">
        <strong>Ennuste MVP</strong>
        <span className="badge">{contextLabel}</span>
        {hasReportRead && (
          <>
            <Link href="/ylataso">Ylätaso</Link>
            <Link href="/tyonohjaus">Työnohjaus</Link>
            <Link href="/tavoitearvio">Tavoitearvio</Link>
            <Link href="/tavoitearvio/mappaus">Tavoitearvion mäppäys</Link>
            <Link href="/suunnittelu">Työpakettisuunnittelu</Link>
            <Link href="/baseline">Baseline</Link>
            <Link href="/ennuste">Ennuste</Link>
            <Link href="/raportti">Raportti</Link>
            <Link href="/loki">Loki</Link>
          </>
        )}
        {projects.length > 0 && (
          <form className="project-switcher" action={switchProjectAction}>
            <label className="label" htmlFor="projectId">Projekti</label>
            <select className="input" id="projectId" name="projectId" defaultValue={session.projectId}>
              {projects.map((project) => (
                <option key={project.projectId} value={project.projectId}>
                  {project.organizationName} / {project.projectName}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary btn-sm" type="submit" disabled={!hasMultipleProjects}>
              Vaihda
            </button>
            {!hasMultipleProjects && <span className="muted project-switcher-note">Vain yksi projekti</span>}
          </form>
        )}
        {adminModeEnabled && hasMembersManage && <Link href="/admin">Admin</Link>}
        {adminModeEnabled && adminUser && !hasAdminSession && <Link href="/admin/login">Admin-tila</Link>}
        {hasAdminSession && <Link href="/admin/act-as">Roolivalinta</Link>}
        {actingRole && <span className="badge">Toimit roolissa: {actingRole.label}</span>}
        {actingRole && (
          <form action={clearAdminActingRoleAction}>
            <button className="btn btn-secondary btn-sm" type="submit">Palaa adminiin</button>
          </form>
        )}
        <span className="badge">{session.displayName ?? session.username}</span>
        <form action={logoutAction}>
          <button className="btn btn-secondary" type="submit">Kirjaudu ulos</button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
