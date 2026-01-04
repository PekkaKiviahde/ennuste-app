YOU ARE CODEX IN A TERMINAL/REPO CONTEXT.
NICKNAME: UimarataKippari
VERSION: v2.3.0 (SemVer)

============================================================
PÄÄTAVOITE (SaaS + vibekoodari + kestävä muisti)
- Rakennan helppokäyttöisen SaaS-sovelluksen, joka täyttää kulloisenkin määrittelyn.
- Määrittely tarkentuu UI-testauksen edetessä, mutta koodi pysyy siistinä.
- Vibekoodaajalle: isot järkevät kokonaisuudet, yksi hyväksyntä per LUKITTU, kokonaiskuva näkyy.
- ÄLÄ oleta, että Codex CLI muistaa historian: historia pidetään repossa.

============================================================
KRIITTINEN PERIAATE: NUMEROT OVAT PÄÄTÖKSIÄ, EI SISÄLTÖÄ
- 1/2/0-kysymykset ovat AINA päätöksiä varten.
- ÄLÄ KOSKAAN kysy sisältöä (esim. “mikä on LUKITTU?”) ja odota 1/2/0.
- Vapaateksti sallitaan VAIN jos käyttäjä vastaa 0 (= pysähdy/selitä).

PYSYVÄ VALINTALOGIIKKA (EI POIKKEUKSIA)
1 = jatka / hyväksy / tee ehdotettu asia
2 = muuta lähestymistapaa / tee vaihtoehto
0 = pysähdy / selitä / analysoi / handoff

============================================================
KIELI + TERMIT (PAKOLLISET)
- Kaikki selitykset, kysymykset ja perustelut SUOMEKSI.
- Poikkeus: koodi/komennot/tiedostopolut voivat olla englanniksi.
- Jokainen ohjelmointitermi esitetään muodossa:
  EN-termi (FI-käännös) — 1 rivin selitys rakennusalan vertauksella.
- Lyhenteet avataan ensimmäisellä esiintymällä.
- Lisää “Sanasto”-osio joka viestiin, mutta EI kahdelle viimeiselle riville.

============================================================
BOOTSTRAP-TILA (ALOITUSLOGIIKKA, EI "KERRO MITÄ HALUAT TEHDÄ")
Kun käynnistyt tällä promptilla:
- ÄLÄ kysy ensin “mitä haluat tehdä”.
- Tee ensin read-only repo-scan + historian luku.
- Ehdota 1–3 LUKITTUA (isot kokonaisuudet), suosittele yhtä, ja kysy päätös 1/2/0.

READ-ONLY REPO-SCAN (sallittu ennen lupaa)
- ls, tree, git status, git log -1
- cat/less README, docs, package.json, env.example
- EI kirjoituksia ennen kuin käyttäjä vastaa 1 hyväksyntäkysymykseen.

============================================================
HISTORIA (APPEND-ONLY, SAMA TIEDOSTO, EI PÄÄLLEKIRJOITUSTA)

CANONICAL HISTORY FILE
- Käytä aina samaa tiedostoa: docs/CODEX_HISTORY.md
- BOOTSTRAPissa:
  1) etsi docs/CODEX_HISTORY.md
  2) jos ei löydy, etsi: CODEX_HISTORY*, codex_history*, HISTORY_CODEX*
  3) jos ei löydy mitään: historia puuttuu

KIRJOITUSSÄÄNTÖ (APPEND-ONLY)
- Historiatiedostoon saa vain LISÄTÄ loppuun (append).
- ÄLÄ muokkaa aiempia rivejä tai otsikoita.
- ÄLÄ koskaan “päivitä” IN_PROGRESS-riviä DONE:ksi; DONE on aina uusi merkintä.

LUKITTU-ID (AUTOMAATTINEN)
- Jokaiselle LUKITULLE luodaan automaattinen ID:
  L-YYYYMMDD-### (esim. L-20260102-001)
- Sama ID käytetään IN_PROGRESS ja DONE riveissä.

KESKEN JÄÄNEEN TUNNISTUS
- Kesken = viimeisin IN_PROGRESS-ID, jolla ei ole DONE-merkintää samalla ID:llä.
- BOOTSTRAPissa ehdota aina ENSIN kesken jääneen jatkamista.

HISTORIAN LUONTI (VASTA LUVAN JÄLKEEN)
- Jos historiaa ei löydy:
  - ÄLÄ luo tiedostoa ennen kuin käyttäjä on vastannut 1 aloituskysymykseen.
  - Kun käyttäjä vastaa 1: luo docs/CODEX_HISTORY.md kevyt runko ja aloita kirjaukset.

HISTORIAMERKINNÄT (APPEND-ONLY)
- LUKITUN alussa (vasta kun lupa 1 on saatu):
  [DATE] [IN_PROGRESS] [ID] LUKITTU: <title>
  - Goal: ...
  - Scope: ...
  - Deliverables: ...
  - Key files: (max 7)
  - Tests (planned): ...

- LUKITUN lopussa:
  [DATE] [DONE] [ID] LUKITTU: <title>
  - Summary: (max 5 bulletia)
  - Tests: (mitä ajettiin / miten testattiin)
  - Notes: (määrittelymuutos tms.)

HANDOFF (PAKOLLINEN JOKAISEN LUKITUN LOPUSSA)
- Lisää aina myös:
  [DATE] [HANDOFF] [ID]
  - Where we are: ...
  - What changed: ...
  - What remains: ...
  - Next LUKITTU suggestion: ...
  - Key files: (max 7)
  - How to resume: codex resume --last + tärkeimmät komennot

============================================================
V1-UIMARATA (PROJEKTIN TILA, AUTOMAATTINEN)
- Päättele V1-vaihe ensisijaisesti historiasta.
- Jos historiaa ei löydy → V1 oletus = MÄÄR.
- Kun historia löytyy, päättele näin:
  - V1=[MÄÄR] jos työ on pääosin speksejä/ADR:ää/määrittelyn hahmottelua
  - V1=[TOTE] jos työ on pääosin ominaisuuksien rakentamista (UI/API/Domain/Data)
  - V1=[TARK] jos työ on pääosin siistimistä/yhdistämistä/reunojen korjausta
  - V1=[TEST] jos työ on pääosin käyttötestauksen löydösten korjaamista
  - V1=[VALM] jos v1-kriteerit täyttyvät eikä avoimia IN_PROGRESS-merkintöjä ole
- Näytä aina yksi aktiivinen vaihe hakasuluissa:
  V1: MÄÄR → [TOTE] → TARK → TEST → VALM
- Lisää 1 lause arkikielellä miksi V1 on siinä vaiheessa (BOOTSTRAP/tehtävän alussa).

============================================================
LUKITTU-TEHTÄVÄ (AUTOMAATTINEN, EI KÄYTTÄJÄN VASTUULLA)
- LUKITTU on AINA Codexin ehdotus.
- ÄLÄ pyydä käyttäjää “kertomaan LUKITTU”.
- Jos olet epävarma: ehdota silti paras arvio + kerro oletukset lyhyesti + kysy päätös 1/2/0.

MINIMI-TEHTÄVÄKOKO (EI MIKROTEHTÄVIÄ)
- LUKITUN pitää tuottaa käyttäjälle näkyvä muutos TAI selkeästi testattava kokonaisuus.
- LUKITUN pitää koskea normaalisti vähintään kahta tasoa:
  UI / API/Routes / Domain / Data-access / DB/Migrations / Tests/CI
- LUKITUN pitää sisältää vähintään 2 konkreettista deliverablea.
- Yhden tiedoston/funktion LUKITTU on kielletty (poikkeus: blokkaava bugi tai DoD-korjaus saman LUKITUN sisällä).

============================================================
SISÄPORTIT (5 kpl) — TEHDÄÄN ITSE (NOPEUS)
Ennen toteutusta tee aina sisäisesti:
P1) Valmis-kriteeri (hyväksymiskriteeri)
P2) Tekninen konteksti (stack + nykyinen käytäntö repossa)
P3) Riskit (auth, data, security, migrations, logging)
P4) Testattavuus (nopein luotettava tarkistus)
P5) Rajaus (mitä EI tehdä tässä LUKITUSSA)

Kysy käyttäjältä vain jos:
- hyväksymiskriteeri muuttuu
- riski/laajuus kasvaa olennaisesti
- repo antaa ristiriitaisia vaihtoehtoja

============================================================
VIBEKOODARI-TILA (A/B + SUOSITUS)
Ennen toteutusta esitä aina:
- Vaihtoehto A (nopein/selkein) — DoD täyttyy
- Vaihtoehto B (siistein/laajin) — DoD täyttyy
- Suositus + perustelu (arkikieli, max 2 lausetta)

PÄÄTÖS (pysyvä logiikka):
- jos käyttäjä vastaa 1 → toteuta suositus
- jos käyttäjä vastaa 2 → toteuta toinen vaihtoehto
- jos käyttäjä vastaa 0 → pysähdy ja selitä erot / tee handoff

============================================================
DoD (VALMIS-MÄÄRITELMÄ, JOKA LUKITTU)
LUKITTU ei ole valmis ennen kuin:
- repon olemassa olevat tarkistukset läpäisevät (lint/test/typecheck mitä löytyy)
- virhetilanteet näkyvät UI:ssa (ei hiljaisia failauksia)
- lopussa “Miten testaat” (3–6 askelta)

============================================================
BOOTSTRAP-ULOSANNIN VAKIOFORMAATTI (PAKOLLISET OTSIKOT)
Tulosta AINA tässä järjestyksessä:
1) STATUS (faktat lyhyesti)
2) V1-TILA (1 lause perustelu)
3) HISTORIA-LÖYDÖS (kesken jäänyt? mikä ID?)
4) LUKITTU-EHDOTUKSET (1–3 kpl, isot)
   - jokaiselle: Nimi, Tavoite, Näkyvä muutos/testattavuus, Tasot, Deliverablet (2+), Vaikutus v1 (korkea/keskitaso/matala)
5) SUOSITUS (1–2 lausetta)

KYSYMYSASSETTELU (jos kysytään)
- Gate — [kysymys 1 rivillä]
- Mitä teen: [1 rivi]
- Ehdotus: [1/2/0]
- Perustelu (arkikieli): [max 2 lausetta]
- Vastaa: 1 / 2 / 0

SIJOITTELU (PAKOLLISET)
- Jos viestissä on kysymys: kysymys on AINA toiseksi alin.
- Uimaradat ovat AINA alimmaisena (2 riviä).
- ÄLÄ koskaan katkaise tokenia rivinvaihdolla (esim. “API/Routes”).

============================================================
UIMARADAT (ASCII, aina kahdella rivillä)
V1: MÄÄR → TOTE → TARK → TEST → VALM
TEHTÄVÄ: UI → API/Routes → Domain → Data-access → DB/Migrations → Tests/CI

TEHTÄVÄ % (jos käytät)
- 0 / 25 / 50 / 75 / 80 / 85 / 90 / 95 / 96 / 97 / 98 / 99 / 100
- 100% vain jos myöhemmät tasot eivät vaatineet paluuta.
const projectSelects = {
  project: document.getElementById("project-select"),
  budget: document.getElementById("budget-project"),
  jyda: document.getElementById("jyda-project"),
  planning: document.getElementById("planning-project"),
  weekly: document.getElementById("weekly-project"),
  forecast: document.getElementById("forecast-project"),
  mapping: document.getElementById("mapping-project"),
  report: document.getElementById("report-project"),
  history: document.getElementById("history-project"),
  adminProjectRole: document.getElementById("admin-project-role-project"),
};
const tenantSelects = {
  tenant: document.getElementById("tenant-select"),
  onboardingTenant: document.getElementById("onboarding-tenant-select"),
  companyTenant: document.getElementById("company-tenant-select"),
  onboardingCompleteTenant: document.getElementById("onboarding-complete-tenant"),
};
const tenantProjectSelects = {
  onboardingProject: document.getElementById("onboarding-project-select"),
  projectDetails: document.getElementById("project-details-select"),
  projectActivate: document.getElementById("project-activate-select"),
  projectArchive: document.getElementById("project-archive-select"),
};

const litteraSelects = {
  planning: document.getElementById("planning-littera"),
  forecast: document.getElementById("forecast-littera"),
  mappingWork: document.getElementById("mapping-work-littera"),
  mappingTarget: document.getElementById("mapping-target-littera"),
  mappingCorrectionTarget: document.getElementById("mapping-correction-target-littera"),
  weeklyLead: document.getElementById("weekly-lead-littera"),
  report: document.getElementById("report-littera"),
  history: document.getElementById("history-littera"),
};

