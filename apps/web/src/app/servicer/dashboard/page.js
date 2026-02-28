'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import ReviewModal from '../../../components/ReviewModal';
import { useNotifications } from '../../../components/NotificationProvider';
import { useInstall } from '../../../components/InstallContext';
import Logo from '../../../components/Logo';

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
      <div className="flex min-h-[100dvh] min-h-[100vh] items-center justify-center bg-gray-900">
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
    <div className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-gray-900 pb-6">
      <header className="bg-gradient-to-b from-gray-800 to-gray-900 px-5 pb-5 pt-header-safe">
        <div className="flex items-center justify-between">
          <Logo size="sm" variant="wordmark" dark />
          <div className="flex items-center gap-1.5">
            <Link href="/notifications" className="relative rounded-full p-2 text-gray-400 transition hover:bg-white/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotifs > 0 && (
                <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white ring-2 ring-gray-800">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
            <button onClick={logout} className="rounded-full p-2 text-gray-400 transition hover:bg-white/10">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {user.profilePhotoUrl ? (
            <img src={user.profilePhotoUrl} alt="" className="h-12 w-12 rounded-full object-cover ring-2 ring-brand-500/30" />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-600/20 text-sm font-bold text-brand-400 ring-2 ring-brand-500/20">{user.firstName?.[0]}{user.lastName?.[0]}</div>
          )}
          <div className="flex-1">
            <h1 className="text-lg font-bold text-white">{user.firstName} {user.lastName}</h1>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="text-xs font-medium text-gray-400">Servicer</span>
              <span className="text-gray-600">&middot;</span>
              <span className={`inline-flex items-center gap-1 text-xs font-semibold ${user.averageRating > 0 ? 'text-yellow-400' : 'text-gray-500'}`}>
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                {user.averageRating > 0 ? `${user.averageRating} (${user.totalReviews})` : 'New'}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="space-y-3 px-4 -mt-1">
        {activeJobs.length > 0 && (
          <Link href="/servicer/route" className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-500 to-accent-600 py-3.5 font-semibold text-white shadow-lg shadow-accent-600/25 transition hover:from-accent-600 hover:to-accent-700 active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            Plan Today&apos;s Route ({activeJobs.length})
          </Link>
        )}

        <div className="flex gap-2">
          <Link href="/servicer/earnings" className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-gray-700/50 bg-gray-800/60 py-3 transition hover:bg-gray-800 active:scale-[0.98]">
            <svg className="h-5 w-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs font-medium text-gray-300">Earnings</span>
          </Link>
          <Link href="/profile" className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-gray-700/50 bg-gray-800/60 py-3 transition hover:bg-gray-800 active:scale-[0.98]">
            <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>
            <span className="text-xs font-medium text-gray-300">Profile</span>
          </Link>
          {canInstall && !isStandalone && (
            <button onClick={triggerInstall} className="flex flex-1 flex-col items-center gap-1.5 rounded-xl border border-brand-500/20 bg-brand-600/10 py-3 transition hover:bg-brand-600/20 active:scale-[0.98]">
              <svg className="h-5 w-5 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              <span className="text-xs font-medium text-brand-300">Get App</span>
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex gap-1.5 px-4">
        {[['available', `Available (${available.length})`], ['active', `My Jobs (${activeJobs.length})`], ['completed', `Done (${completedJobs.length})`]].map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex-1 rounded-xl py-2.5 text-xs font-semibold transition ${tab === key ? 'bg-brand-600 text-white shadow-md shadow-brand-600/25' : 'bg-gray-800/60 text-gray-400 hover:text-gray-300'}`}>
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

      <div className="mt-3 flex-1 space-y-3 px-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-3 border-brand-600 border-t-transparent" />
            <p className="mt-3 text-sm text-gray-500">Loading jobs...</p>
          </div>
        ) : tabData.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-gray-800 bg-gray-800/30 py-16">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gray-800">
              <svg className="h-7 w-7 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                {tab === 'available' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-.673-.38m0 0A2.18 2.18 0 013 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 013.413-.387m7.5 0V5.25A2.25 2.25 0 0013.5 3h-3a2.25 2.25 0 00-2.25 2.25v.894m7.5 0a48.667 48.667 0 00-7.5 0" />
                ) : tab === 'active' ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15a2.25 2.25 0 012.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                )}
              </svg>
            </div>
            <p className="mt-3 text-sm font-medium text-gray-400">
              {tab === 'available' ? 'No available jobs right now' : tab === 'active' ? 'No active jobs' : 'No completed jobs yet'}
            </p>
            <p className="mt-1 text-xs text-gray-600">
              {tab === 'available' ? 'New jobs will appear here when customers book' : tab === 'active' ? 'Accept a job to get started' : 'Completed jobs will show here'}
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
