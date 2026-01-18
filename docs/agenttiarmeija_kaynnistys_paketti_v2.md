# Agenttiarmeija – käynnistys- ja toteutuspaketti (v2)

**Päiväys:** 2026-01-11  
**Tarkoitus:** Käynnistää ja viedä loppuun Tuotannonhallinta SaaS:n agenttiarmeijan MVP ilman rönsyilyä.

**ALOITA TÄSTÄ (käyttö + troubleshooting):** `docs/runbooks/agent_army_overview.md`

---

## 1) Porttipäätökset (lukittu kooste)

**Kooste:** `1-1-1-1-1`

1. Tekninen projekti: **kyllä**
2. Repo-toimitukset: **kyllä**
3. API-orkestrointi: **kyllä**
4. MVP toteutuspaikka: **apps/api (Express) + /agent/run endpoint**
5. Agentti saa tehdä branch/commit/push (gate läpi): **kyllä**

---

## 2) Yhteensovitus ketjujen välillä (tulkintalinja)

- Jos aiemmissa ketjuissa oli ehdotus “vain ChatGPT:n sisäiset roolit”, se on **nyt syrjäytynyt** porttipäätöksillä (API-orkestrointi + repo-toimitukset).
- “Sisäiset roolit” jäävät käyttöön **promptitasolla** (Master/UI/Backend/Debug), mutta ajo tehdään koodilla.

---

## 3) MVP-arkkitehtuuri (tavoitetila)

**apps/api**
- `POST /agent/run` (token-suojattu)
- Orkestroija (MasterAgent) kutsuu alagentteja (UI/Backend/Debug)
- Työkalut:
  - tiedostojen luku/kirjoitus (polkurajat)
  - shell-komennot (gate)
  - git-branch/commit/push
- Pysyvä muisti (Postgres, append-only): `agent_sessions`, `agent_events`

**OpenAI**
- OpenAI SDK: `openai`
- Agents SDK: `@openai/agents`
- Suositus: Structured Outputs JSON-skeemalla agenttien vasteisiin

---

## 4) Endpoint-sopimus (MVP)

### Request
```json
{
  "projectId": "uuid-or-string",
  "task": "luonnollinen kieli: mitä tehdään",
  "mode": "mission0|change",
  "dryRun": true
}
```

### Response (suositus)
```json
{
  "status": "ok",
  "sessionId": "uuid",
  "summary": ["..."],
  "artifacts": {
    "branch": "agent/...",
    "commands": ["npm test"],
    "filesChanged": ["..."],
    "notes": "..."
  }
}
```

---

## 5) Migraatio (append-only) – agenttimuisti

> **Nimeä tiedosto repon käytännön mukaan** (esim. seuraava vapaa `migrations/00XX_agent_memory.sql`).

```sql
CREATE TABLE IF NOT EXISTS agent_sessions (
  agent_session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by text NOT NULL DEFAULT 'agent',
  status text NOT NULL DEFAULT 'OPEN'
);

CREATE TABLE IF NOT EXISTS agent_events (
  agent_event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_session_id uuid NOT NULL REFERENCES agent_sessions(agent_session_id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  event_type text NOT NULL,
  payload jsonb NOT NULL
);

-- Append-only (käytä teidän prevent_update_delete()-funktiota)
DO $$ BEGIN
  CREATE TRIGGER agent_sessions_append_only
    BEFORE UPDATE OR DELETE ON agent_sessions
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER agent_events_append_only
    BEFORE UPDATE OR DELETE ON agent_events
    FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
```

---

## 6) Koodi (minimirunko) – mihin liitetään

### 6.1 Riippuvuudet (apps/api)
- `npm install openai @openai/agents pg`

### 6.2 Tiedostot (ehdotus)
- `apps/api/src/routes/agent.routes.ts`
- `apps/api/src/agent/orchestrator.ts`
- `apps/api/src/agent/tools/*`
- `apps/api/src/memory/agentMemoryRepo.ts`

### 6.3 Reitin kytkentä
- `apps/api/src/server.ts` (tai vastaava): lisää reititys `/agent`

---

## 7) Promptipaketti (lyhyt)

- Master: noudattaa policy A, append-only, terminologia, gate, polkurajat
- UI: vain UI-polut, ei DB-muutoksia
- Backend: vain backend/DB-polut, ei rikota migraatiojärjestystä
- Debug: minimikorjaus, ei scope-laajennuksia

---

## 8) Mission 0 (read-only)

Tuotos:
- repo tree (depth 3)
- UI/backend polut
- gate-skriptit package.json:sta
- suositus ALLOWED_PATHS + gate-komennot

---

## 9) Mission 1 (end-to-end)

- pieni muutos (esim. agent endpoint skeleton + token auth + smoke test)
- branch → gate → commit → push → PR (selaimessa)

---

## Muutos (2026-01-17)

### Mitä muuttui
- Päivitettiin polut vastaamaan nykyistä toteutusta: `apps/api/src/agent_army/*` → `apps/api/src/agent/*`.
- Täsmennettiin työkalupolku: `tools.ts` → `apps/api/src/agent/tools/*`.

### Miksi
- Doksin polut eivät vastanneet repo-työpuuta, mikä aiheutti “file not found” -sekaannusta.

### Miten testataan (manuaali)
- Varmista, että polut löytyvät: `ls apps/api/src/agent` ja `ls apps/api/src/agent/tools`.
