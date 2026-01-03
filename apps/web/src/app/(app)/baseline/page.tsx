import { loadWorkPhaseReport, loadWorkPhases } from "@ennuste/application";
import BaselineForms from "../../../ui/baseline/BaselineForms";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function BaselinePage() {
  const session = await requireSession();
  const services = createServices();
  const reportRows = await loadWorkPhaseReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const workPhases = await loadWorkPhases(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  return (
    <div className="grid">
      <section className="card">
        <h1>Baseline</h1>
        <p>Tyovaiheiden lukitut baselinet ja KPI-tilanne.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Tyovaihe</th>
              <th>BAC EUR</th>
              <th>EV EUR</th>
              <th>AC* EUR</th>
              <th>CPI</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="notice">Ei baselinetietoja viela.</div>
                </td>
              </tr>
            ) : (
              reportRows.map((row: any) => (
                <tr key={row.work_phase_id}>
                  <td>{row.work_phase_name}</td>
                  <td>{row.bac_total}</td>
                  <td>{row.ev_value}</td>
                  <td>{row.ac_star_total}</td>
                  <td>{row.cpi ?? "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <BaselineForms workPhases={workPhases} />
    </div>
  );
}
