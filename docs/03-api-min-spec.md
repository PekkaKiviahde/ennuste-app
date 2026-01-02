# API Min Spec (MVP)

Tämä on käytännönläheinen minimi-API-speksi. Tarkoitus on, että kehittäjä voi toteuttaa tämän suoraan.

## Yleiset säännöt
- Kaikki endpointit vaativat autentikoinnin.
- Jokainen request ajetaan **tenant-kontekstissa**.
  - Suositus: `X-Tenant-Id: <uuid>` header TAI sessionissa “current tenant”.
  - Backendin pitää varmistaa, että käyttäjällä on membership kyseiseen tenanttiin.
- Kaikki domain-kyselyt suodatetaan `tenant_id`:llä.
- Write-operaatiot vaativat permissionin (RBAC).

## Content-Type
- `application/json; charset=utf-8`

## Virheformaatti (suositus)
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Missing permission: project.write",
    "details": {}
  }
}
```

## 1) GET /me
Palauttaa käyttäjän perustiedot + current tenant + permissions.

**200 OK**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "User Name"
  },
  "tenant": {
    "id": "uuid",
    "name": "Tenant Oy"
  },
  "permissions": [
    "company.read",
    "project.write"
  ]
}
```

## 2) Companies

### GET /companies  (permission: company.read)
**200 OK**
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Pajala Yhtiöt Oy",
      "company_details": { "y_tunnus": "1234567-8" },
      "created_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

### POST /companies  (permission: company.write)
**Request**
```json
{
  "name": "Pajala Yhtiöt Oy",
  "company_details": {
    "y_tunnus": "1234567-8",
    "address": "Oulu"
  }
}
```

**201 Created**
```json
{
  "id": "uuid",
  "name": "Pajala Yhtiöt Oy",
  "company_details": { "y_tunnus": "1234567-8", "address": "Oulu" },
  "created_at": "2026-01-01T12:00:00Z"
}
```

### PATCH /companies/:id  (permission: company.write)
Osapäivitys: sallii `name` ja/tai `company_details` (kokonaan tai osittain, valitse käytäntö).

**Request (esimerkki)**
```json
{
  "name": "Pajala Yhtiöt Oy (uusi)",
  "company_details": {
    "address": "Helsinki"
  }
}
```

**200 OK**
```json
{
  "id": "uuid",
  "name": "Pajala Yhtiöt Oy (uusi)",
  "company_details": { "y_tunnus": "1234567-8", "address": "Helsinki" },
  "created_at": "2026-01-01T12:00:00Z"
}
```

## 3) Projects

### GET /projects?companyId=...  (permission: project.read)
**200 OK**
```json
{
  "items": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "Kohde A",
      "status": "active",
      "project_details": { "site_manager": "Matti" },
      "created_at": "2026-01-01T12:00:00Z"
    }
  ]
}
```

### POST /projects  (permission: project.write)
**Request**
```json
{
  "company_id": "uuid",
  "name": "Kohde A",
  "status": "active",
  "project_details": {
    "start_date": "2026-02-01",
    "budget": 1000000
  }
}
```

**201 Created**
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "name": "Kohde A",
  "status": "active",
  "project_details": { "start_date": "2026-02-01", "budget": 1000000 },
  "created_at": "2026-01-01T12:00:00Z"
}
```

### PATCH /projects/:id  (permission: project.write)
**Request**
```json
{
  "status": "active",
  "project_details": {
    "budget": 1100000
  }
}
```

**200 OK** (palauta projekti)
```json
{
  "id": "uuid",
  "company_id": "uuid",
  "name": "Kohde A",
  "status": "active",
  "project_details": { "start_date": "2026-02-01", "budget": 1100000 },
  "created_at": "2026-01-01T12:00:00Z"
}
```

## 4) RBAC

### GET /roles  (permission: rbac.manage)
**200 OK**
```json
{
  "items": [
    { "id": "uuid", "name": "admin" },
    { "id": "uuid", "name": "editor" }
  ]
}
```

### POST /role-assignments  (permission: rbac.manage)
**Request**
```json
{
  "membership_id": "uuid",
  "role_id": "uuid",
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_to": "2026-02-01T00:00:00Z"
}
```

**201 Created**
```json
{
  "id": "uuid",
  "membership_id": "uuid",
  "role_id": "uuid",
  "valid_from": "2026-01-01T00:00:00Z",
  "valid_to": "2026-02-01T00:00:00Z"
}
```

### DELETE /role-assignments/:id  (permission: rbac.manage)
**204 No Content**

## 5) Audit-log (valinnainen UI, mutta DB kirjataan aina)
- Suositus: `GET /audit` (permission: audit.read) jos halutaan UI-näkymä.
- MVP: audit voidaan jättää vain backendin sisäiseksi.


## Mitä muuttui
- Lisätty muutososiot dokumentin loppuun.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
