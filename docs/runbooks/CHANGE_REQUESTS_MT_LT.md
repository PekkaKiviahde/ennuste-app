# Change requests MT/LT — runbook

Päivitetty: 2026-01-23

Tämä runbook kuvaa MT/LT (keskipitkä / pitkä) muutospyyntöjen periaatteet ja käytännön.
Tekninen toteutus tulee migraatiosta: `migrations/0048_change_requests_mt_lt.sql`.

## Tavoite
- Yhdenmukaistaa miten muutospyynnöt kirjataan, tarkastetaan ja hyväksytään/hylätään.
- Varmistaa audit-trail (append-only) ja roolipohjaiset vastuut (RBAC).
- Estää “hiljaiset” muutokset baselineen ja ennusteeseen.

## Määritelmät
- **MT (mid-term)**: keskipitkän aikavälin muutos, jolla on vaikutus ennusteeseen ja/tai työpakettien ajoitukseen.
- **LT (long-term)**: pitkän aikavälin muutos, tyypillisesti laajempi vaikutus scopeen / kustannuskehykseen.
- **Change request**: yksilöity muutosesitys, joka on nähtävissä, jäljitettävissä ja päätöksellä hallittu.

## Roolit ja vastuut (RBAC)
- **PROJECT_OWNER**
  - saa luoda muutospyynnön (MT/LT)
  - saa liittää perustelut ja liitteet (jos UI tukee)
  - voi ehdottaa vaikutuksia (kustannus, aikataulu, work phase)
- **AUDITOR**
  - tarkastaa muutospyynnöt ja auditoinnin jäljitettävyyden
  - varmistaa, että päätökset on dokumentoitu (hyväksy/hylkää) ja että append-only säilyy
- (Jos teillä on muita rooleja, lisää tänne lyhyet säännöt.)

## Prosessi (korkean tason)
1) **Luonti**
   - Luodaan uusi change request ja määritetään tyyppi: MT tai LT.
   - Kirjataan: kuvaus, peruste, arvioitu vaikutus (kustannus/aikataulu), liittyvät work phase / mapping -kohteet.
2) **Tarkastus**
   - Tarkistetaan, että muutos ei riko baseline-periaatteita ja että se voidaan auditoida.
3) **Päätös**
   - Hyväksy / hylkää.
   - Päätös kirjataan audit-trailiin.
4) **Vaikutus ennusteeseen / raportointiin**
   - Muutos vaikuttaa ennusteen tulkintaan ja/tai raportointiin, mutta ei “hiljaisesti”.
   - Mahdolliset jatkotoimet (erillinen migraatio / mapping / baseline update) tehdään hallitusti.

## Audit-trail (append-only)
- Kaikki change requestin elinkaaren tapahtumat kirjataan niin, että:
  - vanhoja tapahtumia ei muokata jälkikäteen
  - näkyy kuka teki mitä ja milloin
  - päätös ja perustelu ovat todennettavissa myöhemmin

## DB-objektit
Tekninen toteutus tulee migraatiosta:
- `migrations/0048_change_requests_mt_lt.sql`

Vinkki: listaa objektit nopeasti:
```bash
grep -nE "CREATE (TABLE|VIEW|FUNCTION)" migrations/0048_change_requests_mt_lt.sql
```
