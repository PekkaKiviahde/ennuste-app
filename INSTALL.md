# Codex-tiedostojen asennus (step-by-step)

Tässä paketissa on kaksi kansiota:
- `home/.codex/`  → kopioidaan kotihakemistoon: `~/.codex/`
- `repo/.codex/`  → kopioidaan projektin juureen: `REPO/.codex/`

## A) macOS / Linux

### 1) Pura zip
Pura zip esimerkiksi Lataukset-kansioon.

### 2) Luo kohdekansiot (jos eivät ole olemassa)
Aja terminaalissa:

```bash
mkdir -p ~/.codex/prompts ~/.codex/rules ~/.codex/skills
```

### 3) Kopioi kotihakemiston Codex-tiedostot
Siirry purettuun kansioon ja kopioi:

```bash
cp -R home/.codex/* ~/.codex/
```

Tarkista että nämä ovat olemassa:
- `~/.codex/config.toml`
- `~/.codex/AGENTS.md`
- `~/.codex/prompts/`
- `~/.codex/rules/`
- `~/.codex/skills/`

### 4) Lisää projektiin projektikohtaiset skillit
Siirry projektin juureen (Git-repo) ja kopioi:

```bash
cp -R /POLKU/PAKETTIIN/repo/.codex ./
```

Tämän jälkeen projektissasi pitäisi olla:
- `REPO/.codex/skills/project-conventions/SKILL.md`

### 5) Käynnistä Codex uudelleen
Asetukset/ohjeet latautuvat yleensä session alussa, joten sulje ja käynnistä Codex uudelleen.

---

## B) Windows (PowerShell)

> Huom: Polut voivat vaihdella. Oletus vastaa yleensä `%USERPROFILE%\.codex`.

### 1) Luo kohdekansiot
PowerShellissä:

```powershell
$codex = Join-Path $env:USERPROFILE ".codex"
New-Item -ItemType Directory -Force -Path "$codex\prompts","$codex\rules","$codex\skills" | Out-Null
```

### 2) Kopioi kotihakemiston tiedostot
Pura zip ensin. Oletetaan että purit kansion `codex_setup_templates` työpöydälle:

```powershell
Copy-Item -Recurse -Force ".\home\.codex\*" $codex
```

### 3) Lisää projektiin projektikohtaiset skillit
Mene projektin juureen ja kopioi:

```powershell
Copy-Item -Recurse -Force "C:\POLKU\PAKETTIIN\repo\.codex" ".\.codex"
```

### 4) Käynnistä Codex uudelleen
Sulje ja avaa Codex uudelleen, jotta uudet asetukset latautuvat.

---

## Vinkit
- Jos haluat testata nopeasti, että AGENTS.md latautuu, aja:
  - `codex --ask-for-approval never "Summarize the current instructions."`
- Jos haluat ottaa web-haun käyttöön:
  1) `~/.codex/config.toml`: `web_search_request = true`
  2) `~/.codex/config.toml`: `[sandbox_workspace_write] network_access = true`
  3) Käynnistä Codex uudelleen
