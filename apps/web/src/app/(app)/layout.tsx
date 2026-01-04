import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionFromCookies } from "../../server/session";
import { redirect } from "next/navigation";
import { logoutAction } from "../../server/actions/auth";

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
  if (!hasReportRead) {
    redirect(hasSellerUi ? "/sales" : "/login");
  }

  return (
    <div>
      <nav className="navbar">
        <strong>Ennuste MVP</strong>
        {hasReportRead && (
          <>
            <Link href="/ylataso">Ylataso</Link>
            <Link href="/tyonohjaus">Tyonohjaus</Link>
            <Link href="/tavoitearvio">Tavoitearvio</Link>
            <Link href="/suunnittelu">Suunnittelu</Link>
            <Link href="/baseline">Baseline</Link>
            <Link href="/ennuste">Ennuste</Link>
            <Link href="/raportti">Raportti</Link>
            <Link href="/loki">Loki</Link>
          </>
        )}
        {hasMembersManage && <Link href="/admin">Admin</Link>}
        <span className="badge">{session.displayName ?? session.username}</span>
        <form action={logoutAction}>
          <button className="btn btn-secondary" type="submit">Kirjaudu ulos</button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
