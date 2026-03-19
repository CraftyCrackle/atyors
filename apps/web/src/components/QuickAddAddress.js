'use client';

import { useState, useRef } from 'react';
import { api } from '../services/api';
import { reverseGeocode } from '../lib/reverseGeocode';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const LOCATION_COOLDOWN_MS = 2500;

export default function QuickAddAddress({ onAdded, title = 'Add your address', subtitle = 'We need it to schedule service at your home.', variant = 'card', compact = false }) {
  const [form, setForm] = useState({
    street: '',
    unit: '',
    city: '',
    state: '',
    zip: '',
    barrelCount: 1,
    trashDay: '',
  });
  const [saving, setSaving] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationCooldown, setLocationCooldown] = useState(false);
  const [error, setError] = useState('');
  const [filledViaLocation, setFilledViaLocation] = useState(false);
  const locationCoordsRef = useRef(null);

  const update = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    setError('');
  };

  async function handleUseLocation() {
    if (!navigator?.geolocation) {
      setError('Location is not supported by your browser.');
      return;
    }
    setError('');
    setLocationLoading(true);
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
      });
      const { coords } = position;
      const addr = await reverseGeocode(coords.lat, coords.lng);
      setForm((prev) => ({
        ...prev,
        street: addr.street || prev.street,
        city: addr.city || prev.city,
        state: addr.state || prev.state,
        zip: addr.zip || prev.zip,
      }));
      locationCoordsRef.current = { lat: coords.lat, lng: coords.lng };
      setFilledViaLocation(true);
      setLocationCooldown(true);
      setTimeout(() => setLocationCooldown(false), LOCATION_COOLDOWN_MS);
    } catch (err) {
      if (err?.code === 1) setError('Location permission denied. Enter your address manually.');
      else if (err?.code === 2) setError('Location unavailable. Enter your address manually.');
      else setError(err?.message || 'Could not get address. Enter it manually below.');
    } finally {
      setLocationLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.street?.trim() || !form.city?.trim() || !form.state?.trim() || !form.zip?.trim()) {
      setError('Please fill in street, city, state, and ZIP.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const body = {
        street: form.street.trim(),
        unit: form.unit?.trim() || undefined,
        city: form.city.trim(),
        state: form.state.trim(),
        zip: form.zip.trim(),
        barrelCount: parseInt(form.barrelCount, 10) || 1,
        trashDay: form.trashDay || undefined,
        isDefault: true,
      };
      const coords = locationCoordsRef.current;
      if (coords) {
        body.lat = coords.lat;
        body.lng = coords.lng;
      }
      const res = await api.post('/addresses', body);
      const result = res.data;
      onAdded(result.address, result);
    } catch (err) {
      setError(err?.message || 'Failed to save address. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const isCard = variant === 'card';
  const containerCls = isCard
    ? 'rounded-2xl border border-gray-200 bg-white p-5 shadow-sm'
    : 'space-y-4';
  const inputCls = 'w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20';
  const locationDisabled = locationLoading || locationCooldown;

  return (
    <form onSubmit={handleSubmit} className={containerCls} aria-describedby={error ? 'quick-add-error' : undefined}>
      {title && (
        <div className="mb-4">
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
      )}

      <div className="mb-4">
        <button
          type="button"
          onClick={handleUseLocation}
          disabled={locationDisabled}
          aria-label="Use my current location to fill in my address"
          aria-describedby="quick-add-location-hint quick-add-location-privacy"
          className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-200 bg-brand-50/50 py-3.5 text-sm font-semibold text-brand-700 transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-60"
        >
          {locationLoading ? (
            <>
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" aria-hidden />
              Getting your address…
            </>
          ) : (
            <>
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Use my location
            </>
          )}
        </button>
        <p id="quick-add-location-hint" className="mt-1.5 text-xs text-gray-500">May take a few seconds on mobile.</p>
        <p id="quick-add-location-privacy" className="mt-0.5 text-xs text-gray-400">We use it only to fill your address; we don’t store your exact location beyond your street address.</p>
      </div>

      {error ? (
        <p id="quick-add-error" className="mb-3 text-xs text-amber-600" role="alert">{error}</p>
      ) : null}

      <div className="space-y-3">
        <input
          type="text"
          placeholder="Street address"
          value={form.street}
          onChange={update('street')}
          required
          className={inputCls}
          aria-required="true"
        />
        <input
          type="text"
          placeholder="Apt, unit, etc. (optional)"
          value={form.unit}
          onChange={update('unit')}
          className={inputCls}
        />
        <div className="grid grid-cols-[1fr_1fr_80px] gap-2">
          <input
            type="text"
            placeholder="City"
            value={form.city}
            onChange={update('city')}
            required
            className={inputCls}
            aria-required="true"
          />
          <input
            type="text"
            placeholder="State"
            value={form.state}
            onChange={update('state')}
            required
            className={inputCls}
            aria-required="true"
          />
          <input
            type="text"
            placeholder="ZIP"
            value={form.zip}
            onChange={update('zip')}
            required
            className={inputCls}
            aria-required="true"
          />
        </div>
      </div>

      {!compact && (
        <div className="mt-4 flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Barrels</label>
            <input
              type="number"
              min={1}
              value={form.barrelCount}
              onChange={(e) => setForm((p) => ({ ...p, barrelCount: e.target.value }))}
              className={`mt-1 ${inputCls}`}
            />
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500">Trash day</label>
            <select
              value={form.trashDay}
              onChange={update('trashDay')}
              className={`mt-1 ${inputCls}`}
            >
              <option value="">Optional</option>
              {DAYS.map((d) => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {filledViaLocation && (
        <p className="mt-3 text-[10px] text-gray-400">
          Address from location. © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="mt-5 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
      >
        {saving ? 'Saving…' : 'Save address'}
      </button>
    </form>
  );
}
