import { loadAuditLog, loadFilteredAuditLog } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

type AuditLogFilter = "all" | "planning" | "forecast" | "auth" | "work-package";

const FILTER_ACTIONS: Record<Exclude<AuditLogFilter, "all">, string[]> = {
  planning: ["planning.create"],
  forecast: ["forecast.create"],
  auth: ["auth.login", "auth.logout", "auth.quick_login"],
  "work-package": [
    "work_package.weekly_update",
    "work_package.ghost_entry",
    "work_package.baseline_lock",
    "work_package.correction_proposed",
    "work_package.correction_pm_approved",
    "work_package.correction_final_approved"
  ]
};

const extractSummary = (payload: unknown) => {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const summary = (payload as { summary?: unknown }).summary;
  return typeof summary === "string" && summary.trim() ? summary.trim() : null;
};

export default async function AuditLogPage({ searchParams }: { searchParams?: { type?: string } }) {
  const session = await requireSession();
  const services = createServices();
  const rawType = searchParams?.type ?? "all";
  const type =
    rawType === "planning" ||
    rawType === "forecast" ||
    rawType === "auth" ||
    rawType === "work-package"
      ? rawType
      : "all";
  const actionFilter = type === "all" ? null : FILTER_ACTIONS[type];
  const rows = actionFilter
    ? await loadFilteredAuditLog(services, {
        projectId: session.projectId,
        tenantId: session.tenantId,
        username: session.username,
        actionFilter
      })
    : await loadAuditLog(services, {
        projectId: session.projectId,
        tenantId: session.tenantId,
        username: session.username
      });

  const formatDateTime = (value: unknown) => {
    if (!value) return "";
    const date =
      value instanceof Date ? value : typeof value === "string" ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) {
      return String(value);
    }
    return new Intl.DateTimeFormat("fi-FI", {
      dateStyle: "short",
      timeStyle: "short"
    }).format(date);
  };

  return (
    <div className="card">
      <h1>Loki</h1>
      <p>Kaikki työpakettisuunnittelu- ja ennustetapahtumat tallentuvat append-only lokiin.</p>
      <div className="status-actions">
        <a className={`btn btn-secondary btn-sm ${type === "all" ? "active" : ""}`} href="/loki">
          Kaikki
        </a>
        <a
          className={`btn btn-secondary btn-sm ${type === "planning" ? "active" : ""}`}
          href="/loki?type=planning"
        >
          Työpakettisuunnittelu
        </a>
        <a
          className={`btn btn-secondary btn-sm ${type === "forecast" ? "active" : ""}`}
          href="/loki?type=forecast"
        >
          Ennuste
        </a>
        <a
          className={`btn btn-secondary btn-sm ${type === "auth" ? "active" : ""}`}
          href="/loki?type=auth"
        >
          Kirjautuminen
        </a>
        <a
          className={`btn btn-secondary btn-sm ${type === "work-package" ? "active" : ""}`}
          href="/loki?type=work-package"
        >
          Työpaketti
        </a>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Aika</th>
            <th>Tekijä</th>
            <th>Tapahtuma</th>
            <th>Selite</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={5}>
                <div className="notice">Ei lokitapahtumia vielä.</div>
              </td>
            </tr>
          ) : (
            rows.map((row: any) => (
              <tr key={row.audit_event_id}>
                <td>{formatDateTime(row.event_time)}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{extractSummary(row.payload) ?? "-"}</td>
                <td>{JSON.stringify(row.payload)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
