"use client";

import { useState } from "react";

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Virhe");
  }
  return payload;
};

export default function AcceptInviteForm({ token }: { token: string }) {
  const [displayName, setDisplayName] = useState("");
  const [pin, setPin] = useState("");
  const [result, setResult] = useState("");

  const submit = async () => {
    if (!pin.trim()) {
      throw new Error("PIN puuttuu.");
    }
    await fetchJson("/api/invites/accept", {
      method: "POST",
      body: JSON.stringify({
        token,
        pin: pin.trim(),
        displayName: displayName.trim() || null
      })
    });
    setResult("Kutsu hyvaksytty. Voit kirjautua sisaan.");
  };

  return (
    <section className="card">
      <h1>Hyvaksy kutsu</h1>
      <p>Syota nimesi ja valitse PIN.</p>
      <div className="form-grid">
        <label className="label" htmlFor="displayName">Nimi</label>
        <input
          id="displayName"
          className="input"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
          placeholder="Etunimi Sukunimi"
        />

        <label className="label" htmlFor="pin">PIN</label>
        <input
          id="pin"
          className="input"
          type="password"
          value={pin}
          onChange={(event) => setPin(event.target.value)}
          placeholder="****"
        />
      </div>
      <div className="status-actions">
        <button className="btn btn-primary" type="button" onClick={() => submit().catch((err) => setResult(err.message))}>
          Hyvaksy kutsu
        </button>
        <a className="btn btn-secondary" href="/login">Kirjautumiseen</a>
      </div>
      {result && <div className="notice">{result}</div>}
    </section>
  );
}