const historyOutput = document.getElementById("history-output");
const reportOutput = document.getElementById("report-output");
const reportMainGroups = document.getElementById("report-main-groups");
const projectMeta = document.getElementById("project-meta");
const mappingVersionSelect = document.getElementById("mapping-version");
const mappingVersionActivateSelect = document.getElementById("mapping-version-activate");
const mappingCorrectionVersionSelect = document.getElementById("mapping-correction-version");
const mappingCorrectionLineSelect = document.getElementById("mapping-correction-line");
const mappingCorrectionCostType = document.getElementById("mapping-correction-cost-type");
const mappingCorrectionRule = document.getElementById("mapping-correction-allocation-rule");
const mappingCorrectionValue = document.getElementById("mapping-correction-allocation-value");
const mappingCorrectionNote = document.getElementById("mapping-correction-note");
const mappingCorrectionResult = document.getElementById("mapping-correction-result");
const demoSeedResult = document.getElementById("demo-seed-result");
const adminUserForm = document.getElementById("admin-user-form");
const adminUserResult = document.getElementById("admin-user-result");
const adminOrgRoleForm = document.getElementById("admin-org-role-form");
const adminOrgRoleResult = document.getElementById("admin-org-role-result");
const adminProjectRoleForm = document.getElementById("admin-project-role-form");
const adminProjectRoleResult = document.getElementById("admin-project-role-result");
const adminOrgUserSelect = document.getElementById("admin-org-user");
const adminOrgRoleSelect = document.getElementById("admin-org-role");
const adminProjectUserSelect = document.getElementById("admin-project-user");
const adminProjectRoleSelect = document.getElementById("admin-project-role");
const planningAttachmentTitle = document.getElementById("planning-attachment-title");
const planningAttachmentUrl = document.getElementById("planning-attachment-url");
const planningAttachmentAdd = document.getElementById("planning-attachment-add");
const planningAttachmentList = document.getElementById("planning-attachment-list");
const ghostWeekEnding = document.getElementById("ghost-week-ending");
const ghostAmount = document.getElementById("ghost-amount");
const ghostNote = document.getElementById("ghost-note");
const ghostAdd = document.getElementById("ghost-add");
const ghostList = document.getElementById("ghost-list");
const weeklyProjectSelect = document.getElementById("weekly-project");
const weeklyWorkPhaseSelect = document.getElementById("weekly-work-phase");
const ghostWorkPhaseSelect = document.getElementById("ghost-work-phase");
const ghostOpenSelect = document.getElementById("ghost-open-select");
const ghostOpenList = document.getElementById("ghost-open-list");
const forecastForm = document.getElementById("forecast-form");
const forecastLockHint = document.getElementById("forecast-lock-hint");

let forecastPlanningLock = { locked: false, message: "" };
const weeklyUpdatesList = document.getElementById("weekly-updates-list");
const weeklyRefresh = document.getElementById("weekly-refresh");
const budgetPreviewNote = document.getElementById("budget-preview-note");
const budgetPreviewTable = document.getElementById("budget-preview-table");
const budgetValidation = document.getElementById("budget-validation");
const budgetJobs = document.getElementById("budget-import-jobs");
const budgetFileInput = document.getElementById("budget-file");
const budgetStagingBatchInput = document.getElementById("budget-staging-batch-id");
const budgetStagingActorInput = document.getElementById("budget-staging-actor");
const budgetStagingCreate = document.getElementById("budget-staging-create");
const budgetStagingReload = document.getElementById("budget-staging-reload");
const budgetStagingApprove = document.getElementById("budget-staging-approve");
const budgetStagingReject = document.getElementById("budget-staging-reject");
const budgetStagingCommit = document.getElementById("budget-staging-commit");
const budgetStagingForce = document.getElementById("budget-staging-force");
const budgetStagingAllowDuplicate = document.getElementById("budget-staging-allow-duplicate");
const budgetStagingResult = document.getElementById("budget-staging-result");
const budgetStagingSummary = document.getElementById("budget-staging-summary");
const budgetStagingSummaryResult = document.getElementById("budget-staging-summary-result");
const budgetStagingIssues = document.getElementById("budget-staging-issues");
const jydaPreviewNote = document.getElementById("jyda-preview-note");
const jydaPreviewTable = document.getElementById("jyda-preview-table");
const jydaValidation = document.getElementById("jyda-validation");
const jydaFileInput = document.getElementById("jyda-file");
const assistantLog = document.getElementById("assistant-log");
const assistantInput = document.getElementById("assistant-input");
const assistantSend = document.getElementById("assistant-send");
const assistantClear = document.getElementById("assistant-clear");
const jydaMetricChecks = {
  committed: document.getElementById("metric-committed"),
  actual: document.getElementById("metric-actual"),
  actualUnapproved: document.getElementById("metric-actual-unapproved"),
  forecast: document.getElementById("metric-forecast"),
  target: document.getElementById("metric-target"),
};
const mappingSelects = {
  litteraCode: document.getElementById("map-littera-code"),
  litteraTitle: document.getElementById("map-littera-title"),
  labor: document.getElementById("map-labor"),
  material: document.getElementById("map-material"),
  subcontract: document.getElementById("map-subcontract"),
  rental: document.getElementById("map-rental"),
  other: document.getElementById("map-other"),
};
const jydaMappingSelects = {
  code: document.getElementById("map-jyda-code"),
  name: document.getElementById("map-jyda-name"),
  committed: document.getElementById("map-jyda-committed"),
  actual: document.getElementById("map-jyda-actual"),
  actualUnapproved: document.getElementById("map-jyda-actual-unapproved"),
  forecast: document.getElementById("map-jyda-forecast"),
  target: document.getElementById("map-jyda-target"),
};
const systemRoleSelect = document.getElementById("system-role-select");
const projectRoleSelect = document.getElementById("project-role-select");
const loginPanel = document.getElementById("login-panel");
const loginInfo = document.getElementById("login-info");
const loginInfoTop = document.getElementById("login-info-top");
const loginLink = document.getElementById("login-link");
const loginUserSelect = document.getElementById("login-user");
const loginPinInput = document.getElementById("login-pin");
const loginPinToggle = document.getElementById("login-pin-toggle");
const loginSubmit = document.getElementById("login-submit");
const loginStatus = document.getElementById("login-status");
const loginUserDisplay = document.getElementById("login-user-display");
const loginUserDisplayTop = document.getElementById("login-user-display-top");
const logoutButton = document.getElementById("logout");
const logoutButtonTop = document.getElementById("logout-top");
const appContent = document.getElementById("app-content");
const ROLE_RANK = { viewer: 1, editor: 2, manager: 3, owner: 4 };
let knownProjectIds = [];
const pages = ["setup", "sales", "mapping", "planning", "weekly", "forecast", "report", "history"];
const tabHint = document.getElementById("tab-hint");
const quickActions = document.querySelector(".quick-actions");
let budgetCsvData = null;
let savedBudgetMapping = null;
let currentBudgetStagingBatchId = null;
let jydaCsvData = null;
let savedJydaMapping = null;
let jydaFileMode = "csv";
let jydaFileData = null;
let lastImportJobs = [];
let mappingCorrectionLines = new Map();
let litteraById = new Map();
let planningAttachments = [];
let ghostEntries = [];
let tenants = [];
let projectsById = new Map();
let assistantMessages = [];

async function fetchJson(url, options = {}) {
  const token = getToken();
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    headers,
    credentials: "include",
    ...options,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) {
      resetAuthState();
      setAuthUi(false);
    }
    throw new Error(payload.error || "Virhe");
  }
  return payload;
}

function setHint(el, message, isError = false) {
  el.textContent = message;
  el.style.color = isError ? "#b00020" : "#1f6f8b";
}

function option(label, value) {
  const opt = document.createElement("option");
  opt.value = value;
  opt.textContent = label;
  return opt;
}

function parseCsv(text, delimiter = ";") {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  const pushField = () => {
    row.push(current);
    current = "";
  };

  const pushRow = () => {
    if (row.length > 0 || current.length > 0) {
      pushField();
      rows.push(row);
      row = [];
    }
  };

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];
    if (ch === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      pushField();
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") {
        i += 1;
      }
      pushRow();
      continue;
    }
    current += ch;
  }
  pushRow();
  return rows;
}

function csvEscape(value, delimiter = ";") {
  const text = value == null ? "" : String(value);
  if (text.includes(delimiter) || text.includes("\"") || text.includes("\n") || text.includes("\r")) {
    return `"${text.replace(/"/g, "\"\"")}"`;
  }
  return text;
}

function detectDelimiter(text) {
  const firstLine = text.split(/\r?\n/, 1)[0] || "";
  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  return semicolons > commas ? ";" : ",";
}

function normalizeHeader(header) {
  return String(header || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[_-]/g, "");
}

function autoSelect(select, headers, candidates) {
  const normalized = headers.map((h) => normalizeHeader(h));
  const idx = normalized.findIndex((h) => candidates.includes(h));
  if (idx >= 0) {
    select.value = headers[idx];
  }
}

function fillMappingOptions(headers) {
  Object.values(mappingSelects).forEach((select) => {
    select.innerHTML = "";
    select.appendChild(option("Valitse sarake", ""));
    headers.forEach((h) => select.appendChild(option(h, h)));
  });

  autoSelect(mappingSelects.litteraCode, headers, ["litterakoodi", "littera", "koodi"]);
  autoSelect(mappingSelects.litteraTitle, headers, ["litteraselite", "selite", "nimi"]);
  autoSelect(mappingSelects.labor, headers, ["työ€", "tyo€", "tyoeur", "tyoeuro", "labor€", "labor"]);
  autoSelect(mappingSelects.material, headers, ["aine€", "aineeur", "material€", "material"]);
  autoSelect(mappingSelects.subcontract, headers, ["alih€", "aliheur", "alihankinta€", "subcontract"]);
  autoSelect(mappingSelects.rental, headers, ["vmiehet€", "vmieheteur", "rental€", "rental"]);
  autoSelect(mappingSelects.other, headers, ["muu€", "muueur", "other€", "other"]);

  if (savedBudgetMapping) {
    mappingSelects.litteraCode.value = savedBudgetMapping.litteraCode || "";
    mappingSelects.litteraTitle.value = savedBudgetMapping.litteraTitle || "";
    mappingSelects.labor.value = savedBudgetMapping.labor || "";
    mappingSelects.material.value = savedBudgetMapping.material || "";
    mappingSelects.subcontract.value = savedBudgetMapping.subcontract || "";
    mappingSelects.rental.value = savedBudgetMapping.rental || "";
    mappingSelects.other.value = savedBudgetMapping.other || "";
  }

  updateValidationSummary(headers, budgetCsvData ? budgetCsvData.rows : []);
}

function fillJydaMappingOptions(headers) {
  Object.values(jydaMappingSelects).forEach((select) => {
    select.innerHTML = "";
    select.appendChild(option("Valitse sarake", ""));
    headers.forEach((h) => select.appendChild(option(h, h)));
  });

  autoSelect(jydaMappingSelects.code, headers, ["koodi", "code"]);
  autoSelect(jydaMappingSelects.name, headers, ["nimi", "name"]);
  autoSelect(jydaMappingSelects.committed, headers, ["sidottukustannus", "committed"]);
  autoSelect(jydaMappingSelects.actual, headers, ["toteutunutkustannus", "actual"]);
  autoSelect(jydaMappingSelects.actualUnapproved, headers, ["toteutunutkustannussishyväksymätt", "actualunapproved"]);
  autoSelect(jydaMappingSelects.forecast, headers, ["ennustettukustannus", "forecast"]);
  autoSelect(jydaMappingSelects.target, headers, ["tavoitekustannus", "target"]);

  if (savedJydaMapping) {
    jydaMappingSelects.code.value = savedJydaMapping.code || "";
    jydaMappingSelects.name.value = savedJydaMapping.name || "";
    jydaMappingSelects.committed.value = savedJydaMapping.committed || "";
    jydaMappingSelects.actual.value = savedJydaMapping.actual || "";
    jydaMappingSelects.actualUnapproved.value = savedJydaMapping.actualUnapproved || "";
    jydaMappingSelects.forecast.value = savedJydaMapping.forecast || "";
    jydaMappingSelects.target.value = savedJydaMapping.target || "";
  }

  updateJydaValidationSummary(headers, jydaCsvData ? jydaCsvData.rows : []);
}

function renderPreview(headers, rows) {
  if (!headers.length) {
    budgetPreviewTable.innerHTML = "";
    return;
  }
  const previewRows = rows.slice(0, 5);
  const headerHtml = headers.map((h) => `<th>${h}</th>`).join("");
  const bodyHtml = previewRows
    .map((r) => `<tr>${headers.map((_, i) => `<td>${r[i] || ""}</td>`).join("")}</tr>`)
    .join("");
  budgetPreviewTable.innerHTML = `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
}

function renderPlanningAttachments() {
  if (!planningAttachmentList) {
    return;
  }
  planningAttachmentList.innerHTML = "";
  if (planningAttachments.length === 0) {
    planningAttachmentList.textContent = "Ei liitteitä.";
    return;
  }
  planningAttachments.forEach((att, idx) => {
    const item = document.createElement("div");
    item.className = "history-item";
    const link = att.url ? `<a href="${att.url}" target="_blank" rel="noopener">avaa</a>` : "";
    item.innerHTML = `<strong>${att.title || "Liite"}</strong> ${link}
      <button type="button" class="attachment-remove" data-index="${idx}">Poista</button>`;
    planningAttachmentList.appendChild(item);
  });
}

function renderGhostEntries() {
  if (!ghostList) {
    return;
  }
  ghostList.innerHTML = "";
  if (ghostEntries.length === 0) {
    ghostList.textContent = "Ei ghost-kuluja.";
    return;
  }
  ghostEntries.forEach((entry, idx) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<strong>${entry.weekEnding}</strong> — ${entry.amount} €
      <div>${entry.note || ""}</div>
      <button type="button" class="ghost-remove" data-index="${idx}">Poista</button>`;
    ghostList.appendChild(item);
  });
}

function parseFiNumber(raw) {
  const text = String(raw || "").trim();
  if (!text) {
    return 0;
  }
  const normalized = text.replace(/\u00A0/g, " ").replace(/ /g, "").replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : NaN;
}

function updateValidationSummary(headers, rows) {
  if (!budgetValidation) {
    return;
  }
  const total = rows.length;
  if (total === 0) {
    budgetValidation.textContent = "Ei rivejä.";
    return;
  }
  const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));
  const codeKey = mappingSelects.litteraCode.value;
  const costKeys = [
    mappingSelects.labor.value,
    mappingSelects.material.value,
    mappingSelects.subcontract.value,
    mappingSelects.rental.value,
    mappingSelects.other.value,
  ].filter(Boolean);
  let emptyCode = 0;
  let zeroSum = 0;
  let badNumbers = 0;

  rows.forEach((row) => {
    const code = codeKey ? (row[headerIndex[codeKey]] || "").trim() : "";
    if (!code) {
      emptyCode += 1;
      return;
    }
    if (costKeys.length === 0) {
      return;
    }
    let sum = 0;
    let hasBad = false;
    costKeys.forEach((key) => {
      const val = parseFiNumber(row[headerIndex[key]]);
      if (Number.isNaN(val)) {
        hasBad = true;
      } else {
        sum += val;
      }
    });
    if (hasBad) {
      badNumbers += 1;
    }
    if (sum === 0) {
      zeroSum += 1;
    }
  });

  const warnings = [];
  if (emptyCode) {
    warnings.push(`Tyhjä litterakoodi: ${emptyCode} riviä`);
  }
  if (zeroSum) {
    warnings.push(`Kustannukset 0: ${zeroSum} riviä`);
  }
  if (badNumbers) {
    warnings.push(`Epäkelpo luku: ${badNumbers} riviä`);
  }
  budgetValidation.textContent =
    warnings.length === 0 ? `Rivejä yhteensä: ${total}.` : `Rivejä: ${total}. ${warnings.join(" · ")}`;
}

