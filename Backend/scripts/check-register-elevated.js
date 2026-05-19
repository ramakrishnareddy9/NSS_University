// Lightweight check: verifies public /api/auth/register rejects elevated roles
// Usage: node Backend/scripts/check-register-elevated.js
// Set TEST_BASE_URL if your server runs on a different host/port, e.g. export TEST_BASE_URL=http://localhost:5000

const axios = require('axios');

const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:5000';

(async () => {
  try {
    const email = `attacker+${Date.now()}@example.edu`;
    const payload = {
      name: 'Evil Actor',
      email,
      password: 'Password123!',
      role: 'admin'
    };

    const res = await axios.post(`${baseUrl}/api/auth/register`, payload, { validateStatus: () => true });

    if (res.status === 403 || (res.data && res.data.success === false && res.status >= 400)) {
      console.log('PASS: Elevated role registration blocked as expected.');
      process.exit(0);
    }

    console.error('FAIL: Elevated role registration was not blocked.');
    console.error('Status:', res.status);
    console.error('Body:', res.data);
    process.exit(2);
  } catch (err) {
    console.error('ERROR running check:', err.message || err);
    process.exit(3);
  }
})();
