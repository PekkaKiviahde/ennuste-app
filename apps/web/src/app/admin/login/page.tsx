import { notFound } from "next/navigation";
import LoginForm from "../../login/login-form";
import { adminLoginAction } from "../../../server/actions/adminAuth";
import { isAdminModeEnabled } from "../../../server/adminSession";

export default function AdminLoginPage({ searchParams }: { searchParams?: { loggedOut?: string } }) {
  if (!isAdminModeEnabled()) {
    notFound();
  }
  const showLoggedOut = searchParams?.loggedOut === "1";

  return (
    <div className="container">
      <div className="grid">
        <section className="card">
          <h1>Admin-kirjautuminen</h1>
          <p>Vain yllapitajille.</p>
          {showLoggedOut && <div className="notice success">Olet kirjautunut ulos.</div>}
          <div className="notice">Kaikki tapahtumat lokitetaan.</div>
          <LoginForm demoMode={false} action={adminLoginAction} submitLabel="Jatka" />
        </section>
      </div>
    </div>
  );
}
