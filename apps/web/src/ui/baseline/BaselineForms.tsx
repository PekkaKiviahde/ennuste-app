"use client";

import { useFormState } from "react-dom";
import FormStatus from "../form-status";
import {
  approveCorrectionFinalAction,
  approveCorrectionPmAction,
  createGhostEntryAction,
  createWeeklyUpdateAction,
  lockBaselineAction,
  proposeCorrectionAction,
  type WorkPhaseFormState
} from "../../server/actions/workPhases";

type WorkPhaseOption = {
  work_phase_id: string;
  name: string;
};

const initialState: WorkPhaseFormState = { ok: false, message: null, error: null };

export default function BaselineForms({ workPhases }: { workPhases: WorkPhaseOption[] }) {
  const [weeklyState, weeklyAction] = useFormState(createWeeklyUpdateAction, initialState);
  const [ghostState, ghostAction] = useFormState(createGhostEntryAction, initialState);
  const [lockState, lockAction] = useFormState(lockBaselineAction, initialState);
  const [proposeState, proposeAction] = useFormState(proposeCorrectionAction, initialState);
  const [pmState, pmAction] = useFormState(approveCorrectionPmAction, initialState);
  const [finalState, finalAction] = useFormState(approveCorrectionFinalAction, initialState);

  const hasWorkPhases = workPhases.length > 0;

  return (
    <>
      <section className="card">
        <h2>Viikkopaivitys</h2>
        {!hasWorkPhases ? <div className="notice">Ei tyovaiheita, lisaa ensin tyovaihe.</div> : null}
        <form className="form-grid" action={weeklyAction}>
          <label className="label" htmlFor="workPhaseId">Tyovaihe</label>
          <select className="input" id="workPhaseId" name="workPhaseId" disabled={!hasWorkPhases}>
            {hasWorkPhases ? (
              workPhases.map((phase) => (
                <option key={phase.work_phase_id} value={phase.work_phase_id}>
                  {phase.name}
                </option>
              ))
            ) : (
              <option>Ei tyovaiheita</option>
            )}
          </select>

          <label className="label" htmlFor="weekEnding">Viikon paattymispaiva</label>
          <input className="input" id="weekEnding" name="weekEnding" type="date" required />

          <label className="label" htmlFor="percentComplete">Valmiusaste %</label>
          <input className="input" id="percentComplete" name="percentComplete" type="number" step="0.1" min="0" max="100" required />

          <label className="label" htmlFor="progressNotes">Huomiot</label>
          <textarea className="input" id="progressNotes" name="progressNotes" rows={2} />

          <label className="label" htmlFor="risks">Riskit</label>
          <textarea className="input" id="risks" name="risks" rows={2} />

          <FormStatus state={weeklyState} />

          <button className="btn btn-primary" type="submit" disabled={!hasWorkPhases}>
            Tallenna viikkopaivitys
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Ghost-kulut</h2>
        {!hasWorkPhases ? <div className="notice">Ei tyovaiheita, lisaa ensin tyovaihe.</div> : null}
        <form className="form-grid" action={ghostAction}>
          <label className="label" htmlFor="workPhaseIdGhost">Tyovaihe</label>
          <select className="input" id="workPhaseIdGhost" name="workPhaseId" disabled={!hasWorkPhases}>
            {hasWorkPhases ? (
              workPhases.map((phase) => (
                <option key={phase.work_phase_id} value={phase.work_phase_id}>
                  {phase.name}
                </option>
              ))
            ) : (
              <option>Ei tyovaiheita</option>
            )}
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
          <input className="input" id="amount" name="amount" type="number" step="0.01" min="0" required />

          <label className="label" htmlFor="description">Selite</label>
          <textarea className="input" id="description" name="description" rows={2} />

          <FormStatus state={ghostState} />

          <button className="btn btn-primary" type="submit" disabled={!hasWorkPhases}>
            Kirjaa ghost
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Baseline-lukitus</h2>
        <form className="form-grid" action={lockAction}>
          <label className="label" htmlFor="workPhaseIdLock">Tyovaihe (UUID)</label>
          <input className="input" id="workPhaseIdLock" name="workPhaseId" required />

          <label className="label" htmlFor="workPhaseVersionId">Version ID</label>
          <input className="input" id="workPhaseVersionId" name="workPhaseVersionId" required />

          <label className="label" htmlFor="targetImportBatchId">TARGET_ESTIMATE batch ID</label>
          <input className="input" id="targetImportBatchId" name="targetImportBatchId" required />

          <label className="label" htmlFor="notes">Muistiinpano</label>
          <textarea className="input" id="notes" name="notes" rows={2} />

          <FormStatus state={lockState} />

          <button className="btn btn-primary" type="submit">Lukitse baseline</button>
        </form>
      </section>

      <section className="card">
        <h2>Korjausehdotus ja hyvaksynta</h2>
        <form className="form-grid" action={proposeAction}>
          <label className="label" htmlFor="workPhaseIdCorrection">Tyovaihe (UUID)</label>
          <input className="input" id="workPhaseIdCorrection" name="workPhaseId" required />

          <label className="label" htmlFor="itemCode">Item code (budget_items)</label>
          <input className="input" id="itemCode" name="itemCode" required />

          <label className="label" htmlFor="notesCorrection">Perustelu</label>
          <textarea className="input" id="notesCorrection" name="notes" rows={2} />

          <FormStatus state={proposeState} />

          <button className="btn btn-secondary" type="submit">Ehdota korjaus</button>
        </form>

        <div className="grid grid-2" style={{ marginTop: "1rem" }}>
          <form className="form-grid" action={pmAction}>
            <label className="label" htmlFor="correctionIdPm">Korjaus ID</label>
            <input className="input" id="correctionIdPm" name="correctionId" required />
            <label className="label" htmlFor="commentPm">Kommentti</label>
            <input className="input" id="commentPm" name="comment" />
            <FormStatus state={pmState} />
            <button className="btn btn-secondary" type="submit">Hyvaksy 1/2</button>
          </form>
          <form className="form-grid" action={finalAction}>
            <label className="label" htmlFor="correctionIdFinal">Korjaus ID</label>
            <input className="input" id="correctionIdFinal" name="correctionId" required />
            <label className="label" htmlFor="commentFinal">Kommentti</label>
            <input className="input" id="commentFinal" name="comment" />
            <FormStatus state={finalState} />
            <button className="btn btn-primary" type="submit">Hyvaksy 2/2</button>
          </form>
        </div>
      </section>
    </>
  );
}
