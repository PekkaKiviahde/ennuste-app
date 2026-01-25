## Fix: Orchestrator change-mode Git auth (fetch/push) using http.extraHeader + add smoke validations

### Tausta / ongelma
- Change/PR-ajossa orkestroija tekee `git fetch origin --prune`, joka kaatuu: “Invalid username or token / Password authentication is not supported”.
- Tokenia ei saa upottaa remote-URL:iin (hajoaa, voi vuotaa, jää repo-konfigiin).
- Tarvitaan vakaa auth-malli, joka toimii Docker-kontissa.

### Tavoite
- Orkestroija pystyy tekemään **fetch + push + PR** luotettavasti **ilman** tokenia remote-URL:ssa.

### Scope
**IN**
- GitHub auth ratkaisu `http.<url>.extraHeader` -mallilla (repo-local).
- Varmistus että auth on käytössä ennen kaikkia network-git-komentoja.
- Smoke-testit change-ajolle (fetch OK, branch, commit, push, PR).

**OUT**
- Uudet missionit tai UI-muutokset.
- Laajempi refaktorointi agenttijärjestelmään (vain auth + validointi).

### Definition of Done (DoD) / Hyväksymiskriteerit
1) `git fetch origin --prune` onnistuu kontissa change-ajossa.  
2) `git push` onnistuu ilman promptia.  
3) PR luonti palauttaa `prUrl` (tai vähintään selkeän `prError`-syyn).  
4) Origin remote **ei sisällä tokenia** (`git remote -v` ei näytä tokenia).  
5) Lokit eivät voi vuotaa tokenia (maskaus).  
6) Node_modules ei päädy stageen eikä PR:ään (nykyiset estot säilyvät).

### Toteutusvaiheet
1) Implementoi repo-local auth extraheaderilla
   - Tee funktio esim. `configureGithubExtraHeader(token: string)`:
     - Muodosta Basic header:
       - `Authorization: basic <base64("x-access-token:<TOKEN>")>`
     - Aseta local config:
       - `git config --local http.https://github.com/.extraHeader "<HEADER>"`
     - Älä koskaan tulosta headeria logeihin (maskaa).

2) Kytke auth aina päälle ennen git network -komentoja
   - Ennen `fetch/push`:
     - kutsu `configureGithubExtraHeader(process.env.GH_TOKEN)`
   - Tee tämä keskitetysti (yksi paikka), ettei jää reunakeissejä.

3) Poista/älä käytä token-remote-URL -kikkaa
   - Jos löytyy `ensureOriginUsesToken()` tai vastaava, muuta se:
     - EI muokkaa `origin` URL:ia
     - vain extraHeader-malli

4) Lisää “auth smoke” -validointi (debug-flagilla)
   - `git config --local --get-all http.https://github.com/.extraHeader` (maskaa tulos!)
   - Jos token puuttuu: selkeä virheviesti (ei geneerinen fetch-fail).

5) Smoke test -polku change-ajoon
   - Lisää runbook:
     - Aja muutos joka muuttaa sallittua tiedostoa.
     - Odotettu: `status: ok`, branchName, changedFiles, prUrl.

### Muutettavat tiedostot (arvio)
- `apps/api/src/agent/tools/gitAuth.ts` (päämuutos)
- `apps/api/src/agent/orchestrator.ts` (kutsu auth-konfigiin oikeaan kohtaan)
- Mahd. `apps/api/src/agent/tools/git.ts` (jos git wrapper löytyy)
- Runbook / docs (smoke-komennot)

### Testiohje (kopioi–liitä)
1) Kontti ylös:
   - `docker compose up -d --build`

2) Varmista token kontissa:
   - `docker exec -it <agent_api_container> sh -lc 'echo ${GH_TOKEN:+OK}'`

3) Aja change-smoke:
   - `curl -s localhost:<port>/agent/run -H 'content-type: application/json' -d '{"mode":"change","instruction":"muuta pieni teksti sallittuun tiedostoon"}' | jq`

4) Varmista:
   - response: `status=="ok"` ja `prUrl` ei ole null

5) Varmista origin puhtaaksi:
   - `docker exec -it <agent_api_container> sh -lc 'git remote -v'` (ei tokenia URL:ssa)

### Riskit ja mitigointi
- Token vuotaa lokiin → maskaa kaikki config-get tulosteet ja estä headerin printtaus.
- Header jää väärään repo-polkuun → käytä `--local` ja varmista workdir.
- GitHub host vaihtuu (GHE) → tee host konfiguroitavaksi (env `GIT_HOST`, default github.com).
