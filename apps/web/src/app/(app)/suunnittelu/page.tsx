import { loadPlanningReport, loadTargetEstimate } from "@ennuste/application";
import PlanningForm from "../../../ui/planning/PlanningForm";
import PlanningTable from "../../../ui/planning/PlanningTable";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function PlanningPage() {
  const session = await requireSession();
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
            <div className="value">{formatDateTime(latestPlanning?.event_time)}</div>
          </div>
        </div>

        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="#suunnitelmat">Siirry suunnitelmiin</a>
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Avaa tavoitearvio</a>
          <a className="btn btn-secondary btn-sm" href="/ylataso">Avaa projekti</a>
          <a className="btn btn-secondary btn-sm" href="/raportti">Avaa raportti</a>
        </div>

        <h2 id="suunnitelmat">Nykyiset suunnitelmat</h2>
        <PlanningTable rows={rows as any[]} targetOptions={targetOptions} />
      </section>
    </div>
  );
}
