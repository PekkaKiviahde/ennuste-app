import { redirect } from "next/navigation";
import { requireSession } from "../../server/session";
import { logoutAction } from "../../server/actions/auth";
import SaasOnboardingForm from "../../ui/sales/SaasOnboardingForm";

export default async function SalesPage() {
  const session = await requireSession();
  const hasSellerUi = session.permissions.includes("SELLER_UI");
  const hasOnboarding = session.permissions.includes("SAAS_ONBOARDING_MANAGE");
  if (!hasSellerUi) {
    redirect("/ylataso");
  }

  return (
    <div className="container">
      <nav className="navbar">
        <strong>Ennuste MVP</strong>
        <span className="badge">{session.displayName ?? session.username}</span>
        <form action={logoutAction}>
          <button className="btn btn-secondary" type="submit">Kirjaudu ulos</button>
        </form>
      </nav>
      <section className="card">
        <h1>Myyjän näkymä</h1>
        <p>Tämä on SaaS-myyjän käyttöönottonäkymä.</p>
        <div className="grid">
          <div className="notice">
            <strong>Myyntimallit</strong>
            <div>Tarjoukset, paketit ja hinnoitteluohjeet.</div>
          </div>
          <div className="notice">
            <strong>Asiakasputki</strong>
            <div>Nykyiset prospektit ja seuraavat toimenpiteet.</div>
          </div>
        </div>
      </section>
      {hasOnboarding ? (
        <SaasOnboardingForm />
      ) : (
        <section className="card">
          <h2>Käyttöönotto</h2>
          <div className="notice error">Ei oikeuksia käyttöönottoon.</div>
        </section>
      )}
    </div>
  );
}
