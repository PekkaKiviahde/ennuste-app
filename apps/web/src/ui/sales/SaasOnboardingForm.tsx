"use client";

import { useState } from "react";

const fetchJson = async (url: string, options: RequestInit = {}) => {
  const res = await fetch(url, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload.error || "Virhe");
  }
  return payload;
};

export default function SaasOnboardingForm() {
  const [groupName, setGroupName] = useState("");
  const [groupId, setGroupId] = useState("");
  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [result, setResult] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const createAll = async () => {
    setResult("");
    setInviteLink("");
    let resolvedGroupId = groupId.trim() || null;
    if (groupName.trim()) {
      const groupRes = await fetchJson("/api/saas/groups", {
        method: "POST",
        body: JSON.stringify({ name: groupName.trim() })
      });
      resolvedGroupId = groupRes.group_id;
    }

    if (!orgName.trim() || !orgSlug.trim() || !adminEmail.trim()) {
      throw new Error("Yhtion nimi, slug ja adminin email vaaditaan.");
    }

    const orgRes = await fetchJson("/api/saas/organizations", {
      method: "POST",
      body: JSON.stringify({
        groupId: resolvedGroupId,
        name: orgName.trim(),
        slug: orgSlug.trim(),
        adminEmail: adminEmail.trim()
      })
    });

    const link = `${window.location.origin}/invite/${orgRes.invite_token}`;
    setInviteLink(link);
    setResult(`Yhtio luotu. organization_id=${orgRes.organization_id} · demo=${orgRes.project_id}`);
  };

  return (
    <section className="card">
      <h1>Myyjan onboarding</h1>
      <p>Luo konserni (valinnainen), yhtio ja kutsu yrityksen paakayttajalle.</p>
      <div className="form-grid">
        <label className="label" htmlFor="groupName">Konsernin nimi (valinnainen)</label>
        <input
          id="groupName"
          className="input"
          value={groupName}
          onChange={(event) => setGroupName(event.target.value)}
          placeholder="Konserni Oy"
        />

        <label className="label" htmlFor="groupId">Konserni ID (valinnainen)</label>
        <input
          id="groupId"
          className="input"
          value={groupId}
          onChange={(event) => setGroupId(event.target.value)}
          placeholder="uuid"
        />

        <label className="label" htmlFor="orgName">Yhtion nimi</label>
        <input
          id="orgName"
          className="input"
          value={orgName}
          onChange={(event) => setOrgName(event.target.value)}
          placeholder="Kide-Asunnot"
        />

        <label className="label" htmlFor="orgSlug">Slug</label>
        <input
          id="orgSlug"
          className="input"
          value={orgSlug}
          onChange={(event) => setOrgSlug(event.target.value)}
          placeholder="kide-asunnot"
        />

        <label className="label" htmlFor="adminEmail">Paakayttajan email</label>
        <input
          id="adminEmail"
          className="input"
          value={adminEmail}
          onChange={(event) => setAdminEmail(event.target.value)}
          placeholder="admin@kide.local"
        />
      </div>

      <div className="status-actions">
        <button className="btn btn-primary" type="button" onClick={() => createAll().catch((err) => setResult(err.message))}>
          Luo yhtio + kutsu
        </button>
      </div>

      {result && <div className="notice">{result}</div>}
      {inviteLink && (
        <div className="notice">
          Kutsulinkki: <code>{inviteLink}</code>
        </div>
      )}
    </section>
  );
}