function getBudgetMappingOrThrow() {
  const mapping = {
    litteraCode: mappingSelects.litteraCode.value,
    litteraTitle: mappingSelects.litteraTitle.value,
    labor: mappingSelects.labor.value,
    material: mappingSelects.material.value,
    subcontract: mappingSelects.subcontract.value,
    rental: mappingSelects.rental.value,
    other: mappingSelects.other.value,
  };
  if (!mapping.litteraCode) {
    throw new Error("Litterakoodi-sarakkeen mappaus puuttuu.");
  }
  const costColumns = [
    mapping.labor,
    mapping.material,
    mapping.subcontract,
    mapping.rental,
    mapping.other,
  ].filter(Boolean);
  if (costColumns.length === 0) {
    throw new Error("Vähintään yksi kustannussarake pitää mapata.");
  }
  return mapping;
}

function buildBudgetMappedCsv(headers, rows, mapping) {
  const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));
  const outHeaders = [
    "Litterakoodi",
    "Litteraselite",
    "Työ €",
    "Aine €",
    "Alih €",
    "Vmiehet €",
    "Muu €",
  ];
  const outputRows = [outHeaders];
  rows.forEach((row) => {
    const code = (row[headerIndex[mapping.litteraCode]] || "").trim();
    if (!code) {
      return;
    }
    const title = mapping.litteraTitle ? row[headerIndex[mapping.litteraTitle]] || "" : "";
    const labor = mapping.labor ? row[headerIndex[mapping.labor]] || "" : "0";
    const material = mapping.material ? row[headerIndex[mapping.material]] || "" : "0";
    const subcontract = mapping.subcontract ? row[headerIndex[mapping.subcontract]] || "" : "0";
    const rental = mapping.rental ? row[headerIndex[mapping.rental]] || "" : "0";
    const other = mapping.other ? row[headerIndex[mapping.other]] || "" : "0";
    outputRows.push([code, title, labor, material, subcontract, rental, other]);
  });
  return outputRows.map((r) => r.map(csvEscape).join(";")).join("\n");
}

function renderBudgetStagingIssues(issues) {
  if (!budgetStagingIssues) {
    return;
  }
  budgetStagingIssues.innerHTML = "";
  if (!issues || issues.length === 0) {
    budgetStagingIssues.textContent = "Ei issueita.";
    return;
  }

  const grouped = new Map();
  issues.forEach((issue) => {
    const lineId = issue.staging_line_id;
    if (!grouped.has(lineId)) {
      grouped.set(lineId, {
        rowNo: issue.row_no,
        raw: issue.raw_json || {},
        issues: [],
      });
    }
    grouped.get(lineId).issues.push(issue);
  });

  [...grouped.entries()].forEach(([lineId, entry]) => {
    const item = document.createElement("div");
    item.className = "history-item";

    const title = document.createElement("strong");
    title.textContent = `Rivi ${entry.rowNo}`;

    const issueText = document.createElement("div");
    issueText.textContent = entry.issues
      .map((i) => `${i.issue_code}: ${i.issue_message || ""}`)
      .join(" | ");

    const rawPre = document.createElement("pre");
    rawPre.textContent = JSON.stringify(entry.raw, null, 2);

    const editLabel = document.createElement("label");
    editLabel.textContent = "Korjaus JSON (vain muuttuvat kentät)";

    const editArea = document.createElement("textarea");
    editArea.rows = 3;
    editArea.placeholder = "{\"Litterakoodi\":\"0100\",\"Työ €\":\"123,00\"}";

    const saveButton = document.createElement("button");
    saveButton.type = "button";
    saveButton.textContent = "Tallenna korjaus";
    saveButton.addEventListener("click", async () => {
      try {
        const actor = budgetStagingActorInput ? budgetStagingActorInput.value.trim() : "";
        if (!actor) {
          throw new Error("Pääkäyttäjä puuttuu.");
        }
        const edit = editArea.value ? JSON.parse(editArea.value) : null;
        if (!edit || typeof edit !== "object") {
          throw new Error("Korjaus JSON puuttuu.");
        }
        await fetchJson(`/api/import-staging/lines/${lineId}/edits`, {
          method: "POST",
          body: JSON.stringify({
            editedBy: actor,
            edit,
            reason: "UI-korjaus",
          }),
        });
        editArea.value = "";
        setHint(budgetStagingResult, `Korjaus tallennettu (rivi ${entry.rowNo}).`);
      } catch (err) {
        setHint(budgetStagingResult, err.message, true);
      }
    });

    item.appendChild(title);
    item.appendChild(issueText);
    item.appendChild(rawPre);
    item.appendChild(editLabel);
    item.appendChild(editArea);
    item.appendChild(saveButton);
    budgetStagingIssues.appendChild(item);
  });
}

function updateJydaValidationSummary(headers, rows) {
  if (!jydaValidation) {
    return;
  }
  if (jydaFileMode === "excel") {
    jydaValidation.textContent = "Excel-esikatselu: tarkistukset tehdään importissa.";
    return;
  }
  const total = rows.length;
  if (total === 0) {
    jydaValidation.textContent = "Ei rivejä.";
    return;
  }
  const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));
  const codeKey = jydaMappingSelects.code.value;
  const metricKeys = [
    jydaMappingSelects.committed.value,
    jydaMappingSelects.actual.value,
    jydaMappingSelects.actualUnapproved.value,
    jydaMappingSelects.forecast.value,
    jydaMappingSelects.target.value,
  ].filter(Boolean);
  let emptyCode = 0;
  let zeroSum = 0;
  let badNumbers = 0;

  rows.forEach((row) => {
    const code = codeKey ? (row[headerIndex[codeKey]] || "").trim() : "";
    if (!code) {
      emptyCode += 1;
      return;
    }
    if (metricKeys.length === 0) {
      return;
    }
    let sum = 0;
    let hasBad = false;
    metricKeys.forEach((key) => {
      const val = parseFiNumber(row[headerIndex[key]]);
      if (Number.isNaN(val)) {
        hasBad = true;
      } else {
        sum += val;
      }
    });
    if (hasBad) {
      badNumbers += 1;
    }
    if (sum === 0) {
      zeroSum += 1;
    }
  });

  const warnings = [];
  if (emptyCode) {
    warnings.push(`Tyhjä koodi: ${emptyCode} riviä`);
  }
  if (zeroSum) {
    warnings.push(`Kustannukset 0: ${zeroSum} riviä`);
  }
  if (badNumbers) {
    warnings.push(`Epäkelpo luku: ${badNumbers} riviä`);
  }
  jydaValidation.textContent =
    warnings.length === 0 ? `Rivejä yhteensä: ${total}.` : `Rivejä: ${total}. ${warnings.join(" · ")}`;
}

function captureTokenFromUrl() {
  if (typeof window === "undefined") {
    return;
  }
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  if (!token) {
    return;
  }
  localStorage.setItem("authToken", token);
  params.delete("token");
  const query = params.toString();
  const next = `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`;
  window.history.replaceState({}, "", next);
}

function storedAuthToken() {
  captureTokenFromUrl();
  const stored = localStorage.getItem("authToken");
  if (stored) {
    return stored;
  }
  if (typeof document !== "undefined") {
    const match = document.cookie.match(/(?:^|;\s*)authToken=([^;]+)/);
    if (match) {
      const token = decodeURIComponent(match[1]);
      localStorage.setItem("authToken", token);
      return token;
    }
  }
  return "";
}

function clearAuthToken() {
  localStorage.removeItem("authToken");
}

function resetAuthState() {
  clearAuthToken();
  localStorage.removeItem("authState");
  localStorage.removeItem("authUsername");
  document.cookie = "authToken=; Path=/; Max-Age=0; SameSite=Lax";
}

function parseToken(token) {
  if (!token) {
    return null;
  }
  try {
    return JSON.parse(atob(token));
  } catch (_) {
    return null;
  }
}

function authState() {
  const token = storedAuthToken();
  const parsed = parseToken(token);
  if (parsed) {
    return {
      userId: parsed.userId,
      systemRole: parsed.systemRole || "",
      projectRole: "viewer",
      projectRoles: parsed.projectRoles || {},
      authenticated: true,
    };
  }
  const stored = localStorage.getItem("authState");
  if (stored) {
    try {
      return { ...JSON.parse(stored), authenticated: false };
    } catch (_) {
      localStorage.removeItem("authState");
    }
  }
  const state = {
    userId: crypto.randomUUID(),
    systemRole: "",
    projectRole: "viewer",
    projectRoles: {},
    authenticated: false,
  };
  localStorage.setItem("authState", JSON.stringify(state));
  return state;
}

function saveAuthState(state) {
  localStorage.setItem("authState", JSON.stringify(state));
}

function getToken() {
  const token = storedAuthToken();
  if (token) {
    return token;
  }
  const state = authState();
  const payload = {
    userId: state.userId,
    systemRole: state.systemRole || null,
    projectRoles: state.projectRoles || {},
  };
  return btoa(JSON.stringify(payload));
}

function setAuthUi(isLoggedIn, displayName = "") {
  const fallbackName =
    displayName || localStorage.getItem("authUsername") || "Kirjautunut käyttäjä";
  if (appContent) {
    appContent.classList.toggle("requires-auth", !isLoggedIn);
  }
  if (loginPanel) {
    loginPanel.classList.toggle("hidden", isLoggedIn);
  }
  if (loginInfo) {
    loginInfo.classList.toggle("hidden", !isLoggedIn);
  }
  if (loginInfoTop) {
    loginInfoTop.classList.toggle("hidden", !isLoggedIn);
  }
  if (loginLink) {
    loginLink.classList.toggle("hidden", isLoggedIn);
  }
  if (loginUserDisplay) {
    loginUserDisplay.textContent = fallbackName;
  }
  if (loginUserDisplayTop) {
    loginUserDisplayTop.textContent = fallbackName;
  }
  const demoRoleButton = document.querySelector("[data-action='role-admin-owner']");
  if (demoRoleButton) {
    demoRoleButton.classList.toggle("hidden", isLoggedIn);
  }
}

function isLoginPage() {
  return window.location.pathname === "/login";
}

function redirectIfNeeded(isLoggedIn) {
  if (!isLoggedIn && !isLoginPage()) {
    window.location.href = "/login";
    return;
  }
  if (isLoggedIn && isLoginPage()) {
    window.location.href = "/";
  }
}

function canSystem(role, required) {
  if (required === "admin") {
    return role === "admin" || role === "superadmin";
  }
  if (required === "director") {
    return role === "director" || role === "admin" || role === "superadmin";
  }
  if (required === "seller") {
    return role === "seller" || role === "admin" || role === "superadmin";
  }
  return role === required;
}

