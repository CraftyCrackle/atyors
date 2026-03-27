'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AdminGuard from '../../../components/AdminGuard';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import Logo from '../../../components/Logo';

const CATEGORY_ICONS = {
  'trash-recycling': 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
  cleaning: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
  outdoors: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
};

export default function AdminServicesPage() {
  const { logout } = useAuthStore();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState({});
  const [feedback, setFeedback] = useState({});

  async function load() {
    try {
      const res = await api.get('/admin/services');
      setGroups(res.data?.groups || []);
    } catch {}
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggle(typeId, currentlyActive) {
    setToggling((prev) => ({ ...prev, [typeId]: true }));
    try {
      await api.patch(`/admin/services/${typeId}/toggle`);
      setGroups((prev) =>
        prev.map((g) => ({
          ...g,
          types: g.types.map((t) =>
            t._id === typeId ? { ...t, isActive: !currentlyActive } : t
          ),
        }))
      );
      setFeedback((prev) => ({ ...prev, [typeId]: currentlyActive ? 'Deactivated' : 'Activated' }));
      setTimeout(() => setFeedback((prev) => ({ ...prev, [typeId]: '' })), 2500);
    } catch (err) {
      setFeedback((prev) => ({ ...prev, [typeId]: 'Failed' }));
      setTimeout(() => setFeedback((prev) => ({ ...prev, [typeId]: '' })), 2500);
    }
    setToggling((prev) => ({ ...prev, [typeId]: false }));
  }

  const totalActive = groups.flatMap((g) => g.types).filter((t) => t.isActive).length;
  const totalTypes = groups.flatMap((g) => g.types).length;

  return (
    <AdminGuard>
      <div className="flex min-h-[100dvh] min-h-[100vh] w-full flex-col overflow-x-hidden bg-gray-900">
        <header className="sticky top-0 z-10 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-header-safe">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/admin/dashboard" className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-800">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
              </Link>
              <div className="flex items-center gap-2">
                <Logo size="sm" variant="wordmark" dark />
                <span className="text-xs text-gray-500">Services</span>
              </div>
            </div>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
              Sign Out
            </button>
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl px-4 py-4">
          <h1 className="text-xl font-bold text-white">Service Management</h1>
          <p className="mt-1 text-sm text-gray-400">
            Enable or disable services by category. Seasonal services (lawn care, snow removal) can be toggled for Massachusetts winters and summers.
          </p>

          {!loading && (
            <div className="mt-4 flex gap-3">
              <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-white">{totalTypes}</p>
                <p className="text-xs text-gray-400">Total Services</p>
              </div>
              <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-green-400">{totalActive}</p>
                <p className="text-xs text-gray-400">Active</p>
              </div>
              <div className="flex-1 rounded-xl border border-gray-700 bg-gray-800 p-3 text-center">
                <p className="text-2xl font-bold text-gray-500">{totalTypes - totalActive}</p>
                <p className="text-xs text-gray-400">Inactive</p>
              </div>
            </div>
          )}

          {loading ? (
            <div className="py-20 text-center text-gray-500">Loading...</div>
          ) : groups.length === 0 ? (
            <div className="py-20 text-center text-gray-500">
              No services found. Run the seed endpoint first.
            </div>
          ) : (
            <div className="mt-6 space-y-6">
              {groups.map((g) => (
                <div key={g.category._id}>
                  <div className="mb-3 flex items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-700">
                      <svg className="h-4 w-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={CATEGORY_ICONS[g.category.slug] || CATEGORY_ICONS.outdoors} />
                      </svg>
                    </div>
                    <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">{g.category.name}</h2>
                    <span className="text-xs text-gray-600">({g.types.filter((t) => t.isActive).length}/{g.types.length} active)</span>
                  </div>

                  <div className="space-y-2">
                    {g.types.map((type) => (
                      <div
                        key={type._id}
                        className={`flex items-center justify-between rounded-xl border px-4 py-3.5 transition ${
                          type.isActive ? 'border-gray-700 bg-gray-800' : 'border-gray-800 bg-gray-900 opacity-60'
                        }`}
                      >
                        <div className="min-w-0 flex-1 pr-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-sm font-semibold ${type.isActive ? 'text-white' : 'text-gray-500'}`}>
                              {type.name}
                            </span>
                            {type.seasonal && (
                              <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
                                Seasonal
                              </span>
                            )}
                            {!type.isActive && (
                              <span className="rounded-full bg-gray-700 px-2 py-0.5 text-[10px] font-semibold text-gray-500">
                                Inactive
                              </span>
                            )}
                          </div>
                          {type.basePrice > 0 && (
                            <p className="mt-0.5 text-xs text-gray-500">From ${type.basePrice}</p>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-3">
                          {feedback[type._id] && (
                            <span className={`text-xs ${feedback[type._id] === 'Failed' ? 'text-red-400' : type.isActive ? 'text-green-400' : 'text-amber-400'}`}>
                              {feedback[type._id]}
                            </span>
                          )}
                          <button
                            onClick={() => toggle(type._id, type.isActive)}
                            disabled={!!toggling[type._id]}
                            aria-label={type.isActive ? `Deactivate ${type.name}` : `Activate ${type.name}`}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-gray-900 disabled:cursor-not-allowed disabled:opacity-50 ${
                              type.isActive ? 'bg-brand-600' : 'bg-gray-700'
                            }`}
                          >
                            <span
                              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                                type.isActive ? 'translate-x-5' : 'translate-x-0'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminGuard>
  );
}
