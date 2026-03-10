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

  async function load() {
    try {
      const [summaryRes, bookingsRes] = await Promise.all([
        api.get('/admin/reports/summary'),
        api.get('/admin/bookings?limit=10'),
      ]);
      setStats(summaryRes.data);
      setBookings(bookingsRes.data.bookings || []);
      if (!capInput) setCapInput(String(summaryRes.data.dailyBookingCap || 100));
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

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-gray-900">
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

        <div className="mx-auto max-w-5xl px-4 py-4">
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