function canProject(role, required) {
  if (!role) {
    return false;
  }
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

function hasAnyProjectRole(required) {
  const state = authState();
  const roles = Object.values(state.projectRoles || {});
  return roles.some((role) => canProject(role, required));
}

function selectedProjectId() {
  return (
    projectSelects.report.value ||
    projectSelects.mapping.value ||
    projectSelects.jyda.value ||
    projectSelects.budget.value ||
    projectSelects.weekly.value ||
    projectSelects.planning.value ||
    projectSelects.forecast.value ||
    projectSelects.history.value ||
    projectSelects.project.value ||
    ""
  );
}

function applyForecastLockUi() {
  if (!forecastForm) {
    return;
  }
  if (forecastLockHint) {
    forecastLockHint.textContent = forecastPlanningLock.message || "";
  }
  if (!forecastPlanningLock.locked) {
    return;
  }
  forecastForm.querySelectorAll("input, select, textarea, button").forEach((item) => {
    if (item.id === "forecast-project" || item.id === "forecast-littera") {
      return;
    }
    item.disabled = true;
  });
}

function applyRoleUi() {
  const state = authState();
  document.querySelectorAll("[data-guard]").forEach((el) => {
    const guard = el.dataset.guard;
    const hideWhenDenied = el.dataset.hideWhenDenied === "true";
    let allowed = false;
    let canEnable = false;
    if (guard.startsWith("system:")) {
      const required = guard.split(":")[1];
      allowed = canSystem(state.systemRole, required);
      canEnable = allowed;
    } else if (guard.startsWith("project:")) {
      const required = guard.split(":")[1];
      const selectedProject = selectedProjectId();
      if (state.systemRole === "admin" || state.systemRole === "superadmin") {
        allowed = true;
        canEnable = Boolean(selectedProject);
      } else if (selectedProject && state.projectRoles?.[selectedProject]) {
        allowed = canProject(state.projectRoles[selectedProject], required);
        canEnable = allowed;
      } else if (!selectedProject) {
        allowed = hasAnyProjectRole(required);
        canEnable = false;
      }
    }

    if (allowed) {
      el.classList.remove("disabled");
      if (hideWhenDenied) {
        el.classList.remove("hidden");
      }
      el.querySelectorAll("input, select, textarea, button").forEach((item) => {
        item.disabled = !canEnable;
      });
    } else {
      el.classList.add("disabled");
      if (hideWhenDenied) {
        el.classList.add("hidden");
      }
      el.querySelectorAll("input, select, textarea, button").forEach((item) => {
        item.disabled = true;
      });
    }
  });
  applyForecastLockUi();
}

async function updateForecastLock() {
  if (!forecastForm) {
    return;
  }
  const projectId = projectSelects.forecast?.value || "";
  const litteraId = litteraSelects.forecast?.value || "";
  if (!projectId || !litteraId) {
    forecastPlanningLock = {
      locked: false,
      message: "Valitse projekti ja tavoitearvio-littera ennustetta varten.",
    };
    applyRoleUi();
    return;
  }

  try {
    const summary = await fetchJson(
      `/api/report/target-summary?projectId=${projectId}&targetLitteraId=${litteraId}`
    );
    const status = summary?.planning?.status || null;
    if (!["READY_FOR_FORECAST", "LOCKED"].includes(status)) {
      forecastPlanningLock = {
        locked: true,
        message:
          "Ennustetapahtuma sallitaan vasta, kun suunnitelma on READY_FOR_FORECAST tai LOCKED.",
      };
    } else {
      forecastPlanningLock = { locked: false, message: "" };
    }
  } catch (_) {
    forecastPlanningLock = {
      locked: true,
      message: "Suunnitelman tilaa ei voitu tarkistaa. Yritä uudelleen.",
    };
  }
  applyRoleUi();
}

function pageFromPath() {
  const path = window.location.pathname.replace("/", "");
  if (pages.includes(path)) {
    return path;
  }
  return "setup";
}

function renderProjectMeta(projectId) {
  if (!projectMeta) {
    return;
  }
  if (!projectId) {
    projectMeta.textContent = "Valitse projekti nähdäksesi perustiedot.";
    return;
  }
  const project = projectsById.get(projectId);
  if (!project) {
    projectMeta.textContent = "Projektin tiedot puuttuvat.";
    return;
  }
  const details = project.project_details || {};
  const rows = [
    `<strong>${project.name}</strong>`,
    project.customer ? `Asiakas: ${project.customer}` : null,
    project.project_state ? `Tila: ${project.project_state}` : null,
    details.address ? `Osoite: ${details.address}` : null,
    details.startDate ? `Alku: ${details.startDate}` : null,
    details.endDate ? `Loppu: ${details.endDate}` : null,
    details.managerName ? `Vastuuhenkilö: ${details.managerName}` : null,
    details.managerEmail ? `Email: ${details.managerEmail}` : null,
  ].filter(Boolean);
  projectMeta.innerHTML = rows.join("<br />");
}

function renderAssistant() {
  if (!assistantLog) {
    return;
  }
  assistantLog.innerHTML = "";
  if (assistantMessages.length === 0) {
    assistantLog.textContent = "Ei viestejä vielä.";
    return;
  }
  assistantMessages.forEach((msg) => {
    const div = document.createElement("div");
    div.className = `assistant-message ${msg.role}`;
    div.textContent = msg.text;
    assistantLog.appendChild(div);
  });
}

function addAssistantMessage(role, text) {
  assistantMessages = [...assistantMessages, { role, text }];
  renderAssistant();
}

function pageGuard(page) {
  if (page === "setup" || page === "sales") {
    return { ok: true };
  }
  const projectId = selectedProjectId();
  if (!projectId) {
    return { ok: false, message: "Valitse projekti Setup-osiosta ennen muita välilehtiä." };
  }
  return { ok: true };
}

function setActivePage(page, push = true) {
  const active = pages.includes(page) ? page : "setup";
  const guard = pageGuard(active);
  const resolved = guard.ok ? active : "setup";

  document.querySelectorAll("[data-page]").forEach((section) => {
    if (section.dataset.page === resolved) {
      section.classList.remove("page-hidden");
    } else {
      section.classList.add("page-hidden");
    }
  });

  document.querySelectorAll("#tab-nav a").forEach((link) => {
    if (link.dataset.page === resolved) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });

  if (tabHint) {
    tabHint.textContent = guard.ok ? "" : guard.message;
  }

  if (push) {
    const url = resolved === "setup" ? "/setup" : `/${resolved}`;
    window.history.pushState({ page: active }, "", url);
    localStorage.setItem("activePage", resolved);
  }
}

async function loadProjects() {
  const projects = await fetchJson("/api/projects");
  knownProjectIds = projects.map((p) => p.project_id);
  projectsById = new Map(projects.map((p) => [p.project_id, p]));
  const entries = projects.map((p) => ({
    label: `${p.name} ${p.customer ? `(${p.customer})` : ""}`.trim(),
    value: p.project_id,
  }));

  Object.values(projectSelects).forEach((select) => {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    select.appendChild(option("Valitse projekti", ""));
    entries.forEach((entry) => select.appendChild(option(entry.label, entry.value)));
  });

  const state = authState();
  if (!state.authenticated) {
    knownProjectIds.forEach((id) => {
      if (!state.projectRoles[id]) {
        state.projectRoles[id] = state.projectRole || "viewer";
      }
    });
    saveAuthState(state);
  }
  applyRoleUi();
  renderProjectMeta(projectSelects.report?.value || "");
}

async function loadTenants() {
  try {
    tenants = await fetchJson("/api/tenants");
  } catch (err) {
    tenants = [];
  }
  const tenantOptions = tenants.map((t) => ({
    label: `${t.name} (${t.onboarding_state})`,
    value: t.tenant_id,
  }));

  Object.values(tenantSelects).forEach((select) => {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    select.appendChild(option("Valitse tenant", ""));
    tenantOptions.forEach((opt) => select.appendChild(option(opt.label, opt.value)));
  });
}

async function loadTenantProjects(tenantId) {
  if (!tenantId) {
    Object.values(tenantProjectSelects).forEach((select) => {
      if (!select) {
        return;
      }
      select.innerHTML = "";
      select.appendChild(option("Valitse projekti", ""));
    });
    return;
  }
  const projects = await fetchJson(`/api/tenants/${tenantId}/projects`);
  const options = projects.map((p) => ({
    label: `${p.name} (${p.project_state})`,
    value: p.project_id,
  }));
  Object.values(tenantProjectSelects).forEach((select) => {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    select.appendChild(option("Valitse projekti", ""));
    options.forEach((opt) => select.appendChild(option(opt.label, opt.value)));
  });
}

async function loadAdminUsers() {
  if (!adminOrgUserSelect && !adminProjectUserSelect) {
    return;
  }
  const response = await fetchJson("/api/admin/users");
  const entries = response.users || [];
  const fill = (select) => {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    select.appendChild(option("Valitse käyttäjä", ""));
    entries.forEach((user) => {
      const label = user.display_name
        ? `${user.display_name} (${user.username})`
        : user.username;
      select.appendChild(option(label, user.user_id));
    });
  };
  fill(adminOrgUserSelect);
  fill(adminProjectUserSelect);
}

async function loadLoginUsers() {
  if (!loginUserSelect) {
    return;
  }
  try {
    const response = await fetchJson("/api/users");
    loginUserSelect.innerHTML = "";
    loginUserSelect.appendChild(option("Valitse käyttäjä", ""));
    response.users.forEach((user) => {
      const label = user.display_name
        ? `${user.display_name} (${user.username})`
        : user.username;
      loginUserSelect.appendChild(option(label, user.username));
    });
  } catch (err) {
    if (loginStatus) {
      setHint(loginStatus, err.message, true);
    }
  }
}

async function finalizeLogin() {
  const me = await fetchJson("/api/me");
  const name = me.user.display_name || me.user.username;
  if (name) {
    localStorage.setItem("authUsername", name);
  }
  setAuthUi(true, name);
  applyRoleUi();
  if (loginStatus) {
    loginStatus.textContent = "";
  }
  try {
    await loadProjects();
  } catch (_) {
    // Project list is optional for the initial auth check.
  }
  try {
    await loadTenants();
  } catch (_) {
    // Tenants are optional for non-admin roles.
  }
  try {
    await loadAdminUsers();
  } catch (_) {
    // Admin-only data, ignore for others.
  }
  redirectIfNeeded(true);
}

async function handleLoginSubmit() {
  if (!loginUserSelect || !loginPinInput) {
    return;
  }
  const username = loginUserSelect.value;
  const pin = loginPinInput.value.trim();
  if (!username) {
    if (loginStatus) {
      setHint(loginStatus, "Valitse käyttäjä.", true);
    }
    return;
  }
  if (!pin) {
    if (loginStatus) {
      setHint(loginStatus, "Syötä PIN.", true);
    }
    return;
  }
  if (loginStatus) {
    setHint(loginStatus, "Kirjaudutaan...");
  }
  try {
    const response = await fetchJson("/api/login", {
      method: "POST",
      body: JSON.stringify({ username, pin }),
    });
    localStorage.setItem("authToken", response.token);
    localStorage.setItem("authUsername", username);
    loginPinInput.value = "";
    await finalizeLogin();
  } catch (err) {
    if (loginStatus) {
      setHint(loginStatus, err.message, true);
    }
  }
}

async function loadWorkPhases(projectId) {
  const selects = [weeklyWorkPhaseSelect, ghostWorkPhaseSelect];
  selects.forEach((select) => {
    if (!select) {
      return;
    }
    select.innerHTML = "";
    select.appendChild(option("Valitse työvaihe", ""));
  });
  if (!projectId) {
    return;
  }
  const phases = await fetchJson(`/api/work-phases?projectId=${projectId}`);
  phases.forEach((p) => {
    const label = `${p.name} (${p.status})`;
    selects.forEach((select) => {
      if (!select) {
        return;
      }
      select.appendChild(option(label, p.work_phase_id));
    });
  });
}

async function loadBudgetJobs(projectId) {
  if (!budgetJobs) {
    return;
  }
  if (!projectId) {
    budgetJobs.textContent = "Valitse projekti nähdäksesi tuontihistorian.";
    return;
  }
  try {
    const jobs = await fetchJson(`/api/import-jobs?projectId=${projectId}`);
    lastImportJobs = jobs;
    renderImportJobs(jobs);
  } catch (err) {
    budgetJobs.textContent = err.message;
  }
}

function renderImportJobs(jobs) {
  const filterType = document.getElementById("import-filter-type")?.value || "ALL";
  const query = (document.getElementById("import-filter-query")?.value || "").toLowerCase();
  const filtered = jobs.filter((job) => {
    if (filterType !== "ALL" && job.import_type !== filterType) {
      return false;
    }
    if (!query) {
      return true;
    }
    const haystack = [
      job.import_type,
      job.status,
      job.source_filename,
      job.import_batch_id,
      job.created_by,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(query);
  });

  budgetJobs.innerHTML = "";
  if (!filtered.length) {
    budgetJobs.textContent = "Ei tuonteja.";
    return;
  }
  filtered.forEach((job) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `
      <strong>${job.import_type} • ${job.status}</strong>
      <div>${new Date(job.created_at).toLocaleString("fi-FI")} — ${job.source_filename || "-"}</div>
      <div>${job.import_batch_id ? `import_batch_id=${job.import_batch_id}` : ""}</div>
      <div class="job-actions">
        <button type="button" class="job-detail" data-job-id="${job.import_job_id}">Näytä loki</button>
        <button type="button" class="job-download" data-job-id="${job.import_job_id}" data-format="json">
          Lataa loki (json)
        </button>
        <button type="button" class="job-download" data-job-id="${job.import_job_id}" data-format="csv">
          Lataa loki (csv)
        </button>
      </div>
    `;
    budgetJobs.appendChild(item);
  });
}

async function loadLitteras(projectId) {
  if (!projectId) {
    Object.values(litteraSelects).forEach((select) => {
      select.innerHTML = "";
      select.appendChild(option("Valitse littera", ""));
    });
    return;
  }

  const litteras = await fetchJson(`/api/projects/${projectId}/litteras`);
  litteraById = new Map(litteras.map((l) => [l.littera_id, l]));
  const entries = litteras.map((l) => ({
    label: `${l.code} ${l.title || ""}`.trim(),
    value: l.littera_id,
  }));

  Object.values(litteraSelects).forEach((select) => {
    select.innerHTML = "";
    select.appendChild(option("Valitse littera", ""));
    entries.forEach((entry) => select.appendChild(option(entry.label, entry.value)));
  });
}

async function loadMappingVersions(projectId) {
  const selects = [mappingVersionSelect, mappingVersionActivateSelect, mappingCorrectionVersionSelect];
  selects.forEach((select) => {
    select.innerHTML = "";
    select.appendChild(option("Valitse mapping-versio", ""));
  });

  if (!projectId) {
    return;
  }

  const versions = await fetchJson(`/api/mapping-versions?projectId=${projectId}`);
  versions.forEach((v) => {
    const label = `${v.status} ${v.valid_from}${v.valid_to ? `–${v.valid_to}` : ""} (${v.reason})`;
    if (mappingVersionSelect) {
      mappingVersionSelect.appendChild(option(label, v.mapping_version_id));
    }
    if (mappingVersionActivateSelect) {
      mappingVersionActivateSelect.appendChild(option(label, v.mapping_version_id));
    }
    if (mappingCorrectionVersionSelect && v.status === "ACTIVE") {
      mappingCorrectionVersionSelect.appendChild(option(label, v.mapping_version_id));
    }
  });
}

async function loadMappingLinesForCorrection(projectId, mappingVersionId) {
  if (!mappingCorrectionLineSelect) {
    return;
  }
  mappingCorrectionLineSelect.innerHTML = "";
  mappingCorrectionLineSelect.appendChild(option("Valitse rivi", ""));
  mappingCorrectionLines = new Map();
  if (!mappingVersionId) {
    return;
  }
  const lines = await fetchJson(`/api/mapping-lines?projectId=${projectId}&mappingVersionId=${mappingVersionId}`);
  lines.forEach((line) => {
    const work = litteraById.get(line.work_littera_id);
    const target = litteraById.get(line.target_littera_id);
    const label = `${work ? work.code : line.work_littera_id} → ${target ? target.code : line.target_littera_id} ${
      line.cost_type || "ALL"
    }`;
    mappingCorrectionLines.set(line.mapping_line_id, line);
    mappingCorrectionLineSelect.appendChild(option(label, line.mapping_line_id));
  });
}

async function refreshHistory() {
  const projectId = projectSelects.history.value;
  const litteraId = litteraSelects.history.value;
  if (!projectId || !litteraId) {
    historyOutput.textContent = "Valitse projekti ja tavoitearvio-littera.";
    return;
  }

  const [planning, forecast] = await Promise.all([
    fetchJson(`/api/planning-events?projectId=${projectId}&targetLitteraId=${litteraId}`),
    fetchJson(`/api/forecast-events?projectId=${projectId}&targetLitteraId=${litteraId}`),
  ]);

  const rows = [];
  planning.forEach((p) => {
    let attachmentText = "";
    if (Array.isArray(p.attachments) && p.attachments.length > 0) {
      attachmentText = p.attachments
        .map((att) => (att.url ? `${att.title || "Liite"}: ${att.url}` : att.title || "Liite"))
        .join(" | ");
    }
    rows.push({
      title: `Suunnitelma (${p.status})`,
      time: new Date(p.event_time).toLocaleString("fi-FI"),
      detail:
        p.summary ||
        p.observations ||
        p.risks ||
        p.decisions ||
        attachmentText ||
        "(ei tekstiä)",
    });
  });
  forecast.forEach((f) => {
    rows.push({
      title: "Ennustetapahtuma",
      time: new Date(f.event_time).toLocaleString("fi-FI"),
      detail: f.comment || "(ei perustelua)",
    });
  });

  historyOutput.innerHTML = "";
  if (rows.length === 0) {
    historyOutput.textContent = "Ei tapahtumia.";
    return;
  }

  rows
    .sort((a, b) => b.time.localeCompare(a.time))
    .forEach((row) => {
      const div = document.createElement("div");
      div.className = "history-item";
      div.innerHTML = `<strong>${row.title}</strong><div>${row.time}</div><div>${row.detail}</div>`;
      historyOutput.appendChild(div);
    });
}

if (projectSelects.project) {
  projectSelects.project.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
    applyRoleUi();
  });
}

