const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3001';

async function requestRaw(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, options);
  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }
  return { status: response.status, data };
}

async function request(path, options = {}) {
  const { status, data } = await requestRaw(path, options);
  if (status < 200 || status >= 300) {
    const detail = data ? JSON.stringify(data) : 'No response body';
    throw new Error(`${options.method || 'GET'} ${path} failed: ${status} ${detail}`);
  }
  return data;
}

async function login(username, pin = '1234') {
  const data = await request('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, pin }),
  });
  return data.token;
}

async function authedRequest(path, token, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return request(path, { ...options, headers });
}

async function authedRequestRaw(path, token, options = {}) {
  const headers = { ...(options.headers || {}), Authorization: `Bearer ${token}` };
  if (options.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  return requestRaw(path, { ...options, headers });
}

async function runStep(name, fn) {
  try {
    console.log(`\n==> ${name}`);
    const result = await fn();
    console.log(`OK: ${name}`);
    return result;
  } catch (error) {
    console.error(`FAILED: ${name}`);
    console.error(error.message);
    process.exit(1);
  }
}

async function run() {
  await runStep('Health check', async () => {
    const health = await request('/api/health');
    console.log('health:', health);
  });

  await runStep('Login page responds', async () => {
    const { status } = await requestRaw('/login');
    if (status !== 200) {
      throw new Error(`Expected 200 from /login, got ${status}`);
    }
  });

  const annaToken = await runStep('Login anna', () => login('anna', '1234'));

  const context = await runStep('Fetch org + project', async () => {
    const me = await authedRequest('/api/me', annaToken);
    const orgId = me.organizations[0]?.organization_id;
    if (!orgId) {
      throw new Error('No organization found for anna');
    }
    const projects = await authedRequest('/api/projects', annaToken);
    const project = projects.projects[0];
    if (!project) {
      throw new Error('No project found for anna');
    }
    return { orgId, projectId: project.project_id };
  });

  const switchedToken = await runStep('Switch organization (if available)', async () => {
    const orgs = await authedRequest('/api/organizations', annaToken);
    if (!orgs.organizations || orgs.organizations.length < 2) {
      return annaToken;
    }
    const targetOrg = orgs.organizations[1];
    const switched = await authedRequest('/api/session/switch-org', annaToken, {
      method: 'POST',
      body: JSON.stringify({ organizationId: targetOrg.organization_id }),
    });
    await authedRequest('/api/projects', switched.token);
    const back = await authedRequest('/api/session/switch-org', switched.token, {
      method: 'POST',
      body: JSON.stringify({ organizationId: context.orgId }),
    });
    return back.token;
  });

  const trackPhase = await runStep('Find TRACK work phase', async () => {
    const list = await authedRequest(`/api/projects/${context.projectId}/work-phases`, switchedToken);
    const phase = list.workPhases.find((wp) => wp.latest_baseline_id);
    if (!phase) {
      throw new Error('No TRACK work phase found');
    }
    return phase;
  });

  const setupPhase = await runStep('Find SETUP work phase', async () => {
    const list = await authedRequest(`/api/projects/${context.projectId}/work-phases`, switchedToken);
    const phase = list.workPhases.find((wp) => !wp.latest_baseline_id);
    if (!phase) {
      throw new Error('No SETUP work phase found');
    }
    return phase;
  });

  await runStep('Negative: baseline lock requires permission', async () => {
    const batches = await authedRequest(`/api/projects/${context.projectId}/target-batches`, switchedToken);
    const targetBatch = batches.batches[0];
    if (!targetBatch) {
      throw new Error('No target batch found');
    }
    const { status, data } = await authedRequestRaw(
      `/api/work-phases/${setupPhase.work_phase_id}/lock-baseline`,
      switchedToken,
      {
        method: 'POST',
        body: JSON.stringify({
          targetImportBatchId: targetBatch.import_batch_id,
        }),
      }
    );
    if (status !== 403 || data?.error !== 'NO_PERMISSION') {
      throw new Error(`Expected 403 NO_PERMISSION, got ${status} ${JSON.stringify(data)}`);
    }
  });

  await runStep('Negative: weekly update requires baseline', async () => {
    const today = new Date().toISOString().split('T')[0];
    const { status, data } = await authedRequestRaw(
      `/api/work-phases/${setupPhase.work_phase_id}/weekly-update`,
      switchedToken,
      {
        method: 'POST',
        body: JSON.stringify({
          weekEnding: today,
          percentComplete: 10,
          progressNotes: 'Should fail',
          risks: 'None',
        }),
      }
    );
    if (status !== 409 || data?.error !== 'BASELINE_REQUIRED') {
      throw new Error(`Expected 409 BASELINE_REQUIRED, got ${status} ${JSON.stringify(data)}`);
    }
  });

  const paavoToken = await runStep('Login paavo', () => login('paavo', '1234'));

  await runStep('Logout anna', async () => {
    const { status } = await authedRequestRaw('/api/logout', annaToken, { method: 'POST' });
    if (status !== 204) {
      throw new Error(`Expected 204 from /api/logout, got ${status}`);
    }
  });

  await runStep('Negative: member add blocked when baseline locked', async () => {
    const litteras = await authedRequest(`/api/projects/${context.projectId}/litteras`, paavoToken);
    const littera = litteras.litteras[0];
    if (!littera) {
      throw new Error('No littera found');
    }
    const { status, data } = await authedRequestRaw(
      `/api/work-phases/${trackPhase.work_phase_id}/members`,
      paavoToken,
      {
        method: 'POST',
        body: JSON.stringify({
          memberType: 'LITTERA',
          litteraId: littera.littera_id,
        }),
      }
    );
    if (status !== 409 || data?.error !== 'BASELINE_ALREADY_LOCKED') {
      throw new Error(`Expected 409 BASELINE_ALREADY_LOCKED, got ${status} ${JSON.stringify(data)}`);
    }
  });

  await runStep('Post weekly update', async () => {
    const today = new Date().toISOString().split('T')[0];
    await authedRequest(`/api/work-phases/${trackPhase.work_phase_id}/weekly-update`, switchedToken, {
      method: 'POST',
      body: JSON.stringify({
        weekEnding: today,
        percentComplete: 40,
        progressNotes: 'Smoke weekly update',
        risks: 'None',
      }),
    });
  });

  await runStep('Post ghost cost', async () => {
    const today = new Date().toISOString().split('T')[0];
    await authedRequest(`/api/work-phases/${trackPhase.work_phase_id}/ghost`, switchedToken, {
      method: 'POST',
      body: JSON.stringify({
        weekEnding: today,
        costType: 'LABOR',
        amount: 123.45,
        description: 'Smoke ghost',
      }),
    });
  });

  const correctionId = await runStep('Propose correction', async () => {
    const response = await authedRequest(`/api/work-phases/${trackPhase.work_phase_id}/corrections/propose`, switchedToken, {
      method: 'POST',
      body: JSON.stringify({
        itemCode: '56001013',
        notes: 'Smoke correction propose',
      }),
    });
    return response.correction_id;
  });

  await runStep('Approve correction (PM)', async () => {
    await authedRequest(`/api/corrections/${correctionId}/approve-pm`, paavoToken, {
      method: 'POST',
      body: JSON.stringify({ comment: 'Smoke PM approve' }),
    });
  });

  const tuijaToken = await runStep('Login tuija', () => login('tuija', '1234'));

  await runStep('Approve correction (final)', async () => {
    await authedRequest(`/api/corrections/${correctionId}/approve-final`, tuijaToken, {
      method: 'POST',
      body: JSON.stringify({ comment: 'Smoke final approve' }),
    });
  });

  await runStep('Verify littera member added', async () => {
    const members = await authedRequest(`/api/work-phases/${trackPhase.work_phase_id}/members`, switchedToken);
    const hasLittera = members.members.some((member) => member.littera_code === '1300');
    if (!hasLittera) {
      throw new Error('Expected littera 1300 not found in members after correction');
    }
  });

  console.log('\nSmoke completed successfully.');
}

run();
