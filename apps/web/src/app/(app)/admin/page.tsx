import { loadAdminOverview } from "@ennuste/application";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function AdminPage() {
  const session = requireSession();
  const services = createServices();
  const overview = await loadAdminOverview(services, {
    projectId: session.projectId,
    username: session.username
  });

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Admin</h1>
        <p>Kayttajat, roolit ja projektin jasenyydet.</p>
        <h3>Roolit</h3>
        <div className="grid">
          {overview.roles.map((role) => (
            <div key={role.role_code} className="badge">
              {role.role_code} - {role.role_name_fi}
            </div>
          ))}
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
            {overview.assignments.map((row, index) => (
              <tr key={`${row.username}-${row.role_code}-${index}`}>
                <td>{row.scope}</td>
                <td>{row.username}</td>
                <td>{row.role_code}</td>
                <td>{row.granted_at}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
