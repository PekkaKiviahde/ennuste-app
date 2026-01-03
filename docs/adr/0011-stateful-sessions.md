# ADR-0011: Tilallinen sessio (stateful session) ja uloskirjautumisen invalidointi

**Status:** Accepted  
**Date:** 2026-01-03

## Context
Testausraportin mukaan uloskirjautuminen ei katkaise sessiota. Nykyinen tilaton cookie (stateless cookie) sisaltaa koko session ja sen allekirjoituksen, joten palvelin ei voi mitatoida sessiota ilman cookiea. Tama aiheuttaa tietoturvariskin.

## Decision
Siirrytaan tilalliseen sessioon (stateful session) tietokannassa:
- Session luodaan `sessions`-tauluun.
- Cookie (evaste) sisaltaa vain session_id ja exp-ajan.
- Uloskirjautuminen mitatoi session palvelimella (revoked_at).
- Login (kirjautuminen) luo uuden session ja asettaa cookien.

## Consequences
+ Uloskirjautuminen mitatoi session luotettavasti.
+ Sessioita voidaan tarkistaa ja mitatoida palvelinpuolella.
- Jokainen pyynto tarvitsee sessionin latauksen tietokannasta.

## Toteutusviitteet
- Migraatio: `migrations/0025_sessions.sql`
- Auth-repository (autentikointi-repositorio): `packages/infrastructure/src/auth.ts`
- Sessio-kasittely: `apps/web/src/server/session.ts`
- Uloskirjautuminen: `apps/web/src/server/actions/auth.ts`
- Login-kuittaus UI:ssa: `apps/web/src/app/login/page.tsx`

Mita muuttui
- Tilaton cookie (stateless cookie) korvattiin session_id-cookieilla.
- Sessioihin lisattiin palvelinpuolinen mitatointi (revoked_at).
- Uloskirjautuminen tekee server-side invalidoinnin.

Miksi
- Uloskirjautumisen on katkaistava sessio tietoturvasyista.
- Tilallinen sessio mahdollistaa mitatoinnin ja auditoinnin.

Miten testataan (manuaali)
- Kirjaudu sisaan, klikkaa "Kirjaudu ulos", varmista /api/me = 401.
- Avaa suojattu sivu ilman sessiota ja varmista ohjaus /login.
- Kirjaudu uudelleen sisaan ja varmista, etta uusi sessio toimii.
