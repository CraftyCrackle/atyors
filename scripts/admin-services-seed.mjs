#!/usr/bin/env node
/**
 * Updates ServiceType prices/descriptions via POST /api/v1/services/seed (admin JWT).
 *
 * Usage:
 *   API_BASE=https://atyors.com/api/v1 ATYORS_ADMIN_EMAIL=... ATYORS_ADMIN_PASSWORD=... node scripts/admin-services-seed.mjs
 *
 * Local (Docker): API_BASE=http://localhost:8081/api/v1 ...
 */

const base = (process.env.API_BASE || 'https://atyors.com/api/v1').replace(/\/$/, '');
const email = process.env.ATYORS_ADMIN_EMAIL;
const password = process.env.ATYORS_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Missing ATYORS_ADMIN_EMAIL or ATYORS_ADMIN_PASSWORD');
  process.exit(1);
}

const loginRes = await fetch(`${base}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});
const loginJson = await loginRes.json().catch(() => ({}));
if (!loginRes.ok) {
  console.error('Login failed:', loginRes.status, loginJson);
  process.exit(1);
}
const token = loginJson.data?.accessToken;
if (!token) {
  console.error('No accessToken in login response');
  process.exit(1);
}

const seedRes = await fetch(`${base}/services/seed`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${token}` },
});
const seedJson = await seedRes.json().catch(() => ({}));
if (!seedRes.ok) {
  console.error('Seed failed:', seedRes.status, seedJson);
  process.exit(1);
}
console.log(JSON.stringify(seedJson, null, 2));
