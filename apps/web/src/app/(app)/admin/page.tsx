import { loadAdminOverview } from "@ennuste/application";
import { ForbiddenError } from "@ennuste/shared";
import { notFound } from "next/navigation";
import { createServices } from "../../../server/services";
import { isAdminModeEnabled } from "../../../server/adminSession";
import { requireSession } from "../../../server/session";

export default async function AdminPage() {
  if (!isAdminModeEnabled()) {
    notFound();
  }
  const session = await requireSession();
  const services = createServices();
  let overview: Awaited<ReturnType<typeof loadAdminOverview>> | null = null;
  try {
    overview = await loadAdminOverview(services, {
      projectId: session.projectId,
      tenantId: session.tenantId,
      username: session.username
    });
  } catch (error) {
    if (!(error instanceof ForbiddenError)) {
      throw error;
    }
  }

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

  if (!overview) {
    return (
      <div className="card">
        <h1>Admin</h1>
        <div className="notice error">Ei oikeuksia admin-näkymiin.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Admin</h1>
        <p>Käyttäjät, roolit ja projektin jäsenyydet.</p>
        <h3>Roolit</h3>
        <div className="grid">
          {overview.roles.length === 0 ? (
            <div className="notice">Ei rooleja saatavilla.</div>
          ) : (
            overview.roles.map((role) => (
              <div key={role.role_code} className="badge">
                {role.role_code} - {role.role_name_fi}
              </div>
            ))
          )}
        </div>
      </section>
      <section className="card">
        <h2>Kohdistukset</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Kohde</th>
              <th>Käyttäjä</th>
              <th>Rooli</th>
              <th>Myönnetty</th>
            </tr>
          </thead>
          <tbody>
            {overview.assignments.length === 0 ? (
              <tr>
                <td colSpan={4}>
                  <div className="notice">Ei assignointeja.</div>
                </td>
              </tr>
            ) : (
              overview.assignments.map((row, index) => (
                <tr key={`${row.username}-${row.role_code}-${index}`}>
                  <td>{row.scope}</td>
                  <td>{row.username}</td>
                  <td>{row.role_code}</td>
                  <td>{formatDateTime(row.granted_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  );
}
