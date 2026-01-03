import { loadForecastReport, loadMappingVersions, loadTargetEstimate } from "@ennuste/application";
import ForecastForm from "../../../ui/forecast/ForecastForm";
import ForecastTable from "../../../ui/forecast/ForecastTable";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function ForecastPage() {
  const session = await requireSession();
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
            <div className="value">{formatDateTime(latestForecast?.event_time)}</div>
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
        <ForecastTable rows={rows as any[]} targetOptions={targetOptions} />
      </section>
    </div>
  );
}
