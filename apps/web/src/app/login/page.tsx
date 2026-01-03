import { loginAction } from "../../server/actions/auth";
import LoginQuickPanel from "./quick-panel";

export default function LoginPage() {
  const isDemo = process.env.DEMO_MODE === "true";
  return (
    <div className="container">
      <div className="grid grid-2">
        <section className="card">
          <h1>Ennuste MVP</h1>
          <p>Kirjaudu sisaan ja valitse rooli. Demo-tilassa saat pikanappaimet.</p>
          <form className="form-grid" action={loginAction}>
            <label className="label" htmlFor="username">Kayttajatunnus</label>
            <input className="input" id="username" name="username" placeholder="etunimi.sukunimi" />

            <label className="label" htmlFor="pin">PIN</label>
            <input className="input" id="pin" name="pin" type="password" placeholder="****" />

            <button className="btn btn-primary" type="submit">Kirjaudu</button>
          </form>
        </section>
        <LoginQuickPanel enabled={isDemo} />
      </div>
    </div>
  );
}
