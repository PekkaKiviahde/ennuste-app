# Pyynto: docs/runbooks hunkkikokorajan loystaminen

## Tausta
- Nykyinen raja: jokainen hunkki max +3/-3 riviä.
- Runbookien lisaaminen/paivittaminen (esim. SWC/lockfile) vaatii kymmenia hunkeja, vaikka kyse on pelkasta dokumentaatiosta.

## Pyynto
- Nosta docs/runbooks -polun hunkkikokoraja arvoon +50/-50 (tai poista raja tasta polusta).

## Perustelut
- Muutokset ovat dokumentaatiota, eivat koske koodipolkua.
- Gate hidastaa runbookien ajantasaistamista ja kasvattaa merge-kitkaa.
- Audit trail säilyy git-historiassa; lint/format ja manuaalireview pysyvat.

## Safeguardit (ennallaan)
- Binäärit estetty.
- Lint/format ajetaan.
- Manuaalinen katselmointi vaaditaan.

## Paatos
- [ ] Hyvaksytaan rajan nosto +50/-50 (tai rajaton) docs/runbooks -polulle
- [ ] Hylataan (perustelu)
