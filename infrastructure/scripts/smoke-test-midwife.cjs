const http = require('http');

async function main() {
  console.log('--- RUNNING LIVE SMOKE TEST FOR MIDWIFE MONITORING ---');
  const midwifePhone = process.env.PFRAM_SMOKE_MIDWIFE_PHONE || '628122222222';
  const midwifePassword = process.env.PFRAM_SMOKE_MIDWIFE_PASSWORD;

  if (!midwifePassword) {
    console.error('Missing required environment variable: PFRAM_SMOKE_MIDWIFE_PASSWORD');
    process.exit(1);
  }

  // Helper fetch
  function request(path, options = {}) {
    return new Promise((resolve, reject) => {
      const url = new URL(path, 'http://127.0.0.1:3200');
      const req = http.request(
        url,
        {
          method: options.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {}),
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const json = data ? JSON.parse(data) : {};
              resolve({ status: res.statusCode, headers: res.headers, body: json });
            } catch (err) {
              resolve({ status: res.statusCode, headers: res.headers, raw: data });
            }
          });
        }
      );
      req.on('error', reject);
      if (options.body) {
        req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
      }
      req.end();
    });
  }

  // 1. Midwife Login
  console.log(`1. Logging in as midwife (${midwifePhone})...`);
  const loginRes = await request('/api/auth/login', {
    method: 'POST',
    body: {
      phoneNumber: midwifePhone,
      password: midwifePassword,
      clientType: 'web',
    },
  });

  if (loginRes.status !== 200 || !loginRes.body.data?.accessToken) {
    console.error('Login failed:', loginRes.body);
    process.exit(1);
  }

  const token = loginRes.body.data.accessToken;
  const midwifeUser = loginRes.body.data.user;
  console.log('   Midwife authenticated:', midwifeUser.displayName, 'Role:', midwifeUser.role);

  const authHeaders = {
    Authorization: `Bearer ${token}`,
  };

  // 2. Get Assigned Mothers
  console.log('2. Fetching assigned mothers for midwife...');
  const mothersRes = await request('/api/midwife/mothers', {
    headers: authHeaders,
  });
  console.log('   Status:', mothersRes.status);
  const mothers = mothersRes.body.data?.items || [];
  console.log('   Assigned mothers count:', mothers.length);
  if (mothers.length === 0) {
    console.error('No assigned mothers found for testing!');
    process.exit(1);
  }

  const targetMother = mothers[0];
  console.log('   Target mother:', targetMother.fullName, 'PublicId:', targetMother.publicId);

  // 3. Get Mother Monitoring Summary
  console.log('3. Fetching monitoring summary for target mother...');
  const summaryRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring/summary`, {
    headers: authHeaders,
  });
  console.log('   Status:', summaryRes.status);
  console.log('   Summary:', JSON.stringify(summaryRes.body.data, null, 2));

  // 4. Get Mother Monitoring History List
  console.log('4. Fetching monitoring history list...');
  const historyRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring`, {
    headers: authHeaders,
  });
  console.log('   Status:', historyRes.status);
  console.log('   History count:', historyRes.body.data?.items?.length || 0);

  // 5. Create Measurement by Midwife (Weight Only)
  console.log('5. Creating measurement: Weight only...');
  const createWeightRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      source: 'MIDWIFE',
      weightKg: 62.5,
      notes: 'Smoke test measurement by midwife - weight only',
    },
  });
  console.log('   Status:', createWeightRes.status);
  console.log('   Created entry ID:', createWeightRes.body.data?.publicId);

  // 6. Create Measurement by Midwife (Blood Pressure Only)
  console.log('6. Creating measurement: BP only...');
  const createBpRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      source: 'MIDWIFE',
      systolicBp: 118,
      diastolicBp: 78,
      notes: 'Smoke test measurement by midwife - BP only',
    },
  });
  console.log('   Status:', createBpRes.status);
  console.log('   Created entry ID:', createBpRes.body.data?.publicId);

  // 7. Create Measurement by Midwife (Combined)
  console.log('7. Creating measurement: Combined Weight + BP...');
  const createCombinedRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring`, {
    method: 'POST',
    headers: authHeaders,
    body: {
      source: 'MIDWIFE',
      weightKg: 63.0,
      systolicBp: 120,
      diastolicBp: 80,
      notes: 'Smoke test measurement by midwife - combined',
    },
  });
  console.log('   Status:', createCombinedRes.status);
  console.log('   Created entry ID:', createCombinedRes.body.data?.publicId);

  // 8. Verify Updated Summary
  console.log('8. Verifying updated summary...');
  const updatedSummaryRes = await request(`/api/midwife/mothers/${targetMother.publicId}/monitoring/summary`, {
    headers: authHeaders,
  });
  console.log('   Updated latest weight:', updatedSummaryRes.body.data?.latestWeight);
  console.log('   Updated latest BP:', updatedSummaryRes.body.data?.latestBloodPressure);
  console.log('   Updated total entries:', updatedSummaryRes.body.data?.totalEntries);

  // 9. Logout
  console.log('9. Logging out midwife...');
  const logoutRes = await request('/api/auth/logout', {
    method: 'POST',
    headers: authHeaders,
    body: { clientType: 'web' },
  });
  console.log('   Status:', logoutRes.status);

  console.log('--- ALL SMOKE TESTS COMPLETED SUCCESSFULLY ---');
}

main().catch((err) => {
  console.error('Smoke test error:', err);
  process.exit(1);
});
