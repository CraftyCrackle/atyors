const http2 = require('http2');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');

const APNS_HOST_PROD = 'https://api.push.apple.com';
const APNS_HOST_SANDBOX = 'https://api.sandbox.push.apple.com';
const BUNDLE_ID = process.env.APNS_BUNDLE_ID || 'com.atyors.app';
const KEY_ID = process.env.APNS_KEY_ID || '';
const TEAM_ID = process.env.APNS_TEAM_ID || '';
const KEY_PATH = process.env.APNS_KEY_PATH || path.join(__dirname, '..', 'config', 'AuthKey_RYDZ5XJHZW.p8');
const USE_SANDBOX = process.env.APNS_SANDBOX === 'true';

let apnsKey = null;
let cachedToken = null;
let tokenIssuedAt = 0;

function loadKey() {
  if (apnsKey) return apnsKey;
  if (!KEY_ID || !TEAM_ID) return null;
  try {
    apnsKey = process.env.APNS_KEY_CONTENTS || fs.readFileSync(KEY_PATH, 'utf8');
    return apnsKey;
  } catch (err) {
    console.error('[APNs] Failed to load key:', err.message);
    return null;
  }
}

function getToken() {
  const key = loadKey();
  if (!key) return null;

  const now = Math.floor(Date.now() / 1000);
  if (cachedToken && (now - tokenIssuedAt) < 3000) return cachedToken;

  cachedToken = jwt.sign({}, key, {
    algorithm: 'ES256',
    keyid: KEY_ID,
    issuer: TEAM_ID,
    expiresIn: '1h',
    header: { alg: 'ES256', kid: KEY_ID },
  });
  tokenIssuedAt = now;
  return cachedToken;
}

function sendNotification(deviceToken, { title, body, data }) {
  return new Promise((resolve, reject) => {
    const token = getToken();
    if (!token) return reject(new Error('APNs not configured'));

    const host = USE_SANDBOX ? APNS_HOST_SANDBOX : APNS_HOST_PROD;
    const client = http2.connect(host);

    client.on('error', (err) => {
      client.close();
      reject(err);
    });

    const payload = JSON.stringify({
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        'mutable-content': 1,
      },
      ...(data || {}),
    });

    const headers = {
      ':method': 'POST',
      ':path': `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      'apns-topic': BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': '0',
    };

    const req = client.request(headers);
    let responseData = '';
    let statusCode;

    req.on('response', (hdrs) => {
      statusCode = hdrs[':status'];
    });

    req.on('data', (chunk) => { responseData += chunk; });

    req.on('end', () => {
      client.close();
      if (statusCode === 200) {
        resolve({ success: true, token: deviceToken });
      } else {
        const parsed = responseData ? JSON.parse(responseData) : {};
        reject(new Error(`APNs ${statusCode}: ${parsed.reason || 'Unknown'}`));
      }
    });

    req.write(payload);
    req.end();
  });
}

function isConfigured() {
  return !!(KEY_ID && TEAM_ID && loadKey());
}

module.exports = { sendNotification, isConfigured };
