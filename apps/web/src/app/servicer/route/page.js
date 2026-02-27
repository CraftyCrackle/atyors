'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../stores/authStore';
import { api } from '../../../services/api';
import ReviewModal from '../../../components/ReviewModal';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  active: 'bg-blue-100 text-blue-800',
  'en-route': 'bg-purple-100 text-purple-800',
  arrived: 'bg-indigo-100 text-indigo-800',
  completed: 'bg-green-100 text-green-800',
};

function JobCard({ booking, onRate, alreadyRated }) {
  const date = new Date(booking.scheduledDate);
  const addr = booking.addressId;
  const svc = booking.serviceTypeId;
  const customer = booking.userId;

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

      {addr && (
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

      {customer && (
        <p className="mt-2 text-xs text-gray-500">
          Customer: {customer.firstName} {customer.lastName}
          {customer.averageRating > 0 && <span className="ml-1 text-yellow-400">{'★'.repeat(Math.round(customer.averageRating))} {customer.averageRating}</span>}
        </p>
      )}

      <div className="mt-3 flex gap-2">
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
            Rated {'★'.repeat(alreadyRated)}
          </div>
        )}
      </div>
    </div>
  );
}

function isSameLocalDay(dateStr) {
  const d = new Date(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate();
}

export default function ServicerRoutePage() {
  const { user, loading: authLoading, init } = useAuthStore();
  const router = useRouter();

  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewBooking, setReviewBooking] = useState(null);
  const [reviewedMap, setReviewedMap] = useState({});

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadJobs();
    loadMyReviews();
    const interval = setInterval(loadJobs, 8000);
    return () => clearInterval(interval);
  }, [user]);

  async function loadJobs() {
    try {
      const res = await api.get('/servicer/jobs/mine?limit=100');
      const todayJobs = (res.data.bookings || []).filter((b) => isSameLocalDay(b.scheduledDate));
      setJobs(todayJobs);
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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  const activeJobs = jobs.filter((b) => ['active', 'en-route', 'arrived'].includes(b.status));
  const completedJobs = jobs.filter((b) => b.status === 'completed');

  return (
    <div className="min-h-screen-safe bg-gray-900 pb-6">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
        <button onClick={() => router.push('/servicer/dashboard')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-semibold text-white">Today's Jobs</h1>
        <span className="ml-auto rounded-full bg-gray-800 px-3 py-1 text-xs text-gray-400">
          {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
      </header>

      <div className="px-4 py-4 space-y-3">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-500">Loading today's jobs...</div>
        ) : jobs.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-gray-400">No jobs scheduled for today.</p>
            <button onClick={() => router.push('/servicer/dashboard')} className="mt-4 text-sm font-medium text-brand-400">Back to Dashboard</button>
          </div>
        ) : (
          <>
            {activeJobs.length > 0 && (
              <div className="mb-1">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Active ({activeJobs.length})</p>
                <div className="space-y-3">
                  {activeJobs.map((b) => (
                    <JobCard key={b._id} booking={b} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} />
                  ))}
                </div>
              </div>
            )}

            {completedJobs.length > 0 && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase text-gray-500">Completed ({completedJobs.length})</p>
                <div className="space-y-3">
                  {completedJobs.map((b) => (
                    <JobCard key={b._id} booking={b} onRate={setReviewBooking} alreadyRated={reviewedMap[b._id]} />
                  ))}
                </div>
              </div>
            )}
          </>
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
