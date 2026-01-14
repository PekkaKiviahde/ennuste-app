# Postgres-taulut (MVP)

Tama on suositeltu Postgres-toteutus speksin entiteeteista. Oletus: `project`-taulu on jo olemassa ja `project_id` viittaa siihen.

## Nimikäytäntö ja tenant-eristys
- Fyysiset taulut ovat **monikkomuotoisia** (esim. `planning_events`, `forecast_events`).
- Multi-tenant SaaS:ssa domain-data eristetään `tenant_id`:llä (katso `docs/adr/ADR-002-tenant-id-everywhere.md`).
  - MVP:ssä tenant-eristys voidaan toteuttaa joko (a) `tenant_id`-sarakkeella tauluissa tai (b) varmistamalla `project_id` → `tenant_id` sovelluskerroksessa ja liittymissä.

## Enum-tyypit

```sql
CREATE TYPE cost_type AS ENUM ('LABOR', 'MATERIAL', 'SUBCONTRACT', 'RENTAL', 'OTHER');
CREATE TYPE allocation_rule AS ENUM ('FULL', 'PERCENT', 'AMOUNT');
CREATE TYPE plan_status AS ENUM ('DRAFT', 'READY_FOR_FORECAST', 'LOCKED');
CREATE TYPE mapping_status AS ENUM ('DRAFT', 'ACTIVE', 'RETIRED');
CREATE TYPE forecast_source AS ENUM ('UI', 'IMPORT', 'MIGRATION');
CREATE TYPE attachment_owner_type AS ENUM ('PLANNING_EVENT', 'FORECAST_EVENT');
```

## Konserni ja yhtiot

```sql
CREATE TABLE groups (
  group_id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE UNIQUE INDEX ux_groups_name ON groups (name);
```

```sql
CREATE TABLE organizations (
  organization_id UUID PRIMARY KEY,
  group_id UUID REFERENCES groups (group_id),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE UNIQUE INDEX ux_organizations_slug ON organizations (slug);
CREATE INDEX ix_organizations_group ON organizations (group_id);
```

```sql
CREATE TABLE org_invites (
  invite_id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations (organization_id),
  email TEXT NOT NULL,
  role_code TEXT NOT NULL DEFAULT 'ORG_ADMIN',
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE UNIQUE INDEX ux_org_invites_token ON org_invites (token_hash);
CREATE INDEX ix_org_invites_org ON org_invites (organization_id, expires_at);
```

```sql
CREATE TABLE group_role_assignments (
  assignment_id UUID PRIMARY KEY,
  group_id UUID NOT NULL REFERENCES groups (group_id),
  user_id UUID NOT NULL REFERENCES users (user_id),
  role_code TEXT NOT NULL REFERENCES roles (role_code),
  granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  granted_by TEXT NOT NULL,
  revoked_at TIMESTAMPTZ,
  revoked_by TEXT,
  revoke_reason TEXT
);

CREATE UNIQUE INDEX ux_group_role_active
  ON group_role_assignments (group_id, user_id, role_code)
  WHERE revoked_at IS NULL;
```

## Littera

```sql
CREATE TABLE litteras (
  littera_id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  tenant_id UUID,
  code TEXT NOT NULL CHECK (code ~ '^\d{4}$'),
  title TEXT NOT NULL,
  group_code INT NOT NULL CHECK (group_code BETWEEN 0 AND 9),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE UNIQUE INDEX ux_litteras_project_code ON litteras (project_id, code);
CREATE INDEX ix_litteras_project ON litteras (project_id);
CREATE INDEX ix_litteras_group_code ON litteras (group_code);
```

## Mapping (versiot + rivit)

```sql
CREATE TABLE mapping_versions (
  mapping_version_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  valid_from DATE NOT NULL,
  valid_to DATE,
  status mapping_status NOT NULL DEFAULT 'DRAFT',
  reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  approved_at TIMESTAMPTZ,
  approved_by TEXT
);

CREATE INDEX ix_mapping_versions_project ON mapping_versions (project_id, status);
CREATE INDEX ix_mapping_versions_validity ON mapping_versions (project_id, valid_from, valid_to);
```

```sql
CREATE TABLE mapping_lines (
  mapping_line_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  mapping_version_id UUID NOT NULL REFERENCES mapping_versions (mapping_version_id),
  work_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  target_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  allocation_rule allocation_rule NOT NULL,
  allocation_value NUMERIC(9,4) NOT NULL,
  cost_type cost_type,
  note TEXT
);

CREATE INDEX ix_mapping_lines_version ON mapping_lines (mapping_version_id);
CREATE INDEX ix_mapping_lines_work ON mapping_lines (work_littera_id);
CREATE INDEX ix_mapping_lines_target ON mapping_lines (target_littera_id);
```

