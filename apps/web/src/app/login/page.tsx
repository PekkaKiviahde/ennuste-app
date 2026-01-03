import LoginQuickPanel from "./quick-panel";
import LoginForm from "./login-form";

export default function LoginPage() {
  const isDemo = process.env.DEMO_MODE === "true";
  return (
    <div className="container">
      <div className="grid grid-2">
        <section className="card">
          <h1>Ennuste MVP</h1>
          <p>Kirjaudu sisaan ja valitse rooli. Demo-tilassa saat pikanappaimet.</p>
          <LoginForm />
        </section>
        <LoginQuickPanel enabled={isDemo} />
      </div>
    </div>
  );
}
