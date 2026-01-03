import { loadWorkflowStatus } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

const formatDateTime = (value: string | null | undefined) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("fi-FI", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
};

export default async function WorkflowPage() {
  const session = requireSession();
  const services = createServices();
  const status = await loadWorkflowStatus(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  const planningLabel = status.planning?.status ?? "Ei suunnitelmaa";
  const planningTime = formatDateTime(status.planning?.event_time);
  const forecastTime = formatDateTime(status.forecast?.event_time);
  const auditTime = formatDateTime(status.audit?.event_time);
  const lockLabel = status.isLocked ? "Lukittu" : "Ei lukittu";

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Tyonohjaus</h1>
        <p>Seuraa suunnittelu → ennustetapahtuma → lukitus → loki → raportti -virtaa.</p>

        <div className="status-grid">
          <div className="status-item">
            <div className="label">Suunnittelu</div>
            <div className="value">{planningLabel}</div>
            <div className="value muted">{planningTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Ennustetapahtuma</div>
            <div className="value">{forecastTime}</div>
            <div className="value muted">{status.forecast?.created_by ?? "-"}</div>
          </div>
          <div className="status-item">
            <div className="label">Lukitus</div>
            <div className="value">{lockLabel}</div>
            <div className="value muted">{planningTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Loki</div>
            <div className="value">{status.audit?.action ?? "Ei tapahtumia"}</div>
            <div className="value muted">{auditTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Raportti</div>
            <div className="value">Avaa raportti</div>
            <div className="value muted">{forecastTime}</div>
          </div>
        </div>
      </section>

      <section className="card">
        <h2>Polku nyt</h2>
        <p>Siirry suoraan seuraavaan vaiheeseen ja tarkista tilanne.</p>
        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="/suunnittelu">Suunnittelu</a>
          <a className="btn btn-secondary btn-sm" href="/ennuste">Ennuste</a>
          <a className="btn btn-secondary btn-sm" href="/loki">Loki</a>
          <a className="btn btn-secondary btn-sm" href="/raportti">Raportti</a>
        </div>
      </section>
    </div>
  );
}
