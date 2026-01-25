"use client";

import { useState } from "react";
import { clearAdminActingRoleAction, setAdminActingRoleAction } from "../../../server/actions/adminAuth";

type RoleOption = {
  roleCode: string;
  label: string;
};

type ActAsClientProps = {
  roleOptions: ReadonlyArray<RoleOption>;
  currentRoleCode: string | null;
  currentRoleLabel: string | null;
};

export default function ActAsClient({ roleOptions, currentRoleCode, currentRoleLabel }: ActAsClientProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredRoles = normalizedQuery
    ? roleOptions.filter((role) =>
        role.label.toLowerCase().includes(normalizedQuery) || role.roleCode.toLowerCase().includes(normalizedQuery)
      )
    : roleOptions;
  const currentRoleText = currentRoleLabel ?? "(ei valittu)";

  return (
    <div className="container">
      <section className="card grid">
        <h1>Valitse rooli</h1>
        <div className="notice admin-banner">
          <span>Toimit roolissa: {currentRoleText}</span>
          <form action={clearAdminActingRoleAction}>
            <button className="btn btn-secondary btn-sm" type="submit">Palaa adminiin</button>
          </form>
        </div>
        <div className="form-grid">
          <label className="label" htmlFor="roleSearch">Hae roolia</label>
          <input
            id="roleSearch"
            className="input"
            placeholder="esim. tyonjohtaja"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <p className="muted">Valinta vaikuttaa vain tahan istuntoon.</p>
        <div className="grid grid-3">
          {filteredRoles.length === 0 ? (
            <div className="notice">Ei rooleja haulla.</div>
          ) : (
            filteredRoles.map((role) => {
              const isActive = role.roleCode === currentRoleCode;
              return (
                <div key={role.roleCode} className="card role-card">
                  <strong>{role.label}</strong>
                  <div className="muted role-card-code">{role.roleCode}</div>
                  <form className="role-card-actions" action={setAdminActingRoleAction}>
                    <input type="hidden" name="roleCode" value={role.roleCode} />
                    <button className="btn btn-primary btn-sm" type="submit" disabled={isActive}>
                      {isActive ? "Valittu" : "Valitse"}
                    </button>
                  </form>
                </div>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
