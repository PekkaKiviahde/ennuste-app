const state = {
  token: localStorage.getItem('authToken'),
  user: null,
  organizations: [],
  projects: [],
  permissions: [],
  terms: {},
  currentOrgId: null,
  currentProjectId: null,
  workPhases: [],
  currentWorkPhase: null,
  activeView: 'work_phase',
  members: [],
  targetBatches: [],
  selvitettavat: [],
  corrections: [],
  projectReport: null,
  projectMainGroups: [],
  projectWeeklyEv: [],
  projectMonthlyWorkPhase: [],
  projectTopOverruns: [],
  projectLowestCpi: [],
  projectTopSelvitettavat: [],
  projectOverlap: [],
  reportPackages: [],
  reportPackagesMonth: '',
  reportPackagesQuery: '',
  litteras: [],
};

const elements = {
  loginView: document.getElementById('login-view'),
  mainView: document.getElementById('main-view'),
  loginUser: document.getElementById('login-user'),
  loginPin: document.getElementById('login-pin'),
  loginSubmit: document.getElementById('login-submit'),
  loginStatus: document.getElementById('login-status'),
  loginTitle: document.getElementById('login-title'),
  loginUserLabel: document.getElementById('login-user-label'),
  loginPinLabel: document.getElementById('login-pin-label'),
  loginUserError: document.getElementById('login-user-error'),
  loginPinError: document.getElementById('login-pin-error'),
  orgSelect: document.getElementById('org-select'),
  projectSelect: document.getElementById('project-select'),
  orgSelectLabel: document.getElementById('org-select-label'),
  projectSelectLabel: document.getElementById('project-select-label'),
  userDisplay: document.getElementById('user-display'),
  refreshProject: document.getElementById('refresh-project'),
  logout: document.getElementById('logout'),
  workPhaseListTitle: document.getElementById('work-phase-list-title'),
  workPhaseItems: document.getElementById('work-phase-items'),
  workPhaseFilter: document.getElementById('work-phase-filter'),
  workPhaseStateFilter: document.getElementById('work-phase-state-filter'),
  workPhaseCreateTitle: document.getElementById('work-phase-create-title'),
  workPhaseName: document.getElementById('work-phase-name'),
  workPhaseNameError: document.getElementById('work-phase-name-error'),
  workPhaseDescription: document.getElementById('work-phase-description'),
  workPhaseCreate: document.getElementById('work-phase-create'),
  workPhaseCreateStatus: document.getElementById('work-phase-create-status'),
  workPhaseDetail: document.getElementById('work-phase-detail-content'),
  tabWorkPhase: document.getElementById('tab-work-phase'),
  tabProject: document.getElementById('tab-project'),
  projectSummary: document.getElementById('project-summary'),
};

function t(key) {
  return state.terms[key]?.label || key;
}

function formatCurrency(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return new Intl.NumberFormat('fi-FI', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

function formatPercent(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return `${Number(value).toFixed(1)} %`;
}

function formatNumber(value) {
  if (value === null || value === undefined) {
    return '—';
  }
  return Number(value).toFixed(2);
}

async function fetchJSON(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  if (state.token) {
    headers.Authorization = `Bearer ${state.token}`;
  }
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'UNKNOWN' }));
    throw {
      code: error.error || 'REQUEST_FAILED',
      permission: error.permission,
      status: response.status,
      detail: error.detail,
    };
  }
  return response.json();
}

function setView(isLoggedIn) {
  if (isLoggedIn) {
    elements.loginView.classList.add('hidden');
    elements.mainView.classList.remove('hidden');
  } else {
    elements.loginView.classList.remove('hidden');
    elements.mainView.classList.add('hidden');
  }
}

function updateLoginTexts() {
  elements.loginTitle.textContent = t('ui.login.title');
  elements.loginUserLabel.textContent = t('ui.login.select_user');
  elements.loginPinLabel.textContent = t('ui.login.pin');
  elements.loginSubmit.textContent = t('ui.login.action');
  elements.loginStatus.textContent = '';
}

function updateTopbarTexts() {
  elements.orgSelectLabel.textContent = t('ui.org.select');
  elements.projectSelectLabel.textContent = t('ui.project.select');
  elements.refreshProject.textContent = t('ui.action.refresh');
  elements.logout.textContent = t('ui.action.logout');
  elements.workPhaseListTitle.textContent = t('ui.section.work_phases');
  elements.workPhaseCreateTitle.textContent = t('ui.section.create_work_phase');
  elements.workPhaseNameLabel = elements.workPhaseNameLabel || document.getElementById('work-phase-name-label');
  if (elements.workPhaseNameLabel) {
    elements.workPhaseNameLabel.textContent = t('ui.field.name');
  }
  elements.workPhaseDescriptionLabel = elements.workPhaseDescriptionLabel || document.getElementById('work-phase-description-label');
  if (elements.workPhaseDescriptionLabel) {
    elements.workPhaseDescriptionLabel.textContent = t('ui.field.description');
  }
  elements.workPhaseCreate.textContent = t('ui.action.create');
  elements.workPhaseFilter.placeholder = t('ui.action.filter');
  if (elements.workPhaseStateFilter.options.length >= 3) {
    elements.workPhaseStateFilter.options[0].textContent = t('ui.filter.all');
    elements.workPhaseStateFilter.options[1].textContent = t('ui.filter.setup');
    elements.workPhaseStateFilter.options[2].textContent = t('ui.filter.track');
  }
  if (elements.tabWorkPhase) {
    elements.tabWorkPhase.textContent = t('ui.tab.work_phase');
  }
  if (elements.tabProject) {
    elements.tabProject.textContent = t('ui.tab.project');
  }
}

