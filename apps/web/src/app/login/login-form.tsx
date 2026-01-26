"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { loginAction, type LoginFormState } from "../../server/actions/auth";

const initialState: LoginFormState = { error: null, errorLog: null };

type LoginFormAction = (state: LoginFormState, formData: FormData) => Promise<LoginFormState>;

type LoginFormProps = {
  demoMode: boolean;
  action?: LoginFormAction;
  submitLabel?: string;
};

export default function LoginForm({ demoMode, action = loginAction, submitLabel = "Kirjaudu" }: LoginFormProps) {
  const [stateRaw, formAction] = useFormState(action, initialState);
  const state = stateRaw ?? initialState; // guard: useFormState should not yield undefined, mutta vältetään runtime-crash
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [showPin, setShowPin] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCopyStatus(null);
  }, [state.errorLog]);

  const copyErrorLog = async () => {
    if (!state.errorLog) {
      return;
    }
    try {
      await navigator.clipboard.writeText(state.errorLog);
      setCopyStatus("Kopioitu");
    } catch {
      setCopyStatus("Kopiointi epäonnistui");
    }
  };

  return (
    <>
      <form
        ref={formRef}
        className="form-grid"
        action={formAction}
        data-show-demo-users={demoMode ? "true" : "false"}
      >
        <label className="label" htmlFor="username">Käyttäjätunnus</label>
        <input
          ref={usernameRef}
          className="input"
          id="username"
          name="username"
          placeholder="etunimi.sukunimi"
          autoComplete="username"
        />

        <label className="label" htmlFor="pin">PIN</label>
        <div className="pin-field">
          <input
            ref={pinRef}
            className="input"
            id="pin"
            name="pin"
            type={showPin ? "text" : "password"}
            placeholder="****"
            inputMode="numeric"
            autoComplete="one-time-code"
          />
          <button
            className="btn btn-secondary btn-sm pin-toggle"
            type="button"
            onClick={() => setShowPin((value) => !value)}
          >
            {showPin ? "Piilota PIN" : "Näytä PIN"}
          </button>
        </div>

        {state.error ? <div className="notice error">{state.error}</div> : null}

        {state.errorLog ? (
          <div className="error-log">
            <div className="error-log-header">
              <span className="label">Virheen logitiedot</span>
              <div className="error-log-actions">
                <button className="btn btn-secondary btn-sm" type="button" onClick={copyErrorLog}>
                  Kopioi virhe
                </button>
                {copyStatus ? <span className="muted">{copyStatus}</span> : null}
              </div>
            </div>
            <textarea className="error-log-text" readOnly value={state.errorLog} />
          </div>
        ) : null}

        <button className="btn btn-primary" type="submit">{submitLabel}</button>
      </form>
    </>
  );
}
