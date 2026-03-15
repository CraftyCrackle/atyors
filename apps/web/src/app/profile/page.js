'use client';

import { useEffect, useState, useCallback } from 'react';
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { useInstall } from '../../components/InstallContext';
import AppStoreBadge from '../../components/AppStoreBadge';
import PhotoViewer from '../../components/PhotoViewer';

export default function ProfilePage() {
  const { user, logout, updateUser } = useAuthStore();
  const { canInstall, isStandalone, isIos, hasAppStore, triggerInstall } = useInstall();
  const [addresses, setAddresses] = useState([]);
  const [editing, setEditing] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);
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
    } catch (err) { alert(err.message || 'Failed to upload photo'); }
    setUploadingPhoto(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await api.patch('/users/me', form);
      updateUser(res.data.user);
      setEditing(false);
    } catch (err) { alert(err.message || 'Failed to save profile'); }
    setSaving(false);
  }

  async function deleteAddress(id) {
    try {
      await api.delete(`/addresses/${id}`);
      setAddresses(addresses.filter((a) => a._id !== id));
    } catch (err) { alert(err.message || 'Failed to delete address'); }
  }

  const dark = !isCustomer;
  const cardCls = dark ? 'rounded-xl border border-gray-700 bg-gray-800 p-4' : 'rounded-xl bg-white p-4 shadow-sm';
  const inputCls = dark
    ? 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none'
    : 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  return (
    <AuthGuard>
      <div className={`min-h-[100dvh] min-h-[100vh] pb-24 ${dark ? 'bg-gray-900 text-white' : 'bg-gray-50'}`}>
        <header className={`sticky top-0 z-10 px-6 pb-6 pt-header-safe ${dark ? 'border-b border-gray-800 bg-gray-900' : 'bg-white shadow-sm'}`}>
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

          <ChangePasswordSection dark={dark} cardCls={cardCls} />

          <TrashDayReminderSection dark={dark} cardCls={cardCls} user={user} updateUser={updateUser} />

          <div className={`mt-4 ${cardCls}`}>
            <div className="flex items-center justify-between">
              <h2 className={`font-semibold ${dark ? 'text-white' : ''}`}>Addresses</h2>
              <button onClick={() => setAddingAddress(!addingAddress)} className="text-sm font-medium text-brand-600">
                {addingAddress ? 'Cancel' : '+ Add'}
              </button>
            </div>
            {addingAddress && (
              <AddAddressForm dark={dark} onAdded={(addr) => { setAddresses((prev) => [...prev, addr]); setAddingAddress(false); }} onCancel={() => setAddingAddress(false)} />
            )}
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


          {isCustomer && <SubscriptionSection />}

          {isCustomer && <PaymentMethodsSection user={user} />}

          {isCustomer && <InvoiceSection />}

          {!isStandalone && isIos && hasAppStore && (
            <div className="mt-4 flex justify-center">
              <AppStoreBadge />
            </div>
          )}
          {!isStandalone && canInstall && !isIos && (
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

          {isCustomer && <DeleteAccountSection onDeleted={logout} />}
        </div>

        {isCustomer && <BottomNav />}
      </div>
    </AuthGuard>
  );
}

function ChangePasswordSection({ dark, cardCls }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const baseCls = dark
    ? 'w-full rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none'
    : 'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.newPassword.length < 8) { setError('New password must be at least 8 characters'); return; }
    if (form.newPassword !== form.confirmPassword) { setError('Passwords do not match'); return; }
    setSaving(true);
    try {
      await api.patch('/users/me/password', { currentPassword: form.currentPassword, newPassword: form.newPassword });
      setSuccess(true);
      setForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => { setSuccess(false); setOpen(false); }, 2000);
    } catch (err) {
      setError(err.message || 'Failed to change password');
    } finally { setSaving(false); }
  }

  return (
    <div className={`mt-4 ${cardCls}`}>
      <div className="flex items-center justify-between">
        <h2 className={`font-semibold ${dark ? 'text-white' : ''}`}>Password</h2>
        <button onClick={() => { setOpen(!open); setError(''); setSuccess(false); }} className="text-sm font-medium text-brand-600">
          {open ? 'Cancel' : 'Change'}
        </button>
      </div>
      {!open && (
        <p className={`mt-1 text-sm ${dark ? 'text-gray-400' : 'text-gray-500'}`}>••••••••</p>
      )}
      {open && (
        <form onSubmit={handleSubmit} className="mt-3 space-y-3">
          <input type="password" placeholder="Current password" value={form.currentPassword}
            onChange={(e) => setForm({ ...form, currentPassword: e.target.value })} className={baseCls} required autoComplete="current-password" />
          <input type="password" placeholder="New password (min 8 chars)" value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })} className={baseCls} required minLength={8} autoComplete="new-password" />
          <input type="password" placeholder="Confirm new password" value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })} className={baseCls} required autoComplete="new-password" />
          {error && <p className="text-xs text-red-500">{error}</p>}
          {success && <p className="text-xs text-green-600">Password updated!</p>}
          <button type="submit" disabled={saving}
            className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
            {saving ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      )}
    </div>
  );
}