function renderProjectSummary() {
  if (!state.projectReport) {
    elements.projectSummary.innerHTML = `<div class="empty">${t('ui.loading')}</div>`;
    return;
  }
  const report = state.projectReport;
  elements.projectSummary.innerHTML = `
    <div><strong>${t('ui.section.project_summary')}</strong></div>
    <div>${t('metric.bac')}: ${formatCurrency(report.bac_total)}</div>
    <div>${t('metric.ev')}: ${formatCurrency(report.ev_total)}</div>
    <div>${t('metric.ac')}: ${formatCurrency(report.ac_total)}</div>
    <div>${t('metric.ghost_open')}: ${formatCurrency(report.ghost_open_total)}</div>
    <div>${t('metric.ac_star')}: ${formatCurrency(report.ac_star_total)}</div>
    <div>${t('metric.cpi')}: ${formatNumber(report.cpi)}</div>
    <div>${t('term.selvitettavat')}: ${formatCurrency(report.unmapped_actual_total)}</div>
  `;
}

function getPhaseState(phase) {
  return phase.latest_baseline_id ? 'TRACK' : 'SETUP';
}

function renderWorkPhaseList() {
  const filterText = elements.workPhaseFilter.value.toLowerCase();
  const stateFilter = elements.workPhaseStateFilter.value;
  const filtered = state.workPhases.filter((phase) => {
    const matchesText = phase.name.toLowerCase().includes(filterText);
    const status = getPhaseState(phase);
    const matchesState = stateFilter === 'ALL' || stateFilter === status;
    return matchesText && matchesState;
  });

  if (filtered.length === 0) {
    elements.workPhaseItems.innerHTML = `<div class="empty">${t('ui.empty.work_phases')}</div>`;
    return;
  }

  elements.workPhaseItems.innerHTML = filtered
    .map((phase) => {
      const status = getPhaseState(phase);
      const badgeClass = status === 'TRACK' ? 'track' : 'setup';
      const isActive = state.currentWorkPhase?.work_phase_id === phase.work_phase_id;
      return `
        <div class="list-item ${isActive ? 'active' : ''}" data-id="${phase.work_phase_id}">
          <div><strong>${phase.name}</strong></div>
          <div class="badge ${badgeClass}">${t(`ui.work_phase.state.${status.toLowerCase()}`)}</div>
          <div class="kpi-line">${t('metric.bac')}: ${phase.latest_baseline_id ? formatCurrency(phase.bac_total) : '—'}</div>
          <div class="kpi-line">${t('metric.cpi')}: ${phase.latest_baseline_id ? formatNumber(phase.cpi) : '—'}</div>
        </div>
      `;
    })
    .join('');

  Array.from(elements.workPhaseItems.querySelectorAll('.list-item')).forEach((item) => {
    item.addEventListener('click', () => {
      const id = item.getAttribute('data-id');
      selectWorkPhase(id);
    });
  });
}

function hasPermission(code) {
  return state.permissions.includes(code);
}

function permissionTooltip(code) {
  if (hasPermission(code)) {
    return '';
  }
  return `${t('ui.permission.denied')} (${code})`;
}

function formatErrorMessage(error) {
  if (!error || !error.code) {
    return `${t('ui.status.error')}`;
  }
  if (error.code === 'NO_PERMISSION') {
    return `${t('ui.error.no_permission')} (${error.permission || ''})`.trim();
  }
  if (error.code === 'BASELINE_REQUIRED') {
    return t('ui.error.baseline_required');
  }
  if (error.code === 'BASELINE_ALREADY_LOCKED') {
    return t('ui.error.baseline_locked');
  }
  if (error.code === 'INVALID_CREDENTIALS' || error.code === 'INVALID_USER') {
    return t('ui.error.invalid_credentials');
  }
  if (error.code === 'RATE_LIMITED') {
    return t('ui.error.rate_limited');
  }
  return `${t('ui.status.error')}: ${error.code}`;
}

