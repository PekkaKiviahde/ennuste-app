import { loadMappingLines, loadTargetEstimate, loadWorkflowStatus } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";
import LockPlanningDialog from "../../../ui/planning/LockPlanningDialog";

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
  const session = await requireSession();
  const services = createServices();
  const status = await loadWorkflowStatus(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const targetRows = await loadTargetEstimate(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const mappingRows = await loadMappingLines(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  const planningLabel = status.planning?.status ?? "Ei työpakettisuunnittelua";
  const planningTime = formatDateTime(status.planning?.event_time);
  const planningSummary = status.planning?.summary?.trim();
  const lockSummaryLabel = status.isLocked
    ? planningSummary || "Ei lukituksen selitetta."
    : "Lukitus ei ole voimassa.";
  const forecastTime = formatDateTime(status.forecast?.event_time);
  const auditTime = formatDateTime(status.audit?.event_time);
  const lockLabel = status.isLocked ? "Lukittu" : "Ei lukittu";
  const targetLitteraCount = new Set(targetRows.map((row: any) => row.target_littera_id)).size;
  const mappingLineCount = mappingRows.length;
  const mappingTargetCount = new Set(mappingRows.map((row: any) => row.target_code)).size;
  const mappingWorkCount = new Set(mappingRows.map((row: any) => row.work_code)).size;
  const needsPlanning = !status.planning;
  const needsLock = status.planning?.status === "READY_FOR_FORECAST" && !status.isLocked;
  const showLockDialog = needsLock && Boolean(status.planning?.target_littera_id);
  const nextStepLabel = needsPlanning
    ? "Tee suunnitelma"
    : needsLock
      ? "Lukitse suunnitelma"
      : "Avaa ennuste";
  const nextStepHint = needsPlanning
    ? "Työpakettisuunnittelu vaaditaan ennen ennustetapahtumaa."
    : needsLock
      ? "Avaa lukitus ja tallenna."
      : "Kirjaa uusi ennustetapahtuma.";
  const nextStepHref = needsPlanning || needsLock ? "/suunnittelu" : "/ennuste";

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Tyonohjaus</h1>
        <p>Seuraa työpakettisuunnittelu → ennustetapahtuma → lukitus (baseline) → loki → raportti -virtaa.</p>

        <div className="status-grid">
          <div className="status-item">
            <div className="label">Suunnittelu</div>
            <div className="value">{planningLabel}</div>
            <div className="value muted">{planningTime}</div>
          </div>
          <div className="status-item">
            <div className="label">Ennustetapahtuma</div>
            <div className="value">{forecastTime}</div>
            <div className="value muted">Työpakettisuunnittelu: {planningLabel}</div>
            <div className="value muted">{status.forecast?.created_by ?? "-"}</div>
          </div>
          <div className="status-item">
            <div className="label">Lukitus</div>
            <div className="value">{lockLabel}</div>
            <div className="value muted">{planningTime}</div>
            <div className="value muted">{lockSummaryLabel}</div>
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
        {needsPlanning && (
          <div className="notice error">Työpakettisuunnittelu puuttuu. Ennustetapahtuma ei ole sallittu.</div>
        )}
        <div className="status-actions">
          {showLockDialog ? (
            <LockPlanningDialog targetLitteraId={status.planning?.target_littera_id ?? null} />
          ) : (
            <a className="btn btn-primary btn-sm" href={nextStepHref}>{nextStepLabel}</a>
          )}
          <a className="btn btn-secondary btn-sm" href="/suunnittelu">Työpakettisuunnittelu</a>
          <a className="btn btn-secondary btn-sm" href="/ennuste">Ennuste</a>
          <a className="btn btn-secondary btn-sm" href="/loki">Loki</a>
          <a className="btn btn-secondary btn-sm" href="/raportti">Raportti</a>
        </div>
        <div className="notice">{nextStepHint}</div>
      </section>

      <section className="card">
        <h2>Tavoitearvio ja mapping</h2>
        <p>Seuraa tavoitearvio-litteroita ja työpakettilittera-mappingia.</p>
        <div className="status-grid">
          <div className="status-item">
            <div className="label">Tavoitearvio-litterat</div>
            <div className="value">{targetLitteraCount}</div>
            <div className="value muted">Riveja: {targetRows.length}</div>
          </div>
          <div className="status-item">
            <div className="label">Mapping-rivit</div>
            <div className="value">{mappingLineCount}</div>
            <div className="value muted">Työpakettilitterat: {mappingWorkCount}</div>
          </div>
          <div className="status-item">
            <div className="label">Mapping-tavoitteet</div>
            <div className="value">{mappingTargetCount}</div>
            <div className="value muted">Avaa tavoitearvio</div>
          </div>
        </div>
        <div className="status-actions">
          <a className="btn btn-secondary btn-sm" href="/tavoitearvio">Avaa tavoitearvio</a>
        </div>
      </section>
    </div>
  );
}
