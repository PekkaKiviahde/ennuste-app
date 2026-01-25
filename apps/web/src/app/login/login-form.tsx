"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { loginAction, type LoginFormState } from "../../server/actions/auth";

const initialState: LoginFormState = { error: null, errorLog: null };

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
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
      setCopyStatus("Kopiointi epaonnistui");
    }
  };

  return (
    <>
      <form ref={formRef} className="form-grid" action={formAction}>
        <label className="label" htmlFor="username">Kayttajatunnus</label>
        <input ref={usernameRef} className="input" id="username" name="username" placeholder="etunimi.sukunimi" />

        <label className="label" htmlFor="pin">PIN</label>
        <input ref={pinRef} className="input" id="pin" name="pin" type="password" placeholder="****" />

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

        <button className="btn btn-primary" type="submit">Kirjaudu</button>
      </form>
    </>
  );
}
