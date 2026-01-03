"use client";

import { useFormState } from "react-dom";
import { createForecastAction, type ForecastFormState } from "../../server/actions/forecast";
import FormStatus from "../form-status";

const initialState: ForecastFormState = { ok: false, message: null, error: null };

type TargetOption = {
  id: string;
  label: string;
};

type MappingVersionOption = {
  id: string;
  label: string;
};

export default function ForecastForm({
  targetOptions = [],
  mappingVersionOptions = []
}: {
  targetOptions?: TargetOption[];
  mappingVersionOptions?: MappingVersionOption[];
}) {
  const [state, formAction] = useFormState(createForecastAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <label className="label" htmlFor="targetLitteraId">Tavoitearvio-littera</label>
      {targetOptions.length > 0 ? (
        <select className="input" id="targetLitteraId" name="targetLitteraId" required>
          <option value="">Valitse tavoitearvio-littera</option>
          {targetOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div>
          <div className="notice">Ei tavoitearvio-litteroita. Syota UUID kasin.</div>
          <input className="input" id="targetLitteraId" name="targetLitteraId" required />
        </div>
      )}

      <label className="label" htmlFor="mappingVersionId">Mapping-versio</label>
      {mappingVersionOptions.length > 0 ? (
        <select className="input" id="mappingVersionId" name="mappingVersionId">
          <option value="">Ei mappingia</option>
          {mappingVersionOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      ) : (
        <div>
          <div className="notice">Ei mapping-versioita. Syota UUID kasin.</div>
          <input className="input" id="mappingVersionId" name="mappingVersionId" />
        </div>
      )}

      <div className="grid grid-2">
        <div>
          <label className="label">Tyo</label>
          <input className="input" name="laborValue" type="number" step="0.01" min="0" />
          <input className="input" name="laborMemo" placeholder="Perustelu" />
        </div>
        <div>
          <label className="label">Aine</label>
          <input className="input" name="materialValue" type="number" step="0.01" min="0" />
          <input className="input" name="materialMemo" placeholder="Perustelu" />
        </div>
        <div>
          <label className="label">Alih</label>
          <input className="input" name="subcontractValue" type="number" step="0.01" min="0" />
          <input className="input" name="subcontractMemo" placeholder="Perustelu" />
        </div>
        <div>
          <label className="label">Valineet</label>
          <input className="input" name="rentalValue" type="number" step="0.01" min="0" />
          <input className="input" name="rentalMemo" placeholder="Perustelu" />
        </div>
        <div>
          <label className="label">Muu</label>
          <input className="input" name="otherValue" type="number" step="0.01" min="0" />
          <input className="input" name="otherMemo" placeholder="Perustelu" />
        </div>
      </div>

      <label className="label" htmlFor="comment">Yleisperustelu</label>
      <textarea className="input" id="comment" name="comment" rows={3} />

      <div className="grid grid-3">
        <div>
          <label className="label">Tekninen valmius %</label>
          <input className="input" name="technicalProgress" type="number" step="0.1" min="0" max="100" />
        </div>
        <div>
          <label className="label">Taloudellinen valmius %</label>
          <input className="input" name="financialProgress" type="number" step="0.1" min="0" max="100" />
        </div>
        <div>
          <label className="label">KPI-arvo</label>
          <input className="input" name="kpiValue" type="number" step="0.01" />
        </div>
      </div>

      <FormStatus state={state} />

      <button className="btn btn-primary" type="submit">Tallenna ennuste</button>
    </form>
  );
}
