"use client";

import { useFormState } from "react-dom";
import { loginAction, type LoginFormState } from "../../server/actions/auth";

const initialState: LoginFormState = { error: null };

export default function LoginForm() {
  const [state, formAction] = useFormState(loginAction, initialState);

  return (
    <form className="form-grid" action={formAction}>
      <label className="label" htmlFor="username">Kayttajatunnus</label>
      <input className="input" id="username" name="username" placeholder="etunimi.sukunimi" />

      <label className="label" htmlFor="pin">PIN</label>
      <input className="input" id="pin" name="pin" type="password" placeholder="****" />

      {state.error ? <div className="notice error">{state.error}</div> : null}

      <button className="btn btn-primary" type="submit">Kirjaudu</button>
    </form>
  );
}
