'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
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
      let active = activeRes.data.route;
      let planned = plannedRes.data.route;
      if (!active && planned?.status === 'in-progress') {
        active = planned;
        planned = null;
      }
      setActiveRoute(active);
      setPlannedRoute(planned);
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

  async function handleCompleteStop(photoFile) {
    if (!activeRoute || !photoFile) return;
    setActing(true);
    try {
      const formData = new FormData();
      formData.append('photo', photoFile);
      await api.patch(`/servicer/routes/${activeRoute._id}/complete-stop`, formData);
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

  async function handleDenyStop(reason) {
    if (!activeRoute) return;
    setActing(true);
    try {
      await api.patch(`/servicer/routes/${activeRoute._id}/deny-stop`, { reason });
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
  const inProgressJobs = jobs.filter((b) => ['en-route', 'arrived', 'in-progress'].includes(b.status));
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
          {activeRoute ? 'Active Route' : plannedRoute ? 'Planned Route' : inProgressJobs.length > 0 ? 'Active Jobs' : 'Plan Route'}
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
              onDeny={handleDenyStop}
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

          {/* In-progress jobs managed without a formal route */}
          {!route && inProgressJobs.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase text-gray-500">Jobs In Progress</p>
              {inProgressJobs.map((b) => {
                const addr = b.addressId;
                const svc = b.serviceTypeId;
                const coords = addr?.location?.coordinates;
                return (
                  <div key={b._id} className="rounded-xl border border-brand-500/60 bg-gray-800 p-3.5">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">{addr?.street || 'Address'}{addr?.unit ? `, ${addr.unit}` : ''}</p>
                        <p className="text-xs text-gray-400">{addr?.city}, {addr?.state} {addr?.zip}</p>
                        <p className="mt-1 text-xs text-gray-400">{svc?.name || 'Service'} &middot; {b.barrelCount || 0} barrel{(b.barrelCount || 0) !== 1 ? 's' : ''}</p>
                      </div>
                      <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-medium ${
                        b.status === 'en-route' ? 'bg-purple-900/50 text-purple-400' :
                        b.status === 'arrived' ? 'bg-indigo-900/50 text-indigo-400' :
                        'bg-yellow-900/50 text-yellow-400'
                      }`}>{b.status}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      {coords && (
                        <button onClick={() => openNavigation(coords[1], coords[0])}
                          className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-blue-600 py-2 text-xs font-semibold text-white transition hover:bg-blue-700 active:scale-[0.98]">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                          Navigate
                        </button>
                      )}
                      <Link href={`/servicer/job/${b._id}`}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-brand-600 py-2 text-xs font-semibold text-brand-400 transition hover:bg-brand-600/10 active:scale-[0.98]">
                        Manage Job
                      </Link>
                    </div>
                  </div>
                );
              })}
              {activeJobs.length > 0 && (
                <p className="text-xs text-gray-500 text-center pt-1">You also have {activeJobs.length} unstarted job{activeJobs.length !== 1 ? 's' : ''} ready to plan.</p>
              )}
            </div>
          )}

          {/* No route and no jobs */}
          {!route && activeJobs.length === 0 && inProgressJobs.length === 0 && (
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
                  <Link key={s._id || i} href={`/servicer/job/${b?._id}`} className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition active:scale-[0.98] ${
                    isCurrent ? 'border-brand-500 bg-brand-900/30' :
                    s.status === 'completed' ? 'border-green-800 bg-green-900/20' :
                    s.status === 'skipped' || s.status === 'denied' ? 'border-gray-700 bg-gray-800/50 opacity-50' :
                    'border-gray-700 bg-gray-800'
                  }`}>
                    <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                      s.status === 'completed' ? 'bg-green-600' :
                      s.status === 'denied' ? 'bg-red-700' :
                      s.status === 'skipped' ? 'bg-gray-600' :
                      isCurrent ? 'bg-brand-600' : 'bg-gray-600'
                    }`}>
                      {s.status === 'completed' ? '✓' : s.status === 'skipped' ? '—' : s.status === 'denied' ? '✕' : i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`truncate text-sm font-medium ${isCurrent ? 'text-brand-300' : 'text-white'}`}>{addr?.street || 'Address'}</p>
                      <p className="text-xs text-gray-400">{svc?.name || 'Service'} &middot; {b?.barrelCount || b?.itemCount || 0} {b?.itemCount ? 'item' : 'barrel'}{(b?.barrelCount || b?.itemCount || 0) !== 1 ? 's' : ''}</p>
                    </div>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      s.status === 'completed' ? 'bg-green-900/50 text-green-400' :
                      s.status === 'en-route' ? 'bg-purple-900/50 text-purple-400' :
                      s.status === 'arrived' ? 'bg-indigo-900/50 text-indigo-400' :
                      s.status === 'denied' ? 'bg-red-900/50 text-red-400' :
                      'bg-gray-700 text-gray-400'
                    }`}>{s.status}</span>
                    <svg className="h-4 w-4 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CurrentStopCard({ stop, index, total, acting, onNavigate, onArrived, onComplete, onSkip, onDeny }) {
  const b = stop.bookingId;
  const addr = b?.addressId;
  const svc = b?.serviceTypeId;
  const customer = b?.userId;
  const fileRef = useRef(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showDenyModal, setShowDenyModal] = useState(false);
  const [denyReason, setDenyReason] = useState('');

  const isEnRoute = stop.status === 'en-route';
  const isArrived = stop.status === 'arrived';

  function openPhotoCapture() {
    setPhotoFile(null);
    setPhotoPreview(null);
    setShowPhotoModal(true);
    setTimeout(() => fileRef.current?.click(), 100);
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPhotoPreview(ev.target.result);
    reader.readAsDataURL(file);
  }

  function handleRetake() {
    setPhotoFile(null);
    setPhotoPreview(null);
    fileRef.current.value = '';
    setTimeout(() => fileRef.current?.click(), 100);
  }

  function handleSubmit() {
    if (photoFile) {
      onComplete(photoFile);
      setShowPhotoModal(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    }
  }

  function handleDenySubmit() {
    if (!denyReason.trim()) return;
    onDeny(denyReason.trim());
    setShowDenyModal(false);
    setDenyReason('');
  }

  const statusColors = {
    'en-route': 'bg-purple-900/60 text-purple-300 border border-purple-700/50',
    'arrived': 'bg-indigo-900/60 text-indigo-300 border border-indigo-700/50',
  };
  const statusLabels = { 'en-route': 'En Route', 'arrived': 'Arrived' };

  return (
    <>
      <div className="overflow-hidden rounded-2xl border border-brand-500/70 bg-gray-800 shadow-lg shadow-black/30">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-700/60 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white">
              {index + 1}
            </div>
            <span className="text-sm font-semibold text-brand-400">Stop {index + 1} of {total}</span>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColors[stop.status] || 'bg-gray-700 text-gray-300'}`}>
            {statusLabels[stop.status] || stop.status}
          </span>
        </div>

        {/* Address */}
        <div className="px-5 pt-4 pb-3">
          <p className="text-xl font-bold leading-snug text-white">{addr?.street}{addr?.unit ? `, ${addr.unit}` : ''}</p>
          <p className="mt-0.5 text-sm text-gray-400">{addr?.city}, {addr?.state} {addr?.zip}</p>
        </div>

        {/* Job details */}
        <div className="mx-5 mb-4 rounded-xl bg-gray-900/70 px-4 py-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-200">{svc?.name}</p>
            {b?.barrelCount > 0 && (
              <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                {b.barrelCount} barrel{b.barrelCount !== 1 ? 's' : ''}
              </span>
            )}
            {b?.itemCount > 0 && (
              <span className="rounded-full bg-gray-700 px-2.5 py-0.5 text-xs font-medium text-gray-300">
                {b.itemCount} item{b.itemCount !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          {customer && (
            <p className="flex items-center gap-1.5 text-xs text-gray-400">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
              {customer.firstName} {customer.lastName}
            </p>
          )}
          {addr?.barrelLocation && (
            <p className="flex items-start gap-1.5 text-xs text-gray-400">
              <svg className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              Location: {addr.barrelLocation}
            </p>
          )}
          {addr?.barrelPlacementInstructions && (
            <p className="rounded-lg bg-blue-900/20 px-3 py-2 text-xs text-blue-300">Curb: {addr.barrelPlacementInstructions}</p>
          )}
          {addr?.barrelReturnInstructions && (
            <p className="rounded-lg bg-amber-900/20 px-3 py-2 text-xs text-amber-300">Return: {addr.barrelReturnInstructions}</p>
          )}
        </div>

        {/* Customer photos */}
        {(addr?.barrelPhotoUrl || addr?.photos?.length > 0) && (
          <div className="mx-5 mb-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-gray-500">Customer Photos</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {addr.barrelPhotoUrl && <PhotoViewer src={addr.barrelPhotoUrl} alt="Barrel" className="h-20 w-24 shrink-0 rounded-xl object-cover" />}
              {addr.photos?.map((url, i) => <PhotoViewer key={i} src={url} alt={`Photo ${i + 1}`} className="h-20 w-24 shrink-0 rounded-xl object-cover" />)}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-gray-700/60 px-5 py-4 space-y-3">
          {/* Navigate — always visible */}
          <button onClick={onNavigate}
            className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-blue-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Navigate
          </button>

          {/* En-route phase: only Mark Arrived + Skip */}
          {isEnRoute && (
            <div className="flex gap-2.5">
              <button onClick={onArrived} disabled={acting}
                className="flex-1 rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 active:scale-[0.98] disabled:opacity-50">
                {acting ? 'Updating…' : 'Mark Arrived'}
              </button>
              <button onClick={onSkip} disabled={acting}
                className="rounded-xl border border-gray-600 px-5 py-3.5 text-sm font-medium text-gray-400 transition hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50">
                Skip
              </button>
            </div>
          )}

          {/* Arrived phase: Complete Stop, Deny Service, Skip */}
          {isArrived && (
            <>
              <button onClick={openPhotoCapture} disabled={acting}
                className="flex w-full items-center justify-center gap-2.5 rounded-xl bg-green-600 py-3.5 font-semibold text-white shadow-sm transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                {acting ? 'Submitting…' : 'Complete Stop'}
              </button>
              <div className="flex gap-2.5">
                <button onClick={() => setShowDenyModal(true)} disabled={acting}
                  className="flex-1 rounded-xl border border-red-700/60 bg-red-900/20 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-900/40 active:scale-[0.98] disabled:opacity-50">
                  Deny Service
                </button>
                <button onClick={onSkip} disabled={acting}
                  className="rounded-xl border border-gray-600 px-5 py-3 text-sm font-medium text-gray-400 transition hover:bg-gray-700 active:scale-[0.98] disabled:opacity-50">
                  Skip
                </button>
              </div>
            </>
          )}

          <Link href={`/servicer/job/${b?._id}`} className="block text-center text-sm font-medium text-brand-400 hover:text-brand-300">
            View full job details
          </Link>
        </div>
      </div>

      <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

      {/* Completion photo modal */}
      {showPhotoModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => { if (!acting) { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null); } }}>
          <div className="w-full max-w-lg rounded-t-2xl bg-gray-800 p-5 pb-8 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Completion Photo</h3>
              <button onClick={() => { setShowPhotoModal(false); setPhotoFile(null); setPhotoPreview(null); }} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            {photoPreview ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-gray-600">
                  <img src={photoPreview} alt="Completion preview" className="w-full object-cover" style={{ maxHeight: '40vh' }} />
                </div>
                <div className="flex gap-3">
                  <button onClick={handleRetake} disabled={acting}
                    className="flex-1 rounded-xl border border-gray-600 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-700 disabled:opacity-50">
                    Retake
                  </button>
                  <button onClick={handleSubmit} disabled={acting}
                    className="flex-1 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50">
                    {acting ? 'Submitting…' : 'Submit & Complete'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex h-48 items-center justify-center rounded-xl border-2 border-dashed border-gray-600">
                  <div className="text-center">
                    <svg className="mx-auto h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                    <p className="mt-2 text-sm text-gray-400">Take a photo of the completed job</p>
                  </div>
                </div>
                <button onClick={() => fileRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-3.5 font-semibold text-white transition hover:bg-brand-700 active:scale-[0.98]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" /></svg>
                  Open Camera
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deny service modal */}
      {showDenyModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm" onClick={() => { if (!acting) setShowDenyModal(false); }}>
          <div className="w-full max-w-lg rounded-t-2xl bg-gray-800 p-5 pb-8 safe-bottom" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-white">Deny Service</h3>
                <p className="mt-0.5 text-xs text-gray-400">The customer will be notified with your reason.</p>
              </div>
              <button onClick={() => setShowDenyModal(false)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-700">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="mb-4 rounded-xl border border-red-800/40 bg-red-900/20 px-4 py-3 text-sm text-red-300">
              This will cancel the service request and notify the customer via email and in-app alert.
            </div>
            <label className="mb-1.5 block text-sm font-medium text-gray-300">
              Reason for denial <span className="text-red-400">*</span>
            </label>
            <textarea
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              placeholder="e.g. Item exceeds weight limit, area is inaccessible, safety concern…"
              rows={4}
              className="w-full rounded-xl border border-gray-600 bg-gray-900 px-4 py-3 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none resize-none"
            />
            <div className="mt-4 flex gap-3">
              <button onClick={() => setShowDenyModal(false)} disabled={acting}
                className="flex-1 rounded-xl border border-gray-600 py-3 text-sm font-semibold text-gray-300 transition hover:bg-gray-700 disabled:opacity-50">
                Cancel
              </button>
              <button onClick={handleDenySubmit} disabled={acting || !denyReason.trim()}
                className="flex-1 rounded-xl bg-red-600 py-3 text-sm font-semibold text-white transition hover:bg-red-700 active:scale-[0.98] disabled:opacity-50">
                {acting ? 'Submitting…' : 'Confirm Denial'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
