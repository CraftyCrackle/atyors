'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function ServicerEarningsPage() {
  const { user, loading: authLoading, init } = useAuthStore();
  const router = useRouter();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadEarnings();
  }, [user]);

  async function loadEarnings() {
    try {
      const res = await api.get('/servicer/earnings');
      setStats(res.data);
    } catch { }
    setLoading(false);
  }

  if (authLoading || !user || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-900 px-6">
        <p className="text-gray-400">Unable to load earnings.</p>
        <button onClick={() => router.push('/servicer/dashboard')} className="mt-4 text-sm text-brand-400">Back to Dashboard</button>
      </div>
    );
  }

  const { today, thisWeek, thisMonth, allTime, dailyBreakdown } = stats;
  const maxDaily = Math.max(...dailyBreakdown.map((d) => d.total), 1);

  return (
    <div className="min-h-screen bg-gray-900 pb-8">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 py-3">
        <button onClick={() => router.push('/servicer/dashboard')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-semibold text-white">Earnings</h1>
      </header>

      {/* Hero card — today */}
      <div className="mx-4 mt-6 rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-6 text-white shadow-xl shadow-brand-700/30">
        <p className="text-sm font-medium text-brand-200">Today's Earnings</p>
        <p className="mt-1 text-4xl font-extrabold">${(today.total || 0).toFixed(2)}</p>
        <div className="mt-3 flex gap-6 text-sm">
          <div>
            <span className="text-brand-200">Jobs</span>
            <p className="font-bold">{today.count || 0}</p>
          </div>
          <div>
            <span className="text-brand-200">Barrels</span>
            <p className="font-bold">{today.barrels || 0}</p>
          </div>
        </div>
      </div>

      {/* Period cards */}
      <div className="mx-4 mt-4 grid grid-cols-3 gap-3">
        {[
          { label: 'This Week', data: thisWeek },
          { label: 'This Month', data: thisMonth },
          { label: 'All Time', data: allTime },
        ].map(({ label, data }) => (
          <div key={label} className="rounded-xl border border-gray-700 bg-gray-800 p-3">
            <p className="text-[10px] font-semibold uppercase text-gray-500">{label}</p>
            <p className="mt-1 text-lg font-bold text-white">${(data.total || 0).toFixed(2)}</p>
            <p className="mt-0.5 text-xs text-gray-400">{data.count || 0} jobs</p>
          </div>
        ))}
      </div>

      {/* Stats row */}
      <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-gray-500">Avg / Job</p>
          <p className="mt-1 text-xl font-bold text-green-400">
            ${allTime.count > 0 ? (allTime.total / allTime.count).toFixed(2) : '0.00'}
          </p>
        </div>
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 text-center">
          <p className="text-xs font-semibold uppercase text-gray-500">Total Barrels</p>
          <p className="mt-1 text-xl font-bold text-purple-400">{allTime.barrels || 0}</p>
        </div>
      </div>

      {/* Weekly chart */}
      {dailyBreakdown.length > 0 && (
        <div className="mx-4 mt-6">
          <p className="mb-3 text-sm font-semibold text-gray-400">This Week</p>
          <div className="flex items-end gap-2" style={{ height: '120px' }}>
            {dailyBreakdown.map((d) => {
              const pct = Math.max(8, (d.total / maxDaily) * 100);
              const dayName = DAY_LABELS[new Date(d._id + 'T12:00:00').getDay()];
              return (
                <div key={d._id} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-medium text-gray-400">${d.total}</span>
                  <div className="w-full rounded-t-lg bg-brand-600 transition-all" style={{ height: `${pct}%` }} />
                  <span className="text-[10px] text-gray-500">{dayName}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
