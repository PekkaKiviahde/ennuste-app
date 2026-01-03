import LoginQuickPanel from "./quick-panel";
import LoginForm from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { loggedOut?: string } }) {
  const isDemo = process.env.DEMO_MODE === "true";
  const showLoggedOut = searchParams?.loggedOut === "1";
  return (
    <div className="container">
      <div className="grid grid-2">
        <section className="card">
          <h1>Ennuste MVP</h1>
          <p>Kirjaudu sisaan ja valitse rooli. Demo-tilassa saat pikanappaimet.</p>
          {showLoggedOut && <div className="notice success">Olet kirjautunut ulos.</div>}
          <LoginForm />
        </section>
        <LoginQuickPanel enabled={isDemo} />
      </div>
    </div>
  );
}
