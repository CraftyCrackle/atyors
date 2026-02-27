'use client';

import { useEffect, useState, useCallback } from 'react';
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

const ALL_STATUSES = ['pending', 'active', 'en-route', 'arrived', 'in-progress', 'completed', 'cancelled'];

const STATUS_TRANSITIONS = {
  pending: ['active', 'cancelled'],
  active: ['en-route', 'cancelled'],
  'en-route': ['arrived'],
  arrived: ['in-progress', 'completed'],
  'in-progress': ['completed'],
  completed: [],
  cancelled: [],
};

export default function AdminBookingsPage() {
  const { logout } = useAuthStore();
  const [bookings, setBookings] = useState([]);
  const [servicers, setServicers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [actionBookingId, setActionBookingId] = useState(null);
  const [actionError, setActionError] = useState('');

  const loadBookings = useCallback(async () => {
    try {
      let url = `/admin/bookings?page=${page}&limit=20`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (dateFilter) url += `&date=${dateFilter}`;
      const res = await api.get(url);
      setBookings(res.data.bookings || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch { }
    setLoading(false);
  }, [page, statusFilter, dateFilter]);

  useEffect(() => {
    api.get('/admin/servicers').then(r => setServicers(r.data.servicers || [])).catch(() => {});
  }, []);

  useEffect(() => { setLoading(true); loadBookings(); }, [loadBookings]);

  async function handleAssign(bookingId, servicerId) {
    setActionError('');
    setActionBookingId(bookingId);
    try {
      await api.patch(`/admin/bookings/${bookingId}/assign`, { assignedTo: servicerId });
      await loadBookings();
    } catch (err) {
      setActionError(err.message);
    }
    setActionBookingId(null);
  }

  async function handleStatusChange(bookingId, newStatus) {
    setActionError('');
    setActionBookingId(bookingId);
    try {
      await api.patch(`/admin/bookings/${bookingId}/status`, { status: newStatus });
      await loadBookings();
    } catch (err) {
      setActionError(err.message);
    }
    setActionBookingId(null);
  }

  return (
    <AdminGuard>
      <div className="min-h-screen-safe bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Link href="/admin/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="flex-1 font-semibold text-white">Bookings</h1>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">{total} total</span>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">Sign Out</button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="flex flex-wrap gap-3">
            <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none">
              <option value="">All statuses</option>
              {ALL_STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <input type="date" value={dateFilter} onChange={(e) => { setDateFilter(e.target.value); setPage(1); }}
              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-200 focus:border-brand-500 focus:outline-none" />
            {(statusFilter || dateFilter) && (
              <button onClick={() => { setStatusFilter(''); setDateFilter(''); setPage(1); }}
                className="rounded-lg px-3 py-2 text-sm text-gray-400 hover:text-white">Clear</button>
            )}
          </div>

          {actionError && (
            <div className="mt-3 rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
              {actionError}
              <button onClick={() => setActionError('')} className="ml-2 underline">Dismiss</button>
            </div>
          )}

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : bookings.length === 0 ? (
              <div className="py-16 text-center text-gray-500">No bookings match your filters</div>
            ) : bookings.map((b) => {
              const transitions = STATUS_TRANSITIONS[b.status] || [];
              const isActing = actionBookingId === b._id;
              return (
                <div key={b._id} className="rounded-xl border border-gray-700 bg-gray-800 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-white">{b.serviceTypeId?.name || 'Service'}</p>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-600 text-gray-300'}`}>
                          {STATUS_LABELS[b.status] || b.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-gray-400">
                        {new Date(b.scheduledDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {b.barrelCount > 0 && <span className="mx-1.5">&middot; {b.barrelCount} barrel{b.barrelCount > 1 ? 's' : ''}</span>}
                        {b.amount != null && <span className="mx-1.5">&middot; ${Number(b.amount).toFixed(2)}</span>}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-gray-600">#{b._id?.slice(-6)}</p>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <div className="rounded-lg bg-gray-900/50 p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase">Customer</p>
                      {b.userId ? (
                        <>
                          <p className="mt-1 text-sm text-gray-200">{b.userId.firstName} {b.userId.lastName}</p>
                          <p className="text-xs text-gray-500">{b.userId.email}</p>
                        </>
                      ) : <p className="mt-1 text-xs text-gray-500">Unknown</p>}
                    </div>
                    <div className="rounded-lg bg-gray-900/50 p-3">
                      <p className="text-xs font-medium text-gray-500 uppercase">Address</p>
                      {b.addressId ? (
                        <>
                          <p className="mt-1 text-sm text-gray-200">{b.addressId.street}</p>
                          <p className="text-xs text-gray-500">{b.addressId.city}, {b.addressId.state} {b.addressId.zip}</p>
                        </>
                      ) : <p className="mt-1 text-xs text-gray-500">No address</p>}
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-gray-500">Servicer:</label>
                      <select
                        value={b.assignedTo?._id || ''}
                        onChange={(e) => e.target.value && handleAssign(b._id, e.target.value)}
                        disabled={isActing || b.status === 'completed' || b.status === 'cancelled'}
                        className="rounded-lg border border-gray-600 bg-gray-700 px-2 py-1 text-xs text-gray-200 focus:border-brand-500 focus:outline-none disabled:opacity-40"
                      >
                        <option value="">Unassigned</option>
                        {servicers.map(s => (
                          <option key={s._id} value={s._id}>{s.firstName} {s.lastName}</option>
                        ))}
                      </select>
                    </div>

                    {transitions.length > 0 && (
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-500">Status:</label>
                        {transitions.map(t => (
                          <button key={t} onClick={() => handleStatusChange(b._id, t)} disabled={isActing}
                            className={`rounded-lg px-2.5 py-1 text-xs font-medium transition disabled:opacity-40 ${
                              t === 'cancelled' ? 'border border-red-500/30 text-red-400 hover:bg-red-500/10'
                              : 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                            }`}>
                            {STATUS_LABELS[t]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800 disabled:opacity-30">
                Next
              </button>
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
