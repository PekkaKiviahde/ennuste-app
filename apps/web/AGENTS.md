# AGENTS.md (apps/web)

Tämä tiedosto täydentää repo-juuren AGENTS.md:ää nimenomaan Next.js UI:lle.
Jos ohjeet ovat ristiriidassa, tämä kansiokohtainen ohje voittaa tässä kansiossa.

## Fokus
- UI (Next.js): näkymät, lomakkeet, navigointi, UX.
- Pidä UI “ohut”: kutsu sovelluslogiikkaa `@ennuste/application`-paketista.
- Älä tee suoraa DB- tai SQL-logiikkaa webissä.

## Kiellettyä / vältä
- Älä tuo `@ennuste/infrastructure` suoraan UI-koodiin.
- Älä kovakoodaa salaisuuksia tai ympäristöarvoja koodiin.

## Käytännöt
- Noudata olemassa olevaa Next-rakennetta:
  - jos repo käyttää `app/`-routeria, älä lisää `pages/`-routeria (ja päinvastoin).
- Kun lisäät uuden UI-virran:
  - varmista, että domain-termit pysyvät samoina (suunnitelma, ennustetapahtuma, mapping, työlittera, tavoitearvio-littera).
  - lisää manuaalitesti: mitä klikataan ja mitä pitäisi nähdä.

## Komennot (tälle työtilalle)
- Dev: `npm --workspace apps/web run dev`
- Build: `npm --workspace apps/web run build`
- Start: `npm --workspace apps/web run start`

## Raportointi (kun teet muutoksia)
Lisää PR:ään:
- Mitä muuttui
- Miksi
- Miten testataan (manuaali, ja tarvittaessa `npm --workspace apps/web run build`)
