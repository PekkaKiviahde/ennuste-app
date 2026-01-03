"use client";

import { useFormState } from "react-dom";
import { createPlanningAction, type PlanningFormState } from "../../server/actions/planning";
import FormStatus from "../form-status";

const initialState: PlanningFormState = { ok: false, message: null, error: null };

export default function LockPlanningDialog({ targetLitteraId }: { targetLitteraId: string | null }) {
  const [state, formAction] = useFormState(createPlanningAction, initialState);

  if (!targetLitteraId) {
    return null;
  }

  return (
    <details className="dialog">
      <summary className="btn btn-primary btn-sm">Lukitse suunnitelma</summary>
      <div className="dialog-panel">
        <p>Kun lukitset, suunnitelma siirtyy lukittuun tilaan ja ennuste voidaan vahvistaa.</p>
        <form className="form-grid" action={formAction}>
          <input type="hidden" name="targetLitteraId" value={targetLitteraId} />
          <input type="hidden" name="status" value="LOCKED" />

          <label className="label" htmlFor="summary">Lukituksen yhteenveto</label>
          <textarea className="input" id="summary" name="summary" rows={3} />

          <FormStatus state={state} />

          <button className="btn btn-primary btn-sm" type="submit">Vahvista lukitus</button>
        </form>
      </div>
    </details>
  );
}
