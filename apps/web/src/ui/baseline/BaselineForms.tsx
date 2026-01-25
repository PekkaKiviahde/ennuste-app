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
  type WorkPackageFormState
} from "../../server/actions/workPackages";

type WorkPackageOption = {
  work_package_id: string;
  name: string;
};

const initialState: WorkPackageFormState = { ok: false, message: null, error: null };

export default function BaselineForms({ workPackages }: { workPackages: WorkPackageOption[] }) {
  const [weeklyState, weeklyAction] = useFormState(createWeeklyUpdateAction, initialState);
  const [ghostState, ghostAction] = useFormState(createGhostEntryAction, initialState);
  const [lockState, lockAction] = useFormState(lockBaselineAction, initialState);
  const [proposeState, proposeAction] = useFormState(proposeCorrectionAction, initialState);
  const [pmState, pmAction] = useFormState(approveCorrectionPmAction, initialState);
  const [finalState, finalAction] = useFormState(approveCorrectionFinalAction, initialState);

  const hasWorkPackages = workPackages.length > 0;

  return (
    <>
      <section className="card">
        <h2>Viikkopäivitys</h2>
        {!hasWorkPackages ? <div className="notice">Ei työpaketteja, lisää ensin työpaketti.</div> : null}
        <form className="form-grid" action={weeklyAction}>
          <label className="label" htmlFor="workPackageId">Työpaketti</label>
          <select className="input" id="workPackageId" name="workPackageId" disabled={!hasWorkPackages}>
            {hasWorkPackages ? (
              workPackages.map((workPackage) => (
                <option key={workPackage.work_package_id} value={workPackage.work_package_id}>
                  {workPackage.name}
                </option>
              ))
            ) : (
              <option>Ei työpaketteja</option>
            )}
          </select>

          <label className="label" htmlFor="weekEnding">Viikon päättymispäivä</label>
          <input className="input" id="weekEnding" name="weekEnding" type="date" required />

          <label className="label" htmlFor="percentComplete">Valmiusaste %</label>
          <input className="input" id="percentComplete" name="percentComplete" type="number" step="0.1" min="0" max="100" required />

          <label className="label" htmlFor="progressNotes">Huomiot</label>
          <textarea className="input" id="progressNotes" name="progressNotes" rows={2} />

          <label className="label" htmlFor="risks">Riskit</label>
          <textarea className="input" id="risks" name="risks" rows={2} />

          <FormStatus state={weeklyState} />

          <button className="btn btn-primary" type="submit" disabled={!hasWorkPackages}>
            Tallenna viikkopäivitys
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Ghost-kulut</h2>
        {!hasWorkPackages ? <div className="notice">Ei työpaketteja, lisää ensin työpaketti.</div> : null}
        <form className="form-grid" action={ghostAction}>
          <label className="label" htmlFor="workPackageIdGhost">Työpaketti</label>
          <select className="input" id="workPackageIdGhost" name="workPackageId" disabled={!hasWorkPackages}>
            {hasWorkPackages ? (
              workPackages.map((workPackage) => (
                <option key={workPackage.work_package_id} value={workPackage.work_package_id}>
                  {workPackage.name}
                </option>
              ))
            ) : (
              <option>Ei työpaketteja</option>
            )}
          </select>

          <label className="label" htmlFor="weekEndingGhost">Viikon päättymispäivä</label>
          <input className="input" id="weekEndingGhost" name="weekEnding" type="date" required />

          <label className="label" htmlFor="costType">Kustannuslaji</label>
          <select className="input" id="costType" name="costType">
            <option value="LABOR">Työ</option>
            <option value="MATERIAL">Aine</option>
            <option value="SUBCONTRACT">Alih</option>
            <option value="RENTAL">Välineet</option>
            <option value="OTHER">Muu</option>
          </select>

          <label className="label" htmlFor="amount">Määrä</label>
          <input className="input" id="amount" name="amount" type="number" step="0.01" min="0" required />

          <label className="label" htmlFor="description">Selite</label>
          <textarea className="input" id="description" name="description" rows={2} />

          <FormStatus state={ghostState} />

          <button className="btn btn-primary" type="submit" disabled={!hasWorkPackages}>
            Kirjaa ghost
          </button>
        </form>
      </section>

      <section className="card">
        <h2>Baseline-lukitus</h2>
        <form className="form-grid" action={lockAction}>
          <label className="label" htmlFor="workPackageIdLock">Työpaketti (UUID)</label>
          <input className="input" id="workPackageIdLock" name="workPackageId" required />

          <label className="label" htmlFor="workPackageVersionId">Versio-ID</label>
          <input className="input" id="workPackageVersionId" name="workPackageVersionId" required />

          <label className="label" htmlFor="targetImportBatchId">TARGET_ESTIMATE-erä-ID</label>
          <input className="input" id="targetImportBatchId" name="targetImportBatchId" required />

          <label className="label" htmlFor="notes">Muistiinpano</label>
          <textarea className="input" id="notes" name="notes" rows={2} />

          <FormStatus state={lockState} />

          <button className="btn btn-primary" type="submit">Lukitse baseline</button>
        </form>
      </section>

      <section className="card">
        <h2>Korjausehdotus ja hyväksyntä</h2>
        <form className="form-grid" action={proposeAction}>
          <label className="label" htmlFor="workPackageIdCorrection">Työpaketti (UUID)</label>
          <input className="input" id="workPackageIdCorrection" name="workPackageId" required />

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
            <button className="btn btn-secondary" type="submit">Hyväksy 1/2</button>
          </form>
          <form className="form-grid" action={finalAction}>
            <label className="label" htmlFor="correctionIdFinal">Korjaus ID</label>
            <input className="input" id="correctionIdFinal" name="correctionId" required />
            <label className="label" htmlFor="commentFinal">Kommentti</label>
            <input className="input" id="commentFinal" name="comment" />
            <FormStatus state={finalState} />
            <button className="btn btn-primary" type="submit">Hyväksy 2/2</button>
          </form>
        </div>
      </section>
    </>
  );
}
