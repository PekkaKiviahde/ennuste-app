import { loadDashboard } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const services = createServices();
  const dashboard = (await loadDashboard(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  })) as any;

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Ylataso</h1>
        <p>Projektin nykytila ja poikkeamat.</p>
        <div className="grid">
          <div className="notice">
            <strong>Projektin KPI</strong>
            <div>Work phases: {dashboard?.work_phases_baseline_locked ?? 0}</div>
            <div>BAC: {dashboard?.bac_total ?? 0} EUR</div>
            <div>EV: {dashboard?.ev_total ?? 0} EUR</div>
            <div>AC*: {dashboard?.ac_star_total ?? 0} EUR</div>
            <div>CPI: {dashboard?.cpi ?? "-"}</div>
          </div>
          <div className="notice">
            <strong>Selvitettavat</strong>
            <div>Unmapped total: {dashboard?.unmapped_actual_total ?? 0} EUR</div>
          </div>
        </div>
      </section>
      <section className="card">
        <h2>Tyon ohjaus</h2>
        <p>Seuraavat paapolut on tarkoitettu arjen kayttoon.</p>
        <div className="grid">
          <div>
            <div className="label">Suunnittelu</div>
            <div>Kirjaa suunnitelma ennen ennustetta.</div>
          </div>
          <div>
            <div className="label">Ennuste</div>
            <div>Lisaa ennustetapahtuma kustannuslajeittain.</div>
          </div>
          <div>
            <div className="label">Raportti</div>
            <div>Seuraa tyovaiheita ja paaryhmia.</div>
          </div>
        </div>
        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="/tyonohjaus">Avaa tyonohjaus</a>
        </div>
      </section>
    </div>
  );
}
