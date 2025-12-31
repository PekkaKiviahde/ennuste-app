const projectSelects = {
  project: document.getElementById("project-select"),
  budget: document.getElementById("budget-project"),
  jyda: document.getElementById("jyda-project"),
  planning: document.getElementById("planning-project"),
  forecast: document.getElementById("forecast-project"),
  mapping: document.getElementById("mapping-project"),
  report: document.getElementById("report-project"),
  history: document.getElementById("history-project"),
};

const litteraSelects = {
  planning: document.getElementById("planning-littera"),
  forecast: document.getElementById("forecast-littera"),
  mappingWork: document.getElementById("mapping-work-littera"),
  mappingTarget: document.getElementById("mapping-target-littera"),
  report: document.getElementById("report-littera"),
  history: document.getElementById("history-littera"),
};

const historyOutput = document.getElementById("history-output");
const reportOutput = document.getElementById("report-output");
const mappingVersionSelect = document.getElementById("mapping-version");
const mappingVersionActivateSelect = document.getElementById("mapping-version-activate");
const demoSeedResult = document.getElementById("demo-seed-result");
const budgetPreviewNote = document.getElementById("budget-preview-note");
const budgetPreviewTable = document.getElementById("budget-preview-table");
const budgetValidation = document.getElementById("budget-validation");
const budgetJobs = document.getElementById("budget-import-jobs");
const budgetFileInput = document.getElementById("budget-file");
const jydaPreviewNote = document.getElementById("jyda-preview-note");
const jydaPreviewTable = document.getElementById("jyda-preview-table");
const jydaValidation = document.getElementById("jyda-validation");
const jydaFileInput = document.getElementById("jyda-file");
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
const ROLE_RANK = { viewer: 1, editor: 2, manager: 3, owner: 4 };
let knownProjectIds = [];
const pages = ["setup", "mapping", "planning", "forecast", "report", "history"];
const tabHint = document.getElementById("tab-hint");
const quickActions = document.querySelector(".quick-actions");
let budgetCsvData = null;
let savedBudgetMapping = null;
let jydaCsvData = null;
let savedJydaMapping = null;
let jydaFileMode = "csv";
let jydaFileData = null;
let lastImportJobs = [];

