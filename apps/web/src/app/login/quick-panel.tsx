"use client";

import { useEffect } from "react";
import { quickRoleLoginAction } from "../../server/actions/auth";

const demoRoles = [
  { label: "Tyonjohtaja (Tenant A)", username: "site.foreman.a", pin: "1234" },
  { label: "Vastaava mestari (Tenant A)", username: "general.foreman.a", pin: "1234" },
  { label: "Tyopaallikko (Tenant A)", username: "project.manager.a", pin: "1234" },
  { label: "Tuotantojohtaja (Tenant A)", username: "production.manager.a", pin: "1234" },
  { label: "Hankinta (Tenant A)", username: "procurement.a", pin: "1234" },
  { label: "Johto (luku) (Tenant A)", username: "exec.readonly.a", pin: "1234" },
  { label: "Organisaatio-admin (Tenant A)", username: "org.admin.a", pin: "1234" },
  { label: "Tyonjohtaja (Tenant B)", username: "site.foreman.b", pin: "1234" },
  { label: "Vastaava mestari (Tenant B)", username: "general.foreman.b", pin: "1234" },
  { label: "Tyopaallikko (Tenant B)", username: "project.manager.b", pin: "1234" },
  { label: "Tuotantojohtaja (Tenant B)", username: "production.manager.b", pin: "1234" },
  { label: "Hankinta (Tenant B)", username: "procurement.b", pin: "1234" },
  { label: "Johto (luku) (Tenant B)", username: "exec.readonly.b", pin: "1234" },
  { label: "Organisaatio-admin (Tenant B)", username: "org.admin.b", pin: "1234" }
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
