import LoginForm from "./login-form";
import { isDemoQuickLoginEnabled } from "../../server/demoFlags";
import { listDemoQuickLogins } from "../../server/demoQuickLogins";

export default function LoginPage({ searchParams }: { searchParams?: { loggedOut?: string } }) {
  const showLoggedOut = searchParams?.loggedOut === "1";
  const showDemoUsers = isDemoQuickLoginEnabled();
  return (
    <div className="container">
      <div className="grid">
        <section className="card">
          <h1>Ennuste MVP</h1>
          <p>Kirjaudu sisaan.</p>
          {showLoggedOut && <div className="notice success">Olet kirjautunut ulos.</div>}
          <LoginForm demoMode={showDemoUsers} quickLogins={showDemoUsers ? listDemoQuickLogins() : []} />
        </section>
      </div>
    </div>
  );
}
