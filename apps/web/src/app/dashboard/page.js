'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import ReviewModal from '../../components/ReviewModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { useNotifications } from '../../components/NotificationProvider';
import { useInstall } from '../../components/InstallContext';
import Logo from '../../components/Logo';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

const ACTIVE_STATUSES = ['active', 'en-route', 'arrived'];

const STATUS_LABELS = {
  active: 'Active',
  'en-route': 'En Route',
  arrived: 'Arrived',
  'in-progress': 'In Progress',
  completed: 'Completed',
  pending: 'Pending',
  cancelled: 'Cancelled',
};

const STATUS_ICONS = {
  'en-route': 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l4-2 4 2zm6-4h-2m-4 0h.01M17 21l-3-3m0 0l-3 3m3-3v6',
  arrived: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z',
  'in-progress': 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
};

const LIVE_COLORS = {
  'en-route': 'bg-purple-600',
  arrived: 'bg-indigo-600',
  'in-progress': 'bg-orange-500',
};

function LiveBookingBanner({ booking }) {
  const status = booking.status;
  const svc = booking.serviceTypeId;
  const servicer = booking.assignedTo;
  const color = LIVE_COLORS[status] || 'bg-brand-600';
  const isMoving = status === 'en-route';

  return (
    <Link href={`/tracking/${booking._id}`} className={`block rounded-xl ${color} p-4 text-white shadow-lg transition active:scale-[0.99]`}>
      <div className="flex items-center gap-3">
        <div className="relative flex h-11 w-11 items-center justify-center rounded-full bg-white/20">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {isMoving && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-400 animate-pulse" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold">{svc?.name || 'Service'} — {STATUS_LABELS[status]}</p>
          <p className="text-sm text-white/80 truncate">
            {servicer ? `${servicer.firstName} ${servicer.lastName}` : 'Servicer assigned'}
            {status === 'en-route' && ' is on the way'}
            {status === 'arrived' && ' has arrived'}
            {status === 'in-progress' && ' is working'}
          </p>
        </div>
        <div className="flex flex-col items-center gap-0.5">
          <svg className="h-5 w-5 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          <span className="text-[10px] text-white/50">Track</span>
        </div>
      </div>
    </Link>
  );
}

const GRACE_PERIOD_MS = 2 * 60 * 1000;

function useGraceCountdown(createdAt) {
  const [secsLeft, setSecsLeft] = useState(() => {
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 1000));
  });

  useEffect(() => {
    if (secsLeft <= 0) return;
    const timer = setInterval(() => {
      const elapsed = Date.now() - new Date(createdAt).getTime();
      const remaining = Math.max(0, Math.ceil((GRACE_PERIOD_MS - elapsed) / 1000));
      setSecsLeft(remaining);
      if (remaining <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [createdAt, secsLeft]);

  return secsLeft;
}

function BookingCard({ booking, onRate, alreadyRated, onCancel, cancelling }) {
  const date = new Date(booking.scheduledDate);
  const svc = booking.serviceTypeId;
  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const isCompleted = booking.status === 'completed';
  const isPendingPayment = booking.paymentStatus === 'pending_payment';
  const servicer = booking.assignedTo;
  const graceLeft = useGraceCountdown(booking.createdAt);
  const inGrace = booking.status === 'pending' && !booking.assignedTo && graceLeft > 0;
  const canCancel = booking.status === 'pending' && !booking.assignedTo;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <Link href={isActive ? `/tracking/${booking._id}` : isCompleted ? `/booking/${booking._id}` : '#'}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900">{svc?.name || 'Service'}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {booking.barrelCount > 0 && <span className="mx-1">&middot; {booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>}
              {booking.subscriptionId
                ? <span className="mx-1 text-accent-600 font-medium">&middot; Subscription</span>
                : booking.amount != null && <span className="mx-1">&middot; ${Number(booking.amount).toFixed(2)}</span>
              }
            </p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[booking.status] || 'bg-gray-100'}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
            {isPendingPayment && (
              <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-700">Payment Required</span>
            )}
          </div>
        </div>
        {booking.addressId && (
          <p className="mt-2 text-xs text-gray-400">{booking.addressId.street}, {booking.addressId.city}</p>
        )}
        {booking.linkedBookingId && (
          <p className="mt-1 text-xs text-brand-500 font-medium">Part of Put-Out &amp; Bring-In</p>
        )}
        {servicer && (
          <div className="mt-1 flex items-center gap-2">
            {servicer.profilePhotoUrl ? (
              <img src={servicer.profilePhotoUrl} alt="" className="h-5 w-5 rounded-full object-cover" />
            ) : (
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[9px] font-bold text-gray-500">{servicer.firstName?.[0]}{servicer.lastName?.[0]}</div>
            )}
            <p className="text-xs text-gray-400">
              {servicer.firstName} {servicer.lastName}
            </p>
          </div>
        )}
        {isActive && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
            </span>
            <span className="text-xs font-medium text-green-600">Live — tap to track</span>
          </div>
        )}
      </Link>
      {canCancel && (
        <div className="mt-3 space-y-2">
          {inGrace ? (
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              <span>Free cancellation — <strong>{Math.floor(graceLeft / 60)}:{String(graceLeft % 60).padStart(2, '0')}</strong> remaining</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>
              <span>A <strong>$1.00</strong> cancellation fee will apply</span>
            </div>
          )}
          <button onClick={() => onCancel(booking._id, inGrace)} disabled={cancelling}
            className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 active:scale-[0.98] disabled:opacity-50">
            {cancelling ? 'Cancelling...' : inGrace ? 'Cancel Booking (Free)' : 'Cancel Booking ($1.00 fee)'}
          </button>
        </div>
      )}
      {(isActive || isCompleted || isPendingPayment) && !canCancel && (
        <div className="mt-3 flex gap-2">
          {isPendingPayment && !isActive && !isCompleted && (
            <Link href={`/book?resume=${booking._id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-red-50 py-2 text-xs font-medium text-red-700 transition hover:bg-red-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>
              Complete Payment
            </Link>
          )}
          {isActive && (
            <>
              <Link href={`/tracking/${booking._id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-50 py-2 text-xs font-medium text-brand-700 transition hover:bg-brand-100">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                Track Live
              </Link>
              <Link href={`/chat/${booking._id}`} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-gray-100 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-200">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                Chat
              </Link>
            </>
          )}
          {isCompleted && !alreadyRated && (
            <button onClick={() => onRate(booking)} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-yellow-50 py-2 text-xs font-medium text-yellow-700 transition hover:bg-yellow-100">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
              Rate Servicer
            </button>
          )}
          {isCompleted && alreadyRated && (
            <div className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-50 py-2 text-xs font-medium text-green-700">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
              Rated
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const { unreadBump } = useNotifications();
  const { canInstall, isStandalone, triggerInstall } = useInstall();
  const [tab, setTab] = useState('upcoming');
  const [bookings, setBookings] = useState([]);
  const [cancelling, setCancelling] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedMap, setReviewedMap] = useState({});
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  async function loadBookings() {
    try {
      const [activeRes, pastRes] = await Promise.all([
        api.get('/bookings?limit=50'),
        api.get('/bookings?status=completed&limit=50&sortBy=completedAt'),
      ]);
      const activeBookings = (activeRes.data.bookings || []).filter((b) => b.status !== 'completed');
      const completedBookings = pastRes.data.bookings || [];
      setBookings([...activeBookings, ...completedBookings]);
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

  function handleCancelClick(bookingId, inGrace) {
    if (inGrace) {
      executeCancel(bookingId);
    } else {
      setCancelConfirm(bookingId);
    }
  }

  async function executeCancel(bookingId) {
    setCancelConfirm(null);
    setCancelling(true);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by customer' });
      await loadBookings();
    } catch {}
    setCancelling(false);
  }

  async function loadUnreadCount() {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnreadNotifs(res.data.count || 0);
    } catch { }
  }

  useEffect(() => {
    loadBookings();
    loadMyReviews();
    loadUnreadCount();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => { loadBookings(); loadUnreadCount(); }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (unreadBump > 0) loadUnreadCount();
  }, [unreadBump]);

  const upcoming = bookings.filter((b) => ['pending'].includes(b.status));
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status));
  const liveBookings = active.filter((b) => ['en-route', 'arrived'].includes(b.status));
  const past = bookings
    .filter((b) => ['completed', 'cancelled', 'no-show'].includes(b.status))
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));
  const tabData = tab === 'upcoming' ? upcoming : tab === 'active' ? active : past;

  return (
    <AuthGuard>
      <div className="min-h-screen-safe bg-gray-50 pb-20">
        <header className="bg-white px-6 pb-4 pt-header-safe shadow-sm">
          <div className="mb-3">
            <Logo size="sm" variant="wordmark" />
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {user?.profilePhotoUrl ? (
                <img src={user.profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-600">{user?.firstName?.[0]}{user?.lastName?.[0]}</div>
              )}
              <div>
                <p className="text-sm text-gray-500">Welcome back,</p>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold">{user?.firstName} {user?.lastName}</h1>
                <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${user?.averageRating > 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'}`}>
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" /></svg>
                  {user?.averageRating > 0 ? (
                    <>{user.averageRating} <span className="text-yellow-500">({user.totalReviews})</span></>
                  ) : (
                    <span>New</span>
                  )}
                </span>
                </div>
              </div>
            </div>
            <Link href="/notifications" className="relative rounded-lg p-2 text-gray-500 hover:bg-gray-100">
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
              </svg>
              {unreadNotifs > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {unreadNotifs > 9 ? '9+' : unreadNotifs}
                </span>
              )}
            </Link>
          </div>
        </header>

        {canInstall && !isStandalone && (
          <button onClick={triggerInstall} className="mx-4 mt-3 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 active:scale-[0.98]">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Download the App
          </button>
        )}

        {liveBookings.length > 0 && (
          <div className="mx-4 mt-4 space-y-3">
            {liveBookings.map((b) => (
              <LiveBookingBanner key={b._id} booking={b} />
            ))}
          </div>
        )}

        <div className="mt-4 px-4">
          <Link href="/book" className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand-600 to-accent-500 py-4 text-sm font-semibold text-white shadow-md shadow-brand-600/20 transition hover:shadow-lg active:scale-[0.98]">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            Book a Service
          </Link>
        </div>

        <div className="mt-6 flex gap-1 px-4">
          {[['upcoming', `Upcoming (${upcoming.length})`], ['active', `Active (${active.length})`], ['past', `Past (${past.length})`]].map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${tab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 px-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : tabData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">{tab === 'upcoming' ? 'No upcoming services' : tab === 'active' ? 'No active services' : 'No past services'}</p>
              {tab === 'upcoming' && (
                <Link href="/book" className="mt-2 inline-block text-sm font-medium text-brand-600">Book your first service</Link>
              )}
            </div>
          ) : (
            tabData.map((b) => <BookingCard key={b._id} booking={b} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} onCancel={handleCancelClick} cancelling={cancelling} />)
          )}
        </div>

        <BottomNav />

        {reviewBooking && (
          <ReviewModal
            bookingId={reviewBooking._id}
            revieweeName={`${reviewBooking.assignedTo?.firstName || ''} ${reviewBooking.assignedTo?.lastName || ''}`.trim() || 'Servicer'}
            onClose={() => setReviewBooking(null)}
            onSubmitted={() => { setReviewBooking(null); loadMyReviews(); loadBookings(); }}
          />
        )}

        {cancelConfirm && (
          <ConfirmModal
            title="Cancel Booking?"
            message="A $1.00 cancellation fee will be deducted from your refund. Would you like to proceed?"
            confirmLabel="Yes, Cancel"
            cancelLabel="Keep Booking"
            danger
            onConfirm={() => executeCancel(cancelConfirm)}
            onCancel={() => setCancelConfirm(null)}
          />
        )}
      </div>
    </AuthGuard>
  );
}