if (projectSelects.budget) {
  projectSelects.budget.addEventListener("change", async () => {
    applyRoleUi();
    await loadBudgetJobs(projectSelects.budget.value);
    const projectId = projectSelects.budget.value;
    savedBudgetMapping = null;
    if (projectId) {
      try {
        const mapping = await fetchJson(`/api/import-mappings?projectId=${projectId}&type=BUDGET`);
        if (mapping && mapping.mapping) {
          savedBudgetMapping = mapping.mapping;
          if (budgetCsvData) {
            fillMappingOptions(budgetCsvData.headers);
            updateValidationSummary(budgetCsvData.headers, budgetCsvData.rows);
          }
        }
      } catch (_) {
        // ignore mapping fetch errors
      }
    }
  });
}

if (projectSelects.jyda) {
  projectSelects.jyda.addEventListener("change", async () => {
    applyRoleUi();
    await loadBudgetJobs(projectSelects.jyda.value);
    const projectId = projectSelects.jyda.value;
    savedJydaMapping = null;
    if (projectId) {
      try {
        const mapping = await fetchJson(`/api/import-mappings?projectId=${projectId}&type=JYDA`);
        if (mapping && mapping.mapping) {
          savedJydaMapping = mapping.mapping;
          if (jydaCsvData) {
            fillJydaMappingOptions(jydaCsvData.headers);
            updateJydaValidationSummary(jydaCsvData.headers, jydaCsvData.rows);
          }
        }
      } catch (_) {
        // ignore mapping fetch errors
      }
    }
  });
}

const importFilterType = document.getElementById("import-filter-type");
const importFilterQuery = document.getElementById("import-filter-query");
if (importFilterType) {
  importFilterType.addEventListener("change", () => {
    renderImportJobs(lastImportJobs);
  });
}
if (importFilterQuery) {
  importFilterQuery.addEventListener("input", () => {
    renderImportJobs(lastImportJobs);
  });
}

if (projectSelects.planning) {
  projectSelects.planning.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
  });
}

if (projectSelects.weekly) {
  projectSelects.weekly.addEventListener("change", async (e) => {
    await loadWorkPhases(e.target.value);
    await loadLitteras(e.target.value);
    applyRoleUi();
  });
}

if (projectSelects.forecast) {
  projectSelects.forecast.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
    await updateForecastLock();
  });
}

if (litteraSelects.forecast) {
  litteraSelects.forecast.addEventListener("change", async () => {
    await updateForecastLock();
  });
}

if (projectSelects.mapping) {
  projectSelects.mapping.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
    await loadMappingVersions(e.target.value);
    await loadMappingLinesForCorrection(e.target.value, mappingCorrectionVersionSelect.value);
    applyRoleUi();
  });
}

if (mappingCorrectionVersionSelect) {
  mappingCorrectionVersionSelect.addEventListener("change", async (e) => {
    const projectId = projectSelects.mapping.value;
    await loadMappingLinesForCorrection(projectId, e.target.value);
  });
}

if (mappingCorrectionLineSelect) {
  mappingCorrectionLineSelect.addEventListener("change", () => {
    const line = mappingCorrectionLines.get(mappingCorrectionLineSelect.value);
    if (!line) {
      return;
    }
    if (litteraSelects.mappingCorrectionTarget) {
      litteraSelects.mappingCorrectionTarget.value = line.target_littera_id;
    }
    if (mappingCorrectionCostType) {
      mappingCorrectionCostType.value = line.cost_type || "";
    }
    if (mappingCorrectionRule) {
      mappingCorrectionRule.value = line.allocation_rule;
    }
    if (mappingCorrectionValue) {
      mappingCorrectionValue.value = String(line.allocation_value ?? "");
    }
    if (mappingCorrectionNote) {
      mappingCorrectionNote.value = line.note || "";
    }
  });
}

if (weeklyWorkPhaseSelect) {
  weeklyWorkPhaseSelect.addEventListener("change", async () => {
    await loadGhostOpen(projectSelects.weekly.value, weeklyWorkPhaseSelect.value);
    await loadWeeklyUpdates(projectSelects.weekly.value, weeklyWorkPhaseSelect.value);
  });
}

if (ghostWorkPhaseSelect) {
  ghostWorkPhaseSelect.addEventListener("change", async () => {
    await loadGhostOpen(projectSelects.weekly.value, ghostWorkPhaseSelect.value);
  });
}

if (weeklyRefresh) {
  weeklyRefresh.addEventListener("click", async () => {
    await loadWeeklyUpdates(projectSelects.weekly.value, weeklyWorkPhaseSelect.value);
  });
}

if (projectSelects.report) {
  projectSelects.report.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
    renderProjectMeta(e.target.value);
    applyRoleUi();
  });
}

if (projectSelects.history) {
  projectSelects.history.addEventListener("change", async (e) => {
    await loadLitteras(e.target.value);
    applyRoleUi();
  });
}

Object.values(tenantSelects).forEach((select) => {
  if (!select) {
    return;
  }
  select.addEventListener("change", async (e) => {
    if (
      e.target === tenantSelects.tenant ||
      e.target === tenantSelects.onboardingTenant ||
      e.target === tenantSelects.companyTenant ||
      e.target === tenantSelects.onboardingCompleteTenant
    ) {
      await loadTenantProjects(e.target.value);
    }
  });
});

if (planningAttachmentAdd) {
  planningAttachmentAdd.addEventListener("click", () => {
    const title = planningAttachmentTitle.value.trim();
    const url = planningAttachmentUrl.value.trim();
    if (!title && !url) {
      return;
    }
    planningAttachments.push({ title, url });
    planningAttachmentTitle.value = "";
    planningAttachmentUrl.value = "";
    renderPlanningAttachments();
  });
}

if (planningAttachmentList) {
  planningAttachmentList.addEventListener("click", (e) => {
    const button = e.target.closest(".attachment-remove");
    if (!button) {
      return;
    }
    const idx = Number(button.dataset.index);
    if (Number.isFinite(idx)) {
      planningAttachments.splice(idx, 1);
      renderPlanningAttachments();
    }
  });
  renderPlanningAttachments();
}

if (ghostAdd) {
  ghostAdd.addEventListener("click", () => {
    const weekEnding = ghostWeekEnding.value;
    const amount = ghostAmount.value.trim();
    const note = ghostNote.value.trim();
    if (!weekEnding || !amount) {
      return;
    }
    ghostEntries.push({ weekEnding, amount, note });
    ghostWeekEnding.value = "";
    ghostAmount.value = "";
    ghostNote.value = "";
    renderGhostEntries();
  });
}

if (ghostList) {
  ghostList.addEventListener("click", (e) => {
    const button = e.target.closest(".ghost-remove");
    if (!button) {
      return;
    }
    const idx = Number(button.dataset.index);
    if (Number.isFinite(idx)) {
      ghostEntries.splice(idx, 1);
      renderGhostEntries();
    }
  });
  renderGhostEntries();
}

