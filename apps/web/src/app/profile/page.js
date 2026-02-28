'use client';

import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { useInstall } from '../../components/InstallContext';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const { canInstall, isStandalone, triggerInstall } = useInstall();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ firstName: '', lastName: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const isCustomer = user?.role === 'customer';

  useEffect(() => {
    if (user) setForm({ firstName: user.firstName, lastName: user.lastName, phone: user.phone || '' });
    api.get('/addresses').then((r) => setAddresses(r.data.addresses)).catch(() => {});
  }, [user]);

  async function handlePhotoUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch('/api/v1/users/me/photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) updateUser(data.data.user);
    } catch { }
    setUploadingPhoto(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch('/users/me', form);
      updateUser(res.data.user);
      setEditing(false);
    } catch { }
    setSaving(false);
  }

  async function deleteAddress(id) {
    try {
      await api.delete(`/addresses/${id}`);
      setAddresses(addresses.filter((a) => a._id !== id));
    } catch { }
  }

  const dark = !isCustomer;
  const cardCls = dark ? 'rounded-xl border border-gray-700 bg-gray-800 p-4' : 'rounded-xl bg-white p-4 shadow-sm';
  const inputCls = dark
    ? 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none'
    : 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <AuthGuard>
      <div className={`min-h-screen-safe pb-24 ${dark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <header className={`px-6 pb-6 pt-header-safe ${dark ? 'border-b border-gray-800 bg-gray-900' : 'bg-white shadow-sm'}`}>
          {dark && (
            <a href="/servicer/dashboard" className="mb-3 inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              Back to Dashboard
            </a>
          )}
          <div className="flex items-center gap-4">
            <label className="relative cursor-pointer group">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="Profile" className={`h-14 w-14 rounded-full object-cover ring-2 ${dark ? 'ring-gray-600' : 'ring-brand-100'}`} />
              ) : (
                <div className={`flex h-14 w-14 items-center justify-center rounded-full text-xl font-bold ${dark ? 'bg-gray-700 text-brand-400' : 'bg-brand-100 text-brand-600'}`}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                {uploadingPhoto ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <svg className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </div>
              <input type="file" accept="image/*" onChange={handlePhotoUpload} className="hidden" disabled={uploadingPhoto} />
            </label>
            <div>
              <h1 className={`text-lg font-bold ${dark ? 'text-white' : ''}`}>{user?.fullName}</h1>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>
        </header>

        <div className="mt-4 px-4">
          <div className={cardCls}>
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold ${dark ? 'text-white' : ''}`}>Personal Info</h2>
              <button onClick={() => setEditing(!editing)} className="text-sm font-medium text-brand-600">
                {editing ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editing ? (
              <div className="mt-3 space-y-3">
                <input type="text" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} placeholder="First name" className={inputCls} />
                <input type="text" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} placeholder="Last name" className={inputCls} />
                <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Phone" className={inputCls} />
                <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            ) : (
              <div className={`mt-3 space-y-2 text-sm ${dark ? 'text-gray-300' : ''}`}>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span>{user?.fullName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span>{user?.email}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span>{user?.phone || '—'}</span></div>
              </div>
            )}
          </div>

          <div className={`mt-4 ${cardCls}`}>
            <h2 className={`font-semibold ${dark ? 'text-white' : ''}`}>Addresses</h2>
            {addresses.length === 0 ? (
              <p className="mt-2 text-sm text-gray-400">No addresses saved</p>
            ) : (
              <div className="mt-3 space-y-3">
                {addresses.map((addr) => (
                  <AddressCard key={addr._id} address={addr} dark={dark} onUpdated={(updated) => setAddresses(addresses.map((a) => a._id === updated._id ? updated : a))} onDelete={() => deleteAddress(addr._id)} />
                ))}
              </div>
            )}
          </div>

          {isCustomer && <PaymentMethodsSection />}

          {canInstall && !isStandalone && (
            <button
              onClick={triggerInstall}
              className={`mt-4 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-semibold transition active:scale-[0.98] ${dark ? 'border border-brand-500/30 bg-brand-500/10 text-brand-400 hover:bg-brand-500/20' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Get the App
            </button>
          )}

          <button onClick={logout} className={`mt-6 w-full rounded-xl border py-3 text-sm font-semibold transition ${dark ? 'border-red-500/30 text-red-400 hover:bg-red-500/10' : 'border-red-200 text-red-500 hover:bg-red-50'}`}>
            Sign Out
          </button>
        </div>

        {isCustomer && <BottomNav />}
      </div>
    </AuthGuard>
  );
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function AddressCard({ address, dark, onUpdated, onDelete }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingBarrelPhoto, setUploadingBarrelPhoto] = useState(false);
  const [form, setForm] = useState({});

  function startEditing() {
    setForm({
      street: address.street || '',
      unit: address.unit || '',
      city: address.city || '',
      state: address.state || '',
      zip: address.zip || '',
      barrelCount: address.barrelCount || 1,
      barrelLocation: address.barrelLocation || '',
      barrelNotes: address.barrelNotes || '',
      barrelPlacementInstructions: address.barrelPlacementInstructions || '',
      barrelReturnInstructions: address.barrelReturnInstructions || '',
      trashDay: address.trashDay || '',
    });
    setEditing(true);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch(`/addresses/${address._id}`, {
        ...form,
        barrelCount: parseInt(form.barrelCount) || 1,
      });
      onUpdated(res.data.address);
      setEditing(false);
    } catch { }
    setSaving(false);
  }

  async function handleBarrelPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingBarrelPhoto(true);
    try {
      const fd = new FormData();
      fd.append('photo', file);
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/addresses/${address._id}/photo`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) onUpdated(data.data.address);
    } catch { }
    setUploadingBarrelPhoto(false);
    e.target.value = '';
  }

  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });
  const inputCls = dark
    ? 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none'
    : 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  if (editing) {
    return (
      <div className={`rounded-lg border p-4 space-y-3 ${dark ? 'border-brand-500/30 bg-gray-900/50' : 'border-brand-200 bg-brand-50/30'}`}>
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-gray-500 uppercase">Edit Address</p>
          <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
        </div>

        <input type="text" placeholder="Street address" value={form.street} onChange={update('street')} required className={inputCls} />
        <div className="flex gap-2">
          <input type="text" placeholder="Apt / Unit" value={form.unit} onChange={update('unit')} className={`w-24 ${inputCls}`} />
          <input type="text" placeholder="City" value={form.city} onChange={update('city')} required className={`flex-1 ${inputCls}`} />
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="State" value={form.state} onChange={update('state')} required className={`w-16 ${inputCls}`} />
          <input type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} required className={`w-20 ${inputCls}`} />
        </div>

        <hr className="border-gray-200" />
        <p className="text-xs font-semibold text-gray-500 uppercase">Barrel Details</p>

        <div>
          <label className="text-xs text-gray-500">Number of barrels</label>
          <input type="number" min="1" value={form.barrelCount} onChange={(e) => setForm({ ...form, barrelCount: e.target.value })} className={inputCls} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Barrel location</label>
          <input type="text" placeholder='e.g. "Left side of garage"' value={form.barrelLocation} onChange={update('barrelLocation')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Placement instructions (curb)</label>
          <input type="text" placeholder='e.g. "End of driveway"' value={form.barrelPlacementInstructions} onChange={update('barrelPlacementInstructions')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Return instructions</label>
          <input type="text" placeholder='e.g. "Back by garage door"' value={form.barrelReturnInstructions} onChange={update('barrelReturnInstructions')} className={inputCls} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Trash pickup day</label>
          <select value={form.trashDay} onChange={update('trashDay')} className={inputCls}>
            <option value="">Select day</option>
            {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>

        <div>
          <label className="text-xs text-gray-500">Notes for servicer</label>
          <textarea placeholder="Any extra notes (optional)" value={form.barrelNotes} onChange={update('barrelNotes')} rows={2} className={`${inputCls} resize-none`} />
        </div>

        <div>
          <label className="text-xs text-gray-500">Barrel photo</label>
          {address.barrelPhotoUrl && (
            <div className="mt-1 mb-2 relative">
              <img src={address.barrelPhotoUrl} alt="Barrel location" className="h-32 w-full rounded-lg object-cover" />
            </div>
          )}
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
            {uploadingBarrelPhoto ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {address.barrelPhotoUrl ? 'Change photo' : 'Upload barrel photo'}
            <input type="file" accept="image/*" onChange={handleBarrelPhoto} className="hidden" disabled={uploadingBarrelPhoto} />
          </label>
        </div>

        <button onClick={handleSave} disabled={saving} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-3 ${dark ? 'bg-gray-900/50' : 'bg-gray-50'}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${dark ? 'text-gray-200' : ''}`}>{address.street}{address.unit ? `, ${address.unit}` : ''}</p>
          <p className="text-xs text-gray-500">{address.city}, {address.state} {address.zip}</p>
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button onClick={startEditing} className="text-xs font-medium text-brand-600 hover:text-brand-700">Edit</button>
          <button onClick={onDelete} className="text-xs text-red-500 hover:text-red-700">Remove</button>
        </div>
      </div>
      {address.barrelPhotoUrl && (
        <div className="mt-2">
          <img src={address.barrelPhotoUrl} alt="Barrel location" className="h-24 w-full rounded-lg object-cover" />
        </div>
      )}
      {!address.barrelPhotoUrl && (
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 transition">
          {uploadingBarrelPhoto ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          Add barrel photo to help servicers
          <input type="file" accept="image/*" onChange={handleBarrelPhoto} className="hidden" disabled={uploadingBarrelPhoto} />
        </label>
      )}
      {(address.barrelCount > 0 || address.barrelLocation || address.trashDay) && (
        <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          {address.barrelCount > 0 && <span>{address.barrelCount} barrel{address.barrelCount > 1 ? 's' : ''}</span>}
          {address.trashDay && <span>Trash day: {address.trashDay}</span>}
          {address.barrelLocation && <span>Location: {address.barrelLocation}</span>}
        </div>
      )}
      {(address.barrelPlacementInstructions || address.barrelReturnInstructions) && (
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-400">
          {address.barrelPlacementInstructions && <span>Put-out: {address.barrelPlacementInstructions}</span>}
          {address.barrelReturnInstructions && <span>Return: {address.barrelReturnInstructions}</span>}
        </div>
      )}
    </div>
  );
}

const BRAND_ICONS = {
  visa: (
    <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#1A1F71"/><path d="M19.5 21h-3l1.87-11.5h3L19.5 21zm8.06-11.2c-.6-.23-1.53-.48-2.7-.48-2.97 0-5.07 1.58-5.08 3.83-.02 1.67 1.49 2.6 2.62 3.15 1.17.57 1.56.93 1.56 1.44-.01.78-.94 1.13-1.8 1.13-1.2 0-1.84-.18-2.83-.6l-.39-.18-.42 2.6c.7.32 2 .6 3.35.62 3.16 0 5.22-1.56 5.24-3.96.01-1.32-.79-2.33-2.52-3.16-.5-.27-1.59-.73-1.59-1.38 0-.46.51-.96 1.62-.96.93-.02 1.6.2 2.12.42l.25.12.4-2.59zm7.88-.3h-2.33c-.72 0-1.26.21-1.58.96L27.5 21h3.16l.63-1.74h3.86l.37 1.74H38.5l-2.5-11.5h-.56zM32.23 17l1.2-3.26.38-1.04.2 1.04.7 3.26h-2.48zM17.5 9.5L14.53 17l-.32-1.62c-.55-1.88-2.28-3.91-4.21-4.93l2.7 10.04h3.18l4.73-11h-3.11z" fill="#fff"/><path d="M11.95 9.5H7.05l-.05.3c3.77.96 6.27 3.3 7.3 6.1l-1.05-5.37c-.18-.73-.71-.98-1.3-1.03z" fill="#F9A533"/></svg>
  ),
  mastercard: (
    <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#252525"/><circle cx="19" cy="16" r="8" fill="#EB001B"/><circle cx="29" cy="16" r="8" fill="#F79E1B"/><path d="M24 10.34a7.97 7.97 0 013 5.66 7.97 7.97 0 01-3 5.66 7.97 7.97 0 01-3-5.66 7.97 7.97 0 013-5.66z" fill="#FF5F00"/></svg>
  ),
  amex: (
    <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#2E77BC"/><text x="24" y="18" textAnchor="middle" fill="#fff" fontSize="8" fontWeight="bold" fontFamily="sans-serif">AMEX</text></svg>
  ),
  discover: (
    <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#FF6600"/><text x="24" y="18" textAnchor="middle" fill="#fff" fontSize="7" fontWeight="bold" fontFamily="sans-serif">DISCOVER</text></svg>
  ),
};

function CardIcon({ brand }) {
  return BRAND_ICONS[brand] || (
    <svg className="h-8 w-12" viewBox="0 0 48 32" fill="none"><rect width="48" height="32" rx="4" fill="#e5e7eb"/><rect x="6" y="10" width="12" height="3" rx="1" fill="#9ca3af"/><rect x="6" y="19" width="20" height="2" rx="1" fill="#9ca3af"/><rect x="6" y="23" width="14" height="2" rx="1" fill="#9ca3af"/></svg>
  );
}

function PaymentMethodsSection() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [settingDefault, setSettingDefault] = useState(null);
  const [removing, setRemoving] = useState(null);

  const loadMethods = useCallback(async () => {
    try {
      const res = await api.get('/payments/methods');
      setMethods(res.data.methods || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { loadMethods(); }, [loadMethods]);

  async function handleAddCard() {
    setAdding(true);
    try {
      const res = await api.post('/payments/setup-intent');
      const clientSecret = res.data.clientSecret;

      if (clientSecret === 'dev_mock_setup_secret') {
        const mockCard = {
          id: `pm_mock_${Date.now()}`,
          brand: ['visa', 'mastercard', 'amex'][Math.floor(Math.random() * 3)],
          last4: String(Math.floor(1000 + Math.random() * 9000)),
          expMonth: Math.floor(1 + Math.random() * 12),
          expYear: 2027 + Math.floor(Math.random() * 4),
          isDefault: methods.length === 0,
        };
        setMethods((prev) => [...prev, mockCard]);
        setAdding(false);
        return;
      }

      const { loadStripe } = await import('@stripe/stripe-js');
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (!stripe) { setAdding(false); return; }

      const { error } = await stripe.confirmCardSetup(clientSecret, {
        payment_method: { card: { token: 'tok_visa' } },
      });

      if (!error) await loadMethods();
    } catch {}
    setAdding(false);
  }

  async function handleSetDefault(id) {
    setSettingDefault(id);
    try {
      await api.patch(`/payments/methods/${id}/default`);
      setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch {}
    setSettingDefault(null);
  }

  async function handleRemove(id) {
    if (!confirm('Remove this card?')) return;
    setRemoving(id);
    try {
      await api.delete(`/payments/methods/${id}`);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch {}
    setRemoving(null);
  }

  return (
    <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Payment Methods</h2>
        <button
          onClick={handleAddCard}
          disabled={adding}
          className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:opacity-50"
        >
          {adding ? 'Adding...' : '+ Add Card'}
        </button>
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : methods.length === 0 ? (
        <div className="mt-3 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
          <p className="mt-2 text-sm text-gray-400">No payment methods saved</p>
          <button
            onClick={handleAddCard}
            disabled={adding}
            className="mt-3 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
          >
            {adding ? 'Adding...' : 'Add a Card'}
          </button>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {methods.map((m) => (
            <div key={m.id} className={`flex items-center gap-3 rounded-lg p-3 transition ${m.isDefault ? 'bg-brand-50 border border-brand-200' : 'bg-gray-50'}`}>
              <CardIcon brand={m.brand} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium capitalize">{m.brand} ····{m.last4}</p>
                  {m.isDefault && (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">Default</span>
                  )}
                </div>
                <p className="text-xs text-gray-400">Expires {String(m.expMonth).padStart(2, '0')}/{m.expYear}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {!m.isDefault && (
                  <button
                    onClick={() => handleSetDefault(m.id)}
                    disabled={settingDefault === m.id}
                    className="rounded px-2 py-1 text-xs font-medium text-brand-600 hover:bg-brand-50 disabled:opacity-50"
                  >
                    {settingDefault === m.id ? '...' : 'Set Default'}
                  </button>
                )}
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={removing === m.id}
                  className="rounded px-2 py-1 text-xs text-red-500 hover:bg-red-50 disabled:opacity-50"
                >
                  {removing === m.id ? '...' : 'Remove'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
