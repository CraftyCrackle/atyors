'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import ReviewModal from '../../../components/ReviewModal';
import { api } from '../../../services/api';

const STATUS_LABELS = {
  pending: 'Pending',
  active: 'Active',
  'en-route': 'En Route',
  arrived: 'Arrived',
  completed: 'Completed',
  cancelled: 'Cancelled',
  'no-show': 'No Show',
};

export default function BookingSummaryPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showReview, setShowReview] = useState(false);
  const [myReview, setMyReview] = useState(null);

  useEffect(() => {
    loadBooking();
    loadMyReview();
  }, [id]);

  async function loadBooking() {
    try {
      const res = await api.get(`/bookings/${id}`);
      setBooking(res.data.booking);
    } catch { }
    setLoading(false);
  }

  async function loadMyReview() {
    try {
      const res = await api.get('/bookings/my-reviews');
      const found = (res.data.reviews || []).find((r) => r.bookingId === id);
      if (found) setMyReview(found);
    } catch { }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen-safe items-center justify-center bg-gray-50">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  if (!booking) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen-safe flex-col items-center justify-center bg-gray-50 px-6">
          <p className="text-gray-400">Booking not found</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm font-medium text-brand-600">Back to Dashboard</button>
        </div>
      </AuthGuard>
    );
  }

  const addr = booking.addressId;
  const svc = booking.serviceTypeId;
  const servicer = booking.assignedTo;
  const isCompleted = booking.status === 'completed';

  return (
    <AuthGuard>
      <div className="min-h-screen-safe bg-gray-50">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-200 bg-white px-4 pb-3 pt-sticky-safe">
          <button onClick={() => router.push('/dashboard')} className="rounded-lg p-2 text-gray-500 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="flex-1 font-semibold text-gray-900">Booking Summary</h1>
          {isCompleted && (
            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-800">Completed</span>
          )}
        </header>

        <div className="px-4 py-6 space-y-4">
          {/* Service info */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-bold text-gray-900">{svc?.name || 'Service'}</h2>
            <p className="mt-1 text-sm text-gray-500">
              {new Date(booking.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${isCompleted ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}`}>
                {STATUS_LABELS[booking.status] || booking.status}
              </span>
              {booking.barrelCount > 0 && (
                <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">{booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>
              )}
            </div>
            {(booking.putOutTime || booking.bringInTime) && (
              <div className="mt-2 flex gap-4 text-xs text-gray-500">
                {booking.putOutTime && <span>Put out: {booking.putOutTime}</span>}
                {booking.bringInTime && <span>Bring in: {booking.bringInTime}</span>}
              </div>
            )}
          </div>

          {/* Invoice / Amount */}
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500">Invoice</h3>
            {booking.subscriptionId ? (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-accent-100 px-3 py-1 text-sm font-semibold text-accent-700">Subscription</span>
                  <span className="text-xs text-gray-400">Covered by your monthly plan</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{svc?.name}</p>
              </div>
            ) : booking.amount != null ? (
              <div className="mt-2">
                <div className="flex items-baseline justify-between">
                  <p className="text-2xl font-bold text-gray-900">${booking.amount.toFixed(2)}</p>
                  <span className="text-xs text-green-600 font-medium">{isCompleted ? 'Paid' : 'Pending'}</span>
                </div>
                <p className="mt-1 text-xs text-gray-400">{svc?.name}</p>
              </div>
            ) : null}
          </div>

          {/* Servicer info */}
          {servicer && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Servicer</h3>
              <div className="mt-2 flex items-center gap-3">
                {servicer.profilePhotoUrl ? (
                  <img src={servicer.profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                    {servicer.firstName?.[0]}{servicer.lastName?.[0]}
                  </div>
                )}
                <div>
                  <p className="font-medium text-gray-900">{servicer.firstName} {servicer.lastName}</p>
                  {servicer.averageRating > 0 && (
                    <p className="text-xs text-yellow-600">
                      {'★'.repeat(Math.round(servicer.averageRating))} {servicer.averageRating} ({servicer.totalReviews} reviews)
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {addr && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Service Address</h3>
              <p className="mt-1 text-sm font-medium text-gray-900">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
              <p className="text-sm text-gray-500">{addr.city}, {addr.state} {addr.zip}</p>
            </div>
          )}

          {/* Completion photo */}
          {booking.completionPhotoUrl && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Completion Photo</h3>
              <img src={booking.completionPhotoUrl} alt="Job completed" className="mt-2 w-full rounded-xl object-cover max-h-72" />
            </div>
          )}

          {/* Servicer notes */}
          {booking.notes && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Servicer Notes</h3>
              <p className="mt-1 text-sm text-gray-700">{booking.notes}</p>
            </div>
          )}

          {/* Completed at */}
          {booking.completedAt && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Completed</h3>
              <p className="mt-1 text-sm text-gray-700">
                {new Date(booking.completedAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </p>
            </div>
          )}

          {/* Rating section */}
          {isCompleted && (
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <h3 className="text-xs font-medium uppercase text-gray-500">Your Rating</h3>
              {myReview ? (
                <div className="mt-2">
                  <p className="text-lg text-yellow-500">{'★'.repeat(myReview.rating)}{'☆'.repeat(5 - myReview.rating)}</p>
                  {myReview.comment && <p className="mt-1 text-sm text-gray-500 italic">"{myReview.comment}"</p>}
                </div>
              ) : (
                <button onClick={() => setShowReview(true)}
                  className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-50 py-3 text-sm font-semibold text-yellow-700 transition hover:bg-yellow-100 active:scale-[0.98]">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                  Rate this Service
                </button>
              )}
            </div>
          )}
        </div>

        {showReview && servicer && (
          <ReviewModal
            bookingId={id}
            revieweeName={`${servicer.firstName} ${servicer.lastName}`}
            onClose={() => setShowReview(false)}
            onSubmitted={() => { setShowReview(false); loadMyReview(); loadBooking(); }}
          />
        )}
      </div>
    </AuthGuard>
  );
}
