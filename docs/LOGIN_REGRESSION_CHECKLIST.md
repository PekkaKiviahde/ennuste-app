# Kirjautumisen regressioseuranta (MVP)

Paivitetty: 2026-01-04

## Tarkistuslista (regressiot)
1) Avaa http://localhost:3000/login.
2) Kirjaudu demo-tunnuksella (esim. org.admin.a) ja PIN 1234.
3) Vahvista roolireititys:
   - REPORT_READ -> http://localhost:3000/ylataso
   - SELLER_UI ilman REPORT_READ -> http://localhost:3000/sales
4) Avaa http://localhost:3000/raportti (REPORT_READ).
5) Kirjaudu ulos ja varmista ohjaus takaisin http://localhost:3000/login?loggedOut=1.

## Logien keruu (kun regressio ilmenee)
- Selain: F12 -> Console -> kopioi virherivit heti kirjautumisen jalkeen.
- Serveri: kopioi terminaalilogi, jossa Next-UI pyorii.
- Lisaa URL-vahvistus: kaytitko http://localhost:3000/login?

## Mitä muuttui
- Lisatty regressioseurannan tarkistuslista ja logien keruuohje.

## Miksi
- Regressiot havaitaan nopeasti yhdenmukaisella kaytannolla.

## Miten testataan (manuaali)
- Noudata tarkistuslistaa ja varmista, etta polut toimivat odotetusti.
