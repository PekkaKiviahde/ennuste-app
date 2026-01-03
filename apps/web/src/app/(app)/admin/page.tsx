import { loadAdminOverview } from "@ennuste/application";
import { ForbiddenError } from "@ennuste/shared";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function AdminPage() {
  const session = requireSession();
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
        <div className="notice error">Ei oikeuksia admin-nakymiin.</div>
      </div>
    );
  }

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Admin</h1>
        <p>Kayttajat, roolit ja projektin jasenyydet.</p>
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
        <h2>Assignoinnit</h2>
        <table className="table">
          <thead>
            <tr>
              <th>Scope</th>
              <th>Kayttaja</th>
              <th>Rooli</th>
              <th>Myonnetty</th>
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
