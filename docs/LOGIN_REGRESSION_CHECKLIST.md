# Kirjautumisen regressioseuranta (MVP)

Paivitetty: 2026-02-08

## Tarkistuslista (regressiot)
1) Avaa http://localhost:3000/login.
2) Jos `ADMIN_MODE=true`, varmista etta sivulla nakyy linkki "Sovellustuen kirjautuminen" -> http://localhost:3000/admin/login.
3) Avaa http://localhost:3000/admin/login ja varmista, etta otsikko on "Admin-kirjautuminen".
4) Kirjaudu demo-tunnuksella (esim. org.admin.a) ja PIN 1234.
5) Vahvista roolireititys:
   - REPORT_READ -> http://localhost:3000/ylataso
   - SELLER_UI ilman REPORT_READ -> http://localhost:3000/sales
6) Avaa http://localhost:3000/raportti (REPORT_READ).
7) Kirjaudu ulos ja varmista ohjaus takaisin http://localhost:3000/login?loggedOut=1.

## Logien keruu (kun regressio ilmenee)
- Selain: F12 -> Console -> kopioi virherivit heti kirjautumisen jalkeen.
- Serveri: kopioi terminaalilogi, jossa Next-UI pyorii.
- Lisaa URL-vahvistus: kaytitko http://localhost:3000/login tai http://localhost:3000/admin/login?

## Mitä muuttui
- Lisatty sovellustuen/paa kayttajan kirjautumispolku (`/admin/login`) regressiotarkistuksiin.
- Paivitetty logiohje kattamaan myos admin-kirjautuminen.

## Miksi
- Regressiot havaitaan nopeasti seka peruskirjautumisessa etta sovellustuen kirjautumisessa.

## Miten testataan (manuaali)
- Noudata tarkistuslistaa ja varmista, etta polut toimivat odotetusti.
