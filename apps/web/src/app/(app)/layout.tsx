import type { ReactNode } from "react";
import Link from "next/link";
import { getSessionFromCookies } from "../../server/session";
import { redirect } from "next/navigation";
import { logoutAction } from "../../server/actions/auth";

export default function AuthedLayout({ children }: { children: ReactNode }) {
  const session = getSessionFromCookies();
  if (!session) {
    redirect("/login");
  }

  return (
    <div>
      <nav className="navbar">
        <strong>Ennuste MVP</strong>
        <Link href="/ylataso">Ylataso</Link>
        <Link href="/tavoitearvio">Tavoitearvio</Link>
        <Link href="/suunnittelu">Suunnittelu</Link>
        <Link href="/baseline">Baseline</Link>
        <Link href="/ennuste">Ennuste</Link>
        <Link href="/raportti">Raportti</Link>
        <Link href="/loki">Loki</Link>
        <Link href="/admin">Admin</Link>
        <span className="badge">{session.displayName ?? session.username}</span>
        <form action={logoutAction}>
          <button className="btn btn-secondary" type="submit">Kirjaudu ulos</button>
        </form>
      </nav>
      <div className="container">{children}</div>
    </div>
  );
}
