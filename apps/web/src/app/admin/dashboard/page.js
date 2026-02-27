'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';

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
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-5">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d={icon} />
          </svg>
        </div>
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className="text-2xl font-bold text-white">{value ?? '—'}</p>
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

  async function load() {
    try {
      const [summaryRes, bookingsRes] = await Promise.all([
        api.get('/admin/reports/summary'),
        api.get('/admin/bookings?limit=10'),
      ]);
      setStats(summaryRes.data);
      setBookings(bookingsRes.data.bookings || []);
    } catch { }
    setLoading(false);
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AdminGuard>
      <div className="min-h-screen-safe bg-gray-900">
        <header className="border-b border-gray-800 bg-gray-900 px-6 pb-4 pt-header-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <svg className="h-7 w-7" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#1b70f5"/><path d="M20 10l-10 8h3v10h5v-6h4v6h5V18h3L20 10z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
              <div>
                <span className="text-sm font-bold tracking-tight text-white">atyors<span className="text-brand-400">.com</span></span>
                <p className="text-xs text-gray-500">Admin Portal</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-400">{user?.firstName} {user?.lastName}</span>
              <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
                Sign Out
              </button>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-6">
          <div className="mb-6 flex items-center justify-between">
            <h1 className="text-xl font-bold text-white">Dashboard</h1>
            <div className="flex gap-2">
              <Link href="/admin/bookings" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">
                All Bookings
              </Link>
              <Link href="/admin/customers" className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-800">
                Customers
              </Link>
            </div>
          </div>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                <StatCard label="Total Bookings" value={stats?.totalBookings} icon="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" color="bg-brand-500/20 text-brand-400" />
                <StatCard label="Active" value={stats?.activeBookings} icon="M13 10V3L4 14h7v7l9-11h-7z" color="bg-yellow-500/20 text-yellow-400" />
                <StatCard label="Completed" value={stats?.completedBookings} icon="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" color="bg-green-500/20 text-green-400" />
                <StatCard label="Customers" value={stats?.totalCustomers} icon="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" color="bg-purple-500/20 text-purple-400" />
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
