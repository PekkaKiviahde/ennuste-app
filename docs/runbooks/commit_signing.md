# Commit signing (Codespaces) – korjausohje + päätöspuu

## Ongelma
Repo on konfiguroitu signeeraamaan commitit (`commit.gpgsign=true`, `gpg.program=/.codespaces/bin/gh-gpgsign`), mutta commit/push epäonnistuu virheellä: `403 | Author is invalid`.

**Päätös (D=2, nykytila):** signed commitit eivät ole pakollisia nyt → tässä repossa `commit.gpgsign` pidetään **repo-local OFF**, jotta commitointi ei blokkaa.

Tämä runbook ratkaisee tilanteen kahdessa haarassa:
- A) “Require signed commits” on päällä branch protectionissa → korjaa identiteetti + signeeraus.
- B) Ei ole pakollinen → poista signeeraus käytöstä **repo-local**, jotta se ei blokkaa.

---

## 1) Diagnoosi: näytä effective asetukset

```bash
git config --list --show-origin | grep -E "^(user\\.name|user\\.email|commit\\.gpgsign|gpg\\.program)="
```

```bash
gh auth status
```

---

## 2) Tarkista branch protection: require signed commits?

```bash
OWNER_REPO="$(gh repo view --json nameWithOwner -q .nameWithOwner)"
BRANCH="$(git rev-parse --abbrev-ref HEAD)"
gh api "repos/$OWNER_REPO/branches/$BRANCH/protection/required_signatures" -i
```

Tulkinta:
- `HTTP/2 200` → require signed commits on käytössä.
- `HTTP/2 404` → ei käytössä (tai branch protection ei ole päällä tälle branchille).

---

## 3) Päätöspuu: korjaavat toimet

### A) Require signed commits = true

1) Varmista että `gh` on kirjautunut oikealla käyttäjällä:

```bash
gh auth status
```

2) Aseta repo-local author-identiteetti GitHub-kelvolliseksi (suositus: noreply-email):

```bash
GH_LOGIN="$(gh api user -q .login)"
GH_ID="$(gh api user -q .id)"
git config --local user.name "$GH_LOGIN"
git config --local user.email "${GH_ID}+${GH_LOGIN}@users.noreply.github.com"
```

3) Varmista signeerausasetukset repo-local:

```bash
git config --local gpg.program "/.codespaces/bin/gh-gpgsign"
git config --local commit.gpgsign true
```

4) Smoke-testaa signeeraus:

```bash
git commit --allow-empty -m "chore: commit signing smoke" -S
git log -1 --show-signature
```

5) Jos branchissä on jo unsigned committeja ja push blokkaa:
allekirjoita commitit uudelleen rebasella ja pushaa `--force-with-lease`.

```bash
git fetch origin
git rebase --rebase-merges --exec "git commit --amend --no-edit -S" origin/main
git push --force-with-lease
```

Huom:
- Rebase muuttaa commit SHA:t → force push on pakollinen.
- Tee tämä vain omassa feature-branchissä (ei suojattuun default-branchiin).

### B) Require signed commits = false

Poista signeeraus käytöstä vain tässä repossa (override mahdolliseen global-asetukseen):

```bash
git config --local commit.gpgsign false
```

Halutessa voit myös poistaa repo-local `gpg.program`-asetuksen:

```bash
git config --local --unset gpg.program || true
```

Fallback jos require-signed myöhemmin kytketään päälle:
```bash
git config --local commit.gpgsign true
git config --local gpg.program "/.codespaces/bin/gh-gpgsign"
```

---

## Mitä muuttui
- Lisättiin ohje: miten tunnistaa require-signed-tila ja korjata Codespaces commit signing / identity, tai vaihtoehtoisesti ottaa signeeraus pois repo-local.

## Miksi
- `403 | Author is invalid` tyypillisesti johtuu virheellisestä author-identiteetistä tai pakotetusta signeerauksesta; päätöspuu tekee korjauksesta toistettavan.

## Miten testataan (manuaali)
- Aja kohdan “2) Tarkista branch protection” `gh api ...required_signatures`.
- Noudata haaraa A tai B.
- Tee commit ja pushaa; varmista ettei tule `403 | Author is invalid`.
