const https = require('https');

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
const USER_AGENT = 'atyors-app/1.0 (admin@atyors.com)';

function httpGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch { reject(new Error('Failed to parse geocode response')); }
      });
    }).on('error', reject);
  });
}

async function geocode(street, city, state, zip) {
  const q = encodeURIComponent(`${street}, ${city}, ${state} ${zip}`);
  const url = `${NOMINATIM_URL}?q=${q}&format=json&limit=1&countrycodes=us`;

  try {
    const results = await httpGet(url);
    if (results.length > 0) {
      return { lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) };
    }
  } catch (err) {
    console.error('[Geocode] Nominatim request failed:', err.message);
  }

  return null;
}

module.exports = { geocode };
