"use client";

import { useEffect } from "react";
import { quickRoleLoginAction } from "../../server/actions/auth";

const demoRoles = [
  { label: "Tyonjohtaja", username: "site.foreman", pin: "1234" },
  { label: "Vastaava mestari", username: "general.foreman", pin: "1234" },
  { label: "Tyopaallikko", username: "project.manager", pin: "1234" },
  { label: "Tuotantojohtaja", username: "production.manager", pin: "1234" },
  { label: "Hankinta", username: "procurement", pin: "1234" },
  { label: "Johto (luku)", username: "exec.readonly", pin: "1234" },
  { label: "Organisaatio-admin", username: "org.admin", pin: "1234" }
];

const isTextInput = (element: Element | null) => {
  return element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement;
};

export default function LoginQuickPanel({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled) {
      return;
    }
    const handler = (event: KeyboardEvent) => {
      if (isTextInput(document.activeElement)) {
        return;
      }
      const index = Number(event.key) - 1;
      if (Number.isNaN(index) || index < 0) {
        return;
      }
      const isShift = event.shiftKey;
      const offset = isShift ? 9 : 0;
      const roleIndex = index + offset;
      const role = demoRoles[roleIndex];
      if (!role) {
        return;
      }
      const button = document.querySelector<HTMLButtonElement>(`[data-role-index="${roleIndex}"]`);
      button?.click();
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [enabled]);

  return (
    <section className="card">
      <h2>Demo-roolit</h2>
      <p>Valitse rooli napilla tai pikanappaimella. Toimii vain demo-tilassa.</p>

      <div className="grid">
        {demoRoles.map((role, index) => {
          const keyNumber = index + 1;
          const hint = keyNumber <= 9 ? `[${keyNumber}]` : `[Shift+${keyNumber - 9}]`;
          return (
            <form key={role.username} action={quickRoleLoginAction}>
              <input type="hidden" name="username" value={role.username} />
              <input type="hidden" name="pin" value={role.pin} />
              <button
                className="btn btn-secondary"
                type="submit"
                data-role-index={index}
                disabled={!enabled}
              >
                {hint} {role.label}
              </button>
            </form>
          );
        })}
      </div>

      <div className="notice">
        <strong>Pikanappaimet:</strong> 1-9 ensimmaisille rooleille. Jos rooleja on yli 9, kayta Shift+1-9.
      </div>
    </section>
  );
}
