import { requireSession } from "../../../server/session";

export default async function BaselinePage() {
  await requireSession();

  return (
    <div className="grid">
      <section className="card">
        <h1>Baseline</h1>
        <p>
          Baseline-näkymä ei ole vielä tuettu uudessa baseline-skeemassa. Kun
          työpakettien seuranta laajennetaan, lisätään tähän uusi raportointi.
        </p>
        <div className="notice">
          Työvaiheiden KPI-raportit ja baseline-lukitus ovat toistaiseksi pois
          käytöstä.
        </div>
      </section>
    </div>
  );
}
