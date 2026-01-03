import { loadWorkPhaseReport, loadWorkPhases } from "@ennuste/application";
import {
  approveCorrectionFinalAction,
  approveCorrectionPmAction,
  createGhostEntryAction,
  createWeeklyUpdateAction,
  lockBaselineAction,
  proposeCorrectionAction
} from "../../../server/actions/workPhases";
import { createServices } from "../../../server/services";
import { requireSession } from "../../../server/session";

export default async function BaselinePage() {
  const session = requireSession();
  const services = createServices();
  const reportRows = await loadWorkPhaseReport(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });
  const workPhases = await loadWorkPhases(services, {
    projectId: session.projectId,
    tenantId: session.tenantId,
    username: session.username
  });

  return (
    <div className="grid">
      <section className="card">
        <h1>Baseline</h1>
        <p>Tyovaiheiden lukitut baselinet ja KPI-tilanne.</p>
        <table className="table">
          <thead>
            <tr>
              <th>Tyovaihe</th>
              <th>BAC EUR</th>
              <th>EV EUR</th>
              <th>AC* EUR</th>
              <th>CPI</th>
            </tr>
          </thead>
          <tbody>
            {reportRows.map((row: any) => (
              <tr key={row.work_phase_id}>
                <td>{row.work_phase_name}</td>
                <td>{row.bac_total}</td>
                <td>{row.ev_value}</td>
                <td>{row.ac_star_total}</td>
                <td>{row.cpi ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="card">
        <h2>Viikkopaivitys</h2>
        <form className="form-grid" action={createWeeklyUpdateAction}>
          <label className="label" htmlFor="workPhaseId">Tyovaihe</label>
          <select className="input" id="workPhaseId" name="workPhaseId">
            {workPhases.map((phase: any) => (
              <option key={phase.work_phase_id} value={phase.work_phase_id}>
                {phase.name}
              </option>
            ))}
          </select>

          <label className="label" htmlFor="weekEnding">Viikon paattymispaiva</label>
          <input className="input" id="weekEnding" name="weekEnding" type="date" required />

          <label className="label" htmlFor="percentComplete">Valmiusaste %</label>
          <input className="input" id="percentComplete" name="percentComplete" type="number" step="0.1" required />

          <label className="label" htmlFor="progressNotes">Huomiot</label>
          <textarea className="input" id="progressNotes" name="progressNotes" rows={2} />

          <label className="label" htmlFor="risks">Riskit</label>
          <textarea className="input" id="risks" name="risks" rows={2} />

          <button className="btn btn-primary" type="submit">Tallenna viikkopaivitys</button>
        </form>
      </section>

      <section className="card">
        <h2>Ghost-kulut</h2>
        <form className="form-grid" action={createGhostEntryAction}>
          <label className="label" htmlFor="workPhaseIdGhost">Tyovaihe</label>
          <select className="input" id="workPhaseIdGhost" name="workPhaseId">
            {workPhases.map((phase: any) => (
              <option key={phase.work_phase_id} value={phase.work_phase_id}>
                {phase.name}
              </option>
            ))}
          </select>

          <label className="label" htmlFor="weekEndingGhost">Viikon paattymispaiva</label>
          <input className="input" id="weekEndingGhost" name="weekEnding" type="date" required />

          <label className="label" htmlFor="costType">Kustannuslaji</label>
          <select className="input" id="costType" name="costType">
            <option value="LABOR">Tyo</option>
            <option value="MATERIAL">Aine</option>
            <option value="SUBCONTRACT">Alih</option>
            <option value="RENTAL">Valineet</option>
            <option value="OTHER">Muu</option>
          </select>

          <label className="label" htmlFor="amount">Maara</label>
          <input className="input" id="amount" name="amount" type="number" step="0.01" required />

          <label className="label" htmlFor="description">Selite</label>
          <textarea className="input" id="description" name="description" rows={2} />

          <button className="btn btn-primary" type="submit">Kirjaa ghost</button>
        </form>
      </section>

      <section className="card">
        <h2>Baseline-lukitus</h2>
        <form className="form-grid" action={lockBaselineAction}>
          <label className="label" htmlFor="workPhaseIdLock">Tyovaihe (UUID)</label>
          <input className="input" id="workPhaseIdLock" name="workPhaseId" required />

          <label className="label" htmlFor="workPhaseVersionId">Version ID</label>
          <input className="input" id="workPhaseVersionId" name="workPhaseVersionId" required />

          <label className="label" htmlFor="targetImportBatchId">TARGET_ESTIMATE batch ID</label>
          <input className="input" id="targetImportBatchId" name="targetImportBatchId" required />

          <label className="label" htmlFor="notes">Muistiinpano</label>
          <textarea className="input" id="notes" name="notes" rows={2} />

          <button className="btn btn-primary" type="submit">Lukitse baseline</button>
        </form>
      </section>

      <section className="card">
        <h2>Korjausehdotus ja hyvaksynta</h2>
        <form className="form-grid" action={proposeCorrectionAction}>
          <label className="label" htmlFor="workPhaseIdCorrection">Tyovaihe (UUID)</label>
          <input className="input" id="workPhaseIdCorrection" name="workPhaseId" required />

          <label className="label" htmlFor="itemCode">Item code (budget_items)</label>
          <input className="input" id="itemCode" name="itemCode" required />

          <label className="label" htmlFor="notesCorrection">Perustelu</label>
          <textarea className="input" id="notesCorrection" name="notes" rows={2} />

          <button className="btn btn-secondary" type="submit">Ehdota korjaus</button>
        </form>

        <div className="grid grid-2" style={{ marginTop: "1rem" }}>
          <form className="form-grid" action={approveCorrectionPmAction}>
            <label className="label" htmlFor="correctionIdPm">Korjaus ID</label>
            <input className="input" id="correctionIdPm" name="correctionId" required />
            <label className="label" htmlFor="commentPm">Kommentti</label>
            <input className="input" id="commentPm" name="comment" />
            <button className="btn btn-secondary" type="submit">Hyvaksy 1/2</button>
          </form>
          <form className="form-grid" action={approveCorrectionFinalAction}>
            <label className="label" htmlFor="correctionIdFinal">Korjaus ID</label>
            <input className="input" id="correctionIdFinal" name="correctionId" required />
            <label className="label" htmlFor="commentFinal">Kommentti</label>
            <input className="input" id="commentFinal" name="comment" />
            <button className="btn btn-primary" type="submit">Hyvaksy 2/2</button>
          </form>
        </div>
      </section>
    </div>
  );
}
