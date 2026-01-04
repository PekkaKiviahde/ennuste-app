"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState } from "react-dom";
import { loginAction, type LoginFormState } from "../../server/actions/auth";

const initialState: LoginFormState = { error: null, errorLog: null };

const demoUsers = [
  { label: "Myyja (SELLER_UI)", username: "seller.a" },
  { label: "Tyonjohtaja", username: "site.foreman.a" },
  { label: "Vastaava mestari", username: "general.foreman.a" },
  { label: "Tyopaallikko", username: "project.manager.a" },
  { label: "Tuotantojohtaja", username: "production.manager.a" },
  { label: "Hankinta", username: "procurement.a" },
  { label: "Johto", username: "exec.readonly.a" },
  { label: "Org-admin", username: "org.admin.a" }
];

type LoginFormProps = {
  demoMode?: boolean;
};

export default function LoginForm({ demoMode = false }: LoginFormProps) {
  const [state, formAction] = useFormState(loginAction, initialState);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const usernameRef = useRef<HTMLInputElement>(null);
  const pinRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCopyStatus(null);
  }, [state.errorLog]);

  const fillDemo = (username: string) => {
    if (usernameRef.current) {
      usernameRef.current.value = username;
    }
    if (pinRef.current) {
      pinRef.current.value = "1234";
    }
    formRef.current?.requestSubmit();
  };

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

      {demoMode ? (
        <details className="dialog" open>
          <summary>Demo-tunnukset</summary>
          <div className="dialog-panel">
            <p className="muted">PIN kaikille: 1234.</p>
            <div className="demo-grid">
              {demoUsers.map((user) => (
                <button
                  key={user.username}
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => fillDemo(user.username)}
                >
                  {user.label}
                </button>
              ))}
            </div>
          </div>
        </details>
      ) : null}
    </>
  );
}
