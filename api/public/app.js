const projectSelects = {
  project: document.getElementById("project-select"),
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
const systemRoleSelect = document.getElementById("system-role-select");
const projectRoleSelect = document.getElementById("project-role-select");
const ROLE_RANK = { viewer: 1, editor: 2, manager: 3, owner: 4 };
let knownProjectIds = [];
const pages = ["setup", "mapping", "planning", "forecast", "report", "history"];
const tabHint = document.getElementById("tab-hint");
const quickActions = document.querySelector(".quick-actions");

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
