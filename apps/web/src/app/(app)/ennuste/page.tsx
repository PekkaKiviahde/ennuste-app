import { loadForecastReport, loadMappingVersions, loadTargetEstimate } from "@ennuste/application";
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
  const mappingVersions = await loadMappingVersions(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const targets = await loadTargetEstimate(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const targetOptions = Array.from(
    new Map(
      (targets as any[]).map((row) => [
        row.target_littera_id,
        { id: row.target_littera_id as string, label: `${row.littera_code} ${row.littera_title}`.trim() }
      ])
    ).values()
  );
  const targetLookup = new Map(targetOptions.map((option) => [option.id, option.label]));
  const mappingVersionOptions = (mappingVersions as any[]).map((row) => ({
    id: row.mapping_version_id as string,
    label: `${row.status} ${row.valid_from}${row.valid_to ? `-${row.valid_to}` : ""} ${row.reason}`.trim()
  }));
  const latestForecast = rows[0] as any | undefined;
  const latestForecastTarget = latestForecast
    ? targetLookup.get(latestForecast.target_littera_id) ?? latestForecast.target_littera_id
    : "Ei ennustetta";
  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fi-FI", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };
  const groupedRows = rows.reduce(
    (acc: Array<{ label: string; items: any[] }>, row: any) => {
      const label = targetLookup.get(row.target_littera_id) ?? row.target_littera_id;
      const last = acc[acc.length - 1];
      if (last && last.label === label) {
        last.items.push(row);
      } else {
        acc.push({ label, items: [row] });
      }
      return acc;
    },
    []
  );

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Ennuste</h1>
        <p>Kirjaa ennustetapahtuma kustannuslajeittain.</p>
        <ForecastForm targetOptions={targetOptions} mappingVersionOptions={mappingVersionOptions} />
      </section>
      <section className="card">
        <h2>Tilannekuva</h2>
        <div className="status-grid">
          <div className="status-item">
            <div className="label">Viimeisin tavoitearvio</div>
            <div className="value">{latestForecastTarget}</div>
          </div>
          <div className="status-item">
            <div className="label">Aika</div>
            <div className="value">{latestForecast?.event_time ?? "-"}</div>
          </div>
          <div className="status-item">
            <div className="label">Tekija</div>
            <div className="value">{latestForecast?.created_by ?? "-"}</div>
          </div>
        </div>

        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="#ennusteet">Siirry ennusteisiin</a>
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Avaa mapping</a>
          <a className="btn btn-secondary btn-sm" href="/ylataso">Avaa projekti</a>
          <a className="btn btn-secondary btn-sm" href="/raportti">Avaa raportti</a>
        </div>

        <h2 id="ennusteet">Viimeisimmat ennusteet</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Tavoitearvio</th>
              <th>Mapping</th>
              <th>Aika</th>
              <th>Tekija</th>
              <th>Kommentti</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="notice">Ei ennustetapahtumia viela.</div>
                </td>
              </tr>
            ) : (
              groupedRows.flatMap((group) => [
                <tr key={`group-${group.label}`} className="table-group">
                  <td colSpan={5}>{group.label}</td>
                </tr>,
                ...group.items.map((row: any) => (
                  <tr key={row.forecast_event_id}>
                    <td>{targetLookup.get(row.target_littera_id) ?? row.target_littera_id}</td>
                    <td>{row.mapping_version_id ? "Valittu" : "Ei mappingia"}</td>
                    <td>{formatDateTime(row.event_time)}</td>
                    <td>
                      <div>{row.created_by}</div>
                      <div className="muted">{row.forecast_event_id}</div>
                    </td>
                    <td>
                      <div>{row.comment ?? "-"}</div>
                      <div className="muted">KPI: {row.kpi_value ?? "-"}</div>
                    </td>
                  </tr>
                ))
              ])
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