async function fetchJson(url, options = {}) {
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` },
    ...options,
  });
  const payload = await res.json();
  if (!res.ok) {
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

function authState() {
  const stored = localStorage.getItem("authState");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (_) {
      localStorage.removeItem("authState");
    }
  }
  const state = {
    userId: crypto.randomUUID(),
    systemRole: "",
    projectRole: "viewer",
    projectRoles: {},
  };
  localStorage.setItem("authState", JSON.stringify(state));
  return state;
}

function saveAuthState(state) {
  localStorage.setItem("authState", JSON.stringify(state));
}

function getToken() {
  const state = authState();
  const payload = {
    userId: state.userId,
    systemRole: state.systemRole || null,
    projectRoles: state.projectRoles || {},
  };
  return btoa(JSON.stringify(payload));
}

function canSystem(role, required) {
  if (required === "admin") {
    return role === "admin" || role === "superadmin";
  }
  if (required === "director") {
    return role === "director" || role === "admin" || role === "superadmin";
  }
  return role === required;
}

function canProject(role, required) {
  if (!role) {
    return false;
  }
  return ROLE_RANK[role] >= ROLE_RANK[required];
}

function selectedProjectId() {
  return (
    projectSelects.report.value ||
    projectSelects.mapping.value ||
    projectSelects.jyda.value ||
    projectSelects.budget.value ||
    projectSelects.planning.value ||
    projectSelects.forecast.value ||
    projectSelects.history.value ||
    projectSelects.project.value ||
    ""
  );
}

function applyRoleUi() {
  const state = authState();
  document.querySelectorAll("[data-guard]").forEach((el) => {
    const guard = el.dataset.guard;
    let allowed = false;
    if (guard.startsWith("system:")) {
      const required = guard.split(":")[1];
      allowed = canSystem(state.systemRole, required);
    } else if (guard.startsWith("project:")) {
      const required = guard.split(":")[1];
      const selectedProject = selectedProjectId();
      if (state.systemRole === "admin" || state.systemRole === "superadmin") {
        allowed = true;
      } else if (selectedProject && state.projectRoles?.[selectedProject]) {
        allowed = canProject(state.projectRoles[selectedProject], required);
      }
    }

    if (allowed) {
      el.classList.remove("disabled");
      el.querySelectorAll("input, select, textarea, button").forEach((item) => {
        item.disabled = false;
      });
    } else {
      el.classList.add("disabled");
      el.querySelectorAll("input, select, textarea, button").forEach((item) => {
        item.disabled = true;
      });
    }
  });
}

function pageFromPath() {
  const path = window.location.pathname.replace("/", "");
  if (pages.includes(path)) {
    return path;
  }
  return "setup";
}

function pageGuard(page) {
  if (page === "setup") {
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
  const entries = projects.map((p) => ({
    label: `${p.name} ${p.customer ? `(${p.customer})` : ""}`.trim(),
    value: p.project_id,
  }));

  Object.values(projectSelects).forEach((select) => {
    select.innerHTML = "";
    select.appendChild(option("Valitse projekti", ""));
    entries.forEach((entry) => select.appendChild(option(entry.label, entry.value)));
  });

  const state = authState();
  knownProjectIds.forEach((id) => {
    if (!state.projectRoles[id]) {
      state.projectRoles[id] = state.projectRole || "viewer";
    }
  });
  saveAuthState(state);
  applyRoleUi();
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
  const selects = [mappingVersionSelect, mappingVersionActivateSelect];
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
    selects.forEach((select) => select.appendChild(option(label, v.mapping_version_id)));
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
    rows.push({
      title: `Suunnitelma (${p.status})`,
      time: new Date(p.event_time).toLocaleString("fi-FI"),
      detail: p.summary || p.observations || p.risks || p.decisions || "(ei tekstiä)",
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

projectSelects.project.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
  applyRoleUi();
});

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

projectSelects.planning.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
});

projectSelects.forecast.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
});

projectSelects.mapping.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
  await loadMappingVersions(e.target.value);
  applyRoleUi();
});

projectSelects.report.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
  applyRoleUi();
});

projectSelects.history.addEventListener("change", async (e) => {
  await loadLitteras(e.target.value);
  applyRoleUi();
});

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
    const costColumns = [mapping.labor, mapping.material, mapping.subcontract, mapping.rental, mapping.other].filter(Boolean);
    if (costColumns.length === 0) {
      throw new Error("Vähintään yksi kustannussarake pitää mapata.");
    }

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
    const csvText = outputRows.map((r) => r.map(csvEscape).join(";")).join("\n");
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

  const result = document.getElementById("planning-result");
  try {
    await fetchJson("/api/planning-events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Suunnitelma tallennettu.");
    planningForm.reset();
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

const forecastForm = document.getElementById("forecast-form");
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

  const result = document.getElementById("forecast-result");
  try {
    await fetchJson("/api/forecast-events", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    setHint(result, "Ennuste tallennettu.");
    forecastForm.reset();
  } catch (err) {
    setHint(result, err.message, true);
  }
});

document.getElementById("report-refresh").addEventListener("click", (e) => {
  e.preventDefault();
  const projectId = projectSelects.report.value;
  const litteraId = litteraSelects.report.value;
  if (!projectId || !litteraId) {
    reportOutput.textContent = "Valitse projekti ja tavoitearvio-littera.";
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
            .map((row) => `<div>${row.cost_type}: ${row.total}</div>`)
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

document.getElementById("history-refresh").addEventListener("click", (e) => {
  e.preventDefault();
  refreshHistory().catch((err) => {
    historyOutput.textContent = err.message;
  });
});

loadProjects().catch((err) => {
  historyOutput.textContent = err.message;
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
  state.projectRoles[projectId] = state.projectRole;
  saveAuthState(state);

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
      comment: "Ensimmäinen ennuste",
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

document.getElementById("demo-seed").addEventListener("click", () => {
  seedDemoData().catch((err) => {
    setHint(demoSeedResult, err.message, true);
  });
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
      const next = authState();
      next.systemRole = "admin";
      next.projectRole = "owner";
      knownProjectIds.forEach((id) => {
        next.projectRoles[id] = "owner";
      });
      saveAuthState(next);
      systemRoleSelect.value = "admin";
      projectRoleSelect.value = "owner";
      applyRoleUi();
      setHint(demoSeedResult, "Roolit asetettu: admin + owner.");
    }
  });
}

const state = authState();
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
    Digit4: "forecast",
    Digit5: "report",
    Digit6: "history",
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
