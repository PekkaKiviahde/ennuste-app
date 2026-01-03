import { loadWorkPhaseReport, loadWorkflowStatus } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function ReportPage() {
  const session = await requireSession();
  const services = createServices();
  const rows = await loadWorkPhaseReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const status = await loadWorkflowStatus(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  const formatDateTime = (value: string | null | undefined) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("fi-FI", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  };
  const formatNumber = (value: number | null | undefined, decimals = 2) => {
    if (value === null || value === undefined) return "-";
    if (Number.isNaN(value)) return String(value);
    return new Intl.NumberFormat("fi-FI", {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }).format(value);
  };
  const formatCpi = (value: number | null | undefined, hasCpi: boolean | null | undefined) => {
    if (!hasCpi || value === null || value === undefined) {
      return "Ei laskettavissa";
    }
    return formatNumber(value, 3);
  };
  const planningLabel = status.planning?.status ?? "Ei suunnitelmaa";
  const planningTime = formatDateTime(status.planning?.event_time);
  const planningSummary = status.planning?.summary?.trim();
  const lockSummaryLabel = status.isLocked
    ? planningSummary || "Ei lukituksen selitetta."
    : "Lukitus ei ole voimassa.";

  return (
    <div className="grid">
      <section className="card">
        <h1>Raportti</h1>
        <p>Tyovaiheiden yhteenveto, KPI ja poikkeamat.</p>
        {!status.planning && (
          <div className="notice error">Suunnitelma puuttuu. Ennustetapahtumia ei voi luoda.</div>
        )}
        <div className="status-grid">
          <div className="status-item">
            <div className="label">Suunnitelman tila</div>
            <div className="value">{planningLabel}</div>
            <div className="value muted">{planningTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Lukituksen selite</div>
            <div className="value">{lockSummaryLabel}</div>
            <div className="value muted">{status.isLocked ? "Lukitus voimassa" : "Ei lukitusta"}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Tyovaiheet</h2>
        <p>Tyovaiheiden yhteenveto, KPI ja poikkeamat.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Tyovaihe</th>
            <th>BAC</th>
            <th>EV</th>
            <th>AC*</th>
            <th>CPI</th>
            <th>Poikkeama EUR</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={6}>
                <div className="notice">Ei raporttiriveja viela.</div>
              </td>
            </tr>
          ) : (
            rows.map((row: any) => (
              <tr key={row.work_phase_id}>
                <td>{row.work_phase_name}</td>
                <td>{formatNumber(row.bac_total)}</td>
                <td>{formatNumber(row.ev_value)}</td>
                <td>{formatNumber(row.ac_star_total)}</td>
                <td>{formatCpi(row.cpi, row.has_cpi)}</td>
                <td>{formatNumber(row.cost_variance_eur)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
      </section>
    </div>
  );
}
