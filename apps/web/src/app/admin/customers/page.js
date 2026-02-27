'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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

function CustomerCard({ customer, expanded, onToggle }) {
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => {
    if (expanded && !detail) {
      setLoadingDetail(true);
      api.get(`/admin/customers/${customer._id}`)
        .then(r => setDetail(r.data))
        .catch(() => {})
        .finally(() => setLoadingDetail(false));
    }
  }, [expanded, customer._id, detail]);

  const addrCount = customer.addresses?.length || 0;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800">
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-4 text-left">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-brand-400">
          {customer.firstName?.[0]}{customer.lastName?.[0]}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white">{customer.firstName} {customer.lastName}</p>
          <p className="text-sm text-gray-400">{customer.email}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-xs text-gray-500">{addrCount} address{addrCount !== 1 ? 'es' : ''}</p>
            {customer.phone && <p className="text-xs text-gray-500">{customer.phone}</p>}
          </div>
          <svg className={`h-4 w-4 text-gray-500 transition ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-700 px-4 pb-4 pt-3">
          {loadingDetail ? (
            <div className="py-4 text-center text-sm text-gray-500">Loading...</div>
          ) : detail ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-gray-900/50 p-3">
                  <p className="text-xs font-medium uppercase text-gray-500">Contact</p>
                  <p className="mt-1 text-sm text-gray-200">{detail.customer?.email}</p>
                  <p className="text-sm text-gray-200">{detail.customer?.phone || 'No phone'}</p>
                  <p className="mt-1 text-xs text-gray-500">Joined {new Date(detail.customer?.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="rounded-lg bg-gray-900/50 p-3">
                  <p className="text-xs font-medium uppercase text-gray-500">Addresses</p>
                  {(detail.customer?.addresses || []).length === 0 ? (
                    <p className="mt-1 text-xs text-gray-500">None saved</p>
                  ) : (detail.customer.addresses).map(a => (
                    <div key={a._id} className="mt-1">
                      <p className="text-sm text-gray-200">{a.street}{a.unit ? `, ${a.unit}` : ''}</p>
                      <p className="text-xs text-gray-500">{a.city}, {a.state} {a.zip}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4">
                <p className="text-xs font-medium uppercase text-gray-500">Recent Bookings ({detail.bookings?.length || 0})</p>
                {(detail.bookings || []).length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">No bookings</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {detail.bookings.slice(0, 10).map(b => (
                      <div key={b._id} className="flex items-center justify-between rounded-lg bg-gray-900/50 px-3 py-2">
                        <div>
                          <p className="text-sm text-gray-200">{b.serviceTypeId?.name || 'Service'}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(b.scheduledDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            {b.barrelCount > 0 && <span className="mx-1">&middot; {b.barrelCount} barrel{b.barrelCount > 1 ? 's' : ''}</span>}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[b.status] || 'bg-gray-600 text-gray-300'}`}>
                          {b.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-gray-500">Failed to load details</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminCustomersPage() {
  const { logout } = useAuthStore();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const debounceRef = useRef(null);

  const loadCustomers = useCallback(async (q, p) => {
    try {
      let url = `/admin/customers?page=${p}&limit=20`;
      if (q) url += `&search=${encodeURIComponent(q)}`;
      const res = await api.get(url);
      setCustomers(res.data.customers || []);
      setTotalPages(res.data.pages || 1);
      setTotal(res.data.total || 0);
    } catch { }
    setLoading(false);
  }, []);

  useEffect(() => {
    setLoading(true);
    loadCustomers(search, page);
  }, [page, loadCustomers]);

  function handleSearchChange(value) {
    setSearch(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      setLoading(true);
      loadCustomers(value, 1);
    }, 400);
  }

  return (
    <AdminGuard>
      <div className="min-h-screen-safe bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
          <div className="mx-auto flex max-w-5xl items-center gap-3">
            <Link href="/admin/dashboard" className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
            </Link>
            <h1 className="flex-1 font-semibold text-white">Customers</h1>
            <span className="rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">{total} total</span>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">Sign Out</button>
          </div>
        </header>

        <div className="mx-auto max-w-5xl px-4 py-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or phone..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="w-full rounded-xl border border-gray-700 bg-gray-800 py-3 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-500 focus:border-brand-500 focus:outline-none"
            />
          </div>

          <div className="mt-4 space-y-3">
            {loading ? (
              <div className="py-16 text-center text-gray-500">Loading...</div>
            ) : customers.length === 0 ? (
              <div className="py-16 text-center text-gray-500">
                {search ? 'No customers match your search' : 'No customers yet'}
              </div>
            ) : customers.map(c => (
              <CustomerCard
                key={c._id}
                customer={c}
                expanded={expandedId === c._id}
                onToggle={() => setExpandedId(expandedId === c._id ? null : c._id)}
              />
            ))}
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
