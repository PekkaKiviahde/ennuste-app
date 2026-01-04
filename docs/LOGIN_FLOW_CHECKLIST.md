# Kirjautumisen polut ja logien keruu (MVP)

Paivitetty: 2026-01-04

## Tarkistuslista (kirjautumisen polut)
1) Avaa http://localhost:3000/login.
2) Kirjaudu demo-tunnuksella (esim. org.admin.a) ja PIN 1234.
3) Vahvista roolireititys:
   - REPORT_READ -> http://localhost:3000/ylataso
   - SELLER_UI ilman REPORT_READ -> http://localhost:3000/sales
4) Avaa http://localhost:3000/raportti (REPORT_READ) ja varmista, ettei tule virheilmoitusta.
5) Kirjaudu ulos ja varmista ohjaus takaisin http://localhost:3000/login?loggedOut=1.

## Logien keruuohje (NEXT_REDIRECT / kirjautumisvirheet)
- Selain: F12 -> Console -> kopioi virherivit heti kirjautumisyrityksen jälkeen.
- Serveri: kopioi terminaalilogi, jossa Next-UI (npm run dev / next dev) pyorii.
- Lisaa mukaan URL-vahvistus: kaytitko http://localhost:3000/login?

## Mitä muuttui
- Lisatty kirjautumisen polkujen tarkistuslista ja logien keruuohje.

## Miksi
- Nopea toistettava UI-kavely ja yhtenaiset logit helpottavat virheiden juurisyyn selvitysta.

## Miten testataan (manuaali)
- Noudata tarkistuslistaa ja varmista, etta polut toimivat odotetusti.
