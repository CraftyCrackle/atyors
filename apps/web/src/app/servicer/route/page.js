'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import { openNavigation } from '../../../utils/navigation';
import PhotoViewer from '../../../components/PhotoViewer';

const RouteMap = dynamic(() => import('./RouteMap'), { ssr: false });

export default function ServicerRoutePage() {
  const { user, loading: authLoading, init } = useAuthStore();
  const router = useRouter();

  const [jobs, setJobs] = useState([]);
  const [activeRoute, setActiveRoute] = useState(null);
  const [plannedRoute, setPlannedRoute] = useState(null);
  const [optimizedStops, setOptimizedStops] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const [jobsRes, activeRes, plannedRes] = await Promise.all([
        api.get('/servicer/jobs/mine?limit=100'),
        api.get('/servicer/routes/active').catch((e) => { console.warn('Failed to load active route:', e.message); return { data: { route: null } }; }),
        api.get('/servicer/routes/planned').catch((e) => { console.warn('Failed to load planned route:', e.message); return { data: { route: null } }; }),
      ]);
      setJobs(jobsRes.data.bookings || []);
      setActiveRoute(activeRes.data.route);
      setPlannedRoute(plannedRes.data.route);
    } catch { }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [load]);

  async function handleOptimize() {
    const activeJobs = jobs.filter((b) => b.status === 'active');
    if (activeJobs.length === 0) return;
    setActing(true);
    try {
      const res = await api.post('/servicer/routes/optimize-preview', {
        bookingIds: activeJobs.map((b) => b._id),
      });
      setOptimizedStops(res.data.stops);
    } catch (err) { alert(err.message || 'Failed to optimize'); }
    setActing(false);
  }

  async function handleCreateRoute() {
    const ids = optimizedStops
      ? optimizedStops.map((s) => s.bookingId)
      : jobs.filter((b) => b.status === 'active').map((b) => b._id);
    if (ids.length === 0) return;
    setActing(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      await api.post('/servicer/routes', { date: today, bookingIds: ids, optimize: !optimizedStops });
      await load();
      setOptimizedStops(null);
    } catch (err) { alert(err.message || 'Failed to create route'); }
    setActing(false);
  }

  async function handleStartRoute() {
    if (!plannedRoute) return;
    setActing(true);
    try {
      await api.patch(`/servicer/routes/${plannedRoute._id}/start`);
      await load();
    } catch (err) { alert(err.message || 'Failed to start route'); }
    setActing(false);
  }

  async function handleMarkArrived() {
    if (!activeRoute) return;
    setActing(true);
    try {
      await api.patch(`/servicer/routes/${activeRoute._id}/mark-arrived`);
      await load();
    } catch (err) { alert(err.message || 'Failed'); }
    setActing(false);
  }

  async function handleCompleteStop() {
    if (!activeRoute) return;
    setActing(true);
    try {
      await api.patch(`/servicer/routes/${activeRoute._id}/complete-stop`);
      await load();
    } catch (err) { alert(err.message || 'Failed'); }
    setActing(false);
  }

  async function handleSkipStop() {
    if (!activeRoute) return;
    setActing(true);
    try {
      await api.patch(`/servicer/routes/${activeRoute._id}/skip-stop`);
      await load();
    } catch (err) { alert(err.message || 'Failed'); }
    setActing(false);
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const route = activeRoute || plannedRoute;
  const activeJobs = jobs.filter((b) => b.status === 'active');
  const currentStop = route && route.currentStopIndex >= 0 ? route.stops[route.currentStopIndex] : null;

  const mapStops = route
    ? route.stops.map((s, i) => {
        const b = s.bookingId;
        const addr = b?.addressId;
        const coords = addr?.location?.coordinates;
        return coords ? { lat: coords[1], lng: coords[0], label: `${i + 1}`, status: s.status } : null;
      }).filter(Boolean)
    : optimizedStops
      ? optimizedStops.filter((s) => s.coords).map((s, i) => ({ lat: s.coords.lat, lng: s.coords.lng, label: `${i + 1}`, status: 'pending' }))
      : [];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gray-900 pb-6">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
        <button onClick={() => router.push('/servicer/dashboard')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-semibold text-white">
          {activeRoute ? 'Active Route' : plannedRoute ? 'Planned Route' : 'Plan Route'}
        </h1>
        {route && (
          <span className="ml-auto rounded-full bg-brand-600/20 px-2.5 py-0.5 text-xs font-medium text-brand-400">
            {route.stops.filter((s) => s.status === 'completed').length}/{route.stops.length} done
          </span>
        )}
      </header>

      {loading ? (
        <div className="py-16 text-center text-sm text-gray-500">Loading...</div>
      ) : (
        <div className="flex-1 px-4 py-4 space-y-4">

          {/* Map */}
          {mapStops.length > 0 && (
            <div className="h-56 overflow-hidden rounded-xl border border-gray-700">
              <RouteMap stops={mapStops} currentIndex={route?.currentStopIndex ?? -1} />
            </div>
          )}

          {/* Active route: current stop */}
          {activeRoute && currentStop && (
            <CurrentStopCard
              stop={currentStop}
              index={activeRoute.currentStopIndex}
              total={activeRoute.stops.length}
              acting={acting}
              onNavigate={() => {
                const addr = currentStop.bookingId?.addressId;
                const coords = addr?.location?.coordinates;
                if (coords) openNavigation(coords[1], coords[0]);
              }}
              onArrived={handleMarkArrived}
              onComplete={handleCompleteStop}
              onSkip={handleSkipStop}
            />
          )}

          {/* Active route: completed message */}
          {activeRoute && activeRoute.status === 'completed' && (
            <div className="rounded-xl border border-green-800 bg-green-900/30 p-4 text-center">
              <svg className="mx-auto h-10 w-10 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-2 font-semibold text-green-300">Route Complete!</p>
              <p className="mt-1 text-sm text-green-400/70">
                {activeRoute.stops.filter((s) => s.status === 'completed').length} completed,{' '}
                {activeRoute.stops.filter((s) => s.status === 'skipped').length} skipped
              </p>
            </div>
          )}

          {/* Planned route: start button */}
          {plannedRoute && (
            <button onClick={handleStartRoute} disabled={acting}
              className="w-full rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-lg transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50">
              {acting ? 'Starting...' : `Start Route (${plannedRoute.stops.length} stops)`}
            </button>
          )}

          {/* No route yet: plan one */}
          {!route && activeJobs.length > 0 && (() => {
            const allBringIn = activeJobs.every((b) => b.serviceTypeId?.slug === 'bring-in');
            return (
            <>
              {allBringIn && (
                <div className="rounded-xl border border-amber-800/40 bg-amber-900/20 px-4 py-3 flex gap-2.5">
                  <svg className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                  </svg>
                  <div className="text-xs text-amber-300 leading-relaxed">
                    <p className="font-semibold">All jobs are bring-in services</p>
                    <p className="mt-0.5 text-amber-400/70">Bring-in jobs can only be started once their scheduled time window begins. You won&apos;t be able to start this route until then.</p>
                  </div>
                </div>
              )}
              {optimizedStops && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-500">Optimized Order</p>
                  {optimizedStops.map((s, i) => (
                    <div key={s.bookingId} className="flex items-center gap-3 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2.5">
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">{i + 1}</div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{s.address?.street}</p>
                        <p className="text-xs text-gray-400">{s.serviceType?.name} &middot; {s.barrelCount || 0} barrel{(s.barrelCount || 0) !== 1 ? 's' : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-3">
                {!optimizedStops && (
                  <button onClick={handleOptimize} disabled={acting}
                    className="flex-1 rounded-xl border border-brand-600 py-3 text-sm font-semibold text-brand-400 transition hover:bg-brand-600/10 disabled:opacity-50">
                    {acting ? 'Optimizing...' : 'Optimize Route'}
                  </button>
                )}
                <button onClick={handleCreateRoute} disabled={acting}
                  className="flex-1 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition hover:bg-brand-700 disabled:opacity-50">
                  {acting ? 'Creating...' : `Create Route (${optimizedStops?.length || activeJobs.length} stops)`}
                </button>
              </div>
            </>
            );
          })()}

          {/* No route and no jobs */}
          {!route && activeJobs.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-gray-400">No active jobs to plan a route.</p>
              <button onClick={() => router.push('/servicer/dashboard')} className="mt-4 text-sm font-medium text-brand-400">Back to Dashboard</button>
            </div>
          )}

          {/* Stop list for active/planned route */}
          {route && route.status !== 'completed' && (
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase text-gray-500">All Stops</p>
              {route.stops.map((s, i) => {
                const b = s.bookingId;
                const addr = b?.addressId;
                const svc = b?.serviceTypeId;
                const isCurrent = i === route.currentStopIndex;
                return (
                  <div key={s._id || i} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 ${isCurrent ? 'border-brand-500 bg-brand-900/30' : s.status === 'completed' ? 'border-green-800 bg-green-900/20' : s.status === 'skipped' ? 'border-gray-700 bg-gray-800/50 opacity-50' : 'border-gray-700 bg-gray-800'}`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${s.status === 'completed' ? 'bg-green-600' : s.status === 'skipped' ? 'bg-gray-600' : isCurrent ? 'bg-brand-600' : 'bg-gray-600'}`}>
                      {s.status === 'completed' ? '✓' : s.status === 'skipped' ? '—' : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isCurrent ? 'text-brand-300' : 'text-white'}`}>{addr?.street || 'Address'}</p>
                      <p className="text-xs text-gray-400">{svc?.name || 'Service'} &middot; {b?.barrelCount || 0} barrel{(b?.barrelCount || 0) !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      s.status === 'en-route' ? 'bg-purple-900/50 text-purple-400' :
                      s.status === 'arrived' ? 'bg-indigo-900/50 text-indigo-400' :
                      s.status === 'skipped' ? 'bg-gray-700 text-gray-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{s.status}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CurrentStopCard({ stop, index, total, acting, onNavigate, onArrived, onComplete, onSkip }) {
  const b = stop.bookingId;
  const addr = b?.addressId;
  const svc = b?.serviceTypeId;
  const customer = b?.userId;

  return (
    <div className="rounded-xl border border-brand-500 bg-gray-800 p-4">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-brand-400">Stop {index + 1} of {total}</p>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
          stop.status === 'en-route' ? 'bg-purple-900/50 text-purple-400' :
          stop.status === 'arrived' ? 'bg-indigo-900/50 text-indigo-400' :
          'bg-yellow-900/50 text-yellow-400'
        }`}>{stop.status}</span>
      </div>

      <p className="mt-2 text-lg font-bold text-white">{addr?.street}{addr?.unit ? `, ${addr.unit}` : ''}</p>
      <p className="text-sm text-gray-400">{addr?.city}, {addr?.state} {addr?.zip}</p>

      <div className="mt-3 rounded-lg bg-gray-900/60 p-3 space-y-1">
        <p className="text-sm text-gray-300">{svc?.name} &middot; {b?.barrelCount || 0} barrel{(b?.barrelCount || 0) !== 1 ? 's' : ''}</p>
        {customer && <p className="text-xs text-gray-500">Customer: {customer.firstName} {customer.lastName}</p>}
        {addr?.barrelLocation && <p className="text-xs text-gray-400">Location: {addr.barrelLocation}</p>}
        {addr?.barrelPlacementInstructions && <p className="text-xs text-blue-400">Curb: {addr.barrelPlacementInstructions}</p>}
        {addr?.barrelReturnInstructions && <p className="text-xs text-amber-400">Return: {addr.barrelReturnInstructions}</p>}
      </div>

      {(addr?.barrelPhotoUrl || addr?.photos?.length > 0) && (
        <div className="mt-3">
          <p className="mb-1 text-[10px] uppercase font-medium text-gray-500">Customer Photos</p>
          <div className="flex gap-1.5 overflow-x-auto">
            {addr.barrelPhotoUrl && <PhotoViewer src={addr.barrelPhotoUrl} alt="Barrel" className="h-16 w-20 shrink-0 rounded-lg object-cover" />}
            {addr.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-16 w-20 shrink-0 rounded-lg object-cover" />)}
          </div>
        </div>
      )}

      <div className="mt-4 space-y-2">
        <button onClick={onNavigate}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Navigate
        </button>

        <div className="flex gap-2">
          {stop.status === 'en-route' && (
            <button onClick={onArrived} disabled={acting}
              className="flex-1 rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50">
              {acting ? '...' : 'Mark Arrived'}
            </button>
          )}
          {(stop.status === 'arrived' || stop.status === 'en-route') && (
            <button onClick={onComplete} disabled={acting}
              className="flex-1 rounded-xl bg-green-600 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
              {acting ? '...' : 'Complete Stop'}
            </button>
          )}
          <button onClick={onSkip} disabled={acting}
            className="rounded-xl border border-gray-600 px-4 py-2.5 text-sm text-gray-400 transition hover:bg-gray-800 disabled:opacity-50">
            Skip
          </button>
        </div>

        <Link href={`/servicer/job/${b?._id}`} className="block text-center text-sm text-brand-400 underline">
          View full job details
        </Link>
      </div>
    </div>
  );
}
