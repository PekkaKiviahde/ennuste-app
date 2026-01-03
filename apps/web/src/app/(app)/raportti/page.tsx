import { loadWorkPhaseReport } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function ReportPage() {
  const session = requireSession();
  const services = createServices();
  const rows = await loadWorkPhaseReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  return (
    <div className="card">
      <h1>Raportti</h1>
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
                <td>{row.bac_total}</td>
                <td>{row.ev_value}</td>
                <td>{row.ac_star_total}</td>
                <td>{row.cpi ?? "-"}</td>
                <td>{row.cost_variance_eur ?? 0}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