function TrashDayReminderSection({ dark, cardCls, user, updateUser }) {
  const reminder = user?.trashDayReminder || { enabled: false, time: '18:00' };
  const [saving, setSaving] = useState(false);

  async function update(field, value) {
    setSaving(true);
    try {
      const updated = { ...reminder, [field]: value };
      const res = await api.patch('/users/me', { trashDayReminder: updated });
      updateUser(res.data.user);
    } catch (err) { alert(err.message || 'Failed to update'); }
    setSaving(false);
  }

  const TIME_OPTIONS = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 30]) {
      const val = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      const label = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
      TIME_OPTIONS.push({ value: val, label });
    }
  }

  const timeVal = reminder.time || '18:00';
  const hour = parseInt(timeVal.split(':')[0], 10);
  const isEvening = hour >= 12;
  const displayTime = TIME_OPTIONS.find((o) => o.value === timeVal)?.label || timeVal;

  return (
    <div className={`mt-4 ${cardCls}`}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className={`font-semibold ${dark ? 'text-white' : ''}`}>Trash Day Reminders</h2>
          <p className={`mt-0.5 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
            Never forget to put your barrels out
          </p>
        </div>
        <button
          disabled={saving}
          onClick={() => update('enabled', !reminder.enabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors ${reminder.enabled ? 'bg-brand-600' : dark ? 'bg-gray-600' : 'bg-gray-200'}`}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition-transform ${reminder.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </button>
      </div>
      {reminder.enabled && (
        <div className="mt-3 space-y-2">
          <label className={`text-xs font-medium ${dark ? 'text-gray-300' : 'text-gray-600'}`}>
            What time should we remind you?
          </label>
          <div className="flex items-center gap-3">
            <select
              value={timeVal}
              disabled={saving}
              onChange={(e) => update('time', e.target.value)}
              className={`flex-1 rounded-lg border-2 px-3 py-2.5 text-sm font-medium transition focus:border-brand-600 focus:outline-none ${
                dark ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-200 bg-white text-gray-900'
              }`}
            >
              {TIME_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
              isEvening ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {isEvening ? 'Night before' : 'Morning of'}
            </span>
          </div>
          <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
            {isEvening
              ? `You'll get a reminder at ${displayTime} the night before your trash day`
              : `You'll get a reminder at ${displayTime} the morning of your trash day`}
          </p>
        </div>
      )}
    </div>
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
    } catch (err) { alert(err.message || 'Failed to save address'); }
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
      if (data.success) {
        onUpdated(data.data.address);
      } else {
        alert(data.error?.message || 'Failed to upload photo');
      }
    } catch (err) { alert(err.message || 'Failed to upload photo'); }
    setUploadingBarrelPhoto(false);
    e.target.value = '';
  }

  async function handleAddPhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploadingBarrelPhoto(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/addresses/${address._id}/photos`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (data.success) {
        onUpdated(data.data.address);
      } else {
        alert(data.error?.message || 'Failed to upload photos');
      }
    } catch (err) { alert(err.message || 'Failed to upload photos'); }
    setUploadingBarrelPhoto(false);
    e.target.value = '';
  }

  async function handleRemovePhoto(idx) {
    try {
      const res = await api.delete(`/addresses/${address._id}/photos/${idx}`);
      if (res.data) onUpdated(res.data.address);
    } catch (err) { alert(err.message || 'Failed to remove photo'); }
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
          <label className="text-xs text-gray-500">Photos to help your servicer (up to 10)</label>
          <p className="text-[11px] text-gray-400 mt-0.5">Show barrel location, curb spot, driveway, or anything helpful.</p>
          {(address.barrelPhotoUrl || address.photos?.length > 0) && (
            <div className="mt-2 grid grid-cols-3 gap-2">
              {address.barrelPhotoUrl && (
                <div className="relative">
                  <PhotoViewer src={address.barrelPhotoUrl} alt="Main barrel photo" className="h-24 w-full rounded-lg object-cover" />
                  <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[9px] font-medium text-white pointer-events-none">Main</span>
                </div>
              )}
              {address.photos?.map((url, i) => (
                <div key={i} className="relative">
                  <PhotoViewer src={url} alt={`Photo ${i + 1}`} className="h-24 w-full rounded-lg object-cover" />
                  <button type="button" onClick={() => handleRemovePhoto(i)} className="absolute top-1 right-1 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-red-600">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-2 flex gap-2">
            <label className="flex-1 flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-3 py-2.5 text-sm text-gray-500 hover:border-brand-400 hover:text-brand-600 transition">
              {uploadingBarrelPhoto ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
              ) : (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
              {(address.photos?.length || 0) + (address.barrelPhotoUrl ? 1 : 0) > 0 ? 'Add more photos' : 'Add photos'}
              <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" disabled={uploadingBarrelPhoto} />
            </label>
          </div>
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
      {(address.barrelPhotoUrl || address.photos?.length > 0) ? (
        <div className="mt-2 flex gap-1.5 overflow-x-auto">
          {address.barrelPhotoUrl && <PhotoViewer src={address.barrelPhotoUrl} alt="Barrel" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
          {address.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />)}
        </div>
      ) : (
        <label className="mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 transition">
          {uploadingBarrelPhoto ? (
            <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
          ) : (
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
          Add photos to help servicers
          <input type="file" accept="image/*" multiple onChange={handleAddPhotos} className="hidden" disabled={uploadingBarrelPhoto} />
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
          {address.barrelPlacementInstructions && <span>Curb: {address.barrelPlacementInstructions}</span>}
          {address.barrelReturnInstructions && <span>Return: {address.barrelReturnInstructions}</span>}
        </div>
      )}
    </div>
  );
}

function AddAddressForm({ dark, onAdded, onCancel }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ street: '', unit: '', city: '', state: '', zip: '', barrelCount: 1, barrelLocation: '', trashDay: '' });
  const [photos, setPhotos] = useState([]);
  const [photoPreviews, setPhotoPreviews] = useState([]);
  const [uploading, setUploading] = useState(false);
  const update = (f) => (e) => setForm({ ...form, [f]: e.target.value });

  const baseCls = dark
    ? 'rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white placeholder-gray-400 focus:border-brand-500 focus:outline-none'
    : 'rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none';

  function handlePhotos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const allowed = 10 - photos.length;
    const toAdd = files.slice(0, allowed);
    setPhotos((prev) => [...prev, ...toAdd]);
    setPhotoPreviews((prev) => [...prev, ...toAdd.map((f) => URL.createObjectURL(f))]);
    e.target.value = '';
  }

  function removePhoto(idx) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
    setPhotoPreviews((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSave() {
    if (!form.street || !form.city || !form.state || !form.zip) {
      alert('Please fill in all required address fields.');
      return;
    }
    setSaving(true);
    try {
      const res = await api.post('/addresses', {
        ...form,
        barrelCount: parseInt(form.barrelCount) || 1,
        formatted: `${form.street}, ${form.city}, ${form.state} ${form.zip}`,
      });
      let addr = res.data.address;

      if (photos.length > 0) {
        setUploading(true);
        const token = localStorage.getItem('accessToken');
        const fd = new FormData();
        fd.append('photo', photos[0]);
        const photoRes = await fetch(`/api/v1/addresses/${addr._id}/photo`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd,
        });
        const photoData = await photoRes.json();
        if (photoData.success) addr = photoData.data.address || { ...addr, barrelPhotoUrl: photoData.data.photoUrl };

        if (photos.length > 1) {
          const fd2 = new FormData();
          photos.slice(1).forEach((f) => fd2.append('photos', f));
          const multiRes = await fetch(`/api/v1/addresses/${addr._id}/photos`, {
            method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd2,
          });
          const multiData = await multiRes.json();
          if (multiData.success) addr = multiData.data.address || { ...addr, photos: multiData.data.photos };
        }
        setUploading(false);
      }

      onAdded(addr);
    } catch (err) { alert(err.message || 'Failed to add address'); }
    setSaving(false);
    setUploading(false);
  }

  return (
    <div className={`mt-3 space-y-3 rounded-lg border p-4 ${dark ? 'border-brand-500/30 bg-gray-900/50' : 'border-brand-200 bg-brand-50/30'}`}>
      <p className={`text-xs font-semibold uppercase ${dark ? 'text-gray-400' : 'text-gray-500'}`}>New Address</p>
      <input type="text" placeholder="Street address" value={form.street} onChange={update('street')} className={`w-full ${baseCls}`} />
      <div className="flex gap-2">
        <input type="text" placeholder="Apt / Unit" value={form.unit} onChange={update('unit')} className={`w-24 shrink-0 ${baseCls}`} />
        <input type="text" placeholder="City" value={form.city} onChange={update('city')} className={`min-w-0 flex-1 ${baseCls}`} />
      </div>
      <div className="flex gap-2">
        <input type="text" placeholder="State" value={form.state} onChange={update('state')} className={`w-20 shrink-0 ${baseCls}`} />
        <input type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} className={`min-w-0 flex-1 ${baseCls}`} />
      </div>
      <div className="flex gap-2">
        <div className="flex-1 min-w-0">
          <label className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Barrels</label>
          <input type="number" min="1" value={form.barrelCount} onChange={(e) => setForm({ ...form, barrelCount: e.target.value })} className={`w-full ${baseCls}`} />
        </div>
        <div className="flex-1 min-w-0">
          <label className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Trash day</label>
          <select value={form.trashDay} onChange={update('trashDay')} className={`w-full ${baseCls}`}>
            <option value="">Select</option>
            {DAYS_OF_WEEK.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>
      <input type="text" placeholder='Barrel location (e.g. "Left side of garage")' value={form.barrelLocation} onChange={update('barrelLocation')} className={`w-full ${baseCls}`} />

      <div>
        <label className={`text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>Photos to help your servicer (up to 10)</label>
        <p className={`text-[11px] mt-0.5 ${dark ? 'text-gray-500' : 'text-gray-400'}`}>Show barrel location, curb spot, driveway, or anything helpful.</p>
        {photoPreviews.length > 0 && (
          <div className="mt-2 grid grid-cols-3 gap-2">
            {photoPreviews.map((url, i) => (
              <div key={i} className="relative">
                <PhotoViewer src={url} alt={`Photo ${i + 1}`} className="h-20 w-full rounded-lg object-cover" />
                <button type="button" onClick={(e) => { e.stopPropagation(); removePhoto(i); }}
                  className="absolute top-1 right-1 z-10 rounded-full bg-black/50 p-1 text-white hover:bg-red-600">
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            ))}
          </div>
        )}
        {photos.length < 10 && (
          <label className={`mt-2 flex cursor-pointer items-center gap-2 rounded-lg border border-dashed px-3 py-2.5 text-sm transition ${dark ? 'border-gray-600 text-gray-400 hover:border-brand-400 hover:text-brand-400' : 'border-gray-300 text-gray-500 hover:border-brand-400 hover:text-brand-600'}`}>
            {uploading ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
            {photos.length === 0 ? 'Add photos' : `Add more (${photos.length}/10)`}
            <input type="file" accept="image/*" multiple onChange={handlePhotos} className="hidden" disabled={uploading} />
          </label>
        )}
      </div>

      <button onClick={handleSave} disabled={saving || uploading} className="w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
        {uploading ? 'Uploading photos...' : saving ? 'Saving...' : 'Save Address'}
      </button>
    </div>
  );
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function SubscriptionSection() {
  const [subs, setSubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/subscriptions');
        setSubs(res.data.subscriptions || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  async function handleToggleAutoRenew(sub) {
    const newValue = !!sub.cancelAtPeriodEnd;
    setToggling(sub._id);
    try {
      const res = await api.patch(`/subscriptions/${sub._id}/auto-renew`, { autoRenew: newValue });
      setSubs((prev) => prev.map((s) => s._id === sub._id ? { ...s, cancelAtPeriodEnd: !newValue } : s));
    } catch (err) { alert(err.message || 'Failed to update auto-renewal'); }
    setToggling(null);
  }

  async function handleCancel(id) {
    setCancelling(id);
    try {
      await api.post(`/subscriptions/${id}/cancel`);
      setSubs((prev) => prev.map((s) => s._id === id ? { ...s, status: 'cancelled', cancelledAt: new Date().toISOString() } : s));
    } catch (err) { alert(err.message || 'Failed to cancel subscription'); }
    setCancelling(null);
    setConfirmCancel(null);
  }

  const active = subs.filter((s) => s.status !== 'cancelled');
  const cancelled = subs.filter((s) => s.status === 'cancelled');

  return (
    <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">My Subscriptions</h2>
        {active.length > 0 && (
          <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[10px] font-semibold text-brand-700">{active.length} active</span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : subs.length === 0 ? (
        <div className="mt-3 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182M2.985 19.644l3.181-3.182" />
          </svg>
          <p className="mt-2 text-sm text-gray-400">No subscriptions yet</p>
          <a href="/book?plan=subscription" className="mt-3 inline-block rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700">
            Subscribe to a Plan
          </a>
        </div>
      ) : (
        <div className="mt-3 space-y-3">
          {active.map((sub) => (
            <SubscriptionCard key={sub._id} sub={sub} toggling={toggling} onToggle={handleToggleAutoRenew}
              confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel}
              cancelling={cancelling} onCancel={handleCancel} />
          ))}
          {cancelled.length > 0 && (
            <div className="pt-2">
              <p className="mb-2 text-xs font-medium text-gray-400 uppercase">Past</p>
              {cancelled.map((sub) => (
                <SubscriptionCard key={sub._id} sub={sub} toggling={toggling} onToggle={handleToggleAutoRenew}
                  confirmCancel={confirmCancel} setConfirmCancel={setConfirmCancel}
                  cancelling={cancelling} onCancel={handleCancel} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SubscriptionCard({ sub, toggling, onToggle, confirmCancel, setConfirmCancel, cancelling, onCancel }) {
  const svc = sub.serviceTypeId;
  const addr = sub.addressId;
  const isCancelled = sub.status === 'cancelled';
  const isPastDue = sub.status === 'past_due';
  const autoRenewOn = !sub.cancelAtPeriodEnd && !isCancelled;
  const periodEnd = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;

  const statusColor = isCancelled
    ? 'bg-gray-100 text-gray-500'
    : isPastDue
      ? 'bg-red-100 text-red-700'
      : autoRenewOn
        ? 'bg-green-100 text-green-700'
        : 'bg-amber-100 text-amber-700';
  const statusLabel = isCancelled
    ? 'Cancelled'
    : isPastDue
      ? 'Past Due'
      : autoRenewOn
        ? 'Active'
        : 'Ending Soon';

  return (
    <div className={`rounded-xl border p-4 transition ${isCancelled ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'}`}>
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{svc?.name || 'Monthly Plan'}</p>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColor}`}>{statusLabel}</span>
          </div>
          {addr && <p className="mt-0.5 text-xs text-gray-500">{addr.street}, {addr.city}</p>}
        </div>
        <p className="text-lg font-bold text-brand-600 shrink-0">${sub.monthlyPrice?.toFixed(2)}<span className="text-xs font-normal text-gray-400">/mo</span></p>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span className="inline-flex items-center gap-1">
          <svg className="h-3.5 w-3.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
          Every {DAY_NAMES[sub.dayOfWeek]}
        </span>
        {sub.barrelCount > 0 && <span>{sub.barrelCount} barrel{sub.barrelCount > 1 ? 's' : ''}</span>}
        {sub.putOutTime && <span>Out: {sub.putOutTime}</span>}
        {sub.bringInTime && <span>In: {sub.bringInTime}</span>}
      </div>

      {periodEnd && !isCancelled && (
        <p className="mt-2 text-xs text-gray-400">
          {autoRenewOn ? 'Renews' : 'Ends'}{' '}
          {periodEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}
      {isCancelled && sub.cancelledAt && (
        <p className="mt-2 text-xs text-gray-400">
          Cancelled {new Date(sub.cancelledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>
      )}

      {!isCancelled && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
            <div>
              <p className="text-sm font-medium text-gray-700">Auto-renewal</p>
              <p className="text-[11px] text-gray-400">{autoRenewOn ? 'Plan renews automatically each month' : 'Plan will end after current period'}</p>
            </div>
            <button
              onClick={() => onToggle(sub)}
              disabled={toggling === sub._id}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none disabled:opacity-50 ${autoRenewOn ? 'bg-brand-600' : 'bg-gray-300'}`}
            >
              <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${autoRenewOn ? 'translate-x-5' : 'translate-x-0'}`} />
            </button>
          </div>

          {confirmCancel === sub._id ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
              <p className="text-sm font-medium text-red-700">Cancel this subscription?</p>
              <p className="text-xs text-red-600/70">All future scheduled services will be removed. This cannot be undone.</p>
              <div className="flex gap-2">
                <button onClick={() => setConfirmCancel(null)}
                  className="flex-1 rounded-lg border border-gray-300 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100">
                  Keep Plan
                </button>
                <button onClick={() => onCancel(sub._id)} disabled={cancelling === sub._id}
                  className="flex-1 rounded-lg bg-red-600 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50">
                  {cancelling === sub._id ? 'Cancelling...' : 'Yes, Cancel'}
                </button>
              </div>
            </div>
          ) : (
            <button onClick={() => setConfirmCancel(sub._id)}
              className="w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-red-500 hover:bg-red-50 transition">
              Cancel Subscription
            </button>
          )}
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

function PaymentMethodsSection({ user }) {
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

  const [showCardForm, setShowCardForm] = useState(false);
  const [setupSecret, setSetupSecret] = useState(null);

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

      setSetupSecret(clientSecret);
      setShowCardForm(true);
    } catch (err) { alert(err.message || 'Failed to set up card'); }
    setAdding(false);
  }

  function handleCardSaved() {
    setShowCardForm(false);
    setSetupSecret(null);
    loadMethods();
  }

  async function handleSetDefault(id) {
    setSettingDefault(id);
    try {
      await api.patch(`/payments/methods/${id}/default`);
      setMethods((prev) => prev.map((m) => ({ ...m, isDefault: m.id === id })));
    } catch (err) { alert(err.message || 'Failed to set default card'); }
    setSettingDefault(null);
  }

  async function handleRemove(id) {
    if (!confirm('Remove this card?')) return;
    setRemoving(id);
    try {
      await api.delete(`/payments/methods/${id}`);
      setMethods((prev) => prev.filter((m) => m.id !== id));
    } catch (err) { alert(err.message || 'Failed to remove card'); }
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

      {showCardForm && setupSecret && (
        <AddCardModal
          clientSecret={setupSecret}
          user={user}
          onSuccess={handleCardSaved}
          onClose={() => { setShowCardForm(false); setSetupSecret(null); }}
        />
      )}
    </div>
  );
}

function formatChargeDescription(desc, amountCents) {
  if (!desc) {
    if (amountCents === 100) return 'Cancellation fee';
    return 'Service charge';
  }
  if (/^cancellation fee$/i.test(desc)) return 'Cancellation fee';
  if (/cancel-[a-f0-9]/i.test(desc)) return 'Cancellation fee';
  const cleaned = desc.replace(/\s*—\s*booking\s+[a-f0-9]{20,}/i, '').replace(/^atyors service\s*—?\s*/i, '').trim();
  return cleaned || 'Service charge';
}

function InvoiceSection() {
  const [charges, setCharges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/payments/history');
        setCharges(res.data.charges || []);
      } catch {}
      setLoading(false);
    })();
  }, []);

  const visible = expanded ? charges : charges.slice(0, 3);

  return (
    <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Payment History</h2>
        {charges.length > 0 && (
          <span className="text-xs text-gray-400">{charges.length} transaction{charges.length !== 1 ? 's' : ''}</span>
        )}
      </div>

      {loading ? (
        <div className="mt-4 flex justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
        </div>
      ) : charges.length === 0 ? (
        <div className="mt-3 rounded-lg border-2 border-dashed border-gray-200 py-6 text-center">
          <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
          <p className="mt-2 text-sm text-gray-400">No invoices yet</p>
        </div>
      ) : (
        <>
          <div className="mt-3 space-y-2">
            {visible.map((c) => {
              const date = new Date(c.created * 1000);
              const succeeded = c.status === 'succeeded';
              const refunded = c.refunded;
              return (
                <div key={c.id} className="flex items-center gap-3 rounded-lg bg-gray-50 p-3">
                  <div className={`flex h-8 w-8 items-center justify-center rounded-full ${refunded ? 'bg-amber-100' : succeeded ? 'bg-green-100' : 'bg-red-100'}`}>
                    {refunded ? (
                      <svg className="h-4 w-4 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
                      </svg>
                    ) : succeeded ? (
                      <svg className="h-4 w-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="h-4 w-4 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatChargeDescription(c.description, c.amount)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {' '}&middot;{' '}
                      {c.payment_method_details?.card?.brand && (
                        <span className="capitalize">{c.payment_method_details.card.brand} ····{c.payment_method_details.card.last4}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-semibold ${refunded ? 'text-amber-600' : succeeded ? 'text-gray-900' : 'text-red-500'}`}>
                      ${(c.amount / 100).toFixed(2)}
                    </p>
                    <p className={`text-[10px] font-medium ${refunded ? 'text-amber-500' : succeeded ? 'text-green-600' : 'text-red-400'}`}>
                      {refunded ? 'Refunded' : succeeded ? 'Paid' : 'Failed'}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          {charges.length > 3 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="mt-3 w-full rounded-lg border border-gray-200 py-2 text-xs font-medium text-brand-600 transition hover:bg-brand-50"
            >
              {expanded ? 'Show less' : `View all ${charges.length} transactions`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

function DeleteAccountSection({ onDeleted }) {
  const [step, setStep] = useState(0);
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await api.delete('/users/me');
      onDeleted();
    } catch (err) {
      alert(err.message || 'Failed to delete account');
      setDeleting(false);
    }
  }

  if (step === 0) {
    return (
      <button
        onClick={() => setStep(1)}
        className="mt-4 w-full rounded-xl py-3 text-xs text-gray-400 hover:text-red-400 transition"
      >
        Delete my account
      </button>
    );
  }

  if (step === 1) {
    return (
      <div className="mt-4 rounded-xl border-2 border-red-200 bg-red-50 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
            <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <p className="font-semibold text-red-800">Are you sure?</p>
            <p className="mt-1 text-sm text-red-700">
              This will permanently delete your account, addresses, bookings, subscriptions, and payment data. This cannot be undone.
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setStep(0)} className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
            Never mind
          </button>
          <button onClick={() => setStep(2)} className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700">
            Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-3">
      <p className="text-sm font-semibold text-red-800">Type DELETE to confirm</p>
      <p className="text-xs text-red-600/70">This is your last chance. Type the word DELETE below to permanently remove your account.</p>
      <input
        type="text"
        value={confirmText}
        onChange={(e) => setConfirmText(e.target.value)}
        placeholder="Type DELETE"
        className="w-full rounded-lg border border-red-300 bg-white px-3 py-2.5 text-sm text-red-900 placeholder-red-300 focus:border-red-500 focus:outline-none"
        autoFocus
      />
      <div className="flex gap-2">
        <button onClick={() => { setStep(0); setConfirmText(''); }} className="flex-1 rounded-lg border border-gray-300 bg-white py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50">
          Cancel
        </button>
        <button
          onClick={handleDelete}
          disabled={confirmText !== 'DELETE' || deleting}
          className="flex-1 rounded-lg bg-red-600 py-2.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition"
        >
          {deleting ? 'Deleting...' : 'Permanently Delete'}
        </button>
      </div>
    </div>
  );
}

function AddCardModal({ clientSecret, user, onSuccess, onClose }) {
  const [stripe, setStripe] = useState(null);
  const [elements, setElements] = useState(null);
  const [cardReady, setCardReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { loadStripe } = await import('@stripe/stripe-js');
      const s = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      if (!mounted || !s) return;
      setStripe(s);
      const el = s.elements({ clientSecret, appearance: { theme: 'stripe' } });
      setElements(el);
    })();
    return () => { mounted = false; };
  }, [clientSecret]);

  useEffect(() => {
    if (!elements) return;
    const card = elements.create('card', {
      style: {
        base: {
          fontSize: '18px',
          color: '#1f2937',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          '::placeholder': { color: '#9ca3af' },
          lineHeight: '28px',
        },
        invalid: { color: '#ef4444' },
      },
    });
    card.mount('#card-element');
    card.on('ready', () => setCardReady(true));
    card.on('change', (e) => setError(e.error ? e.error.message : ''));
    return () => card.unmount();
  }, [elements]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSaving(true);
    setError('');
    const cardElement = elements.getElement('card');
    const billingDetails = {};
    if (user?.firstName || user?.lastName) billingDetails.name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    if (user?.email) billingDetails.email = user.email;
    const { error: err } = await stripe.confirmCardSetup(clientSecret, {
      payment_method: { card: cardElement, billing_details: billingDetails },
    });
    if (err) {
      setError(err.message);
      setSaving(false);
    } else {
      setSuccess(true);
      setTimeout(() => onSuccess(), 1200);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-[max(env(safe-area-inset-top),12px)] pb-3 border-b border-gray-100">
        <button onClick={onClose} className="text-brand-600 font-medium text-base py-2 pr-4">Cancel</button>
        <h3 className="text-lg font-bold text-gray-900">Add Payment Card</h3>
        <div className="w-16" />
      </div>

      <div className="flex-1 overflow-y-auto px-5 pt-6 pb-10">
        {success ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-xl font-semibold text-gray-900">Card saved</p>
            <p className="mt-1 text-sm text-gray-500">Your payment method has been added.</p>
          </div>
        ) : (
          <>
            {/* Card illustration */}
            <div className="mx-auto mb-6 w-56 h-36 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-800 p-5 shadow-lg">
              <div className="flex justify-between items-start">
                <div className="w-10 h-7 rounded bg-yellow-300/80" />
                <svg className="w-6 h-6 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0" />
                </svg>
              </div>
              <p className="mt-4 text-white/70 text-sm tracking-[0.25em] font-mono">•••• •••• •••• ••••</p>
              <div className="mt-3 flex justify-between">
                <p className="text-white/50 text-xs">YOUR NAME</p>
                <p className="text-white/50 text-xs">MM/YY</p>
              </div>
            </div>

            <p className="text-center text-sm text-gray-500 mb-6">
              Enter your card details below. Your information is encrypted and secure.
            </p>

            <form onSubmit={handleSubmit}>
              <label className="block text-sm font-medium text-gray-700 mb-2">Card information</label>
              <div className="rounded-xl border-2 border-gray-200 focus-within:border-brand-500 bg-gray-50 px-4 py-4 transition-colors">
                <div id="card-element" className="min-h-[28px]" />
              </div>
              <p className="mt-1.5 text-xs text-gray-400">The ZIP code must match your card&apos;s billing address, not your service address.</p>

              {error && (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-red-50 p-3">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={saving || !cardReady}
                className="mt-6 w-full rounded-xl bg-brand-600 py-4 text-base font-semibold text-white hover:bg-brand-700 active:bg-brand-800 disabled:opacity-40 transition"
              >
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Saving...
                  </span>
                ) : 'Save Card'}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-center gap-1.5 text-gray-400">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span className="text-xs">Secured by Stripe</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
