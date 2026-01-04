import LoginForm from "./login-form";

export default function LoginPage({ searchParams }: { searchParams?: { loggedOut?: string } }) {
  const showLoggedOut = searchParams?.loggedOut === "1";
  const demoMode = process.env.DEMO_MODE === "true";
  return (
    <div className="container">
      <div className="grid">
        <section className="card">
          <h1>Ennuste MVP</h1>
          <p>Kirjaudu sisaan.</p>
          {showLoggedOut && <div className="notice success">Olet kirjautunut ulos.</div>}
          <LoginForm demoMode={demoMode} />
        </section>
      </div>
    </div>
  );
}
