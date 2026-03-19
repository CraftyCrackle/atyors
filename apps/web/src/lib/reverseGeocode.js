/**
 * Client-side reverse geocode (lat/lng → address) via Nominatim.
 * See https://operations.osmfoundation.org/policies/nominatim/
 */

const NOMINATIM_REVERSE = 'https://nominatim.openstreetmap.org/reverse';
const DEFAULT_TIMEOUT_MS = 8000;

export async function reverseGeocode(lat, lng, options = {}) {
  const { signal: externalSignal, timeoutMs = DEFAULT_TIMEOUT_MS } = options;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  const signal = externalSignal || controller.signal;

  try {
    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lng),
      format: 'json',
      addressdetails: '1',
    });
    const res = await fetch(`${NOMINATIM_REVERSE}?${params}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'atyors-app/1.0 (curbside services; admin@atyors.com)' },
      signal,
    });
    if (!res.ok) throw new Error('Could not look up address');
    const data = await res.json();
    const a = data?.address || {};
    const street = [a.house_number, a.road].filter(Boolean).join(' ') || a.road || a.pedestrian || '';
    return {
      street: street.trim() || '',
      city: a.city || a.town || a.village || a.municipality || a.county || '',
      state: a.state || '',
      zip: a.postcode || '',
    };
  } catch (err) {
    if (err?.name === 'AbortError') throw new Error('Address lookup timed out. Please enter your address manually.');
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