```sql
CREATE TABLE mapping_event_log (
  event_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  event_user TEXT,
  action TEXT NOT NULL,
  payload_json JSONB NOT NULL
);

CREATE INDEX ix_mapping_event_project_time ON mapping_event_log (project_id, event_time DESC);
```

## Suunnittelutapahtuma (append-only)

```sql
CREATE TABLE planning_events (
  planning_event_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  target_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  status plan_status NOT NULL DEFAULT 'DRAFT',
  summary TEXT,
  observations TEXT,
  risks TEXT,
  decisions TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX ix_planning_events_project_target ON planning_events (project_id, target_littera_id);
CREATE INDEX ix_planning_events_project_time ON planning_events (project_id, event_time DESC, planning_event_id DESC);
CREATE INDEX ix_planning_events_status ON planning_events (status);
```

## Ennustetapahtuma + rivit

```sql
CREATE TABLE forecast_events (
  forecast_event_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  target_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  mapping_version_id UUID REFERENCES mapping_versions (mapping_version_id),
  event_time TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT,
  source forecast_source NOT NULL DEFAULT 'UI',
  comment TEXT,
  technical_progress NUMERIC(5,4),
  financial_progress NUMERIC(5,4),
  kpi_value NUMERIC(12,4),
  is_locked BOOLEAN NOT NULL DEFAULT FALSE,
  lock_reason TEXT
);

CREATE INDEX ix_forecast_events_project_time ON forecast_events (project_id, event_time DESC);
CREATE INDEX ix_forecast_events_target_time ON forecast_events (target_littera_id, event_time DESC);
```

```sql
CREATE TABLE forecast_event_lines (
  forecast_event_line_id UUID PRIMARY KEY,
  forecast_event_id UUID NOT NULL REFERENCES forecast_events (forecast_event_id),
  cost_type cost_type NOT NULL,
  forecast_value NUMERIC(14,2) NOT NULL,
  memo_general TEXT,
  memo_procurement TEXT,
  memo_calculation TEXT
);

CREATE INDEX ix_forecast_event_lines_event ON forecast_event_lines (forecast_event_id);
CREATE INDEX ix_forecast_event_lines_cost_type ON forecast_event_lines (cost_type);
```

## Liitteet

```sql
CREATE TABLE attachments (
  attachment_id UUID PRIMARY KEY,
  tenant_id UUID,
  owner_type attachment_owner_type NOT NULL,
  owner_id UUID NOT NULL,
  filename TEXT NOT NULL,
  storage_ref TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX ix_attachments_owner ON attachments (owner_type, owner_id);
```

## Tavoitearvio (budget) ja toteuma (actual)

```sql
CREATE TABLE budget_lines (
  budget_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  target_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  cost_type cost_type NOT NULL,
  budget_value NUMERIC(14,2) NOT NULL,
  source TEXT NOT NULL,
  valid_from DATE,
  valid_to DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by TEXT
);

CREATE INDEX ix_budget_lines_project_target ON budget_lines (project_id, target_littera_id);
CREATE INDEX ix_budget_lines_cost_type ON budget_lines (cost_type);
```

```sql
CREATE TABLE actual_cost_lines (
  actual_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID NOT NULL,
  work_littera_id UUID NOT NULL REFERENCES litteras (littera_id),
  cost_type cost_type NOT NULL,
  actual_value NUMERIC(14,2) NOT NULL,
  period DATE NOT NULL,
  source TEXT NOT NULL,
  import_batch_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX ix_actual_cost_lines_project_period ON actual_cost_lines (project_id, period);
CREATE INDEX ix_actual_cost_lines_work_littera ON actual_cost_lines (work_littera_id);
```

```sql
CREATE TABLE import_batches (
  import_batch_id UUID PRIMARY KEY,
  tenant_id UUID,
  project_id UUID,
  source_system TEXT NOT NULL,
  imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  imported_by TEXT,
  hash_signature TEXT,
  notes TEXT
);
```

## Mita muuttui
- Lisatty konserni- ja yhtiotaulut seka kutsulinkit.
- Lisatty konserniroolien assignoinnit.
- Paivitetty Postgres-taulut, avaimet ja indeksit speksin entiteeteille.
- Lisatty mapping_version ja mapping_line taulut mapping-speksin mukaisesti.
- Liitetty ennustetapahtuma mapping_versioniin audit trailia varten.
- Lisatty viite spec-migraatioihin (`spec/migrations/0001_spec_mvp_schema.sql`).

## Miksi
- Toteutus tarvitsee selkean taulurungon, jota UI/API/DB voivat noudattaa.
- Mappingin versionointi on keskeinen osa suunnittelun ja ennusteen ketjua.
- Onboarding-virta vaatii konserni- ja kutsutaulut.

## Miten testataan (manuaali)
- Lue taulut ja varmista, etta ne kattavat speksin entiteetit.
- Varmista, etta kaikilla FKeilla on olemassa oleva kohde ja perusindeksit.
- Luo konserni, yhtio ja org_invite, varmista uniikki token_hash.