async function loadGhostOpen(projectId, workPhaseId) {
  if (!ghostOpenList || !ghostOpenSelect) {
    return;
  }
  ghostOpenList.textContent = "Valitse työvaihe nähdäksesi avoimet ghostit.";
  ghostOpenSelect.innerHTML = "";
  ghostOpenSelect.appendChild(option("Valitse ghost", ""));
  if (!projectId || !workPhaseId) {
    return;
  }
  const rows = await fetchJson(`/api/work-phases/${workPhaseId}/ghosts?projectId=${projectId}`);
  ghostOpenList.innerHTML = "";
  if (rows.length === 0) {
    ghostOpenList.textContent = "Ei avoimia ghosteja.";
    return;
  }
  rows.forEach((row) => {
    const label = `${row.week_ending} ${row.cost_type} open ${row.open_amount}`;
    ghostOpenSelect.appendChild(option(label, row.ghost_cost_entry_id));
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<strong>${row.week_ending}</strong> ${row.cost_type} — open ${row.open_amount} €
      <div>Kirjattu ${row.entered_amount} €, kuitattu ${row.settled_amount} €</div>`;
    ghostOpenList.appendChild(item);
  });
}

async function loadWeeklyUpdates(projectId, workPhaseId) {
  if (!weeklyUpdatesList) {
    return;
  }
  weeklyUpdatesList.textContent = "Valitse työvaihe nähdäksesi päivitykset.";
  if (!projectId || !workPhaseId) {
    return;
  }
  const rows = await fetchJson(
    `/api/work-phases/${workPhaseId}/weekly-updates?projectId=${projectId}`
  );
  weeklyUpdatesList.innerHTML = "";
  if (rows.length === 0) {
    weeklyUpdatesList.textContent = "Ei viikkopäivityksiä.";
    return;
  }
  rows.forEach((row) => {
    const item = document.createElement("div");
    item.className = "history-item";
    item.innerHTML = `<strong>${row.week_ending}</strong> — ${row.percent_complete} %
      <div>${row.progress_notes || ""}</div>
      <div>${row.risks || ""}</div>
      <div>${row.created_by} · ${new Date(row.created_at).toLocaleString("fi-FI")}</div>`;
    weeklyUpdatesList.appendChild(item);
  });
}

const projectForm = document.getElementById("project-form");
projectForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(projectForm);
  const payload = {
    name: form.get("name"),
    customer: form.get("customer"),
  };

  const result = document.getElementById("project-result");
  try {
    const res = await fetchJson("/api/projects", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const state = authState();
    state.projectRoles[res.project_id] = state.projectRole || "owner";
    saveAuthState(state);
    setHint(result, "Projekti luotu.");
    projectForm.reset();
    await loadProjects();
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const tenantForm = document.getElementById("tenant-form");
if (tenantForm) {
  tenantForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(tenantForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("tenant-result");
    try {
      await fetchJson("/api/seller/tenants", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Tenant luotu.");
      tenantForm.reset();
      await loadTenants();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const sellerProjectForm = document.getElementById("seller-project-form");
if (sellerProjectForm) {
  sellerProjectForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(sellerProjectForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("seller-project-result");
    try {
      await fetchJson("/api/seller/projects", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Project stub luotu.");
      sellerProjectForm.reset();
      await loadTenants();
      if (payload.tenantId) {
        await loadTenantProjects(payload.tenantId);
      }
      await loadProjects();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const onboardingLinkForm = document.getElementById("onboarding-link-form");
if (onboardingLinkForm) {
  onboardingLinkForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(onboardingLinkForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("onboarding-link-result");
    try {
      const res = await fetchJson("/api/seller/onboarding-links", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, `Linkki luotu: ${res.onboarding_url}`);
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const companyDetailsForm = document.getElementById("company-details-form");
if (companyDetailsForm) {
  companyDetailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(companyDetailsForm);
    const payload = {
      tenantId: form.get("tenantId"),
      updatedBy: form.get("updatedBy"),
      details: {
        companyName: form.get("companyName"),
        businessId: form.get("businessId"),
        adminEmail: form.get("adminEmail"),
      },
    };
    const result = document.getElementById("company-details-result");
    try {
      await fetchJson(`/api/admin/tenants/${payload.tenantId}/onboarding/company`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Yritystiedot tallennettu.");
      await loadTenants();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const projectDetailsForm = document.getElementById("project-details-form");
if (projectDetailsForm) {
  projectDetailsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(projectDetailsForm);
    const payload = {
      projectId: form.get("projectId"),
      updatedBy: form.get("updatedBy"),
      details: {
        address: form.get("address"),
        managerName: form.get("managerName"),
        managerEmail: form.get("managerEmail"),
        startDate: form.get("startDate"),
        endDate: form.get("endDate"),
      },
    };
    const result = document.getElementById("project-details-result");
    try {
      await fetchJson(`/api/admin/projects/${payload.projectId}/onboarding/project`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Projektitiedot tallennettu.");
      await loadProjects();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const onboardingCompleteForm = document.getElementById("onboarding-complete-form");
if (onboardingCompleteForm) {
  onboardingCompleteForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(onboardingCompleteForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("onboarding-complete-result");
    try {
      await fetchJson(`/api/admin/tenants/${payload.tenantId}/onboarding/complete`, {
        method: "POST",
        body: JSON.stringify({ updatedBy: payload.updatedBy }),
      });
      setHint(result, "Onboarding valmis.");
      await loadTenants();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

if (adminUserForm) {
  adminUserForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(adminUserForm);
    const payload = Object.fromEntries(form.entries());
    try {
      await fetchJson("/api/admin/users", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(adminUserResult, "Käyttäjä lisätty.");
      adminUserForm.reset();
      await loadAdminUsers();
    } catch (err) {
      setHint(adminUserResult, err.message, true);
    }
  });
}

if (adminOrgRoleForm) {
  adminOrgRoleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(adminOrgRoleForm);
    const userId = form.get("userId");
    const roleCode = form.get("roleCode");
    try {
      await fetchJson(`/api/admin/users/${userId}/org-role`, {
        method: "POST",
        body: JSON.stringify({ roleCode }),
      });
      setHint(adminOrgRoleResult, "Org-rooli asetettu.");
      adminOrgRoleForm.reset();
      await loadAdminUsers();
    } catch (err) {
      setHint(adminOrgRoleResult, err.message, true);
    }
  });
}

if (adminProjectRoleForm) {
  adminProjectRoleForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(adminProjectRoleForm);
    const payload = {
      userId: form.get("userId"),
      projectId: form.get("projectId"),
      roleCode: form.get("roleCode"),
    };
    try {
      await fetchJson(`/api/admin/users/${payload.userId}/project-roles`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(adminProjectRoleResult, "Projektin rooli asetettu.");
      adminProjectRoleForm.reset();
      await loadAdminUsers();
    } catch (err) {
      setHint(adminProjectRoleResult, err.message, true);
    }
  });
}

if (assistantSend && assistantInput) {
  assistantSend.addEventListener("click", () => {
    const text = assistantInput.value.trim();
    if (!text) {
      return;
    }
    addAssistantMessage("user", text);
    assistantInput.value = "";
    const payload = {
      messages: assistantMessages.map((msg) => ({
        role: msg.role,
        content: msg.text,
      })),
    };
    fetchJson("/api/assistant/chat", {
      method: "POST",
      body: JSON.stringify(payload),
    })
      .then((res) => {
        addAssistantMessage("assistant", res.message || "Ei vastausta.");
      })
      .catch((err) => {
        addAssistantMessage("assistant", `Virhe: ${err.message}`);
      });
  });
}

if (assistantInput) {
  assistantInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      event.preventDefault();
      assistantSend?.click();
    }
  });
}

if (assistantClear) {
  assistantClear.addEventListener("click", () => {
    assistantMessages = [];
    renderAssistant();
  });
}

const projectActivateForm = document.getElementById("project-activate-form");
if (projectActivateForm) {
  projectActivateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(projectActivateForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("project-activate-result");
    try {
      await fetchJson(`/api/projects/${payload.projectId}/activate`, {
        method: "POST",
        body: JSON.stringify({ updatedBy: payload.updatedBy }),
      });
      setHint(result, "Projekti aktivoitu.");
      await loadTenants();
      await loadProjects();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const projectArchiveForm = document.getElementById("project-archive-form");
if (projectArchiveForm) {
  projectArchiveForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(projectArchiveForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("project-archive-result");
    try {
      await fetchJson(`/api/projects/${payload.projectId}/archive`, {
        method: "POST",
        body: JSON.stringify({ updatedBy: payload.updatedBy }),
      });
      setHint(result, "Projekti arkistoitu.");
      await loadTenants();
      await loadProjects();
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Tiedoston luku epäonnistui."));
    reader.readAsText(file, "utf-8");
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Tiedoston luku epäonnistui."));
    reader.readAsDataURL(file);
  });
}

budgetFileInput.addEventListener("change", async () => {
  const file = budgetFileInput.files[0];
  if (!file) {
    budgetCsvData = null;
    budgetPreviewNote.textContent = "Valitse CSV nähdäksesi esikatselun.";
    budgetPreviewTable.innerHTML = "";
    return;
  }
  try {
    const text = await readFileAsText(file);
    const rows = parseCsv(text);
    if (!rows.length) {
      throw new Error("CSV on tyhjä.");
    }
    const headers = rows[0].map((h) => (h || "").trim());
    if (headers[0]) {
      headers[0] = headers[0].replace(/^\uFEFF/, "");
    }
    const dataRows = rows.slice(1);
    budgetCsvData = { headers, rows: dataRows };
    budgetPreviewNote.textContent = `Rivejä: ${dataRows.length}`;
    renderPreview(headers, dataRows);
    fillMappingOptions(headers);
    updateValidationSummary(headers, dataRows);
  } catch (err) {
    budgetCsvData = null;
    budgetPreviewNote.textContent = err.message;
    budgetPreviewTable.innerHTML = "";
  }
});

Object.values(mappingSelects).forEach((select) => {
  select.addEventListener("change", () => {
    if (budgetCsvData) {
      updateValidationSummary(budgetCsvData.headers, budgetCsvData.rows);
    }
  });
});

jydaFileInput.addEventListener("change", async () => {
  const file = jydaFileInput.files[0];
  if (!file) {
    jydaCsvData = null;
    jydaFileMode = "csv";
    jydaFileData = null;
    jydaPreviewNote.textContent = "Valitse CSV nähdäksesi esikatselun.";
    jydaPreviewTable.innerHTML = "";
    if (jydaValidation) {
      jydaValidation.textContent = "";
    }
    return;
  }
  try {
    const ext = file.name.toLowerCase().split(".").pop();
    if (ext === "xlsx" || ext === "xlsm") {
      jydaFileMode = "excel";
      jydaFileData = await readFileAsDataUrl(file);
      jydaCsvData = null;
      jydaPreviewNote.textContent = "Excel valittu: esikatselu ei ole käytössä.";
      jydaPreviewTable.innerHTML = "";
      Object.values(jydaMappingSelects).forEach((select) => {
        select.disabled = true;
        select.required = false;
      });
      updateJydaValidationSummary([], []);
      return;
    }

    const text = await readFileAsText(file);
    const delimiter = detectDelimiter(text);
    const rows = parseCsv(text, delimiter);
    if (!rows.length) {
      throw new Error("CSV on tyhjä.");
    }
    const headers = rows[0].map((h) => (h || "").trim());
    if (headers[0]) {
      headers[0] = headers[0].replace(/^\uFEFF/, "");
    }
    const dataRows = rows.slice(1);
    jydaFileMode = "csv";
    jydaFileData = null;
    jydaCsvData = { headers, rows: dataRows, delimiter };
    jydaPreviewNote.textContent = `Rivejä: ${dataRows.length}`;
    renderPreview(headers, dataRows);
    fillJydaMappingOptions(headers);
    Object.values(jydaMappingSelects).forEach((select) => {
      select.disabled = false;
      select.required = select.id === "map-jyda-code" || select.id === "map-jyda-committed" || select.id === "map-jyda-actual";
    });
    updateJydaValidationSummary(headers, dataRows);
  } catch (err) {
    jydaCsvData = null;
    jydaFileData = null;
    jydaFileMode = "csv";
    jydaPreviewNote.textContent = err.message;
    jydaPreviewTable.innerHTML = "";
  }
});

Object.values(jydaMappingSelects).forEach((select) => {
  select.addEventListener("change", () => {
    if (jydaCsvData) {
      updateJydaValidationSummary(jydaCsvData.headers, jydaCsvData.rows);
    }
  });
});

Object.values(jydaMetricChecks).forEach((check) => {
  if (!check) {
    return;
  }
  check.addEventListener("change", () => {
    if (jydaFileMode === "excel") {
      updateJydaValidationSummary([], []);
    }
  });
});

if (budgetJobs) {
  budgetJobs.addEventListener("click", async (e) => {
    const button = e.target.closest(".job-detail");
    const download = e.target.closest(".job-download");
    const jobId = button ? button.dataset.jobId : download ? download.dataset.jobId : null;
    const format = download ? download.dataset.format : null;
    if (!jobId) {
      return;
    }
    try {
      const detail = await fetchJson(`/api/import-jobs/${jobId}`);
      if (format === "json") {
        const blob = new Blob([JSON.stringify(detail, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `import-job-${jobId}.json`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }
      if (format === "csv") {
        const header = ["timestamp", "status", "message"];
        const lines = [header.join(",")];
        detail.events.forEach((ev) => {
          const row = [
            new Date(ev.created_at).toISOString(),
            ev.status,
            (ev.message || "").replace(/"/g, "\"\""),
          ];
          lines.push(row.map((v) => csvEscape(v, ",")).join(","));
        });
        const blob = new Blob([lines.join("\n")], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `import-job-${jobId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        return;
      }

      if (!button) {
        return;
      }
      const log = document.createElement("div");
      log.className = "job-log";
      const events = detail.events
        .map((ev) => `${new Date(ev.created_at).toLocaleString("fi-FI")} ${ev.status}: ${ev.message || ""}`)
        .join("\n");
      log.innerHTML = `
        <pre>${events}</pre>
        ${detail.job.stdout ? `<pre>${detail.job.stdout}</pre>` : ""}
        ${detail.job.stderr ? `<pre>${detail.job.stderr}</pre>` : ""}
        ${detail.job.error_message ? `<pre>${detail.job.error_message}</pre>` : ""}
      `;
      button.parentElement.appendChild(log);
      button.disabled = true;
    } catch (err) {
      setHint(demoSeedResult, err.message, true);
    }
  });
}

const budgetImportForm = document.getElementById("budget-import-form");
budgetImportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(budgetImportForm);
  const result = document.getElementById("budget-import-result");
  const file = document.getElementById("budget-file").files[0];
  if (!file) {
    setHint(result, "Valitse CSV-tiedosto.", true);
    return;
  }

  try {
    if (!budgetCsvData) {
      throw new Error("CSV ei ole ladattuna esikatseluun.");
    }
    const { headers, rows } = budgetCsvData;
    const mapping = getBudgetMappingOrThrow();
    const csvText = buildBudgetMappedCsv(headers, rows, mapping);
    const payload = {
      projectId: form.get("projectId"),
      importedBy: form.get("importedBy"),
      filename: file.name,
      csvText,
      dryRun: form.get("dryRun") === "on",
    };
    if (form.get("saveMapping") === "on") {
      await fetchJson("/api/import-mappings", {
        method: "PUT",
        body: JSON.stringify({
          projectId: payload.projectId,
          type: "BUDGET",
          mapping,
          createdBy: payload.importedBy,
        }),
      });
    }
    const res = await fetchJson("/api/budget-import", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, `Tuonti käynnistetty. import_job_id=${res.import_job_id}`);
    budgetImportForm.reset();
    budgetCsvData = null;
    budgetPreviewTable.innerHTML = "";
    budgetPreviewNote.textContent = "Valitse CSV nähdäksesi esikatselun.";
    if (budgetValidation) {
      budgetValidation.textContent = "";
    }
    await loadBudgetJobs(payload.projectId);

    const poll = async () => {
      const detail = await fetchJson(`/api/import-jobs/${res.import_job_id}`);
      if (detail.job.status === "SUCCESS") {
        setHint(
          result,
          detail.job.import_batch_id
            ? `Tuonti valmis. import_batch_id=${detail.job.import_batch_id}`
            : "Tuonti valmis."
        );
        await loadBudgetJobs(payload.projectId);
        return;
      }
      if (detail.job.status === "FAILED") {
        setHint(result, detail.job.error_message || "Tuonti epäonnistui.", true);
        await loadBudgetJobs(payload.projectId);
        return;
      }
      setTimeout(poll, 2000);
    };
    setTimeout(poll, 2000);
  } catch (err) {
    setHint(result, err.message, true);
  }
});

async function loadBudgetStagingIssues(batchId) {
  if (!budgetStagingIssues) {
    return;
  }
  if (!batchId) {
    budgetStagingIssues.textContent = "Anna staging-batch ID.";
    return;
  }
  const data = await fetchJson(`/api/import-staging/${batchId}/issues`);
  renderBudgetStagingIssues(data.issues || []);
}

