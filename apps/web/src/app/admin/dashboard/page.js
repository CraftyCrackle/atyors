'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import Logo from '../../../components/Logo';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const STATUS_LABELS = {
  pending: 'Pending', active: 'Active', 'en-route': 'En Route',
  arrived: 'Arrived', 'in-progress': 'In Progress',
  completed: 'Completed', cancelled: 'Cancelled',
};

function StatCard({ label, value, icon, color }) {
  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-3 sm:p-5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg sm:h-10 sm:w-10 ${color}`}>
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-xs text-gray-400 sm:text-sm">{label}</p>
          <p className="text-xl font-bold text-white sm:text-2xl">{value ?? '—'}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { user, logout } = useAuthStore();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [capInput, setCapInput] = useState('');
  const [capSaving, setCapSaving] = useState(false);
  const [capMsg, setCapMsg] = useState('');
  const [ecCapInput, setEcCapInput] = useState('');
  const [ecCapSaving, setEcCapSaving] = useState(false);
  const [ecCapMsg, setEcCapMsg] = useState('');
  const [zipcodes, setZipcodes] = useState([]);
  const [zipInput, setZipInput] = useState('');
  const [zipSaving, setZipSaving] = useState(false);
  const [zipMsg, setZipMsg] = useState('');

  async function load() {
    try {
      const [summaryRes, bookingsRes, settingsRes] = await Promise.all([
        api.get('/admin/reports/summary'),
        api.get('/admin/bookings?limit=10'),
        api.get('/admin/settings'),
      ]);
      setStats(summaryRes.data);
      setBookings(bookingsRes.data.bookings || []);
      if (!capInput) setCapInput(String(summaryRes.data.dailyBookingCap || 100));
      if (!ecCapInput) setEcCapInput(String(summaryRes.data.entranceCleaningDailyCap ?? 0));
      setZipcodes(settingsRes.data.settings?.servedZipcodes || []);
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  async function saveCap() {
    const val = parseInt(capInput);
    if (isNaN(val) || val < 1) { setCapMsg('Must be at least 1'); return; }
    setCapSaving(true);
    setCapMsg('');
    try {
      await api.patch('/admin/settings', { dailyBookingCap: val });
      setCapMsg('Saved');
      load();
    } catch { setCapMsg('Failed to save'); }
    setCapSaving(false);
    setTimeout(() => setCapMsg(''), 3000);
  }

  async function saveEcCap() {
    const val = parseInt(ecCapInput);
    if (isNaN(val) || val < 0) { setEcCapMsg('Must be 0 (unlimited) or higher'); return; }
    setEcCapSaving(true);
    setEcCapMsg('');
    try {
      await api.patch('/admin/settings', { entranceCleaningDailyCap: val });
      setEcCapMsg('Saved');
      load();
    } catch { setEcCapMsg('Failed to save'); }
    setEcCapSaving(false);
    setTimeout(() => setEcCapMsg(''), 3000);
  }

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] min-h-[100vh] w-full flex-col overflow-x-hidden bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-header-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Logo size="sm" variant="wordmark" dark />
              <span className="hidden text-xs text-gray-500 sm:inline">Admin Portal</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-sm text-gray-400 sm:inline">{user?.firstName} {user?.lastName}</span>
              <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto w-full max-w-5xl px-4 py-4">
          <h1 className="text-xl font-bold text-white">Dashboard</h1>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            <Link href="/admin/bookings" className="shrink-0 rounded-lg bg-brand-600 px-3.5 py-2 text-sm font-medium text-white hover:bg-brand-700">
              All Bookings
            </Link>
            <Link href="/admin/users" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Users
            </Link>
            <Link href="/admin/customers" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Customers
            </Link>
            <Link href="/admin/zipcodes" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Zipcodes
            </Link>
            <Link href="/admin/carousel" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Carousel
            </Link>
            <Link href="/admin/services" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Services
            </Link>
            <a href="#settings" className="shrink-0 rounded-lg border border-gray-700 px-3.5 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
              Settings
            </a>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
                <StatCard label="Total Bookings" value={stats?.totalBookings} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="bg-brand-500/20 text-brand-400" />
                <StatCard label="Active" value={stats?.activeBookings} icon="M13 10V3L4 14h7v7l9-11h-7z" color="bg-yellow-500/20 text-yellow-400" />
                <StatCard label="Completed" value={stats?.completedBookings} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500/20 text-green-400" />
                <StatCard label="Customers" value={stats?.totalCustomers} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" color="bg-purple-500/20 text-purple-400" />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 sm:gap-4">
                {[
                  { label: 'Total Revenue', value: stats?.totalRevenue },
                  { label: 'This Week', value: stats?.weekRevenue },
                  { label: 'This Month', value: stats?.monthRevenue },
                ].map((r) => (
                  <div key={r.label} className="rounded-xl border border-gray-700 bg-gray-800 p-2.5 sm:p-5">
                    <p className="text-[10px] uppercase font-semibold text-gray-400 truncate">{r.label}</p>
                    <p className="mt-1 text-base font-bold text-white sm:text-xl">${(r.value || 0).toFixed(2)}</p>
                  </div>
                ))}
              </div>

              <div id="settings" className="mt-8 rounded-xl border border-gray-700 bg-gray-800 p-4">
                <h2 className="text-lg font-semibold text-white">Settings</h2>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-300">Daily booking limit</label>
                  <p className="mt-0.5 text-xs text-gray-500">Max number of reservations accepted per day</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min="1"
                      value={capInput}
                      onChange={(e) => setCapInput(e.target.value)}
                      className="w-28 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                    />
                    <button onClick={saveCap} disabled={capSaving}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                      {capSaving ? 'Saving...' : 'Save'}
                    </button>
                    {capMsg && <span className={`text-xs ${capMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{capMsg}</span>}
                  </div>
                  {stats && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Today:</span>
                        <span className={`font-semibold ${stats.todayBooked >= stats.dailyBookingCap ? 'text-red-400' : 'text-green-400'}`}>
                          {stats.todayBooked} / {stats.dailyBookingCap}
                        </span>
                        {stats.todayBooked >= stats.dailyBookingCap && (
                          <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">At capacity</span>
                        )}
                      </div>
                      <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all ${stats.todayBooked >= stats.dailyBookingCap ? 'bg-red-500' : 'bg-brand-500'}`}
                          style={{ width: `${Math.min(100, (stats.todayBooked / stats.dailyBookingCap) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-6 border-t border-gray-700 pt-5">
                  <label className="block text-sm font-medium text-gray-300">Entrance Cleaning daily limit</label>
                  <p className="mt-0.5 text-xs text-gray-500">Max entrance cleaning jobs per day. Set to <strong className="text-gray-400">0</strong> for unlimited.</p>
                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      value={ecCapInput}
                      onChange={(e) => setEcCapInput(e.target.value)}
                      className="w-28 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                    />
                    <button onClick={saveEcCap} disabled={ecCapSaving}
                      className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">
                      {ecCapSaving ? 'Saving...' : 'Save'}
                    </button>
                    {ecCapMsg && <span className={`text-xs ${ecCapMsg === 'Saved' ? 'text-green-400' : 'text-red-400'}`}>{ecCapMsg}</span>}
                  </div>
                  {stats && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-400">Today:</span>
                        {stats.entranceCleaningDailyCap === 0 ? (
                          <span className="font-semibold text-green-400">{stats.ecTodayBooked ?? 0} <span className="font-normal text-gray-500">(unlimited)</span></span>
                        ) : (
                          <>
                            <span className={`font-semibold ${stats.ecTodayBooked >= stats.entranceCleaningDailyCap ? 'text-red-400' : 'text-green-400'}`}>
                              {stats.ecTodayBooked ?? 0} / {stats.entranceCleaningDailyCap}
                            </span>
                            {stats.ecTodayBooked >= stats.entranceCleaningDailyCap && (
                              <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-xs font-medium text-red-400">At capacity</span>
                            )}
                          </>
                        )}
                      </div>
                      {stats.entranceCleaningDailyCap > 0 && (
                        <div className="mt-1.5 h-2 w-full max-w-xs overflow-hidden rounded-full bg-gray-700">
                          <div
                            className={`h-full rounded-full transition-all ${stats.ecTodayBooked >= stats.entranceCleaningDailyCap ? 'bg-red-500' : 'bg-teal-500'}`}
                            style={{ width: `${Math.min(100, ((stats.ecTodayBooked ?? 0) / stats.entranceCleaningDailyCap) * 100)}%` }}
                          />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 rounded-xl border border-gray-700 bg-gray-800 p-4">
                <h2 className="text-lg font-semibold text-white">Served Zipcodes</h2>
                <p className="mt-0.5 text-xs text-gray-500">Clients can only book services for addresses in these zipcodes</p>

                <div className="mt-4 flex items-center gap-3">
                  <input
                    type="text"
                    maxLength={5}
                    placeholder="e.g. 02149"
                    value={zipInput}
                    onChange={(e) => setZipInput(e.target.value.replace(/\D/g, '').slice(0, 5))}
                    className="w-28 rounded-lg border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-white focus:border-brand-500 focus:outline-none"
                  />
                  <button
                    onClick={async () => {
                      if (!/^\d{5}$/.test(zipInput)) { setZipMsg('Enter a 5-digit zipcode'); return; }
                      setZipSaving(true); setZipMsg('');
                      try {
                        const res = await api.post('/admin/zipcodes', { zipcode: zipInput });
                        setZipcodes(res.data.servedZipcodes);
                        setZipInput('');
                        setZipMsg('Added');
                      } catch (err) { setZipMsg(err.message || 'Failed'); }
                      setZipSaving(false);
                      setTimeout(() => setZipMsg(''), 3000);
                    }}
                    disabled={zipSaving}
                    className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50"
                  >
                    {zipSaving ? 'Adding...' : 'Add'}
                  </button>
                  {zipMsg && <span className={`text-xs ${zipMsg === 'Added' ? 'text-green-400' : 'text-red-400'}`}>{zipMsg}</span>}
                </div>

                {zipcodes.length === 0 ? (
                  <p className="mt-4 text-sm text-gray-500">No zipcodes configured. All addresses will be blocked until you add at least one.</p>
                ) : (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {zipcodes.map((z) => (
                      <div key={z} className="flex items-center gap-1.5 rounded-full border border-gray-600 bg-gray-700 px-3 py-1.5">
                        <span className="text-sm font-medium text-white">{z}</span>
                        <button
                          onClick={async () => {
                            try {
                              const res = await api.delete(`/admin/zipcodes/${z}`);
                              setZipcodes(res.data.servedZipcodes);
                            } catch { }
                          }}
                          className="rounded-full p-0.5 text-gray-400 hover:text-red-400 transition"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-8">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-white">Recent Bookings</h2>
                  <Link href="/admin/bookings" className="text-sm text-brand-400 hover:text-brand-300">View all</Link>
                </div>
                <div className="mt-4 space-y-3">
                  {bookings.length === 0 ? (
                    <p className="py-8 text-center text-sm text-gray-500">No bookings yet</p>
                  ) : bookings.map((b) => (
                    <div key={b._id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-medium text-white">{b.serviceTypeId?.name || 'Service'}</p>
                          <p className="mt-0.5 text-sm text-gray-400">
                            {b.userId?.firstName} {b.userId?.lastName}
                            <span className="mx-1.5 text-gray-600">&middot;</span>
                            {new Date(b.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            {b.barrelCount > 0 && <><span className="mx-1.5 text-gray-600">&middot;</span>{b.barrelCount} barrel{b.barrelCount > 1 ? 's' : ''}</>}
                          </p>
                        </div>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-600 text-gray-300'}`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </div>
                      {b.addressId && (
                        <p className="mt-2 text-xs text-gray-500">{b.addressId.street}, {b.addressId.city}</p>
                      )}
                      {b.assignedTo && (
                        <p className="mt-1 text-xs text-gray-500">Servicer: {b.assignedTo.firstName} {b.assignedTo.lastName}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
