const baseUrl =
  process.env.BASE_URL ?? "https://refactored-train-x5xggp94wrxx2v7q9-3000.app.github.dev";
const roleSuffix = process.env.ROLE_SUFFIX ?? "a";
const pin = process.env.PIN ?? "1234";

const roles = [
  {
    code: "SITE_FOREMAN",
    username: `site.foreman.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ", "WORK_PHASE_WEEKLY_UPDATE_CREATE", "GHOST_ENTRY_CREATE", "CORRECTION_PROPOSE"],
    adminExpected: false
  },
  {
    code: "GENERAL_FOREMAN",
    username: `general.foreman.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ", "WORK_PHASE_WEEKLY_UPDATE_APPROVE", "GHOST_ENTRY_CREATE", "CORRECTION_PROPOSE"],
    adminExpected: false
  },
  {
    code: "PROJECT_MANAGER",
    username: `project.manager.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ", "BASELINE_LOCK", "CORRECTION_APPROVE_PM"],
    adminExpected: false
  },
  {
    code: "PRODUCTION_MANAGER",
    username: `production.manager.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ", "BASELINE_LOCK", "CORRECTION_APPROVE_FINAL"],
    adminExpected: false
  },
  {
    code: "PROCUREMENT",
    username: `procurement.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ"],
    adminExpected: false,
    alias: "hankinta"
  },
  {
    code: "EXEC_READONLY",
    username: `exec.readonly.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ"],
    adminExpected: false
  },
  {
    code: "ORG_ADMIN",
    username: `org.admin.${roleSuffix}`,
    expectedPermissions: ["REPORT_READ", "MEMBERS_MANAGE"],
    adminExpected: true
  },
  {
    code: "SELLER",
    username: `seller.${roleSuffix}`,
    expectedPermissions: ["SELLER_UI"],
    adminExpected: false,
    alias: "myyja (SaaS)"
  }
];

const workflowPages = [
  { path: "/ylataso", expect: "Ylataso" },
  { path: "/tyonohjaus", expect: "Tyonohjaus" },
  { path: "/suunnittelu", expect: "Suunnittelu" },
  { path: "/ennuste", expect: "Ennuste" },
  { path: "/loki", expect: "Loki" },
  { path: "/raportti", expect: "Raportti" },
  { path: "/tavoitearvio", expect: "Tavoitearvio" },
  { path: "/baseline", expect: "Baseline" }
];

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  const body = await response.json().catch(() => ({}));
  return { response, body };
};

const login = async (username) => {
  const { response } = await fetchJson(`${baseUrl}/api/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username, pin })
  });

  if (response.status !== 200) {
    throw new Error(`Login failed for ${username} (status ${response.status}).`);
  }

  const setCookie = response.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`Missing set-cookie for ${username}.`);
  }

  const cookie = setCookie.split(";")[0];
  return cookie;
};

const assertPermissions = (username, permissions, expected) => {
  const missing = expected.filter((code) => !permissions.includes(code));
  if (missing.length > 0) {
    throw new Error(`User ${username} missing permissions: ${missing.join(", ")}`);
  }
};

const checkAdmin = async (cookie, adminExpected, hasReportRead) => {
  const { response } = await fetchJson(`${baseUrl}/api/admin`, {
    headers: { cookie }
  });

  if (adminExpected && response.status !== 200) {
    throw new Error(`Expected admin access, got status ${response.status}.`);
  }

  if (!adminExpected && response.status !== 403) {
    throw new Error(`Expected admin forbidden, got status ${response.status}.`);
  }

  const pageResponse = await fetch(`${baseUrl}/admin`, { headers: { cookie }, redirect: "manual" });
  if (!hasReportRead) {
    if (pageResponse.status !== 307 && pageResponse.status !== 308) {
      throw new Error(`Expected /admin redirect for non-report role, got ${pageResponse.status}`);
    }
    const location = pageResponse.headers.get("location");
    if (location !== "/sales") {
      throw new Error(`Expected /admin -> /sales for non-report role, got ${location ?? "-"}`);
    }
    return;
  }

  const text = await pageResponse.text();
  if (adminExpected && !text.includes("Kayttajat, roolit")) {
    throw new Error("Admin page does not show expected content.");
  }
  if (!adminExpected && !text.includes("Ei oikeuksia admin-nakymiin")) {
    throw new Error("Non-admin page does not show permission error.");
  }
};

const checkWorkflowPages = async (cookie) => {
  for (const page of workflowPages) {
    const response = await fetch(`${baseUrl}${page.path}`, { headers: { cookie } });
    if (response.status !== 200) {
      throw new Error(`Page ${page.path} status ${response.status}`);
    }
    const text = await response.text();
    if (!text.includes(page.expect)) {
      throw new Error(`Page ${page.path} missing expected text: ${page.expect}`);
    }
  }
};

const run = async () => {
  console.log(`BASE_URL=${baseUrl}`);
  for (const role of roles) {
    const roleLabel = role.alias ? `${role.code} (${role.alias})` : role.code;
    console.log(`\nRole: ${roleLabel} (${role.username})`);

    const cookie = await login(role.username);
    const me = await fetchJson(`${baseUrl}/api/me`, { headers: { cookie } });
    if (me.response.status !== 200) {
      throw new Error(`GET /api/me failed for ${role.username} (${me.response.status})`);
    }
    const permissions = me.body?.user?.permissions ?? [];
    assertPermissions(role.username, permissions, role.expectedPermissions);

    const hasReportRead = role.expectedPermissions.includes("REPORT_READ");
    if (hasReportRead) {
      await checkWorkflowPages(cookie);
      const salesResponse = await fetch(`${baseUrl}/sales`, { headers: { cookie }, redirect: "manual" });
      if (salesResponse.status !== 307 && salesResponse.status !== 308) {
        throw new Error(`Expected /sales redirect for ${role.username}, got ${salesResponse.status}`);
      }
      const salesLocation = salesResponse.headers.get("location");
      if (salesLocation !== "/ylataso") {
        throw new Error(`Expected /sales -> /ylataso for ${role.username}, got ${salesLocation ?? "-"}`);
      }
    } else {
      const response = await fetch(`${baseUrl}/ylataso`, { headers: { cookie }, redirect: "manual" });
      if (response.status !== 307 && response.status !== 308) {
        throw new Error(`Expected /ylataso redirect for ${role.username}, got ${response.status}`);
      }
      const location = response.headers.get("location");
      if (location !== "/sales") {
        throw new Error(`Expected /ylataso -> /sales for ${role.username}, got ${location ?? "-"}`);
      }
      const salesPage = await fetch(`${baseUrl}/sales`, { headers: { cookie } });
      if (salesPage.status !== 200) {
        throw new Error(`Expected /sales 200 for ${role.username}, got ${salesPage.status}`);
      }
      const salesText = await salesPage.text();
      if (!salesText.includes("Myyjan nakyma")) {
        throw new Error("Sales page missing expected title.");
      }
    }

    await checkAdmin(cookie, role.adminExpected, hasReportRead);
    console.log("OK");
  }
};

run().catch((error) => {
  console.error("FAIL");
  console.error(error);
  process.exit(1);
});
