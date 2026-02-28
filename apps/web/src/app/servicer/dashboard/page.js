'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import ReviewModal from '../../../components/ReviewModal';
import { useNotifications } from '../../../components/NotificationProvider';
import { useInstall } from '../../../components/InstallContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
};

function canAcceptToday(booking) {
  const scheduled = new Date(booking.scheduledDate);
  scheduled.setHours(0, 0, 0, 0);
  const earliest = booking.putOutTime === 'Night before'
    ? new Date(scheduled.getTime() - 86400000)
    : scheduled;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return { allowed: today >= earliest, earliest };
}

function JobCard({ booking, onAccept, accepting, onRate, alreadyRated }) {
  const date = new Date(booking.scheduledDate);
  const addr = booking.addressId;
  const svc = booking.serviceTypeId;
  const customer = booking.userId;
  const acceptCheck = booking.status === 'pending' ? canAcceptToday(booking) : null;

  return (
    <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-semibold text-white">{svc?.name || 'Service'}</p>
          <p className="mt-0.5 text-sm text-gray-400">
            {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {booking.barrelCount > 0 && <span className="mx-1">&middot; {booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>}
            <span className="mx-1">&middot; ${Number(booking.serviceValue ?? booking.amount ?? 0).toFixed(2)}</span>
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-600 text-gray-300'}`}>
          {booking.status}
        </span>
      </div>

      {addr && booking.status !== 'completed' && (
        <div className="mt-3 rounded-lg bg-gray-900/50 p-3">
          <p className="text-sm text-gray-300">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
          <p className="text-xs text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
          {addr.barrelLocation && (
            <div className="mt-2 flex items-start gap-2">
              <svg className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              </svg>
              <p className="text-xs text-gray-400">{addr.barrelLocation}</p>
            </div>
          )}
          {addr.barrelPlacementInstructions && (
            <p className="mt-1 text-xs text-blue-400">Curb: {addr.barrelPlacementInstructions}</p>
          )}
          {addr.barrelReturnInstructions && (
            <p className="mt-0.5 text-xs text-amber-400">Return: {addr.barrelReturnInstructions}</p>
          )}
          {addr.barrelNotes && (
            <p className="mt-1 text-xs text-gray-500 italic">"{addr.barrelNotes}"</p>
          )}
          {addr.barrelPhotoUrl && (
            <div className="mt-2">
              <img src={addr.barrelPhotoUrl} alt="Barrel location" className="h-24 w-full rounded-lg object-cover" />
            </div>
          )}
        </div>
      )}

      {customer && booking.status !== 'completed' && (
        <div className="mt-2 flex items-center gap-2">
          {customer.profilePhotoUrl ? (
            <img src={customer.profilePhotoUrl} alt="" className="h-6 w-6 rounded-full object-cover" />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-[10px] font-bold text-gray-300">{customer.firstName?.[0]}{customer.lastName?.[0]}</div>
          )}
          <p className="text-xs text-gray-500">
            {customer.firstName} {customer.lastName}
          </p>
        </div>
      )}

      <div className="mt-3 flex gap-2">
        {booking.status === 'pending' && acceptCheck?.allowed && (
          <button onClick={() => onAccept(booking._id)} disabled={accepting}
            className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-semibold text-white transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50">
            {accepting ? 'Accepting...' : 'Accept Job'}
          </button>
        )}
        {booking.status === 'pending' && acceptCheck && !acceptCheck.allowed && (
          <div className="flex-1 rounded-lg border border-gray-600 bg-gray-900/50 py-2 text-center text-xs text-gray-400">
            Available {acceptCheck.earliest.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            {booking.putOutTime === 'Night before' && <span className="block text-[10px] text-amber-400 mt-0.5">Night-before service</span>}
          </div>
        )}
        {['active', 'en-route', 'arrived'].includes(booking.status) && (
          <>
            <Link href={`/servicer/job/${booking._id}`} className="flex-1 rounded-lg bg-brand-600 py-2 text-center text-sm font-semibold text-white transition hover:bg-brand-700">
              Manage Job
            </Link>
            <Link href={`/chat/${booking._id}`} className="rounded-lg border border-gray-600 px-3 py-2 text-sm text-gray-300 transition hover:bg-gray-700">
              Chat
            </Link>
          </>
        )}
        {booking.status === 'completed' && !alreadyRated && (
          <button onClick={() => onRate(booking)} className="flex-1 rounded-lg bg-yellow-600/20 py-2 text-sm font-medium text-yellow-400 transition hover:bg-yellow-600/30">
            Rate Customer
          </button>
        )}
        {booking.status === 'completed' && alreadyRated && (
          <div className="flex-1 rounded-lg bg-green-900/30 py-2 text-center text-sm font-medium text-green-400">
            Rated
          </div>
        )}
      </div>
    </div>
  );
}

export default function ServicerDashboard() {
  const { user, loading: authLoading, init, logout } = useAuthStore();
  const router = useRouter();
  const { unreadBump } = useNotifications();
  const { canInstall, isStandalone, triggerInstall } = useInstall();
  const [tab, setTab] = useState('available');
  const [available, setAvailable] = useState([]);
  const [myJobs, setMyJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedMap, setReviewedMap] = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  async function loadUnreadCount() {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadNotifs(res.data.count || 0);
    } catch { }
  }

  useEffect(() => {
    if (!user || !['servicer', 'admin', 'superadmin'].includes(user.role)) return;
    loadJobs();
    loadMyReviews();
    loadUnreadCount();
    const interval = setInterval(() => { loadJobs(); loadUnreadCount(); }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    if (unreadBump > 0) loadUnreadCount();
  }, [unreadBump]);

  async function loadJobs() {
    try {
      const [avail, activeRes, doneRes] = await Promise.all([
        api.get('/servicer/jobs/available?limit=50'),
        api.get('/servicer/jobs/mine?limit=50'),
        api.get('/servicer/jobs/mine?status=completed&limit=50&sortBy=completedAt'),
      ]);
      setAvailable(avail.data.bookings);
      const activeJobs = (activeRes.data.bookings || []).filter((b) => b.status !== 'completed');
      setMyJobs([...activeJobs, ...(doneRes.data.bookings || [])]);
    } catch { }
    setLoading(false);
  }

  async function loadMyReviews() {
    try {
      const res = await api.get('/bookings/my-reviews');
      const map = {};
      (res.data.reviews || []).forEach((r) => { map[r.bookingId] = r.rating; });
      setReviewedMap(map);
    } catch { }
  }

  async function handleAccept(bookingId) {
    setAccepting(true);
    setAcceptError('');
    try {
      await api.post(`/servicer/jobs/${bookingId}/accept`);
      await loadJobs();
    } catch (err) {
      setAcceptError(err.message || 'Failed to accept job');
    }
    setAccepting(false);
  }

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const activeJobs = myJobs.filter((b) => ['active', 'en-route', 'arrived'].includes(b.status));
  const completedJobs = myJobs
    .filter((b) => b.status === 'completed')
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
  const tabData = tab === 'available' ? available : tab === 'active' ? activeJobs : completedJobs;

  return (
    <div className="min-h-screen-safe bg-gray-900 pb-6">
      <header className="border-b border-gray-800 bg-gray-900 px-6 pb-4 pt-header-safe">
        <div className="mb-3 flex items-center gap-2">
          <svg className="h-6 w-6" viewBox="0 0 40 40" fill="none"><rect width="40" height="40" rx="10" fill="#1b70f5"/><path d="M20 10l-10 8h3v10h5v-6h4v6h5V18h3L20 10z" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none"/></svg>
          <span className="text-sm font-bold tracking-tight text-white">atyors<span className="text-brand-400">.com</span></span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {user.profilePhotoUrl ? (
              <img src={user.profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-gray-700" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-brand-400">{user.firstName?.[0]}{user.lastName?.[0]}</div>
            )}
            <div>
              <p className="text-sm text-gray-500">Servicer Portal</p>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-white">{user.firstName} {user.lastName}</h1>
              <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${user.averageRating > 0 ? 'bg-yellow-500/15 text-yellow-400' : 'bg-gray-700 text-gray-400'}`}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                {user.averageRating > 0 ? (
                  <>{user.averageRating} <span className="text-gray-500">({user.totalReviews})</span></>
                ) : (
                  <span>New</span>
                )}
              </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/notifications" className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-800">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotifs > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
            <button onClick={logout} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-800">
              Sign Out
            </button>
          </div>
        </div>
      </header>

      {canInstall && !isStandalone && (
        <button onClick={triggerInstall} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
          Download the App
        </button>
      )}

      <div className="mx-4 mt-4 flex gap-3">
        {activeJobs.length > 0 && (
          <Link href="/servicer/route" className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-3.5 font-semibold text-white shadow-lg shadow-accent-600/30 transition hover:from-accent-600 hover:to-accent-700 active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Today's Jobs ({activeJobs.length})
          </Link>
        )}
        <Link href="/servicer/earnings" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-3.5 font-semibold text-white transition hover:bg-gray-700 active:scale-[0.98]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Earnings
        </Link>
        <Link href="/profile" className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-700 bg-gray-800 py-3.5 font-semibold text-white transition hover:bg-gray-700 active:scale-[0.98]">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
          Profile
        </Link>
      </div>

      <div className="mt-4 flex gap-1 px-4">
        {[['available', `Available (${available.length})`], ['active', `My Jobs (${activeJobs.length})`], ['completed', `Done (${completedJobs.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2.5 text-xs font-medium transition ${tab === key ? 'bg-brand-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {label}
          </button>
        ))}
      </div>

      {acceptError && (
        <div className="mx-4 mt-3 rounded-lg bg-red-900/30 p-3 text-sm text-red-400">
          {acceptError}
          <button onClick={() => setAcceptError('')} className="ml-2 text-red-500 underline">Dismiss</button>
        </div>
      )}

      <div className="mt-4 space-y-3 px-4">
        {loading ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading jobs...</div>
        ) : tabData.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-500">
              {tab === 'available' ? 'No available jobs right now' : tab === 'active' ? 'No active jobs' : 'No completed jobs yet'}
            </p>
          </div>
        ) : (
          tabData.map((b) => <JobCard key={b._id} booking={b} onAccept={handleAccept} accepting={accepting} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} />)
        )}
      </div>

      {reviewBooking && (
        <ReviewModal
          bookingId={reviewBooking._id}
          revieweeName={`${reviewBooking.userId?.firstName || ''} ${reviewBooking.userId?.lastName || ''}`.trim() || 'Customer'}
          onClose={() => setReviewBooking(null)}
          onSubmitted={() => { setReviewBooking(null); loadMyReviews(); loadJobs(); init(); }}
          dark
        />
      )}
    </div>
  );
}
