'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../../stores/authStore';
import { api } from '../../../../services/api';

const STATUS_FLOW = {
  active: { next: 'en-route', label: 'Start Route', color: 'bg-purple-600 hover:bg-purple-700' },
  'en-route': { next: 'arrived', label: 'Mark Arrived', color: 'bg-indigo-600 hover:bg-indigo-700' },
};

const STATUS_LABELS = {
  active: 'Active',
  'en-route': 'En Route',
  arrived: 'Arrived',
  completed: 'Done',
};

export default function ServicerJobPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, loading: authLoading, init } = useAuthStore();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [completionPhoto, setCompletionPhoto] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [completeError, setCompleteError] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    if (!authLoading && (!user || !['servicer', 'admin', 'superadmin'].includes(user.role))) {
      router.push('/servicer/login');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    loadJob();
  }, [user, id]);

  async function loadJob() {
    try {
      const res = await api.get(`/servicer/jobs/${id}`);
      setBooking(res.data.booking);
    } catch { }
    setLoading(false);
  }

  async function advanceStatus() {
    if (!booking) return;
    const flow = STATUS_FLOW[booking.status];
    if (!flow) return;
    setUpdating(true);
    try {
      const res = await api.patch(`/servicer/jobs/${id}/status`, { status: flow.next });
      setBooking(res.data.booking);
    } catch { }
    setUpdating(false);
  }

  async function openCamera() {
    setCameraError(null);
    setCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      const msg = err.name === 'NotAllowedError'
        ? 'Camera access denied. Please allow camera permissions in your browser settings.'
        : err.name === 'NotFoundError'
          ? 'No camera found on this device.'
          : 'Could not access camera. Please check your permissions.';
      setCameraError(msg);
    }
  }

  function closeCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
    setCameraError(null);
  }

  function capturePhoto() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `completion-${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCompletionPhoto(file);
      setPhotoPreview(URL.createObjectURL(blob));
      closeCamera();
    }, 'image/jpeg', 0.85);
  }

  async function handleComplete() {
    if (!completionPhoto) return;
    setUploading(true);
    setCompleteError(null);
    try {
      const formData = new FormData();
      formData.append('photo', completionPhoto);
      if (completionNotes.trim()) formData.append('notes', completionNotes.trim());
      const token = localStorage.getItem('accessToken');
      const res = await fetch(`/api/v1/servicer/jobs/${id}/complete`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setCompleteError(data.error?.message || data.message || 'Failed to complete job. Please try again.');
        setUploading(false);
        return;
      }
      setBooking(data.data.booking);
      setCompletionPhoto(null);
      setPhotoPreview(null);
      setCompletionNotes('');
    } catch (err) {
      setCompleteError('Network error. Please check your connection and try again.');
    }
    setUploading(false);
  }

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-gray-900">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="flex min-h-screen-safe flex-col items-center justify-center bg-gray-900 px-6">
        <p className="text-gray-400">Job not found</p>
        <button onClick={() => router.push('/servicer/dashboard')} className="mt-4 text-sm font-medium text-brand-400">Back to Dashboard</button>
      </div>
    );
  }

  const addr = booking.addressId;
  const svc = booking.serviceTypeId;
  const customer = booking.userId;
  const flow = STATUS_FLOW[booking.status];
  const isArrived = booking.status === 'arrived';
  const isActive = ['active', 'en-route', 'arrived'].includes(booking.status);

  return (
    <div className="min-h-screen-safe bg-gray-900">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-gray-800 bg-gray-900 px-4 pb-3 pt-sticky-safe">
        <button onClick={() => router.push('/servicer/dashboard')} className="rounded-lg p-2 text-gray-400 hover:bg-gray-800">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="flex-1 font-semibold text-white">Job Details</h1>
        {booking && isActive && (
          <Link href={`/chat/${id}`} className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-800">
            Chat
          </Link>
        )}
      </header>

      <div className="px-4 py-6 space-y-4">
        {/* Service info */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">{svc?.name}</h2>
            <span className={`rounded-full px-3 py-1 text-xs font-medium ${booking.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-brand-100 text-brand-800'}`}>
              {STATUS_LABELS[booking.status] || booking.status}
            </span>
          </div>
          <p className="mt-1 text-sm text-gray-400">
            {new Date(booking.scheduledDate).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">${Number(booking.serviceValue ?? booking.amount ?? 0).toFixed(2)}</span>
            {booking.barrelCount > 0 && (
              <span className="rounded-full bg-purple-900/40 px-2.5 py-0.5 text-xs font-medium text-purple-400">{booking.barrelCount} barrel{booking.barrelCount > 1 ? 's' : ''}</span>
            )}
          </div>
          {(booking.putOutTime || booking.bringInTime) && (
            <div className="mt-2 flex gap-3 text-xs text-gray-400">
              {booking.putOutTime && <span>Put out: {booking.putOutTime}</span>}
              {booking.bringInTime && <span>Bring in: {booking.bringInTime}</span>}
            </div>
          )}
        </div>

        {/* Customer info */}
        {customer && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500">Customer</h3>
            <div className="mt-2 flex items-center gap-3">
              {customer.profilePhotoUrl ? (
                <img src={customer.profilePhotoUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-700 text-sm font-bold text-gray-300">{customer.firstName?.[0]}{customer.lastName?.[0]}</div>
              )}
              <div>
                <p className="text-sm font-medium text-white">{customer.firstName} {customer.lastName}</p>
                {customer.phone && <p className="text-xs text-gray-400">{customer.phone}</p>}
              </div>
            </div>
          </div>
        )}

        {/* Address + barrel details */}
        {addr && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
            <h3 className="text-xs font-medium uppercase text-gray-500">Service Address</h3>
            <p className="mt-1 text-sm font-medium text-white">{addr.street}{addr.unit ? `, ${addr.unit}` : ''}</p>
            <p className="text-sm text-gray-400">{addr.city}, {addr.state} {addr.zip}</p>
            {addr.barrelLocation && (
              <div className="mt-3 rounded-lg bg-brand-900/30 border border-brand-800/50 p-3">
                <div className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-brand-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  </svg>
                  <span className="text-xs font-medium text-brand-300">Barrel Location</span>
                </div>
                <p className="mt-1 text-sm text-gray-300">{addr.barrelLocation}</p>
              </div>
            )}
            {addr.barrelCount > 1 && (
              <p className="mt-2 text-xs text-gray-400">Barrels at address: {addr.barrelCount}</p>
            )}
            {addr.trashDay && (
              <p className="mt-1 text-xs text-gray-400">Trash day: {addr.trashDay}</p>
            )}
            {addr.barrelPlacementInstructions && (
              <div className="mt-2 rounded-lg bg-blue-900/20 border border-blue-800/40 p-2">
                <p className="text-[10px] uppercase text-blue-400 font-medium">Curb Placement</p>
                <p className="text-xs text-gray-300">{addr.barrelPlacementInstructions}</p>
              </div>
            )}
            {addr.barrelReturnInstructions && (
              <div className="mt-2 rounded-lg bg-amber-900/20 border border-amber-800/40 p-2">
                <p className="text-[10px] uppercase text-amber-400 font-medium">Return Location</p>
                <p className="text-xs text-gray-300">{addr.barrelReturnInstructions}</p>
              </div>
            )}
            {addr.barrelNotes && (
              <p className="mt-2 text-xs text-gray-400 italic">Note: &ldquo;{addr.barrelNotes}&rdquo;</p>
            )}
            {addr.barrelPhotoUrl && (
              <div className="mt-3">
                <p className="mb-1 text-xs font-medium text-gray-500">Customer Photo</p>
                <img src={addr.barrelPhotoUrl} alt="Barrel location" className="w-full rounded-lg object-cover" />
              </div>
            )}
          </div>
        )}

        {/* Status progress */}
        <div className="rounded-xl border border-gray-700 bg-gray-800 p-4">
          <h3 className="text-xs font-medium uppercase text-gray-500">Progress</h3>
          <div className="mt-3 space-y-3">
            {Object.entries(STATUS_LABELS).map(([status, label], i) => {
              const steps = Object.keys(STATUS_LABELS);
              const currentIdx = steps.indexOf(booking.status);
              const stepIdx = steps.indexOf(status);
              const done = stepIdx <= currentIdx;
              const isCurrent = stepIdx === currentIdx;
              return (
                <div key={status} className="flex items-center gap-3">
                  <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs ${done ? 'bg-brand-600 text-white' : 'border border-gray-600 text-gray-600'} ${isCurrent ? 'ring-2 ring-brand-400/50' : ''}`}>
                    {done ? '✓' : i + 1}
                  </div>
                  <span className={`text-sm ${done ? 'text-white font-medium' : 'text-gray-500'}`}>{label}</span>
                  {isCurrent && booking.status !== 'completed' && <span className="ml-auto animate-pulse text-xs text-brand-400">Current</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Status advance button (active → en-route, en-route → arrived) */}
        {flow && (
          <button onClick={advanceStatus} disabled={updating}
            className={`w-full rounded-xl py-4 text-center font-semibold text-white shadow-lg transition active:scale-[0.98] disabled:opacity-50 ${flow.color}`}>
            {updating ? 'Updating...' : flow.label}
          </button>
        )}

        {/* Completion with photo (arrived → completed) */}
        {isArrived && (
          <div className="rounded-xl border border-gray-700 bg-gray-800 p-4 space-y-4">
            <div>
              <h3 className="text-sm font-semibold text-white">Complete this job</h3>
              <p className="mt-1 text-xs text-gray-400">Take a photo to confirm the job is done.</p>
            </div>

            {photoPreview ? (
              <div className="relative">
                <img src={photoPreview} alt="Completion photo" className="w-full rounded-xl object-cover max-h-64" />
                <button onClick={() => { setCompletionPhoto(null); setPhotoPreview(null); }}
                  className="absolute right-2 top-2 rounded-full bg-black/60 p-1.5 text-white hover:bg-black/80">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <button onClick={openCamera}
                  className="mt-2 w-full rounded-lg border border-gray-600 py-2 text-xs text-gray-400 hover:bg-gray-700">
                  Retake Photo
                </button>
              </div>
            ) : (
              <button onClick={openCamera}
                className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-gray-600 py-8 text-gray-400 transition hover:border-brand-500 hover:text-brand-400">
                <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
                </svg>
                <span className="text-sm font-medium">Open Camera</span>
                <span className="text-xs text-gray-500">Live camera capture only</span>
              </button>
            )}

            <canvas ref={canvasRef} className="hidden" />

            <div>
              <label className="text-xs font-medium text-gray-400">Notes (optional)</label>
              <textarea
                value={completionNotes}
                onChange={(e) => setCompletionNotes(e.target.value)}
                placeholder="Any notes about the service..."
                rows={2}
                maxLength={500}
                className="mt-1 w-full rounded-lg border border-gray-600 bg-gray-900 px-3 py-2 text-sm text-white placeholder-gray-500 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {completeError && (
              <div className="rounded-lg border border-red-800/50 bg-red-900/30 p-3">
                <p className="text-sm text-red-300">{completeError}</p>
              </div>
            )}

            <button onClick={handleComplete} disabled={!completionPhoto || uploading}
              className="w-full rounded-xl bg-green-600 py-4 text-center font-semibold text-white shadow-lg transition hover:bg-green-700 active:scale-[0.98] disabled:opacity-50">
              {uploading ? 'Submitting...' : 'Mark Job Complete'}
            </button>
          </div>
        )}

        {/* Completed state */}
        {booking.status === 'completed' && (
          <div className="rounded-xl bg-green-900/30 border border-green-800/50 p-4 text-center space-y-3">
            <p className="text-lg font-bold text-green-400">Job Complete!</p>
            <p className="text-sm text-gray-400">Great work. Head back for more jobs.</p>
            {booking.completionPhotoUrl && (
              <div className="mt-2">
                <p className="mb-1 text-xs font-medium text-gray-500">Completion Photo</p>
                <img src={booking.completionPhotoUrl} alt="Completed" className="w-full rounded-lg object-cover max-h-48" />
              </div>
            )}
            <button onClick={() => router.push('/servicer/dashboard')} className="rounded-lg bg-gray-800 px-6 py-2 text-sm font-medium text-white">
              Back to Dashboard
            </button>
          </div>
        )}
      </div>

      {/* Full-screen camera overlay */}
      {cameraOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <h2 className="text-sm font-semibold text-white">Take Completion Photo</h2>
            <button onClick={closeCamera} className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {cameraError ? (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <svg className="h-12 w-12 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="mt-4 text-sm text-red-300">{cameraError}</p>
              <button onClick={closeCamera} className="mt-6 rounded-lg bg-gray-800 px-6 py-2 text-sm text-white">Close</button>
            </div>
          ) : (
            <>
              <div className="flex flex-1 items-center justify-center overflow-hidden">
                <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover" />
              </div>
              <div className="flex items-center justify-center py-6">
                <button onClick={capturePhoto}
                  className="flex h-18 w-18 items-center justify-center rounded-full border-4 border-white bg-white/20 transition active:scale-90">
                  <div className="h-14 w-14 rounded-full bg-white" />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
