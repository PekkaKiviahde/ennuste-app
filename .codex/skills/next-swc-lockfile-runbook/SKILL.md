---
name: next-swc-lockfile-runbook
description: Luo ja paivita runbookit Next.js SWC/lockfile -virheiden selvitykseen. Kayta, kun pyynto koskee SWC-binaarivirheita, lockfile-mismatchia tai runbookin/CodeX-startupin paivitysta.
---

# Next.js SWC/Lockfile Runbook

## Laukaisimet (esimerkkipyyntoja)
- "Tutki Next.js SWC -virhe ja paivita runbook."
- "Lockfile mismatch rikkoo Next buildin; tee runbook ja linkita CODEX_STARTUPiin."
- "Kirjoita ohje: Required SWC binary not found -miten korjataan."

## Tavoite ja tuotokset
- Paivita olemassa olevaa runbookia tai luo uusi tiedostoon `docs/runbooks/*`.
- Tarvittaessa paivita `docs/runbooks/CODEX_STARTUP.md` ja lisaa linkki uuteen runbookiin.
- Kerro aina muutosehdotuksissa: "Mita muuttui", "Miksi", "Miten testataan (manuaali)".

## Rajaus ja varovaisuus
- Keskity runbookeihin ja dokumentaatioon; koodiin/migraatioihin ei kosketa ilman erillista lupaa.
- Kysy aina, jos muutos voisi vaikuttaa raportointiin, dataan tai auditointiin.
- Suosi minimiratkaisua ennen jareampia toimenpiteita.

## Workflow (decision tree)
1) Kerää konteksti
   - Oire: tarkka virheilmoitus ja komento (esim. `next build`/`npm run build`).
   - Ymparisto: Node-versio, Next-versio, package manager, lockfile-tyyppi, kayttojarjestelma.
   - Repon rakenne: workspace/polku, mihin ongelma liittyy.

2) Luokittele ongelma
   - **SWC-binaari puuttuu/rikki**: virhe viittaa SWC binaryn puuttumiseen tai latausongelmaan.
   - **Lockfile-mismatch**: virhe viittaa lockfile/dep-ristiriitaan.
   - **Vanhentunut cache**: virhe katoaa .next/.cache -tyhjennyksella.

3) Laadi minimikorjausvaihtoehdot (runbookiin)
   - Aloita turvallisilla tarkistuksilla (versiot, komento, polku).
   - Esita korjausvaihtoehdot pienimmasta suurempaan.
   - Varoita ennen raskaampia askeleita (lockfile/node_modules poisto).

4) Paivita runbook
   - Rakenne-ehdotus:
     - Oireet
     - Mahdolliset syyt
     - Tarkistukset
     - Korjausvaihtoehdot (jarjestys: min -> maks)
     - Varmistus (miten todetaan korjattu)
     - Ennaltaehkaisy (jos relevantti)

5) Paivita CODEX_STARTUP tarvittaessa
   - Lisaa linkki uuteen runbookiin ja mainitse milloin se tulee lukea.

6) Tarjoa manuaalitestit
   - Ehdota minimivarmistus komentoihin, jotka loytyvat `package.json`/workspacesta.
   - Jos et loyda sopivaa komentoa, kysy ennen ehdottamista.

## Muistilista: tyotapa tasta repossa
- Ehdota ensin minimiratkaisu ja kysy lupa ennen muokkausta.
- Kerro mihin tiedostoon muutos menisi (esim. `docs/runbooks/next-swc-lockfile.md`).
- Jos muutos vaikuttaisi raportointiin/dataan/auditointiin, kysy aina ensin.

