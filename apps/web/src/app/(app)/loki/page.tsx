import { loadAuditLog } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function AuditLogPage() {
  const session = await requireSession();
  const services = createServices();
  const rows = await loadAuditLog(services, {
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
      <p>Kaikki suunnitelma- ja ennustetapahtumat tallentuvat append-only lokiin.</p>
      <table className="table">
        <thead>
          <tr>
            <th>Aika</th>
            <th>Tekija</th>
            <th>Tapahtuma</th>
            <th>Payload</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={4}>
                <div className="notice">Ei lokitapahtumia viela.</div>
              </td>
            </tr>
          ) : (
            rows.map((row: any) => (
              <tr key={row.audit_event_id}>
                <td>{formatDateTime(row.event_time)}</td>
                <td>{row.actor}</td>
                <td>{row.action}</td>
                <td>{JSON.stringify(row.payload)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
