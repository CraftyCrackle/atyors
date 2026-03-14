'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import Logo from '../../../components/Logo';

export default function AdminZipcodesPage() {
  const { user, logout } = useAuthStore();
  const [demand, setDemand] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionMsg, setActionMsg] = useState({});

  async function load() {
    try {
      const res = await api.get('/admin/zipcodes/demand');
      setDemand(res.data || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleZip(zip, currentlyServed) {
    setActionMsg((prev) => ({ ...prev, [zip]: 'saving' }));
    try {
      if (currentlyServed) {
        await api.delete(`/admin/zipcodes/${zip}`);
      } else {
        await api.post('/admin/zipcodes', { zipcode: zip });
      }
      await load();
      setActionMsg((prev) => ({ ...prev, [zip]: currentlyServed ? 'removed' : 'added' }));
    } catch (err) {
      setActionMsg((prev) => ({ ...prev, [zip]: err.message || 'failed' }));
    }
    setTimeout(() => setActionMsg((prev) => ({ ...prev, [zip]: '' })), 3000);
  }

  const servedCount = demand.filter((d) => d.served).length;
  const unservedCount = demand.filter((d) => !d.served).length;

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-header-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <div className="flex items-center gap-2">
                <Logo size="sm" variant="wordmark" dark />
                <span className="text-xs text-gray-500">Zipcodes</span>
              </div>
            </div>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
              Sign Out
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <h1 className="text-xl font-bold text-white">Registered Zipcodes</h1>
          <p className="mt-1 text-sm text-gray-400">All zipcodes where users have registered addresses. Use this to decide which areas to onboard next.</p>

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : demand.length === 0 ? (
            <div className="py-20 text-center text-gray-500">No addresses registered yet.</div>
          ) : (
            <>
              <div className="mt-4 flex gap-3">
                <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                  <p className="text-2xl font-bold text-white">{demand.length}</p>
                  <p className="text-xs text-gray-400">Total Zipcodes</p>
                </div>
                <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                  <p className="text-2xl font-bold text-green-400">{servedCount}</p>
                  <p className="text-xs text-gray-400">Served</p>
                </div>
                <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-400">{unservedCount}</p>
                  <p className="text-xs text-gray-400">Not Served</p>
                </div>
              </div>

              {unservedCount > 0 && (
                <div className="mt-6">
                  <h2 className="text-sm font-semibold uppercase tracking-wider text-amber-400">Not Yet Served — Potential Onboarding</h2>
                  <div className="mt-3 space-y-2">
                    {demand.filter((d) => !d.served).map((d) => (
                      <div key={d.zip} className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-gray-800 px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-white font-mono">{d.zip}</span>
                          <div className="flex gap-4 text-sm text-gray-400">
                            <span>{d.userCount} user{d.userCount !== 1 ? 's' : ''}</span>
                            <span>{d.addressCount} address{d.addressCount !== 1 ? 'es' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {actionMsg[d.zip] === 'added' && <span className="text-xs text-green-400">Added</span>}
                          {actionMsg[d.zip] === 'failed' && <span className="text-xs text-red-400">Failed</span>}
                          <button
                            onClick={() => toggleZip(d.zip, false)}
                            disabled={actionMsg[d.zip] === 'saving'}
                            className="rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-brand-700 disabled:opacity-50"
                          >
                            {actionMsg[d.zip] === 'saving' ? '...' : 'Onboard'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6">
                <h2 className="text-sm font-semibold uppercase tracking-wider text-green-400">Currently Served</h2>
                {servedCount === 0 ? (
                  <p className="mt-3 text-sm text-gray-500">No zipcodes are currently served.</p>
                ) : (
                  <div className="mt-3 space-y-2">
                    {demand.filter((d) => d.served).map((d) => (
                      <div key={d.zip} className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-4 py-3">
                        <div className="flex items-center gap-4">
                          <span className="text-lg font-bold text-white font-mono">{d.zip}</span>
                          <div className="flex gap-4 text-sm text-gray-400">
                            <span>{d.userCount} user{d.userCount !== 1 ? 's' : ''}</span>
                            <span>{d.addressCount} address{d.addressCount !== 1 ? 'es' : ''}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {actionMsg[d.zip] === 'removed' && <span className="text-xs text-amber-400">Removed</span>}
                          <span className="rounded-full bg-green-500/20 px-2.5 py-0.5 text-xs font-medium text-green-400">Active</span>
                          <button
                            onClick={() => toggleZip(d.zip, true)}
                            disabled={actionMsg[d.zip] === 'saving'}
                            className="rounded p-1 text-gray-500 transition hover:text-red-400 disabled:opacity-50"
                            title="Remove from served"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