function renderWorkPhaseView() {
  if (!state.currentWorkPhase) {
    return `<div class="empty">${t('ui.empty.select_work_phase')}</div>`;
  }
  const phase = state.currentWorkPhase;
  const status = getPhaseState(phase);
  const badgeClass = status === 'TRACK' ? 'track' : 'setup';

  const kpiCards = [
    { key: 'metric.bac', value: formatCurrency(phase.bac_total) },
    { key: 'metric.percent_complete', value: formatPercent(phase.percent_complete) },
    { key: 'metric.ev', value: formatCurrency(phase.ev_value) },
    { key: 'metric.ac', value: formatCurrency(phase.ac_total) },
    { key: 'metric.ghost_open', value: formatCurrency(phase.ghost_open_total) },
    { key: 'metric.ac_star', value: formatCurrency(phase.ac_star_total) },
    { key: 'metric.cpi', value: formatNumber(phase.cpi) },
  ];

  const kpiContent = phase.latest_baseline_id
    ? kpiCards
        .map((card) => `
          <div class="kpi-card">
            <div class="kpi-label">${t(card.key)}</div>
            <div class="kpi-value">${card.value}</div>
          </div>
        `)
        .join('')
    : `<div class="empty">${t('ui.kpi.lock_baseline_first')}</div>`;

  const membersTable = state.members.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.member_type')}</th>
            <th>${t('ui.field.littera')}</th>
            <th>${t('ui.field.item_code')}</th>
            <th>${t('ui.field.note')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.members
            .map(
              (member) => `
            <tr>
              <td>${member.member_type}</td>
              <td>${member.littera_code || '—'} ${member.littera_title || ''}</td>
              <td>${member.item_code || '—'}</td>
              <td>${member.note || ''}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.members')}</div>`;

  const correctionsRows = state.corrections.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.work_phase')}</th>
            <th>${t('ui.field.item_code')}</th>
            <th>${t('ui.field.status')}</th>
            <th>${t('ui.field.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.corrections
            .map((correction) => {
              const canPm = hasPermission('CORRECTION_APPROVE_PM');
              const canFinal = hasPermission('CORRECTION_APPROVE_FINAL');
              const buttons = `
                <button data-action="approve-pm" data-id="${correction.correction_id}" ${!canPm ? 'disabled' : ''} title="${permissionTooltip('CORRECTION_APPROVE_PM')}">${t('ui.action.approve_pm')}</button>
                <button data-action="approve-final" data-id="${correction.correction_id}" ${!canFinal ? 'disabled' : ''} title="${permissionTooltip('CORRECTION_APPROVE_FINAL')}">${t('ui.action.approve_final')}</button>
                <button data-action="reject" data-id="${correction.correction_id}" ${!canPm && !canFinal ? 'disabled' : ''} title="${permissionTooltip('CORRECTION_APPROVE_PM')}">${t('ui.action.reject')}</button>
              `;
              return `
                <tr>
                  <td>${correction.work_phase_name || ''}</td>
                  <td>${correction.evidence_item_code || ''}</td>
                  <td>${correction.status}</td>
                  <td>${buttons}</td>
                </tr>
              `;
            })
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.corrections')}</div>`;

  const selvitettavatRows = state.selvitettavat.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.littera')}</th>
            <th>${t('metric.ac')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.selvitettavat
            .map(
              (row) => `
            <tr>
              <td>${row.littera_code || ''} ${row.littera_title || ''}</td>
              <td>${formatCurrency(row.actual_total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.selvitettavat')}</div>`;

  return `
    <div class="section">
      <h2>${phase.work_phase_name}</h2>
      <div class="badge ${badgeClass}">${t(`ui.work_phase.state.${status.toLowerCase()}`)}</div>
    </div>

    <div class="section">
      <h3>${t('ui.section.kpi')}</h3>
      <div class="kpi-grid">${kpiContent}</div>
    </div>

    <div class="section">
      <h3>${t('ui.section.members')}</h3>
      ${membersTable}
    </div>

    ${status === 'SETUP' ? renderSetupSection(phase) : renderTrackSection(phase)}

    <div class="section">
      <h3>${t('term.selvitettavat')}</h3>
      ${selvitettavatRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.corrections_queue')}</h3>
      ${correctionsRows}
    </div>
  `;
}

function renderProjectView() {
  if (!state.currentProjectId) {
    return `<div class="empty">${t('ui.empty.project_reports')}</div>`;
  }

  const mainGroupRows = state.projectMainGroups.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.main_group')}</th>
            <th>${t('ui.field.budget_total')}</th>
            <th>${t('ui.field.actual_total')}</th>
            <th>${t('ui.field.variance_eur')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectMainGroups
            .map(
              (row) => `
            <tr>
              <td>${row.main_group_code}</td>
              <td>${formatCurrency(row.budget_total)}</td>
              <td>${formatCurrency(row.actual_total)}</td>
              <td>${formatCurrency(row.variance_eur)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.main_groups')}</div>`;

  const weeklyRows = state.projectWeeklyEv.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.week_ending')}</th>
            <th>${t('ui.field.work_phases_updated')}</th>
            <th>${t('metric.ev')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectWeeklyEv
            .map(
              (row) => `
            <tr>
              <td>${row.week_ending}</td>
              <td>${row.work_phases_updated}</td>
              <td>${formatCurrency(row.ev_total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.weekly_ev')}</div>`;

  const monthlyRows = state.projectMonthlyWorkPhase.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.month_key')}</th>
            <th>${t('ui.field.work_phase')}</th>
            <th>${t('ui.field.target_total')}</th>
            <th>${t('ui.field.actual_total')}</th>
            <th>${t('ui.field.forecast_total')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectMonthlyWorkPhase
            .map(
              (row) => `
            <tr>
              <td>${row.month_key}</td>
              <td>${row.work_phase_name}</td>
              <td>${formatCurrency(row.target_total)}</td>
              <td>${formatCurrency(row.actual_total)}</td>
              <td>${formatCurrency(row.forecast_total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.monthly_work_phase')}</div>`;

  const topOverrunsRows = state.projectTopOverruns.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.work_phase')}</th>
            <th>${t('metric.bac')}</th>
            <th>${t('metric.percent_complete')}</th>
            <th>${t('metric.ev')}</th>
            <th>${t('metric.ac_star')}</th>
            <th>${t('metric.cpi')}</th>
            <th>${t('ui.field.overrun_eur')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectTopOverruns
            .map(
              (row) => `
            <tr>
              <td>${row.work_phase_name}</td>
              <td>${formatCurrency(row.bac_total)}</td>
              <td>${formatPercent(row.percent_complete)}</td>
              <td>${formatCurrency(row.ev_value)}</td>
              <td>${formatCurrency(row.ac_star_total)}</td>
              <td>${formatNumber(row.cpi)}</td>
              <td>${formatCurrency(row.overrun_eur)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.top_overruns')}</div>`;

  const lowestCpiRows = state.projectLowestCpi.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.work_phase')}</th>
            <th>${t('metric.bac')}</th>
            <th>${t('metric.percent_complete')}</th>
            <th>${t('metric.ev')}</th>
            <th>${t('metric.ac_star')}</th>
            <th>${t('metric.cpi')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectLowestCpi
            .map(
              (row) => `
            <tr>
              <td>${row.work_phase_name}</td>
              <td>${formatCurrency(row.bac_total)}</td>
              <td>${formatPercent(row.percent_complete)}</td>
              <td>${formatCurrency(row.ev_value)}</td>
              <td>${formatCurrency(row.ac_star_total)}</td>
              <td>${formatNumber(row.cpi)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.lowest_cpi')}</div>`;

  const topSelvitettavatRows = state.projectTopSelvitettavat.length
    ? `
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.littera')}</th>
            <th>${t('metric.ac')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectTopSelvitettavat
            .map(
              (row) => `
            <tr>
              <td>${row.littera_code || ''} ${row.littera_title || ''}</td>
              <td>${formatCurrency(row.actual_total)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
      <div class="tooltip">${t('ui.note.selvitettavat_detail')}</div>
    `
    : `<div class="empty">${t('ui.empty.selvitettavat')}</div>`;

  const overlapWarning = state.projectOverlap.length
    ? `
      <div class="warning">${t('ui.warning.overlap')}</div>
      <table class="table">
        <thead>
          <tr>
            <th>${t('ui.field.littera')}</th>
            <th>${t('ui.field.work_phase_count')}</th>
            <th>${t('ui.field.work_phase_ids')}</th>
          </tr>
        </thead>
        <tbody>
          ${state.projectOverlap
            .map(
              (row) => `
            <tr>
              <td>${row.littera_code} ${row.littera_title || ''}</td>
              <td>${row.work_phase_count}</td>
              <td>${(row.work_phase_ids || []).join(', ')}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : '';

  const monthValue = state.reportPackagesMonth || defaultReportMonth();
  const filteredReportPackages = state.reportPackagesQuery
    ? state.reportPackages.filter((pkg) =>
        String(pkg.checksum || '')
          .toLowerCase()
          .includes(state.reportPackagesQuery.toLowerCase())
      )
    : state.reportPackages;
  const reportPackages = filteredReportPackages.length
    ? `
      <table>
        <thead>
          <tr>
            <th>${t('ui.field.month_key')}</th>
            <th>${t('ui.field.sent_at')}</th>
            <th>${t('ui.field.artifact_type')}</th>
            <th>${t('ui.field.checksum')}</th>
            <th>${t('ui.field.actions')}</th>
          </tr>
        </thead>
        <tbody>
          ${filteredReportPackages
            .map(
              (pkg) => `
            <tr>
              <td>${pkg.month}</td>
              <td>${pkg.sent_at ? new Date(pkg.sent_at).toLocaleString('fi-FI') : '—'}</td>
              <td>${pkg.artifact_type}</td>
              <td class="mono">${pkg.checksum || '—'}</td>
              <td>
                <a href="/api/report-packages/${pkg.package_id}/download" target="_blank" rel="noopener">
                  ${t('ui.action.open_report_metadata')}
                </a>
              </td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `
    : `<div class="empty">${t('ui.empty.report_packages')}</div>`;

  const summary = state.projectReport
    ? `
      <div class="section">
        <h3>${t('ui.section.project_summary')}</h3>
        <div>${t('metric.bac')}: ${formatCurrency(state.projectReport.bac_total)}</div>
        <div>${t('metric.ev')}: ${formatCurrency(state.projectReport.ev_total)}</div>
        <div>${t('metric.ac')}: ${formatCurrency(state.projectReport.ac_total)}</div>
        <div>${t('metric.ghost_open')}: ${formatCurrency(state.projectReport.ghost_open_total)}</div>
        <div>${t('metric.ac_star')}: ${formatCurrency(state.projectReport.ac_star_total)}</div>
        <div>${t('metric.cpi')}: ${formatNumber(state.projectReport.cpi)}</div>
      </div>
    `
    : `<div class="empty">${t('ui.loading')}</div>`;

  return `
    <div class="section">
      <h2>${t('ui.section.project_reports')}</h2>
    </div>
    ${summary}

    <div class="section">
      <h3>${t('ui.section.main_groups')}</h3>
      ${mainGroupRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.weekly_ev')}</h3>
      ${weeklyRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.monthly_work_phase')}</h3>
      ${monthlyRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.report_packages')}</h3>
      <div class="form-row">
        <label>${t('ui.field.month_key')}</label>
        <input id="report-packages-month" type="month" value="${monthValue}" />
      </div>
      <div class="form-row">
        <label>${t('ui.field.search')}</label>
        <input
          id="report-packages-filter"
          type="search"
          value="${state.reportPackagesQuery}"
          placeholder="${t('ui.field.checksum')}"
        />
      </div>
      <button id="report-packages-load" type="button">${t('ui.action.load_report_packages')}</button>
      <div class="status" id="report-packages-status"></div>
      ${reportPackages}
    </div>

    <div class="section">
      <h3>${t('ui.section.top_overruns')}</h3>
      ${topOverrunsRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.lowest_cpi')}</h3>
      ${lowestCpiRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.top_selvitettavat')}</h3>
      ${topSelvitettavatRows}
    </div>

    <div class="section">
      <h3>${t('ui.section.overlap')}</h3>
      ${overlapWarning || `<div class="empty">${t('ui.empty.overlap')}</div>`}
    </div>
  `;
}

function renderDetail() {
  elements.tabWorkPhase.classList.toggle('active', state.activeView === 'work_phase');
  elements.tabProject.classList.toggle('active', state.activeView === 'project');

  elements.workPhaseDetail.innerHTML =
    state.activeView === 'project' ? renderProjectView() : renderWorkPhaseView();

  if (state.activeView === 'work_phase') {
    bindDetailActions();
  } else if (state.activeView === 'project') {
    bindProjectActions();
  }
}

function renderSetupSection(phase) {
  const canMemberAdd = hasPermission('WORK_PHASE_MEMBER_CREATE');
  const canCreateVersion = hasPermission('WORK_PHASE_VERSION_CREATE');
  const batchOptions = state.targetBatches
    .map((batch) => `<option value="${batch.import_batch_id}">${new Date(batch.imported_at).toLocaleDateString('fi-FI')}</option>`)
    .join('');
  const canLock = hasPermission('BASELINE_LOCK');

  const litteraOptions = state.litteras
    .map((littera) => `<option value="${littera.littera_id}">${littera.code} ${littera.title || ''}</option>`)
    .join('');

  return `
    <div class="section">
      <h3>${t('ui.section.members_add')}</h3>
      <div class="form-row">
        <label>${t('ui.field.member_type')}</label>
        <select id="member-type">
          <option value="LITTERA">${t('ui.member.littera')}</option>
          <option value="ITEM">${t('ui.member.item')}</option>
        </select>
      </div>
      <div class="form-row" id="member-littera-row">
        <label>${t('ui.field.littera')}</label>
        <select id="member-littera">${litteraOptions}</select>
        <div class="inline-error" id="member-littera-error"></div>
      </div>
      <div class="form-row hidden" id="member-item-code-row">
        <label>${t('ui.field.item_code')}</label>
        <input id="member-item-code" type="text" />
        <div class="inline-error" id="member-item-code-error"></div>
      </div>
      <div class="form-row hidden" id="member-item-desc-row">
        <label>${t('ui.field.item_desc')}</label>
        <input id="member-item-desc" type="text" />
      </div>
      <div class="form-row">
        <label>${t('ui.field.note')}</label>
        <input id="member-note" type="text" />
      </div>
      <button id="member-add" type="button" ${!canMemberAdd ? 'disabled' : ''} title="${permissionTooltip('WORK_PHASE_MEMBER_CREATE')}">${t('ui.action.add_member')}</button>
      <div class="status" id="member-status"></div>
    </div>

    <div class="section">
      <h3>${t('ui.section.lock_baseline')}</h3>
      <div class="form-row">
        <label>${t('ui.field.target_batch')}</label>
        <select id="baseline-batch">${batchOptions}</select>
        <div class="inline-error" id="baseline-batch-error"></div>
      </div>
      <div class="form-row">
        <label>${t('ui.field.note')}</label>
        <input id="baseline-notes" type="text" />
      </div>
      <button id="baseline-lock" type="button" ${!canLock ? 'disabled' : ''} title="${permissionTooltip('BASELINE_LOCK')}">${t('ui.action.lock_baseline')}</button>
      <div class="status" id="baseline-status"></div>
    </div>

    <div class="section">
      <h3>${t('ui.section.version')}</h3>
      <button id="create-version" type="button" ${!canCreateVersion ? 'disabled' : ''} title="${permissionTooltip('WORK_PHASE_VERSION_CREATE')}">${t('ui.action.create_version')}</button>
      <div class="status" id="version-status"></div>
    </div>
  `;
}

function renderTrackSection(phase) {
  const canWeekly = hasPermission('WORK_PHASE_WEEKLY_UPDATE_CREATE');
  const canGhost = hasPermission('GHOST_ENTRY_CREATE');
  const canPropose = hasPermission('CORRECTION_PROPOSE');

  return `
    <div class="section">
      <h3>${t('ui.section.weekly_update')}</h3>
      <div class="form-row">
        <label>${t('ui.field.week_ending')}</label>
        <input id="weekly-week-ending" type="date" />
        <div class="inline-error" id="weekly-week-ending-error"></div>
      </div>
      <div class="form-row">
        <label>${t('metric.percent_complete')}</label>
        <input id="weekly-percent" type="number" min="0" max="100" step="0.1" />
        <div class="inline-error" id="weekly-percent-error"></div>
      </div>
      <div class="form-row">
        <label>${t('ui.field.progress_notes')}</label>
        <textarea id="weekly-progress" rows="2"></textarea>
      </div>
      <div class="form-row">
        <label>${t('ui.field.risks')}</label>
        <textarea id="weekly-risks" rows="2"></textarea>
      </div>
      <button id="weekly-submit" type="button" ${!canWeekly ? 'disabled' : ''} title="${permissionTooltip('WORK_PHASE_WEEKLY_UPDATE_CREATE')}">${t('ui.action.weekly_update')}</button>
      <div class="status" id="weekly-status"></div>
    </div>

    <div class="section">
      <h3>${t('ui.section.ghost')}</h3>
      <div class="form-row">
        <label>${t('ui.field.week_ending')}</label>
        <input id="ghost-week-ending" type="date" />
        <div class="inline-error" id="ghost-week-ending-error"></div>
      </div>
      <div class="form-row">
        <label>${t('ui.field.cost_type')}</label>
        <select id="ghost-cost-type">
          <option value="LABOR">LABOR</option>
          <option value="MATERIAL">MATERIAL</option>
          <option value="SUBCONTRACT">SUBCONTRACT</option>
          <option value="RENTAL">RENTAL</option>
          <option value="OTHER">OTHER</option>
        </select>
      </div>
      <div class="form-row">
        <label>${t('ui.field.amount')}</label>
        <input id="ghost-amount" type="number" min="0" step="0.01" />
        <div class="inline-error" id="ghost-amount-error"></div>
      </div>
      <div class="form-row">
        <label>${t('ui.field.description')}</label>
        <input id="ghost-description" type="text" />
      </div>
      <button id="ghost-submit" type="button" ${!canGhost ? 'disabled' : ''} title="${permissionTooltip('GHOST_ENTRY_CREATE')}">${t('ui.action.add_ghost')}</button>
      <div class="status" id="ghost-status"></div>
    </div>

    <div class="section">
      <h3>${t('ui.section.corrections')}</h3>
      <div class="form-row">
        <label>${t('ui.field.item_code')}</label>
        <input id="correction-item-code" type="text" />
        <div class="inline-error" id="correction-item-code-error"></div>
      </div>
      <div class="form-row">
        <label>${t('ui.field.note')}</label>
        <input id="correction-notes" type="text" />
      </div>
      <button id="correction-submit" type="button" ${!canPropose ? 'disabled' : ''} title="${permissionTooltip('CORRECTION_PROPOSE')}">${t('ui.action.propose_correction')}</button>
      <div class="status" id="correction-status"></div>
    </div>
  `;
}

function bindDetailActions() {
  const memberTypeSelect = document.getElementById('member-type');
  if (memberTypeSelect) {
    const litteraRow = document.getElementById('member-littera-row');
    const itemCodeRow = document.getElementById('member-item-code-row');
    const itemDescRow = document.getElementById('member-item-desc-row');
    memberTypeSelect.addEventListener('change', () => {
      const type = memberTypeSelect.value;
      litteraRow.classList.toggle('hidden', type !== 'LITTERA');
      itemCodeRow.classList.toggle('hidden', type !== 'ITEM');
      itemDescRow.classList.toggle('hidden', type !== 'ITEM');
    });
  }

  const memberAdd = document.getElementById('member-add');
  if (memberAdd) {
    memberAdd.addEventListener('click', async () => {
      const type = document.getElementById('member-type').value;
      const status = document.getElementById('member-status');
      const litteraId = document.getElementById('member-littera')?.value;
      const itemCode = document.getElementById('member-item-code')?.value.trim();
      const itemDesc = document.getElementById('member-item-desc')?.value.trim();
      const note = document.getElementById('member-note')?.value.trim();
      document.getElementById('member-littera-error').textContent = '';
      document.getElementById('member-item-code-error').textContent = '';
      if (type === 'LITTERA' && !litteraId) {
        document.getElementById('member-littera-error').textContent = t('ui.error.required');
        return;
      }
      if (type === 'ITEM' && !itemCode) {
        document.getElementById('member-item-code-error').textContent = t('ui.error.required');
        return;
      }
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/members`, {
          method: 'POST',
          body: JSON.stringify({
            memberType: type,
            litteraId: type === 'LITTERA' ? litteraId : null,
            itemCode: type === 'ITEM' ? itemCode : null,
            itemDesc: type === 'ITEM' ? itemDesc : null,
            note,
          }),
        });
        status.textContent = t('ui.status.saved');
        await refreshCurrentWorkPhase();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  const baselineLock = document.getElementById('baseline-lock');
  if (baselineLock) {
    baselineLock.addEventListener('click', async () => {
      const batchId = document.getElementById('baseline-batch')?.value;
      const notes = document.getElementById('baseline-notes')?.value.trim();
      const status = document.getElementById('baseline-status');
      document.getElementById('baseline-batch-error').textContent = '';
      if (!batchId) {
        document.getElementById('baseline-batch-error').textContent = t('ui.error.required');
        return;
      }
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/lock-baseline`, {
          method: 'POST',
          body: JSON.stringify({ targetImportBatchId: batchId, notes }),
        });
        status.textContent = t('ui.status.saved');
        await refreshProjectData();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  const createVersion = document.getElementById('create-version');
  if (createVersion) {
    createVersion.addEventListener('click', async () => {
      const status = document.getElementById('version-status');
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/version`, {
          method: 'POST',
          body: JSON.stringify({ notes: 'New version via UI' }),
        });
        status.textContent = t('ui.status.saved');
        await refreshCurrentWorkPhase();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  const weeklySubmit = document.getElementById('weekly-submit');
  if (weeklySubmit) {
    const today = new Date().toISOString().split('T')[0];
    const weeklyDate = document.getElementById('weekly-week-ending');
    if (weeklyDate && !weeklyDate.value) {
      weeklyDate.value = today;
    }
    weeklySubmit.addEventListener('click', async () => {
      const weekEnding = document.getElementById('weekly-week-ending').value;
      const percent = document.getElementById('weekly-percent').value;
      const progress = document.getElementById('weekly-progress').value.trim();
      const risks = document.getElementById('weekly-risks').value.trim();
      const status = document.getElementById('weekly-status');
      document.getElementById('weekly-week-ending-error').textContent = '';
      document.getElementById('weekly-percent-error').textContent = '';
      if (!weekEnding) {
        document.getElementById('weekly-week-ending-error').textContent = t('ui.error.required');
        return;
      }
      if (!percent) {
        document.getElementById('weekly-percent-error').textContent = t('ui.error.required');
        return;
      }
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/weekly-update`, {
          method: 'POST',
          body: JSON.stringify({
            weekEnding,
            percentComplete: percent,
            progressNotes: progress,
            risks,
          }),
        });
        status.textContent = t('ui.status.saved');
        await refreshProjectData();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  const ghostSubmit = document.getElementById('ghost-submit');
  if (ghostSubmit) {
    const today = new Date().toISOString().split('T')[0];
    const ghostDate = document.getElementById('ghost-week-ending');
    if (ghostDate && !ghostDate.value) {
      ghostDate.value = today;
    }
    ghostSubmit.addEventListener('click', async () => {
      const weekEnding = document.getElementById('ghost-week-ending').value;
      const costType = document.getElementById('ghost-cost-type').value;
      const amount = document.getElementById('ghost-amount').value;
      const description = document.getElementById('ghost-description').value.trim();
      const status = document.getElementById('ghost-status');
      document.getElementById('ghost-week-ending-error').textContent = '';
      document.getElementById('ghost-amount-error').textContent = '';
      if (!weekEnding) {
        document.getElementById('ghost-week-ending-error').textContent = t('ui.error.required');
        return;
      }
      if (!amount) {
        document.getElementById('ghost-amount-error').textContent = t('ui.error.required');
        return;
      }
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/ghost`, {
          method: 'POST',
          body: JSON.stringify({
            weekEnding,
            costType,
            amount,
            description,
          }),
        });
        status.textContent = t('ui.status.saved');
        await refreshProjectData();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  const correctionSubmit = document.getElementById('correction-submit');
  if (correctionSubmit) {
    correctionSubmit.addEventListener('click', async () => {
      const itemCode = document.getElementById('correction-item-code').value.trim();
      const notes = document.getElementById('correction-notes').value.trim();
      const status = document.getElementById('correction-status');
      document.getElementById('correction-item-code-error').textContent = '';
      if (!itemCode) {
        document.getElementById('correction-item-code-error').textContent = t('ui.error.required');
        return;
      }
      status.textContent = t('ui.status.saving');
      try {
        await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/corrections/propose`, {
          method: 'POST',
          body: JSON.stringify({ itemCode, notes }),
        });
        status.textContent = t('ui.status.saved');
        await refreshProjectData();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  }

  document.querySelectorAll('[data-action]')?.forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.getAttribute('data-action');
      const id = button.getAttribute('data-id');
      const status = document.getElementById('correction-status') || { textContent: '' };
      status.textContent = t('ui.status.saving');
      try {
        if (action === 'approve-pm') {
          await fetchJSON(`/api/corrections/${id}/approve-pm`, { method: 'POST', body: JSON.stringify({}) });
        } else if (action === 'approve-final') {
          await fetchJSON(`/api/corrections/${id}/approve-final`, { method: 'POST', body: JSON.stringify({}) });
        } else if (action === 'reject') {
          await fetchJSON(`/api/corrections/${id}/reject`, { method: 'POST', body: JSON.stringify({}) });
        }
        status.textContent = t('ui.status.saved');
        await refreshProjectData();
      } catch (error) {
        status.textContent = formatErrorMessage(error);
      }
    });
  });
}

async function loadDictionary() {
  const response = await fetchJSON(`/api/terminology/dictionary?locale=fi&fallback=en`);
  const terms = {};
  response.terms.forEach((term) => {
    terms[term.term_key] = term;
  });
  state.terms = terms;
  updateLoginTexts();
  updateTopbarTexts();
}

async function loadPublicDictionary() {
  const response = await fetchJSON('/api/terminology/dictionary?locale=fi&fallback=en');
  const terms = {};
  response.terms.forEach((term) => {
    terms[term.term_key] = term;
  });
  state.terms = terms;
  updateLoginTexts();
  updateTopbarTexts();
}

async function loadOrganizations() {
  const response = await fetchJSON('/api/organizations');
  state.organizations = response.organizations;
  if (!state.currentOrgId && state.organizations.length > 0) {
    state.currentOrgId = state.organizations[0].organization_id;
  }
  elements.orgSelect.innerHTML = state.organizations
    .map((org) => `<option value="${org.organization_id}">${org.name}</option>`)
    .join('');
  elements.orgSelect.value = state.currentOrgId;
}

async function loadProjects() {
  if (!state.currentOrgId) {
    return;
  }
  const response = await fetchJSON(`/api/projects`);
  state.projects = response.projects;
  elements.projectSelect.innerHTML = state.projects
    .map((project) => `<option value="${project.project_id}">${project.name}</option>`)
    .join('');
  if (!state.currentProjectId && state.projects.length > 0) {
    state.currentProjectId = state.projects[0].project_id;
  }
  elements.projectSelect.value = state.currentProjectId;
}

async function refreshProjectData() {
  if (!state.currentProjectId) {
    return;
  }
  elements.projectSummary.innerHTML = `<div class="empty">${t('ui.loading')}</div>`;
  elements.workPhaseItems.innerHTML = `<div class="empty">${t('ui.loading')}</div>`;
  const [
    permissions,
    report,
    reportMainGroups,
    reportWeeklyEv,
    reportMonthlyWorkPhase,
    reportTopOverruns,
    reportLowestCpi,
    reportTopSelvitettavat,
    reportOverlap,
    workPhases,
    batches,
    selvitettavat,
    corrections,
    litteras,
  ] = await Promise.all([
    fetchJSON(`/api/projects/${state.currentProjectId}/permissions`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/project-current`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/main-group-current`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/weekly-ev`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/monthly-work-phase`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/top-overruns`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/lowest-cpi`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/top-selvitettavat`),
    fetchJSON(`/api/projects/${state.currentProjectId}/reports/overlap`),
    fetchJSON(`/api/projects/${state.currentProjectId}/work-phases`),
    fetchJSON(`/api/projects/${state.currentProjectId}/target-batches`),
    fetchJSON(`/api/projects/${state.currentProjectId}/selvitettavat`),
    fetchJSON(`/api/projects/${state.currentProjectId}/corrections/queue`),
    fetchJSON(`/api/projects/${state.currentProjectId}/litteras`),
  ]);
  state.permissions = permissions.permissions;
  state.projectReport = report.report;
  state.projectMainGroups = reportMainGroups.rows;
  state.projectWeeklyEv = reportWeeklyEv.rows;
  state.projectMonthlyWorkPhase = reportMonthlyWorkPhase.rows;
  state.projectTopOverruns = reportTopOverruns.rows;
  state.projectLowestCpi = reportLowestCpi.rows;
  state.projectTopSelvitettavat = reportTopSelvitettavat.rows;
  state.projectOverlap = reportOverlap.rows;
  state.reportPackages = [];
  state.reportPackagesMonth = defaultReportMonth();
  state.reportPackagesQuery = '';
  state.workPhases = workPhases.workPhases;
  state.targetBatches = batches.batches;
  state.selvitettavat = selvitettavat.selvitettavat;
  state.corrections = corrections.corrections;
  state.litteras = litteras.litteras;
  if (elements.workPhaseCreate) {
    const canCreatePhase = hasPermission('WORK_PHASE_CREATE');
    elements.workPhaseCreate.disabled = !canCreatePhase;
    elements.workPhaseCreate.title = permissionTooltip('WORK_PHASE_CREATE');
  }
  renderProjectSummary();
  renderWorkPhaseList();
  await refreshCurrentWorkPhase();
}

function defaultReportMonth() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  return `${yyyy}-${mm}`;
}

async function loadReportPackages() {
  if (!state.currentProjectId) {
    return;
  }
  const status = document.getElementById('report-packages-status');
  const input = document.getElementById('report-packages-month');
  const month = input?.value;
  if (!month) {
    if (status) {
      status.textContent = t('ui.error.required');
    }
    return;
  }
  state.reportPackagesMonth = month;
  if (status) {
    status.textContent = t('ui.status.loading');
  }
  try {
    const packages = await fetchJSON(
      `/api/projects/${state.currentProjectId}/months/${month}/report-packages`
    );
    state.reportPackages = packages;
    if (status) {
      status.textContent = t('ui.status.loaded');
    }
    renderDetail();
  } catch (error) {
    state.reportPackages = [];
    if (status) {
      status.textContent = formatErrorMessage(error);
    }
    renderDetail();
  }
}

function bindProjectActions() {
  const loadButton = document.getElementById('report-packages-load');
  if (loadButton) {
    loadButton.addEventListener('click', async () => {
      await loadReportPackages();
    });
  }
  const filterInput = document.getElementById('report-packages-filter');
  if (filterInput) {
    filterInput.addEventListener('input', () => {
      state.reportPackagesQuery = filterInput.value.trim();
      renderDetail();
    });
  }
}

async function refreshCurrentWorkPhase() {
  if (!state.currentWorkPhase) {
    renderDetail();
    return;
  }
  const detail = await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}`);
  state.currentWorkPhase = detail.workPhase;
  const members = await fetchJSON(`/api/work-phases/${state.currentWorkPhase.work_phase_id}/members`);
  state.members = members.members;
  renderWorkPhaseList();
  renderDetail();
}

async function selectWorkPhase(id) {
  const match = state.workPhases.find((phase) => phase.work_phase_id === id);
  if (!match) {
    return;
  }
  state.activeView = 'work_phase';
  state.currentWorkPhase = match;
  await refreshCurrentWorkPhase();
}

async function handleLogin() {
  elements.loginUserError.textContent = '';
  elements.loginPinError.textContent = '';
  const username = elements.loginUser.value;
  const pin = elements.loginPin.value.trim();
  if (!username) {
    elements.loginUserError.textContent = t('ui.error.required');
    return;
  }
  if (!pin) {
    elements.loginPinError.textContent = t('ui.error.required');
    return;
  }
  elements.loginStatus.textContent = t('ui.status.loading');
  try {
    const response = await fetchJSON('/api/login', {
      method: 'POST',
      body: JSON.stringify({ username, pin }),
    });
    state.token = response.token;
    localStorage.setItem('authToken', response.token);
    elements.loginPin.value = '';
    await loadAfterLogin();
  } catch (error) {
    elements.loginStatus.textContent = formatErrorMessage(error);
  }
}

async function loadAfterLogin() {
  const me = await fetchJSON('/api/me');
  state.user = me.user;
  state.currentOrgId = me.current_organization_id || me.organizations[0]?.organization_id || null;
  state.organizations = me.organizations;
  elements.userDisplay.textContent = `${state.user.display_name || state.user.username}`;
  await loadDictionary();
  await loadOrganizations();
  await loadProjects();
  setView(true);
  await refreshProjectData();
}

async function loadLoginOptions() {
  const response = await fetchJSON('/api/users');
  elements.loginUser.innerHTML = '<option value="">--</option>';
  response.users.forEach((user) => {
    const option = document.createElement('option');
    option.value = user.username;
    option.textContent = user.display_name ? `${user.display_name} (${user.username})` : user.username;
    elements.loginUser.appendChild(option);
  });
}

async function init() {
  await loadPublicDictionary();
  if (state.token) {
    try {
      await loadAfterLogin();
      return;
    } catch (error) {
      localStorage.removeItem('authToken');
      state.token = null;
    }
  }
  setView(false);
  await loadLoginOptions();
}

elements.loginSubmit.addEventListener('click', handleLogin);

elements.logout.addEventListener('click', () => {
  localStorage.removeItem('authToken');
  state.token = null;
  setView(false);
  loadLoginOptions();
});

elements.orgSelect.addEventListener('change', async (event) => {
  const nextOrgId = event.target.value;
  try {
    const response = await fetchJSON('/api/session/switch-org', {
      method: 'POST',
      body: JSON.stringify({ organizationId: nextOrgId }),
    });
    state.token = response.token;
    localStorage.setItem('authToken', response.token);
    state.currentOrgId = nextOrgId;
    await loadDictionary();
    await loadProjects();
    await refreshProjectData();
  } catch (error) {
    elements.projectSummary.innerHTML = `<div class="empty">${formatErrorMessage(error)}</div>`;
  }
});

elements.projectSelect.addEventListener('change', async (event) => {
  state.currentProjectId = event.target.value;
  state.currentWorkPhase = null;
  state.activeView = 'work_phase';
  await refreshProjectData();
});

elements.refreshProject.addEventListener('click', async () => {
  await refreshProjectData();
});

elements.workPhaseCreate.addEventListener('click', async () => {
  elements.workPhaseNameError.textContent = '';
  const name = elements.workPhaseName.value.trim();
  if (!name) {
    elements.workPhaseNameError.textContent = t('ui.error.required');
    return;
  }
  elements.workPhaseCreateStatus.textContent = t('ui.status.saving');
  try {
    await fetchJSON(`/api/projects/${state.currentProjectId}/work-phases`, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: elements.workPhaseDescription.value.trim(),
      }),
    });
    elements.workPhaseCreateStatus.textContent = t('ui.status.saved');
    elements.workPhaseName.value = '';
    elements.workPhaseDescription.value = '';
    await refreshProjectData();
  } catch (error) {
    elements.workPhaseCreateStatus.textContent = formatErrorMessage(error);
  }
});

elements.workPhaseFilter.addEventListener('input', renderWorkPhaseList);

elements.workPhaseStateFilter.addEventListener('change', renderWorkPhaseList);

elements.tabWorkPhase.addEventListener('click', () => {
  state.activeView = 'work_phase';
  renderDetail();
});

elements.tabProject.addEventListener('click', () => {
  state.activeView = 'project';
  renderDetail();
});

init();
