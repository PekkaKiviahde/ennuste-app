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
  const statusClass = (status: string | null | undefined) => {
    if (status === "READY_FOR_FORECAST") return "ready";
    if (status === "LOCKED") return "locked";
    if (status === "DRAFT") return "draft";
    return "missing";
  };
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
            <span className={`status-pill ${statusClass(latestPlanning?.status)}`}>{statusLabel}</span>
          </div>
          <div className="status-item">
            <div className="label">Aika</div>
            <div className="value">{latestPlanning?.event_time ?? "-"}</div>
          </div>
        </div>

        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="#suunnitelmat">Siirry suunnitelmiin</a>
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Avaa tavoitearvio</a>
          <a className="btn btn-secondary btn-sm" href="/ylataso">Avaa projekti</a>
          <a className="btn btn-secondary btn-sm" href="/raportti">Avaa raportti</a>
        </div>

        <h2 id="suunnitelmat">Nykyiset suunnitelmat</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Tavoitearvio</th>
              <th>Tila</th>
              <th>Aika</th>
              <th>Tekija</th>
              <th>Yhteenveto</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  <div className="notice">Ei suunnitelmia viela.</div>
                </td>
              </tr>
            ) : (
              groupedRows.flatMap((group) => [
                <tr key={`group-${group.label}`} className="table-group">
                  <td colSpan={5}>{group.label}</td>
                </tr>,
                ...group.items.map((row: any) => (
                  <tr key={row.planning_event_id}>
                    <td>{targetLookup.get(row.target_littera_id) ?? row.target_littera_id}</td>
                    <td>
                      <span className={`status-pill ${statusClass(row.status)}`}>{row.status}</span>
                    </td>
                    <td>{formatDateTime(row.event_time)}</td>
                    <td>
                      <div>{row.created_by}</div>
                      <div className="muted">{row.planning_event_id}</div>
                    </td>
                    <td>
                      <div>{row.summary ?? "-"}</div>
                      <div className="muted">{row.observations ?? "-"}</div>
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
