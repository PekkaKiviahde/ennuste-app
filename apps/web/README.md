# Ennuste MVP (apps/web)

## Komennot

1) Kaynnista Postgres
`npm run db:start`

2) Aja migraatiot
`npm run db:migrate`

3) Demo-seed
`npm run db:seed-demo`

4) Resetoi admin-identiteetit (dev/demo)
`ADMIN_MODE=true npm run db:reset-admin`

5) Kaynnista web
`npm run dev`

## Pakolliset ymparistomuuttujat
- `DATABASE_URL` (esim. `postgres://postgres:postgres@localhost:5432/ennuste`)
- `SESSION_SECRET` (HMAC allekirjoitus cookieen)
- `ADMIN_MODE=true` (admin-kirjautuminen ja roolin valinta)

## Testit
- `npm run test` (domain + infra testit, sisaltaa integraatiotestin)
