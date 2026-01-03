import { loadPlanningReport, loadTargetEstimate } from "@ennuste/application";
import PlanningForm from "../../../ui/planning/PlanningForm";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function PlanningPage() {
  const session = requireSession();
  const services = createServices();
  const rows = await loadPlanningReport(services, {
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
  const latestPlanning = rows[0] as any | undefined;
  const latestTargetLabel = latestPlanning
    ? targetLookup.get(latestPlanning.target_littera_id) ?? latestPlanning.target_littera_id
    : "Ei suunnitelmaa";
  const statusClass =
    latestPlanning?.status === "READY_FOR_FORECAST"
      ? "ready"
      : latestPlanning?.status === "LOCKED"
        ? "locked"
        : latestPlanning?.status === "DRAFT"
          ? "draft"
          : "missing";
  const statusLabel = latestPlanning?.status ?? "Ei tietoa";

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Suunnittelu</h1>
        <p>Tee suunnitelma ennen ennustetapahtumaa.</p>
        <PlanningForm targetOptions={targetOptions} />
      </section>
      <section className="card">
        <h2>Tilannekuva</h2>
        <div className="status-grid">
          <div className="status-item">
            <div className="label">Viimeisin tavoitearvio</div>
            <div className="value">{latestTargetLabel}</div>
          </div>
          <div className="status-item">
            <div className="label">Tila</div>
            <span className={`status-pill ${statusClass}`}>{statusLabel}</span>
          </div>
          <div className="status-item">
            <div className="label">Aika</div>
            <div className="value">{latestPlanning?.event_time ?? "-"}</div>
          </div>
        </div>

        <h2>Nykyiset suunnitelmat</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Tavoitearvio</th>
              <th>Tila</th>
              <th>Aika</th>
              <th>Tekija</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="notice">Ei suunnitelmia viela.</div>
                </td>
              </tr>
            ) : (
              rows.map((row: any) => (
                <tr key={row.planning_event_id}>
                  <td>{targetLookup.get(row.target_littera_id) ?? row.target_littera_id}</td>
                  <td className="status">{row.status}</td>
                  <td>{row.event_time}</td>
                  <td>{row.created_by}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
