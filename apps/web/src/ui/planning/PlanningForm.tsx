"use client";

import { useFormState } from "react-dom";
import { createPlanningAction, type PlanningFormState } from "../../server/actions/planning";
import FormStatus from "../form-status";

const initialState: PlanningFormState = { ok: false, message: null, error: null };

export default function PlanningForm() {
  const [state, formAction] = useFormState(createPlanningAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
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

      <FormStatus state={state} />

      <button className="btn btn-primary" type="submit">Tallenna suunnitelma</button>
    </form>
  );
}
