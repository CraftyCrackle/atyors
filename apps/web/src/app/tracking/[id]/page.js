'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import AuthGuard from '../../../components/AuthGuard';
import { api } from '../../../services/api';

const TrackingMap = dynamic(() => import('../../../components/TrackingMap'), { ssr: false });

const STATUS_STEPS = ['active', 'en-route', 'arrived', 'completed'];
const STATUS_LABELS = { active: 'Active', 'en-route': 'En Route', arrived: 'Arrived', completed: 'Done' };

export default function TrackingPage() {
  const { id } = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState(null);
  const [queue, setQueue] = useState(null);
  const [servicerPos, setServicerPos] = useState(null);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [id]);

  useEffect(() => {
    let socket;
    let disposed = false;
    async function connectSocket() {
      const { createSocket } = await import('../../../services/socket');
      if (disposed) return;
      const token = localStorage.getItem('accessToken');
      socket = createSocket('/tracking', token);
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join:booking', id);
      });

      socket.on('location:update', (data) => {
        setServicerPos({ lat: data.lat, lng: data.lng, heading: data.heading, timestamp: data.timestamp });
      });

      socket.on('queue:position', (data) => {
        setQueue((prev) => ({ ...prev, position: data.position, total: data.total, isNext: false }));
      });

      socket.on('status:update', (data) => {
        setBooking((prev) => prev ? { ...prev, status: data.status } : prev);
        loadData();
      });

      socket.on('booking:status', (data) => {
        setBooking((prev) => prev ? { ...prev, status: data.status } : prev);
        loadData();
      });
    }
    connectSocket();
    return () => {
      disposed = true;
      if (socket) {
        socket.emit('leave:booking', id);
        socket.disconnect();
      }
    };
  }, [id]);

  async function loadData() {
    try {
      const [bookingRes, queueRes] = await Promise.all([
        api.get(`/bookings/${id}`),
        api.get(`/bookings/${id}/queue`).catch(() => ({ data: { queue: { inRoute: false } } })),
      ]);
      setBooking(bookingRes.data.booking);
      const q = queueRes.data.queue;
      setQueue(q);
      if (q?.servicerLocation) {
        setServicerPos({ lat: q.servicerLocation.lat, lng: q.servicerLocation.lng, timestamp: q.servicerLocation.timestamp });
      }
    } catch { }
    setLoading(false);
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  if (!booking) {
    return (
      <AuthGuard>
        <div className="flex min-h-screen flex-col items-center justify-center px-6">
          <p className="text-gray-500">Booking not found</p>
          <button onClick={() => router.push('/dashboard')} className="mt-4 text-sm font-medium text-brand-600">Back to Dashboard</button>
        </div>
      </AuthGuard>
    );
  }

  const currentStepIndex = STATUS_STEPS.indexOf(booking.status);
  const isCompleted = booking.status === 'completed';
  const statusImpliesNext = ['en-route', 'arrived'].includes(booking.status);
  const isNext = queue?.isNext === true || (statusImpliesNext && !queue?.inRoute);
  const showMap = isNext && servicerPos;
  const customerCoords = booking.addressId?.location?.coordinates;
  const customerLatLng = customerCoords ? { lat: customerCoords[1], lng: customerCoords[0] } : null;

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-white px-4 py-3">
          <button onClick={() => router.push('/dashboard')} className="rounded-lg p-2 hover:bg-gray-100">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h1 className="font-semibold">Live Tracking</h1>
        </header>

        {/* Map or Queue Position */}
        {isCompleted ? null : showMap ? (
          <div className="relative h-72">
            <TrackingMap servicerPos={servicerPos} customerPos={customerLatLng} />
            <div className="absolute bottom-4 left-4 rounded-xl bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
              <p className="text-xs text-gray-500">Servicer is heading to you</p>
              <p className="text-lg font-bold text-brand-600">You're next!</p>
            </div>
          </div>
        ) : isNext && !servicerPos ? (
          <div className="bg-green-50 px-6 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
              <svg className="h-10 w-10 text-green-600 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900">You're next!</p>
            <p className="mt-1 text-sm text-gray-500">Your servicer is on the way. The live map will appear as soon as we receive their GPS signal.</p>
            <div className="mx-auto mt-4 h-1 w-32 overflow-hidden rounded-full bg-green-200">
              <div className="h-full w-8 animate-[slide_1.5s_ease-in-out_infinite] rounded-full bg-green-500" />
            </div>
          </div>
        ) : queue?.inRoute && queue?.routeStatus === 'in-progress' && queue?.position && !isNext ? (
          <div className="bg-brand-50 px-6 py-8 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-100">
              <span className="text-3xl font-bold text-brand-600">#{queue.position}</span>
            </div>
            <p className="mt-4 text-lg font-semibold text-gray-900">You are stop #{queue.position} of {queue.total}</p>
            <p className="mt-1 text-sm text-gray-500">Your servicer is on the route. We'll show you live tracking when you're next.</p>
            <div className="mx-auto mt-4 flex max-w-xs gap-1">
              {Array.from({ length: queue.total }).map((_, i) => (
                <div key={i} className={`h-2 flex-1 rounded-full ${i < queue.total - queue.position ? 'bg-brand-600' : i === queue.total - queue.position ? 'bg-brand-400 animate-pulse' : 'bg-gray-200'}`} />
              ))}
            </div>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center bg-gray-50 text-center px-6">
            <div>
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="mt-3 text-sm text-gray-500">
                {booking.status === 'active' ? 'Your servicer will start their route soon.' : 'Waiting for your servicer to begin.'}
              </p>
              <p className="mt-1 text-xs text-gray-400">Live tracking will appear when they're on the way.</p>
            </div>
          </div>
        )}

        {/* Status progress */}
        <div className="border-t px-6 py-6">
          {isCompleted ? (
            <div className="text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="mt-3 text-lg font-bold text-green-700">Service Complete!</h2>
              <p className="mt-1 text-sm text-gray-500">Your barrels have been taken care of</p>
              <button onClick={() => router.push('/dashboard')} className="mt-6 w-full rounded-xl bg-brand-600 py-3 font-semibold text-white">
                Back to Dashboard
              </button>
            </div>
          ) : (
            <div>
              <h2 className="text-lg font-bold">Service Status</h2>
              <div className="mt-4 space-y-4">
                {STATUS_STEPS.map((status, i) => {
                  const done = i <= currentStepIndex;
                  const active = i === currentStepIndex;
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full ${done ? 'bg-brand-600 text-white' : 'border-2 border-gray-200 text-gray-300'} ${active ? 'ring-4 ring-brand-100' : ''}`}>
                        {done ? (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        ) : (
                          <span className="text-xs">{i + 1}</span>
                        )}
                      </div>
                      <span className={`text-sm ${done ? 'font-medium text-gray-900' : 'text-gray-400'}`}>
                        {STATUS_LABELS[status]}
                      </span>
                      {active && <span className="ml-auto animate-pulse rounded-full bg-brand-100 px-2 py-0.5 text-xs text-brand-600">Current</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Booking details */}
        <div className="border-t px-6 py-4">
          <h3 className="text-sm font-semibold text-gray-500">Details</h3>
          <div className="mt-2 space-y-1 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Service</span><span>{booking.serviceTypeId?.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Date</span><span>{new Date(booking.scheduledDate).toLocaleDateString()}</span></div>
            {booking.barrelCount > 0 && <div className="flex justify-between"><span className="text-gray-500">Barrels</span><span>{booking.barrelCount}</span></div>}
            {booking.subscriptionId
              ? <div className="flex justify-between"><span className="text-gray-500">Plan</span><span className="text-accent-600 font-medium">Subscription</span></div>
              : booking.amount != null && <div className="flex justify-between"><span className="text-gray-500">Amount</span><span>${Number(booking.amount).toFixed(2)}</span></div>
            }
            {booking.addressId && (
              <div className="flex justify-between"><span className="text-gray-500">Address</span><span>{booking.addressId.street}</span></div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
