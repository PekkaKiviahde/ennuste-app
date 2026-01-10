import { requireSession } from "../../../server/session";

export default async function BaselinePage() {
  await requireSession();

  return (
    <div className="grid">
      <section className="card">
        <h1>Baseline</h1>
        <p>
          Baseline-nakyma ei ole viela tuettu uudessa baseline-skeemassa. Kun
          tyopakettien seuranta laajennetaan, lisataan tahan uusi raportointi.
        </p>
        <div className="notice">
          Tyovaiheiden KPI-raportit ja baseline-lukitus ovat toistaiseksi pois
          kaytosta.
        </div>
      </section>
    </div>
  );
}
