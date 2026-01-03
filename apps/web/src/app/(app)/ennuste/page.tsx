import { loadForecastReport } from "@ennuste/application";
import { createForecastAction } from "../../../server/actions/forecast";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function ForecastPage() {
  const session = requireSession();
  const services = createServices();
  const rows = await loadForecastReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Ennuste</h1>
        <p>Kirjaa ennustetapahtuma kustannuslajeittain.</p>
        <form className="form-grid" action={createForecastAction}>
          <label className="label" htmlFor="targetLitteraId">Tavoitearvio-littera (UUID)</label>
          <input className="input" id="targetLitteraId" name="targetLitteraId" required />

          <label className="label" htmlFor="mappingVersionId">Mapping-versio (UUID)</label>
          <input className="input" id="mappingVersionId" name="mappingVersionId" />

          <div className="grid grid-2">
            <div>
              <label className="label">Tyo</label>
              <input className="input" name="laborValue" type="number" step="0.01" />
              <input className="input" name="laborMemo" placeholder="Perustelu" />
            </div>
            <div>
              <label className="label">Aine</label>
              <input className="input" name="materialValue" type="number" step="0.01" />
              <input className="input" name="materialMemo" placeholder="Perustelu" />
            </div>
            <div>
              <label className="label">Alih</label>
              <input className="input" name="subcontractValue" type="number" step="0.01" />
              <input className="input" name="subcontractMemo" placeholder="Perustelu" />
            </div>
            <div>
              <label className="label">Valineet</label>
              <input className="input" name="rentalValue" type="number" step="0.01" />
              <input className="input" name="rentalMemo" placeholder="Perustelu" />
            </div>
            <div>
              <label className="label">Muu</label>
              <input className="input" name="otherValue" type="number" step="0.01" />
              <input className="input" name="otherMemo" placeholder="Perustelu" />
            </div>
          </div>

          <label className="label" htmlFor="comment">Yleisperustelu</label>
          <textarea className="input" id="comment" name="comment" rows={3} />

          <div className="grid grid-3">
            <div>
              <label className="label">Tekninen valmius %</label>
              <input className="input" name="technicalProgress" type="number" step="0.1" />
            </div>
            <div>
              <label className="label">Taloudellinen valmius %</label>
              <input className="input" name="financialProgress" type="number" step="0.1" />
            </div>
            <div>
              <label className="label">KPI-arvo</label>
              <input className="input" name="kpiValue" type="number" step="0.01" />
            </div>
          </div>

          <button className="btn btn-primary" type="submit">Tallenna ennuste</button>
        </form>
      </section>
      <section className="card">
        <h2>Viimeisimmat ennusteet</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Tavoitearvio</th>
              <th>Aika</th>
              <th>Tekija</th>
              <th>Kommentti</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any) => (
              <tr key={row.forecast_event_id}>
                <td>{row.target_littera_id}</td>
                <td>{row.event_time}</td>
                <td>{row.created_by}</td>
                <td>{row.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