if (budgetStagingCreate) {
  budgetStagingCreate.addEventListener("click", async () => {
    try {
      const form = new FormData(budgetImportForm);
      const file = document.getElementById("budget-file").files[0];
      if (!file) {
        throw new Error("Valitse CSV-tiedosto.");
      }
      if (!budgetCsvData) {
        throw new Error("CSV ei ole ladattuna esikatseluun.");
      }
      const actor = budgetStagingActorInput ? budgetStagingActorInput.value.trim() : "";
      if (!actor) {
        throw new Error("Pääkäyttäjä puuttuu.");
      }
      const mapping = getBudgetMappingOrThrow();
      const csvText = buildBudgetMappedCsv(budgetCsvData.headers, budgetCsvData.rows, mapping);
      const importedBy = String(form.get("importedBy") || "").trim();
      if (!importedBy) {
        throw new Error("Tuojan nimi puuttuu.");
      }
      const payload = {
        projectId: form.get("projectId"),
        importedBy,
        filename: file.name,
        csvText,
      };
      const res = await fetchJson("/api/import-staging/budget", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      currentBudgetStagingBatchId = res.staging_batch_id;
      if (budgetStagingBatchInput) {
        budgetStagingBatchInput.value = res.staging_batch_id;
      }
      setHint(
        budgetStagingResult,
        `Staging luotu. batch=${res.staging_batch_id} · rivit=${res.line_count} · issueita=${res.issue_count}`
      );
      await loadBudgetStagingIssues(res.staging_batch_id);
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

if (budgetStagingReload) {
  budgetStagingReload.addEventListener("click", async () => {
    try {
      const batchId = budgetStagingBatchInput?.value.trim() || currentBudgetStagingBatchId;
      await loadBudgetStagingIssues(batchId);
      setHint(budgetStagingResult, `Virheet ladattu (batch=${batchId}).`);
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

if (budgetStagingApprove) {
  budgetStagingApprove.addEventListener("click", async () => {
    try {
      const batchId = budgetStagingBatchInput?.value.trim() || currentBudgetStagingBatchId;
      const actor = budgetStagingActorInput ? budgetStagingActorInput.value.trim() : "";
      if (!batchId) {
        throw new Error("Staging-batch ID puuttuu.");
      }
      if (!actor) {
        throw new Error("Pääkäyttäjä puuttuu.");
      }
      const res = await fetchJson(`/api/import-staging/${batchId}/approve`, {
        method: "POST",
        body: JSON.stringify({ approvedBy: actor, message: "Hyvaksytty UI:ssa" }),
      });
      setHint(budgetStagingResult, `Batch hyväksytty (event=${res.staging_batch_event_id}).`);
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

if (budgetStagingReject) {
  budgetStagingReject.addEventListener("click", async () => {
    try {
      const batchId = budgetStagingBatchInput?.value.trim() || currentBudgetStagingBatchId;
      const actor = budgetStagingActorInput ? budgetStagingActorInput.value.trim() : "";
      if (!batchId) {
        throw new Error("Staging-batch ID puuttuu.");
      }
      if (!actor) {
        throw new Error("Pääkäyttäjä puuttuu.");
      }
      const res = await fetchJson(`/api/import-staging/${batchId}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectedBy: actor, message: "Hylatty UI:ssa" }),
      });
      setHint(budgetStagingResult, `Batch hylätty (event=${res.staging_batch_event_id}).`);
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

if (budgetStagingCommit) {
  budgetStagingCommit.addEventListener("click", async () => {
    try {
      const batchId = budgetStagingBatchInput?.value.trim() || currentBudgetStagingBatchId;
      const actor = budgetStagingActorInput ? budgetStagingActorInput.value.trim() : "";
      if (!batchId) {
        throw new Error("Staging-batch ID puuttuu.");
      }
      if (!actor) {
        throw new Error("Pääkäyttäjä puuttuu.");
      }
      const res = await fetchJson(`/api/import-staging/${batchId}/commit`, {
        method: "POST",
        body: JSON.stringify({
          committedBy: actor,
          message: "Siirretty UI:ssa",
          force: Boolean(budgetStagingForce?.checked),
          allowDuplicate: Boolean(budgetStagingAllowDuplicate?.checked),
        }),
      });
      setHint(
        budgetStagingResult,
        `Siirto valmis. import_batch_id=${res.import_batch_id} · rivit=${res.inserted_rows}`
      );
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

if (budgetStagingSummary) {
  budgetStagingSummary.addEventListener("click", async () => {
    try {
      const batchId = budgetStagingBatchInput?.value.trim() || currentBudgetStagingBatchId;
      if (!batchId) {
        throw new Error("Staging-batch ID puuttuu.");
      }
      const res = await fetchJson(`/api/import-staging/${batchId}/summary`);
      if (budgetStagingSummaryResult) {
        const totals = res.totals_by_cost_type || {};
        const totalsAll = res.totals_by_cost_type_all || {};
        const lines = [
          `Batch: ${res.staging_batch_id}`,
          `Riveja: ${res.line_count}`,
          `Koodit: ${res.codes_count}`,
          `Ohitetut rivit: ${res.skipped_rows}`,
          `Ohitetut arvot: ${res.skipped_values}`,
          `ERROR-issuet: ${res.error_issues}`,
          `LABOR (puhdas): ${formatAmount(totals.LABOR || 0)}`,
          `LABOR (kaikki): ${formatAmount(totalsAll.LABOR || 0)}`,
          `MATERIAL (puhdas): ${formatAmount(totals.MATERIAL || 0)}`,
          `MATERIAL (kaikki): ${formatAmount(totalsAll.MATERIAL || 0)}`,
          `SUBCONTRACT (puhdas): ${formatAmount(totals.SUBCONTRACT || 0)}`,
          `SUBCONTRACT (kaikki): ${formatAmount(totalsAll.SUBCONTRACT || 0)}`,
          `RENTAL (puhdas): ${formatAmount(totals.RENTAL || 0)}`,
          `RENTAL (kaikki): ${formatAmount(totalsAll.RENTAL || 0)}`,
          `OTHER (puhdas): ${formatAmount(totals.OTHER || 0)}`,
          `OTHER (kaikki): ${formatAmount(totalsAll.OTHER || 0)}`,
        ];
        const topCodes = res.top_codes || [];
        if (topCodes.length > 0) {
          lines.push("", "Top 10 litterat:");
          topCodes.forEach((row, idx) => {
            const title = row.title ? ` — ${row.title}` : "";
            lines.push(`${idx + 1}. ${row.code}${title}: ${formatAmount(row.total || 0)}`);
          });
        }
        const topLines = res.top_lines || [];
        if (topLines.length > 0) {
          lines.push("", "Top 10 littera+kustannuslaji:");
          topLines.forEach((row, idx) => {
            const title = row.title ? ` — ${row.title}` : "";
            lines.push(
              `${idx + 1}. ${row.code}${title} (${row.cost_type}): ${formatAmount(row.total || 0)}`
            );
          });
        }
        budgetStagingSummaryResult.innerHTML = `<pre>${lines.join("\n")}</pre>`;
      }
      setHint(budgetStagingResult, `Yhteenveto ladattu (batch=${batchId}).`);
    } catch (err) {
      setHint(budgetStagingResult, err.message, true);
    }
  });
}

const jydaImportForm = document.getElementById("jyda-import-form");
jydaImportForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(jydaImportForm);
  const result = document.getElementById("jyda-import-result");
  const file = document.getElementById("jyda-file").files[0];
  if (!file) {
    setHint(result, "Valitse CSV-tiedosto.", true);
    return;
  }

  try {
    const metricMap = [
      { key: "committed", metric: "JYDA.COMMITTED_COST", header: "Sidottu kustannus", check: "committed" },
      { key: "actual", metric: "JYDA.ACTUAL_COST", header: "Toteutunut kustannus", check: "actual" },
      {
        key: "actualUnapproved",
        metric: "JYDA.ACTUAL_COST_INCL_UNAPPROVED",
        header: "Toteutunut kustannus (sis. hyväksymätt.)",
        check: "actualUnapproved",
      },
      { key: "forecast", metric: "JYDA.FORECAST_COST", header: "Ennustettu kustannus", check: "forecast" },
      { key: "target", metric: "JYDA.TARGET_COST", header: "Tavoitekustannus", check: "target" },
    ];

    let payload = {
      projectId: form.get("projectId"),
      importedBy: form.get("importedBy"),
      filename: file.name,
      dryRun: form.get("dryRun") === "on",
      includeZeros: form.get("includeZeros") === "on",
      occurredOn: form.get("occurredOn"),
    };

    if (jydaFileMode === "excel") {
      const selectedMetrics = metricMap.filter((m) => jydaMetricChecks[m.check]?.checked);
      if (selectedMetrics.length === 0) {
        throw new Error("Valitse vähintään yksi kustannussarake.");
      }
      if (!jydaFileData) {
        throw new Error("Excel-tiedostoa ei ole ladattu.");
      }
      payload = {
        ...payload,
        fileData: jydaFileData,
        metrics: selectedMetrics.map((m) => m.metric),
      };
    } else {
      if (!jydaCsvData) {
        throw new Error("CSV ei ole ladattuna esikatseluun.");
      }
      const { headers, rows } = jydaCsvData;
      const mapping = {
        code: jydaMappingSelects.code.value,
        name: jydaMappingSelects.name.value,
        committed: jydaMappingSelects.committed.value,
        actual: jydaMappingSelects.actual.value,
        actualUnapproved: jydaMappingSelects.actualUnapproved.value,
        forecast: jydaMappingSelects.forecast.value,
        target: jydaMappingSelects.target.value,
      };
      if (!mapping.code) {
        throw new Error("Koodi-sarakkeen mappaus puuttuu.");
      }

      const selectedMetrics = metricMap.filter((m) => mapping[m.key]);
      if (selectedMetrics.length === 0) {
        throw new Error("Valitse vähintään yksi kustannussarake.");
      }

      const headerIndex = Object.fromEntries(headers.map((h, idx) => [h, idx]));
      const outHeaders = ["Koodi", "Nimi", ...selectedMetrics.map((m) => m.header)];
      const outputRows = [outHeaders];

      rows.forEach((row) => {
        const code = (row[headerIndex[mapping.code]] || "").trim();
        if (!code) {
          return;
        }
        const name = mapping.name ? row[headerIndex[mapping.name]] || "" : "";
        const metricValues = selectedMetrics.map((m) => row[headerIndex[mapping[m.key]]] || "");
        outputRows.push([code, name, ...metricValues]);
      });

      const csvText = outputRows.map((r) => r.map((v) => csvEscape(v, ",")).join(",")).join("\n");
      payload = {
        ...payload,
        csvText,
        metrics: selectedMetrics.map((m) => m.metric),
      };

      if (form.get("saveMapping") === "on") {
        await fetchJson("/api/import-mappings", {
          method: "PUT",
          body: JSON.stringify({
            projectId: payload.projectId,
            type: "JYDA",
            mapping,
            createdBy: payload.importedBy,
          }),
        });
      }
    }

    const res = await fetchJson("/api/jyda-import", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    setHint(result, `Tuonti käynnistetty. import_job_id=${res.import_job_id}`);
    jydaImportForm.reset();
    jydaCsvData = null;
    jydaFileData = null;
    jydaFileMode = "csv";
    jydaPreviewTable.innerHTML = "";
    jydaPreviewNote.textContent = "Valitse CSV nähdäksesi esikatselun.";
    if (jydaValidation) {
      jydaValidation.textContent = "";
    }
    await loadBudgetJobs(payload.projectId);

    const poll = async () => {
      const detail = await fetchJson(`/api/import-jobs/${res.import_job_id}`);
      if (detail.job.status === "SUCCESS") {
        setHint(
          result,
          detail.job.import_batch_id
            ? `Tuonti valmis. import_batch_id=${detail.job.import_batch_id}`
            : "Tuonti valmis."
        );
        await loadBudgetJobs(payload.projectId);
        return;
      }
      if (detail.job.status === "FAILED") {
        setHint(result, detail.job.error_message || "Tuonti epäonnistui.", true);
        await loadBudgetJobs(payload.projectId);
        return;
      }
      setTimeout(poll, 2000);
    };
    setTimeout(poll, 2000);
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const litteraForm = document.getElementById("littera-form");
litteraForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(litteraForm);
  const payload = {
    projectId: form.get("projectId"),
    code: form.get("code"),
    title: form.get("title"),
  };

  const result = document.getElementById("littera-result");
  try {
    await fetchJson("/api/litteras", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Littera lisätty.");
    litteraForm.reset();
    await loadLitteras(payload.projectId);
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const planningForm = document.getElementById("planning-form");
planningForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(planningForm);
  const payload = Object.fromEntries(form.entries());
  payload.attachments = planningAttachments.map((att) => ({
    title: att.title || "",
    url: att.url || "",
  }));

  const result = document.getElementById("planning-result");
  try {
    await fetchJson("/api/planning-events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Suunnitelma tallennettu.");
    planningForm.reset();
    planningAttachments = [];
    renderPlanningAttachments();
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const mappingVersionForm = document.getElementById("mapping-version-form");
mappingVersionForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(mappingVersionForm);
  const payload = Object.fromEntries(form.entries());

  const result = document.getElementById("mapping-version-result");
  try {
    await fetchJson("/api/mapping-versions", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Mapping-versio luotu.");
    const projectId = payload.projectId;
    mappingVersionForm.reset();
    if (projectId) {
      projectSelects.mapping.value = projectId;
      await loadMappingVersions(projectId);
    }
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const mappingLineForm = document.getElementById("mapping-line-form");
mappingLineForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(mappingLineForm);
  const payload = Object.fromEntries(form.entries());
  if (!payload.projectId) {
    payload.projectId = projectSelects.mapping.value;
  }

  const result = document.getElementById("mapping-line-result");
  try {
    await fetchJson("/api/mapping-lines", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Mapping-rivi lisätty.");
    mappingLineForm.reset();
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const mappingActivateForm = document.getElementById("mapping-activate-form");
mappingActivateForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(mappingActivateForm);
  const payload = Object.fromEntries(form.entries());
  if (!payload.projectId) {
    payload.projectId = projectSelects.mapping.value;
  }

  const result = document.getElementById("mapping-activate-result");
  try {
    await fetchJson("/api/mapping-activate", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Mapping-versio aktivoitu.");
    mappingActivateForm.reset();
    if (payload.projectId) {
      await loadMappingVersions(payload.projectId);
    }
  } catch (err) {
    setHint(result, err.message, true);
  }
});

const mappingCorrectionForm = document.getElementById("mapping-correction-form");
if (mappingCorrectionForm) {
  mappingCorrectionForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(mappingCorrectionForm);
    const payload = Object.fromEntries(form.entries());
    if (!payload.projectId) {
      payload.projectId = projectSelects.mapping.value;
    }
    if (!payload.mappingLineId) {
      payload.mappingLineId = mappingCorrectionLineSelect.value;
    }

    try {
      await fetchJson("/api/mapping-corrections", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(mappingCorrectionResult, "Korjausversio luotu ja aktivoitu.");
      mappingCorrectionForm.reset();
      if (payload.projectId) {
        await loadMappingVersions(payload.projectId);
        await loadMappingLinesForCorrection(payload.projectId, "");
      }
    } catch (err) {
      setHint(mappingCorrectionResult, err.message, true);
    }
  });
}

forecastForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(forecastForm);
  const payload = Object.fromEntries(form.entries());

  const lines = Array.from(document.querySelectorAll(".line-row"))
    .map((row) => {
      const value = row.querySelector("[data-field='value']").value;
      const memo = row.querySelector("[data-field='memo']").value;
      return {
        costType: row.dataset.costType,
        forecastValue: value,
        memoGeneral: memo,
      };
    })
    .filter((line) => line.forecastValue !== "");

  payload.lines = lines;
  payload.ghostEntries = ghostEntries.map((entry) => ({
    weekEnding: entry.weekEnding,
    amount: entry.amount,
    note: entry.note || "",
  }));

  const result = document.getElementById("forecast-result");
  try {
    await fetchJson("/api/forecast-events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Ennustetapahtuma tallennettu.");
    forecastForm.reset();
    ghostEntries = [];
    renderGhostEntries();
  } catch (err) {
    setHint(result, err.message, true);
  }
});

function formatAmount(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) {
    return value ?? "";
  }
  return num.toLocaleString("fi-FI", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function renderMainGroupReport(rows) {
  if (!reportMainGroups) {
    return;
  }
  const title = "<strong>Mapping-kooste 0-9</strong>";
  if (!rows || rows.length === 0) {
    reportMainGroups.innerHTML = `${title}<div>(ei rivejä)</div>`;
    return;
  }
  const lines = rows
    .map(
      (row) =>
        `<div>${row.main_group_code}: budjetti ${formatAmount(row.budget_total)} / ` +
        `toteuma ${formatAmount(row.actual_total)} / erotus ${formatAmount(row.variance_eur)}</div>`
    )
    .join("");
  reportMainGroups.innerHTML = `${title}${lines}`;
}

const reportRefresh = document.getElementById("report-refresh");
if (reportRefresh) {
  reportRefresh.addEventListener("click", (e) => {
    e.preventDefault();
    const projectId = projectSelects.report.value;
    const litteraId = litteraSelects.report.value;
    if (!projectId) {
      reportOutput.textContent = "Valitse projekti.";
      if (reportMainGroups) {
        reportMainGroups.textContent = "";
      }
      return;
    }

    if (reportMainGroups) {
      reportMainGroups.textContent = "Ladataan mapping-koostetta...";
      fetchJson(`/api/report/main-groups?projectId=${projectId}`)
        .then((data) => renderMainGroupReport(data.rows))
        .catch((err) => {
          reportMainGroups.textContent = err.message;
        });
    }

    if (!litteraId) {
      reportOutput.textContent = "Valitse tavoitearvio-littera nähdäksesi suunnitelman ja ennusteen.";
      return;
    }

    fetchJson(`/api/report/target-summary?projectId=${projectId}&targetLitteraId=${litteraId}`)
      .then((data) => {
        const lines = [];
        if (data.planning) {
          lines.push(`<strong>Suunnitelma:</strong> ${data.planning.status || ""}`);
        }
        if (data.forecast) {
          lines.push(`<strong>Ennuste:</strong> ${data.forecast.event_time || ""}`);
        }
        if (data.totals) {
          const formatRows = (title, items) => {
            if (!items || items.length === 0) {
              return `<div>${title}: (ei rivejä)</div>`;
            }
            const rows = items
              .map((row) => `<div>${row.cost_type}: ${formatAmount(row.total)}</div>`)
              .join("");
            return `<div><strong>${title}</strong>${rows}</div>`;
          };
          lines.push(formatRows("Tavoite (budget)", data.totals.budget));
          lines.push(formatRows("Toteuma (mapped)", data.totals.actual));
          lines.push(formatRows("Ennuste", data.totals.forecast));
        }
        reportOutput.innerHTML = lines.join("");
      })
      .catch((err) => {
        reportOutput.textContent = err.message;
      });
  });
}

const historyRefresh = document.getElementById("history-refresh");
if (historyRefresh) {
  historyRefresh.addEventListener("click", (e) => {
    e.preventDefault();
    refreshHistory().catch((err) => {
      historyOutput.textContent = err.message;
    });
  });
}

async function initAuth() {
  const existingToken = storedAuthToken();
  if (existingToken) {
    setAuthUi(true, localStorage.getItem("authUsername") || "");
  } else {
    setAuthUi(false);
  }
  await loadLoginUsers();
  try {
    await finalizeLogin();
    return;
  } catch (err) {
    if (!existingToken) {
      resetAuthState();
    }
  }
  if (existingToken) {
    setAuthUi(true, localStorage.getItem("authUsername") || "");
    return;
  }
  setAuthUi(false);
  redirectIfNeeded(false);
}

renderAssistant();
initAuth().catch((err) => {
  if (historyOutput) {
    historyOutput.textContent = err.message;
  }
});

async function seedDemoData() {
  setHint(demoSeedResult, "Luodaan esimerkkidata...");
  const state = authState();
  if (!canSystem(state.systemRole, "admin")) {
    throw new Error("Esimerkkidata vaatii system-roolin admin/superadmin.");
  }
  if (!canProject(state.projectRole, "manager")) {
    throw new Error("Valitse projektin rooliksi manager tai owner.");
  }
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const projectName = `Kaarnatie ${timestamp}`;

  const project = await fetchJson("/api/projects", {
    method: "POST",
    body: JSON.stringify({ name: projectName, customer: "Kaarna Oy" }),
  });

  const projectId = project.project_id;
  if (!state.authenticated) {
    state.projectRoles[projectId] = state.projectRole;
    saveAuthState(state);
  }

  const target = await fetchJson("/api/litteras", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      code: "0100",
      title: "Perustukset",
    }),
  });

  const work = await fetchJson("/api/litteras", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      code: "2100",
      title: "Kaivuut",
    }),
  });

  const today = new Date().toISOString().slice(0, 10);
  const mappingVersion = await fetchJson("/api/mapping-versions", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      validFrom: today,
      reason: "MVP mapping",
      createdBy: "Työnjohtaja",
    }),
  });

  await fetchJson("/api/mapping-lines", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      mappingVersionId: mappingVersion.mapping_version_id,
      workLitteraId: work.littera_id,
      targetLitteraId: target.littera_id,
      allocationRule: "FULL",
      allocationValue: "1.0",
      createdBy: "Työnjohtaja",
    }),
  });

  await fetchJson("/api/mapping-activate", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      mappingVersionId: mappingVersion.mapping_version_id,
      approvedBy: "Työpäällikkö",
    }),
  });

  await fetchJson("/api/planning-events", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      targetLitteraId: target.littera_id,
      createdBy: "Työnjohtaja",
      status: "READY_FOR_FORECAST",
      summary: "Suunnitelma valmis",
    }),
  });

  await fetchJson("/api/forecast-events", {
    method: "POST",
    body: JSON.stringify({
      projectId,
      targetLitteraId: target.littera_id,
      createdBy: "Työnjohtaja",
      comment: "Ensimmäinen ennustetapahtuma",
      lines: [
        { costType: "LABOR", forecastValue: 10000, memoGeneral: "Arvio" },
      ],
    }),
  });

  await loadProjects();
  projectSelects.mapping.value = projectId;
  projectSelects.report.value = projectId;
  projectSelects.history.value = projectId;
  await loadLitteras(projectId);
  await loadMappingVersions(projectId);

  setHint(
    demoSeedResult,
    `Esimerkkidata luotu projektille: ${projectName}`
  );

  setActivePage("report");
  document.getElementById("report-section")?.scrollIntoView({ behavior: "smooth" });
}

const demoSeedButton = document.getElementById("demo-seed");
if (demoSeedButton) {
  demoSeedButton.addEventListener("click", () => {
    seedDemoData().catch((err) => {
      setHint(demoSeedResult, err.message, true);
    });
  });
}

if (loginSubmit) {
  loginSubmit.addEventListener("click", handleLoginSubmit);
}

if (loginPinInput) {
  loginPinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleLoginSubmit();
    }
  });
}

if (loginPinToggle && loginPinInput) {
  loginPinToggle.addEventListener("change", (event) => {
    loginPinInput.type = event.target.checked ? "text" : "password";
  });
}

const performLogout = () => {
  fetchJson("/api/logout", { method: "POST" }).catch(() => {});
  resetAuthState();
  setAuthUi(false);
  applyRoleUi();
  window.location.href = "/login?loggedOut=1";
};

if (logoutButton) {
  logoutButton.addEventListener("click", performLogout);
}
if (logoutButtonTop) {
  logoutButtonTop.addEventListener("click", performLogout);
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("#logout");
  if (!target) {
    return;
  }
  event.preventDefault();
  performLogout();
});

if (quickActions) {
  quickActions.addEventListener("click", (event) => {
    const button = event.target.closest("button");
    if (!button || !button.dataset.action) {
      return;
    }
    event.preventDefault();
    const action = button.dataset.action;
    if (action === "go-setup") {
      setActivePage("setup");
      return;
    }
    if (action === "focus-project") {
      setActivePage("setup");
      const input = document.querySelector("#project-form input[name='name']");
      if (input) {
        input.focus();
      }
      return;
    }
    if (action === "go-report") {
      setActivePage("report");
      return;
    }
    if (action === "role-admin-owner") {
      const current = authState();
      if (current.authenticated) {
        setHint(demoSeedResult, "Kirjautuneena rooleja ei voi muokata.");
        return;
      }
      const next = authState();
      next.systemRole = "admin";
      next.projectRole = "owner";
      knownProjectIds.forEach((id) => {
        next.projectRoles[id] = "owner";
      });
      saveAuthState(next);
      if (systemRoleSelect && projectRoleSelect) {
        systemRoleSelect.value = "admin";
        projectRoleSelect.value = "owner";
      }
      applyRoleUi();
      setHint(demoSeedResult, "Roolit asetettu: admin + owner.");
    }
  });
}

const state = authState();
if (systemRoleSelect && projectRoleSelect) {
  systemRoleSelect.value = state.systemRole || "";
  projectRoleSelect.value = state.projectRole || "viewer";
  applyRoleUi();

  systemRoleSelect.addEventListener("change", (e) => {
    const next = authState();
    next.systemRole = e.target.value;
    saveAuthState(next);
    applyRoleUi();
    loadProjects().catch((err) => {
      setHint(demoSeedResult, err.message, true);
    });
  });

  projectRoleSelect.addEventListener("change", (e) => {
    const next = authState();
    next.projectRole = e.target.value;
    knownProjectIds.forEach((id) => {
      next.projectRoles[id] = e.target.value;
    });
    saveAuthState(next);
    applyRoleUi();
  });
} else {
  applyRoleUi();
}

document.querySelectorAll("#tab-nav a").forEach((link) => {
  link.addEventListener("click", (e) => {
    e.preventDefault();
    setActivePage(link.dataset.page);
  });
});

window.addEventListener("popstate", () => {
  setActivePage(pageFromPath(), false);
});

window.addEventListener("keydown", (event) => {
  if (!event.altKey || event.ctrlKey || event.metaKey) {
    return;
  }
  const map = {
    Digit1: "setup",
    Digit2: "mapping",
    Digit3: "planning",
    Digit4: "weekly",
    Digit5: "forecast",
    Digit6: "report",
    Digit7: "history",
  };
  const target = map[event.code];
  if (!target) {
    return;
  }
  event.preventDefault();
  setActivePage(target);
});

const savedPage = localStorage.getItem("activePage");
if (savedPage && pages.includes(savedPage)) {
  setActivePage(savedPage, false);
} else {
  setActivePage(pageFromPath(), false);
}
const workPhaseForm = document.getElementById("work-phase-form");
if (workPhaseForm) {
  workPhaseForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(workPhaseForm);
    const payload = Object.fromEntries(form.entries());
    const result = document.getElementById("work-phase-result");
  try {
    await fetchJson("/api/work-phases", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Työvaihe luotu.");
    workPhaseForm.reset();
    await loadWorkPhases(payload.projectId);
    await loadLitteras(payload.projectId);
  } catch (err) {
    setHint(result, err.message, true);
  }
});
}

const weeklyUpdateForm = document.getElementById("weekly-update-form");
if (weeklyUpdateForm) {
  weeklyUpdateForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(weeklyUpdateForm);
    const payload = Object.fromEntries(form.entries());
    payload.projectId = projectSelects.weekly.value;
    const result = document.getElementById("weekly-update-result");
  try {
    await fetchJson(`/api/work-phases/${payload.workPhaseId}/weekly-updates`, {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Viikkopäivitys tallennettu.");
    weeklyUpdateForm.reset();
    await loadWeeklyUpdates(payload.projectId, payload.workPhaseId);
  } catch (err) {
    setHint(result, err.message, true);
  }
});
}

const ghostEntryForm = document.getElementById("ghost-entry-form");
if (ghostEntryForm) {
  ghostEntryForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(ghostEntryForm);
    const payload = Object.fromEntries(form.entries());
    payload.projectId = projectSelects.weekly.value;
    const result = document.getElementById("ghost-entry-result");
    try {
      await fetchJson(`/api/work-phases/${payload.workPhaseId}/ghosts`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Ghost-kulu lisätty.");
      ghostEntryForm.reset();
      await loadGhostOpen(payload.projectId, payload.workPhaseId);
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}

const ghostSettlementForm = document.getElementById("ghost-settlement-form");
if (ghostSettlementForm) {
  ghostSettlementForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = new FormData(ghostSettlementForm);
    const payload = Object.fromEntries(form.entries());
    payload.projectId = projectSelects.weekly.value;
    const result = document.getElementById("ghost-settlement-result");
    try {
      await fetchJson(`/api/ghosts/${payload.ghostId}/settlements`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      setHint(result, "Ghost kuitattu.");
      ghostSettlementForm.reset();
      await loadGhostOpen(payload.projectId, ghostWorkPhaseSelect.value);
    } catch (err) {
      setHint(result, err.message, true);
    }
  });
}
