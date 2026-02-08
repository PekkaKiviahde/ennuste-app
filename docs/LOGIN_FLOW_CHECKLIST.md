# Kirjautumisen polut ja logien keruu (MVP)

Paivitetty: 2026-02-08

## Tarkistuslista (kirjautumisen polut)
1) Avaa http://localhost:3000/login.
2) Jos `ADMIN_MODE=true`, varmista etta sivulla nakyy linkki "Sovellustuen kirjautuminen" -> http://localhost:3000/admin/login.
3) Avaa http://localhost:3000/admin/login ja varmista, etta otsikko on "Admin-kirjautuminen".
4) Kirjaudu demo-tunnuksella (esim. org.admin.a) ja PIN 1234.
5) Vahvista roolireititys:
   - REPORT_READ -> http://localhost:3000/ylataso
   - SELLER_UI ilman REPORT_READ -> http://localhost:3000/sales
6) Avaa http://localhost:3000/raportti (REPORT_READ) ja varmista, ettei tule virheilmoitusta.
7) Kirjaudu ulos ja varmista ohjaus takaisin http://localhost:3000/login?loggedOut=1.

## Logien keruuohje (NEXT_REDIRECT / kirjautumisvirheet)
- Selain: F12 -> Console -> kopioi virherivit heti kirjautumisyrityksen jälkeen.
- Serveri: kopioi terminaalilogi, jossa Next-UI (npm run dev / next dev) pyorii.
- Lisaa mukaan URL-vahvistus: kaytitko http://localhost:3000/login tai http://localhost:3000/admin/login?

## Mitä muuttui
- Lisatty sovellustuen/paa kayttajan kirjautumispolku (`/admin/login`) osaksi tarkistuslistaa.
- Paivitetty logiohje tunnistamaan seka normaali login-polku etta admin-polku.

## Miksi
- Sovellustuen paakayttajan kirjautuminen on nyt eksplisiittinen ja testattava osa login-polkuja.
- Yhtenainen logien keruu helpottaa juurisyyn selvitysta molemmissa kirjautumisissa.

## Miten testataan (manuaali)
- Noudata tarkistuslistaa ja varmista, etta polut toimivat odotetusti.
