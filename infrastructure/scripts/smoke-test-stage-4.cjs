/**
 * PFRAM Telemedicine - Tahap 4 Live API Smoke Test
 * Tests live Fastify API at http://127.0.0.1:3200
 */
const http = require('http');

const API_BASE = 'http://127.0.0.1:3200';

function request(method, path, body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, API_BASE);
    const headers = {
      'Accept': 'application/json',
    };
    if (body) {
      headers['Content-Type'] = 'application/json';
    }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      url,
      {
        method,
        headers,
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = data ? JSON.parse(data) : null;
          } catch {
            parsed = data;
          }
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function assert(condition, message) {
  if (!condition) {
    console.error(`[FAIL] ${message}`);
    throw new Error(message);
  }
  console.log(`[PASS] ${message}`);
}

function requiredSmokePassword(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required environment variable: ${name}`);
    process.exit(1);
  }
  return value;
}

async function runSmokeTests() {
  const motherPhone = process.env.PFRAM_SMOKE_MOTHER_PHONE || '628133333333';
  const motherPassword = requiredSmokePassword('PFRAM_SMOKE_MOTHER_PASSWORD');
  const midwifePhone = process.env.PFRAM_SMOKE_MIDWIFE_PHONE || '628122222222';
  const midwifePassword = requiredSmokePassword('PFRAM_SMOKE_MIDWIFE_PASSWORD');
  const adminPhone = process.env.PFRAM_SMOKE_ADMIN_PHONE || '628111111111';
  const adminPassword = requiredSmokePassword('PFRAM_SMOKE_ADMIN_PASSWORD');

  console.log('====================================================');
  console.log('PFRAM TELEMEDICINE - STAGE 4 LIVE SMOKE TESTS');
  console.log(`Target API: ${API_BASE}`);
  console.log('====================================================\n');

  // 1. Health check
  console.log('--- 1. Health Check ---');
  const healthRes = await request('GET', '/api/health');
  assert(healthRes.status === 200, 'Health endpoint responds with 200');
  assert(healthRes.body?.data?.status === 'ok', 'Health status is ok');

  // 2. Mother Flow
  console.log('\n--- 2. Mother Flow ---');
  const motherLogin = await request('POST', '/api/auth/login', {
    phoneNumber: motherPhone,
    password: motherPassword,
    clientType: 'mobile',
  });
  assert(motherLogin.status === 200, 'Mother login succeeds (200)');
  const motherToken = motherLogin.body?.data?.accessToken;
  assert(typeof motherToken === 'string' && motherToken.length > 20, 'Mother received valid JWT access token');

  // Mother summary
  const motherSummary = await request('GET', '/api/mother/monitoring/summary', null, motherToken);
  assert(motherSummary.status === 200, 'Mother summary responds with 200');
  const summaryData = motherSummary.body?.data;
  assert(typeof summaryData?.totalEntries === 'number', 'Mother summary contains totalEntries');
  assert('latestWeight' in summaryData, 'Mother summary contains latestWeight');
  assert('latestBloodPressure' in summaryData, 'Mother summary contains latestBloodPressure');

  // Mother create weight only
  const createWeightRes = await request('POST', '/api/mother/monitoring', {
    weightKg: 58.2,
    recordedAt: new Date(Date.now() - 60000).toISOString(),
    source: 'SELF',
    notes: 'Live smoke test weight entry',
  }, motherToken);
  assert(createWeightRes.status === 201, 'Mother creates weight entry (201)');
  const weightEntryId = createWeightRes.body?.data?.publicId;
  assert(!!weightEntryId, 'Weight entry has publicId');

  // Mother create BP only
  const createBpRes = await request('POST', '/api/mother/monitoring', {
    systolicBp: 118,
    diastolicBp: 78,
    recordedAt: new Date(Date.now() - 50000).toISOString(),
    source: 'SELF',
    notes: 'Live smoke test BP entry',
  }, motherToken);
  assert(createBpRes.status === 201, 'Mother creates BP entry (201)');
  const bpEntryId = createBpRes.body?.data?.publicId;
  assert(!!bpEntryId, 'BP entry has publicId');

  // Mother create combined entry
  const createCombinedRes = await request('POST', '/api/mother/monitoring', {
    weightKg: 58.5,
    systolicBp: 120,
    diastolicBp: 80,
    recordedAt: new Date(Date.now() - 40000).toISOString(),
    source: 'SELF',
    notes: 'Live smoke test combined entry',
  }, motherToken);
  assert(createCombinedRes.status === 201, 'Mother creates combined entry (201)');
  const combinedEntryId = createCombinedRes.body?.data?.publicId;
  assert(!!combinedEntryId, 'Combined entry has publicId');

  // Mother list entries
  const motherListRes = await request('GET', '/api/mother/monitoring?page=1&limit=10', null, motherToken);
  assert(motherListRes.status === 200, 'Mother lists monitoring entries (200)');
  assert(Array.isArray(motherListRes.body?.data?.items), 'List response contains items array');
  assert(motherListRes.body?.data?.items.length >= 3, 'List response contains at least 3 entries');

  // Mother update entry (PATCH)
  const updateRes = await request('PATCH', `/api/mother/monitoring/${combinedEntryId}`, {
    weightKg: 58.7,
    systolicBp: 119,
    diastolicBp: 79,
    notes: 'Live smoke test updated notes',
  }, motherToken);
  assert(updateRes.status === 200, 'Mother updates own entry (200)');
  assert(Number(updateRes.body?.data?.weightKg) === 58.7, 'Updated weightKg reflected');

  // Mother archive entry (POST :publicId/archive)
  const archiveRes = await request('POST', `/api/mother/monitoring/${combinedEntryId}/archive`, null, motherToken);
  assert(archiveRes.status === 200, 'Mother archives own entry (200)');
  assert(!!archiveRes.body?.data?.archivedAt, 'Response confirms archivedAt timestamp');

  // Verify archived entry is excluded from active list
  const listAfterArchive = await request('GET', '/api/mother/monitoring?page=1&limit=50', null, motherToken);
  const foundArchived = listAfterArchive.body?.data?.items.find((item) => item.publicId === combinedEntryId);
  assert(!foundArchived, 'Archived entry is excluded from active list');

  // Clean up test entries
  await request('POST', `/api/mother/monitoring/${weightEntryId}/archive`, null, motherToken);
  await request('POST', `/api/mother/monitoring/${bpEntryId}/archive`, null, motherToken);

  // 3. Midwife Flow
  console.log('\n--- 3. Midwife Flow ---');
  const midwifeLogin = await request('POST', '/api/auth/login', {
    phoneNumber: midwifePhone,
    password: midwifePassword,
    clientType: 'web',
  });
  assert(midwifeLogin.status === 200, 'Midwife login succeeds (200)');
  const midwifeToken = midwifeLogin.body?.data?.accessToken;
  assert(typeof midwifeToken === 'string' && midwifeToken.length > 20, 'Midwife received valid JWT access token');

  // Get assigned mothers
  const assignedMothersRes = await request('GET', '/api/midwife/mothers', null, midwifeToken);
  assert(assignedMothersRes.status === 200, 'Midwife retrieves assigned mothers (200)');
  const mothersList = assignedMothersRes.body?.data?.items || [];
  assert(mothersList.length > 0, 'Midwife has at least 1 assigned mother');
  const motherPublicId = mothersList[0].publicId;

  // Midwife views mother monitoring summary
  const midwifeSummaryRes = await request('GET', `/api/midwife/mothers/${motherPublicId}/monitoring/summary`, null, midwifeToken);
  assert(midwifeSummaryRes.status === 200, 'Midwife views mother monitoring summary (200)');
  assert(typeof midwifeSummaryRes.body?.data?.totalEntries === 'number', 'Midwife summary contains totalEntries');

  // Midwife views mother monitoring history
  const midwifeHistoryRes = await request('GET', `/api/midwife/mothers/${motherPublicId}/monitoring?page=1&limit=10`, null, midwifeToken);
  assert(midwifeHistoryRes.status === 200, 'Midwife views mother monitoring history (200)');
  assert(Array.isArray(midwifeHistoryRes.body?.data?.items), 'Midwife history contains items array');

  // Midwife creates measurement for mother
  const midwifeCreateRes = await request('POST', `/api/midwife/mothers/${motherPublicId}/monitoring`, {
    weightKg: 58.0,
    systolicBp: 116,
    diastolicBp: 76,
    recordedAt: new Date(Date.now() - 30000).toISOString(),
    source: 'PUSKESMAS',
    notes: 'Pemeriksaan rutin puskesmas oleh bidan (smoke test)',
  }, midwifeToken);
  assert(midwifeCreateRes.status === 201, 'Midwife creates measurement for mother (201)');
  assert(midwifeCreateRes.body?.data?.source === 'PUSKESMAS', 'Recorded entry has source PUSKESMAS');
  const midwifeCreatedEntryId = midwifeCreateRes.body?.data?.publicId;

  // 4. Security & IDOR Hardening Verification
  console.log('\n--- 4. Security & IDOR Hardening ---');

  // Admin login
  const adminLogin = await request('POST', '/api/auth/login', {
    phoneNumber: adminPhone,
    password: adminPassword,
    clientType: 'web',
  });
  assert(adminLogin.status === 200, 'Admin login succeeds (200)');
  const adminToken = adminLogin.body?.data?.accessToken;

  // Admin blocked from clinical monitoring
  const adminMotherAccess = await request('GET', '/api/mother/monitoring', null, adminToken);
  assert(adminMotherAccess.status === 403, 'Admin blocked from /api/mother/monitoring (403)');

  const adminMidwifeAccess = await request('GET', `/api/midwife/mothers/${motherPublicId}/monitoring`, null, adminToken);
  assert(adminMidwifeAccess.status === 403, 'Admin blocked from /api/midwife/mothers/:id/monitoring (403)');

  // Cross-role blocking
  const motherMidwifeAccess = await request('GET', `/api/midwife/mothers/${motherPublicId}/monitoring`, null, motherToken);
  assert(motherMidwifeAccess.status === 403, 'Mother blocked from /api/midwife/* (403)');

  const midwifeMotherAccess = await request('GET', '/api/mother/monitoring', null, midwifeToken);
  assert(midwifeMotherAccess.status === 403, 'Midwife blocked from /api/mother/* (403)');

  // Unauthenticated access blocked
  const anonAccess = await request('GET', '/api/mother/monitoring', null, null);
  assert(anonAccess.status === 401, 'Unauthenticated request blocked (401)');

  console.log('\n====================================================');
  console.log('ALL LIVE SMOKE TESTS PASSED SUCCESSFULLY! (100%)');
  console.log('====================================================\n');
}

runSmokeTests().catch((err) => {
  console.error('\nSmoke tests encountered fatal error:', err);
  process.exit(1);
});
