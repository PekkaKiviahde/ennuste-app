import { loadPlanningReport } from "@ennuste/application";
import { createPlanningAction } from "../../../server/actions/planning";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function PlanningPage() {
  const session = requireSession();
  const services = createServices();
  const rows = await loadPlanningReport(services, {
    projectId: session.projectId,
    username: session.username
  });

  return (
    <div className="grid grid-2">
      <section className="card">
        <h1>Suunnittelu</h1>
        <p>Tee suunnitelma ennen ennustetapahtumaa.</p>
        <form className="form-grid" action={createPlanningAction}>
          <label className="label" htmlFor="targetLitteraId">Tavoitearvio-littera (UUID)</label>
          <input className="input" id="targetLitteraId" name="targetLitteraId" placeholder="littera-id" required />

          <label className="label" htmlFor="status">Tila</label>
          <select className="input" id="status" name="status">
            <option value="DRAFT">Luonnos</option>
            <option value="READY_FOR_FORECAST">Valmis ennusteeseen</option>
            <option value="LOCKED">Lukittu</option>
          </select>

          <label className="label" htmlFor="summary">Yhteenveto</label>
          <textarea className="input" id="summary" name="summary" rows={3} />

          <label className="label" htmlFor="observations">Havainnot</label>
          <textarea className="input" id="observations" name="observations" rows={3} />

          <label className="label" htmlFor="risks">Riskit</label>
          <textarea className="input" id="risks" name="risks" rows={3} />

          <label className="label" htmlFor="decisions">Paatokset</label>
          <textarea className="input" id="decisions" name="decisions" rows={3} />

          <button className="btn btn-primary" type="submit">Tallenna suunnitelma</button>
        </form>
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
            {rows.map((row: any) => (
              <tr key={row.planning_event_id}>
                <td>{row.target_littera_id}</td>
                <td className="status">{row.status}</td>
                <td>{row.event_time}</td>
                <td>{row.created_by}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
