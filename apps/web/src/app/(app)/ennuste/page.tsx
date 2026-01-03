import { loadForecastReport } from "@ennuste/application";
import ForecastForm from "../../../ui/forecast/ForecastForm";
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
        <ForecastForm />
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
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="notice">Ei ennustetapahtumia viela.</div>
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row.forecast_event_id}>
                  <td>{row.target_littera_id}</td>
                  <td>{row.event_time}</td>
                  <td>{row.created_by}</td>
                  <td>{row.comment}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
