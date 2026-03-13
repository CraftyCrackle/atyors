'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const GRACE_MS = 2 * 60 * 1000;

function useGraceCountdown(createdAt) {
  const getRemaining = useCallback(() => {
    if (!createdAt) return 0;
    const elapsed = Date.now() - new Date(createdAt).getTime();
    return Math.max(0, Math.ceil((GRACE_MS - elapsed) / 1000));
  }, [createdAt]);

  const [seconds, setSeconds] = useState(getRemaining);

  useEffect(() => {
    if (seconds <= 0) return;
    const id = setInterval(() => {
      const s = getRemaining();
      setSeconds(s);
      if (s <= 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [seconds, getRemaining]);

  return seconds;
}
import AuthGuard from '../../components/AuthGuard';
import BottomNav from '../../components/BottomNav';
import ReviewModal from '../../components/ReviewModal';
import ConfirmModal from '../../components/ConfirmModal';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';
import { useNotifications } from '../../components/NotificationProvider';
import { useInstall } from '../../components/InstallContext';
import Logo from '../../components/Logo';

const TrackingMap = dynamic(() => import('../../components/TrackingMap'), { ssr: false });

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  'in-progress': 'bg-orange-100 text-orange-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-500',
  expired: 'bg-orange-100 text-orange-700',
  denied: 'bg-red-100 text-red-700',
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
  expired: 'Expired',
  denied: 'Denied',
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

function LiveTrackingCard({ booking, onStatusChange }) {
  const status = booking.status;
  const svc = booking.serviceTypeId;
  const servicer = booking.assignedTo;
  const isMoving = status === 'en-route';
  const [servicerPos, setServicerPos] = useState(null);
  const socketRef = useRef(null);

  const customerCoords = booking.addressId?.location?.coordinates;
  const customerPos = customerCoords ? { lat: customerCoords[1], lng: customerCoords[0] } : null;

  useEffect(() => {
    let disposed = false;

    async function fetchInitialPosition() {
      try {
        const res = await api.get(`/bookings/${booking._id}/queue`);
        const q = res.data?.queue;
        if (q?.servicerLocation && !disposed) {
          setServicerPos({ lat: q.servicerLocation.lat, lng: q.servicerLocation.lng });
        }
      } catch {}
    }

    async function connectSocket() {
      const { createSocket } = await import('../../services/socket');
      if (disposed) return;
      const token = localStorage.getItem('accessToken');
      const socket = createSocket('/tracking', token);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:booking', booking._id);
      });

      socket.on('location:update', (data) => {
        if (!disposed) setServicerPos({ lat: data.lat, lng: data.lng });
      });

      socket.on('status:update', () => { if (!disposed && onStatusChange) onStatusChange(); });
      socket.on('booking:status', () => { if (!disposed && onStatusChange) onStatusChange(); });
    }

    fetchInitialPosition();
    connectSocket();

    return () => {
      disposed = true;
      if (socketRef.current) {
        socketRef.current.emit('leave:booking', booking._id);
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [booking._id]);

  const showMap = servicerPos || (status === 'arrived' && customerPos);
  const effectiveServicerPos = servicerPos || (status === 'arrived' ? customerPos : null);

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg">
      <div className="relative h-48 bg-gray-100">
        {showMap ? (
          <TrackingMap servicerPos={effectiveServicerPos} customerPos={customerPos} />
        ) : (
          <div className="flex h-full items-center justify-center">
            <div className="text-center">
              {status === 'active' ? (
                <>
                  <svg className="mx-auto h-8 w-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-2 text-xs text-gray-400">Your servicer will start their route soon.</p>
                  <p className="text-[10px] text-gray-300">Live tracking will appear when they&apos;re on the way.</p>
                </>
              ) : (
                <>
                  <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent" />
                  <p className="mt-2 text-xs text-gray-400">Loading map...</p>
                </>
              )}
            </div>
          </div>
        )}
        <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-white/95 px-3 py-1.5 shadow-md backdrop-blur">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
          </span>
          <span className="text-xs font-semibold text-gray-800">Live</span>
        </div>
      </div>

      <div className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold text-gray-900">{svc?.name || 'Service'} — {STATUS_LABELS[status]}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {servicer ? `${servicer.firstName} ${servicer.lastName}` : 'Servicer assigned'}
              {isMoving && ' is on the way'}
              {status === 'arrived' && ' has arrived'}
            </p>
          </div>
          <Link href={`/tracking/${booking._id}`} className="rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-600 transition hover:bg-brand-100">
            Details
          </Link>
        </div>
      </div>
    </div>
  );
}

function BookingCard({ booking, onRate, alreadyRated, onCancel, cancelling }) {
  const date = new Date(booking.scheduledDate);
  const svc = booking.serviceTypeId;
  const isActive = ACTIVE_STATUSES.includes(booking.status);
  const isCompleted = booking.status === 'completed';
  const servicer = booking.assignedTo;
  const canCancel = booking.status === 'pending' && !booking.assignedTo && !booking.subscriptionId;
  const graceSeconds = useGraceCountdown(canCancel ? booking.createdAt : null);
  const inGrace = canCancel && graceSeconds > 0;
  const graceMin = Math.floor(graceSeconds / 60);
  const graceSec = graceSeconds % 60;

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <Link href={isActive ? `/tracking/${booking._id}` : isCompleted ? `/booking/${booking._id}` : '#'}>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-semibold text-gray-900">{svc?.name || 'Service'}</p>
            <p className="mt-0.5 text-sm text-gray-500">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              {svc?.slug === 'curb-items'
                ? <span className="mx-1">&middot; {booking.itemCount || 1} item{(booking.itemCount || 1) > 1 ? 's' : ''}</span>
                : booking.barrelCount > 0 && <span className="mx-1">&middot; {booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>
              }
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
          </div>
        </div>
        {booking.addressId && (
          <p className="mt-2 text-xs text-gray-400">{booking.addressId.street}, {booking.addressId.city}</p>
        )}
        {booking.linkedBookingId && (
          <p className="mt-1 text-xs text-brand-500 font-medium">Part of Put Out and Bring In</p>
        )}
        {booking.placementConfirmed && (
          <div className="mt-1 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            <span className="text-xs font-medium text-green-600">Placement confirmed</span>
          </div>
        )}
        {booking.status === 'denied' && booking.denialReason && (
          <p className="mt-1 text-xs text-red-600">Denied: {booking.denialReason}</p>
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
        <div className="mt-3">
          {inGrace && (
            <div className="mb-2 flex items-center justify-center gap-1.5 rounded-lg bg-amber-50 py-1.5 text-xs text-amber-700">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m6-2a10 10 0 11-20 0 10 10 0 0120 0z" />
              </svg>
              Free cancellation for <span className="font-semibold">{graceMin}:{String(graceSec).padStart(2, '0')}</span>
            </div>
          )}
          {!inGrace && (
            <p className="mb-2 text-center text-[11px] text-gray-400">A $1.00 cancellation fee will apply</p>
          )}
          <button onClick={() => onCancel(booking._id, inGrace)} disabled={cancelling}
            className="w-full rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-medium text-red-600 transition hover:bg-red-100 active:scale-[0.98] disabled:opacity-50">
            {cancelling ? 'Cancelling...' : 'Cancel Booking'}
          </button>
        </div>
      )}
      {(isActive || isCompleted) && !canCancel && (
        <div className="mt-3 flex gap-2">
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

function ServiceTypeGroup({ type, jobs, onRate, reviewedMap, onCancel, cancelling, dark }) {
  const [open, setOpen] = useState(false);
  const totalValue = jobs.reduce((sum, b) => sum + Number(b.serviceValue ?? b.amount ?? 0), 0);

  const cardCls = dark
    ? 'rounded-xl border border-gray-700 bg-gray-800/60 overflow-hidden'
    : 'rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden';
  const btnCls = dark
    ? 'hover:bg-gray-800 active:bg-gray-700/50'
    : 'hover:bg-gray-50 active:bg-gray-100';
  const iconBg = dark ? 'bg-green-600/20' : 'bg-green-100';
  const iconColor = dark ? 'text-green-400' : 'text-green-600';
  const titleColor = dark ? 'text-white' : 'text-gray-900';
  const subColor = dark ? 'text-gray-400' : 'text-gray-500';
  const chevronColor = dark ? 'text-gray-500' : 'text-gray-400';

  return (
    <div className={cardCls}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex w-full items-center gap-3 px-4 py-3.5 text-left transition ${btnCls}`}
      >
        <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${iconBg}`}>
          <svg className={`h-5 w-5 ${iconColor}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold truncate ${titleColor}`}>{type}</p>
          <p className={`text-xs ${subColor}`}>{jobs.length} completed &middot; ${totalValue.toFixed(2)}</p>
        </div>
        <svg className={`h-5 w-5 transition-transform duration-200 ${chevronColor} ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {open && (
        <div className="space-y-3 px-3 pb-3">
          {jobs.map((b) => (
            <BookingCard key={b._id} booking={b} onRate={onRate} alreadyRated={reviewedMap?.[b._id]} onCancel={onCancel} cancelling={cancelling} />
          ))}
        </div>
      )}
    </div>
  );
}

const PAGE_SIZE = 15;

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
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  async function loadBookings() {
    try {
      const [activeRes, pastRes] = await Promise.all([
        api.get('/bookings?limit=200'),
        api.get('/bookings?status=completed&limit=200&sortBy=completedAt'),
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

  const [cancelInGrace, setCancelInGrace] = useState(false);

  function handleCancelClick(bookingId, inGrace) {
    setCancelConfirm(bookingId);
    setCancelInGrace(!!inGrace);
  }

  async function executeCancel(bookingId) {
    setCancelConfirm(null);
    setCancelling(true);
    try {
      await api.patch(`/bookings/${bookingId}/cancel`, { reason: 'Cancelled by customer' });
      await loadBookings();
    } catch (err) {
      alert(err?.message || 'Failed to cancel booking. Please try again.');
    }
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

  const byLastModified = (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt);
  const upcoming = bookings.filter((b) => ['pending'].includes(b.status)).sort(byLastModified);
  const active = bookings.filter((b) => ACTIVE_STATUSES.includes(b.status)).sort(byLastModified);
  const liveBookings = active.filter((b) => ['en-route', 'arrived'].includes(b.status));
  const past = bookings
    .filter((b) => ['completed', 'cancelled', 'no-show', 'expired', 'denied'].includes(b.status))
    .sort((a, b) => new Date(b.completedAt || b.updatedAt) - new Date(a.completedAt || a.updatedAt));

  const pastServiceTypeGroups = (() => {
    const groups = {};
    past.forEach((b) => {
      const name = b.serviceTypeId?.name || 'Service';
      if (!groups[name]) groups[name] = [];
      groups[name].push(b);
    });
    return Object.entries(groups)
      .sort((a, b) => b[1].length - a[1].length)
      .map(([type, jobs]) => ({ type, jobs }));
  })();

  const nonPastData = tab === 'upcoming' ? upcoming : active;
  const tabData = nonPastData.slice(0, visibleCount);
  const hasMore = nonPastData.length > visibleCount;

  function switchTab(key) {
    setTab(key);
    setVisibleCount(PAGE_SIZE);
  }

  return (
    <AuthGuard>
      <div className="min-h-screen-safe bg-gray-50 pb-20">
        <header className="sticky top-0 z-10 bg-white px-6 pb-4 pt-header-safe shadow-sm">
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
              <LiveTrackingCard key={b._id} booking={b} onStatusChange={loadBookings} />
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
            <button key={key} onClick={() => switchTab(key)} className={`flex-1 rounded-lg py-2 text-xs font-medium transition ${tab === key ? 'bg-brand-600 text-white' : 'bg-white text-gray-500'}`}>
              {label}
            </button>
          ))}
        </div>

        <div className="mt-4 space-y-3 px-4">
          {loading ? (
            <div className="py-12 text-center text-sm text-gray-400">Loading...</div>
          ) : tab === 'past' ? (
            pastServiceTypeGroups.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-sm text-gray-400">No past services</p>
              </div>
            ) : (
              pastServiceTypeGroups.map((g) => (
                <ServiceTypeGroup key={g.type} type={g.type} jobs={g.jobs} onRate={setReviewBooking} reviewedMap={reviewedMap} onCancel={handleCancelClick} cancelling={cancelling} dark={false} />
              ))
            )
          ) : tabData.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm text-gray-400">{tab === 'upcoming' ? 'No upcoming services' : 'No active services'}</p>
              {tab === 'upcoming' && (
                <Link href="/book" className="mt-2 inline-block text-sm font-medium text-brand-600">Book a service</Link>
              )}
            </div>
          ) : (
            <>
              {tabData.map((b) => <BookingCard key={b._id} booking={b} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} onCancel={handleCancelClick} cancelling={cancelling} />)}
              {hasMore && (
                <button onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className="w-full rounded-xl border border-gray-200 bg-white py-3 text-sm font-medium text-brand-600 transition hover:bg-brand-50 active:scale-[0.98]">
                  Show more ({nonPastData.length - visibleCount} remaining)
                </button>
              )}
            </>
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
            message={cancelInGrace
              ? 'This is within your free cancellation window. No charge will apply.'
              : 'A $1.00 cancellation fee will be charged to your card on file.'}
            confirmLabel={cancelInGrace ? 'Yes, Cancel' : 'Cancel & Pay $1.00'}
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
