# Open questions / TODO – Ennustus (MVP)

Päivitetty: 2026-01-02

Tämä lista on tarkoituksella lyhyt ja käytännönläheinen. Kun jokin päätetään, siirrä se Decision logiin ja/tai oikeaan runbookiin.

---

## Compliance / GDPR
- [ ] Mikä on sopimuksen päättymisen jälkeinen **purge-ikkuna** (30/60/90 päivää) vakiona?
- [ ] Subprocessor-lista (jos käytössä): mitä palveluita käytetään (email, hosting, monitoring)?
- [ ] Tarkka “access log” -säilytysaika ja logityypit (audit vs access vs application).

## Tuote / työnkulku
- [ ] Miten “READY_TO_SEND” (M1) käytetään käytännössä: pakollinen vai valinnainen?

## Tekniikka
- [ ] Miten report package arkistoidaan: DB vs object storage (ja miten siihen viitataan)?
- [ ] Backup-politiikka (päivittäinen? retention 30 päivää?) – tekninen runbook.

## Operointi
- [ ] SEV-vasteajat: halutaanko muuttaa oletuksia (15 min / 60 min / 4 h jne.)?
- [ ] Mitä monitoroidaan: import-ajot, raporttien lähetys, error-rate?

## Mitä muuttui
- Päivitetty päiväys linjaan päätöslokin kanssa.
- Poistettu raporttiformaattikysymys, koska päätös on PDF + CSV.

## Miksi
- Dokumentaatiokäytäntö: muutokset kirjataan näkyvästi.
- Päätösloki määrittää raporttiformaatit, joten kysymystä ei pidetä avoimena.

## Miten testataan (manuaali)
- Avaa dokumentti ja varmista, että osiot ovat mukana.
- Varmista, että raporttiformaattikysymys ei ole open-questions-listassa.
