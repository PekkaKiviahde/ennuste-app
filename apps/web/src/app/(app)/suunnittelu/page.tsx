import { loadPlanningReport } from "@ennuste/application";
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

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Suunnittelu</h1>
        <p>Tee suunnitelma ennen ennustetapahtumaa.</p>
        <PlanningForm />
      </section>
      <section className="card">
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
                  <td>{row.target_littera_id}</td>
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
