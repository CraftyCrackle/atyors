'use client';

import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

const NotificationContext = createContext({ notifications: [], unreadBump: 0, pushStatus: null });

export function useNotifications() {
  return useContext(NotificationContext);
}

function detectPushSupport() {
  if (typeof window === 'undefined') return { supported: false, reason: 'ssr' };
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/.test(ua);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
    || window.navigator.standalone === true;

  if (isIOS && !isStandalone) {
    return { supported: false, reason: 'ios-not-installed', isIOS: true };
  }

  if (!('serviceWorker' in navigator)) {
    return { supported: false, reason: 'no-sw' };
  }
  if (!('PushManager' in window)) {
    return { supported: false, reason: 'no-push-api', isIOS };
  }

  return { supported: true, isIOS };
}

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadBump, setUnreadBump] = useState(0);
  const [pushStatus, setPushStatus] = useState(null);
  const [pushBannerDismissed, setPushBannerDismissed] = useState(() => {
    try { return sessionStorage.getItem('push-banner-dismissed') === '1'; } catch { return false; }
  });
  const user = useAuthStore((s) => s.user);
  const userId = user?._id;
  const socketRef = useRef(null);

  const dismiss = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  function pushNotif(type, message, data) {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((prev) => [...prev, { id, type, message, data }]);
    setUnreadBump((c) => c + 1);
    const timeout = type === 'message' ? 5000 : type === 'success' ? 8000 : 6000;
    setTimeout(() => dismiss(id), timeout);
  }

  useEffect(() => {
    if (!userId) return;

    let timers = [];
    let disposed = false;

    async function attemptNativePush() {
      const { isNativeApp, registerNativePush, isPushRegistered, getPushDiagnostics } =
        await import('../services/capacitorPush');

      if (!isNativeApp()) return null;

      console.log('[Push] Native platform detected, registering...');
      const result = await registerNativePush();
      const diag = getPushDiagnostics();
      console.log('[Push] Registration result:', JSON.stringify(result), 'diag:', JSON.stringify(diag));

      if (result.status === 'registered') {
        return { subscribed: true, native: true };
      }

      if (result.status === 'denied') {
        return { subscribed: false, native: true, reason: 'native-denied' };
      }

      if (!isPushRegistered() && !disposed) {
        const delays = [5000, 12000];
        delays.forEach((delay, i) => {
          const t = setTimeout(async () => {
            if (disposed || isPushRegistered()) return;
            console.log(`[Push] Retry ${i + 1} after ${delay}ms...`);
            try {
              const retry = await registerNativePush();
              console.log('[Push] Retry result:', JSON.stringify(retry));
              if (retry.status === 'registered' && !disposed) {
                setPushStatus({ subscribed: true, native: true });
              }
            } catch (e) {
              console.error(`[Push] Retry ${i + 1} failed:`, e);
            }
          }, delay);
          timers.push(t);
        });
      }

      return { subscribed: false, native: true, reason: 'native-failed' };
    }

    (async () => {
      try {
        const nativeResult = await attemptNativePush();
        if (nativeResult) {
          setPushStatus(nativeResult);
          return;
        }
      } catch (err) {
        console.error('[Push] Native push setup error:', err);
      }

      const support = detectPushSupport();
      if (!support.supported) {
        console.warn(`[Push] Not available: ${support.reason}`);
        setPushStatus({ subscribed: false, reason: support.reason, isIOS: support.isIOS });
        return;
      }

      navigator.serviceWorker.ready.then(async (reg) => {
        try {
          const existing = await reg.pushManager.getSubscription();
          if (existing) {
            setPushStatus({ subscribed: true });
            return;
          }
          const perm = await Notification.requestPermission();
          if (perm !== 'granted') {
            setPushStatus({ subscribed: false, reason: 'denied' });
            return;
          }
          const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!vapidKey) {
            setPushStatus({ subscribed: false, reason: 'no-vapid' });
            return;
          }
          const padding = '='.repeat((4 - (vapidKey.length % 4)) % 4);
          const b64 = (vapidKey + padding).replace(/-/g, '+').replace(/_/g, '/');
          const raw = atob(b64);
          const arr = new Uint8Array(raw.length);
          for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
          const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: arr });
          const token = localStorage.getItem('accessToken');
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api/v1'}/push/subscribe`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ subscription: sub.toJSON() }),
          });
          setPushStatus({ subscribed: true });
        } catch (err) {
          console.error('[Push] Web push subscription error:', err);
          setPushStatus({ subscribed: false, reason: 'error' });
        }
      });
    })();

    return () => {
      disposed = true;
      timers.forEach(clearTimeout);
    };
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    async function handleResume() {
      if (document.visibilityState !== 'visible') return;
      try {
        const { clearNativeBadge, isNativeApp } = await import('../services/capacitorPush');
        if (isNativeApp()) await clearNativeBadge();
      } catch {}
    }
    handleResume();
    document.addEventListener('visibilitychange', handleResume);
    return () => document.removeEventListener('visibilitychange', handleResume);
  }, [userId]);

  useEffect(() => {
    function handleNativePush(e) {
      const n = e.detail;
      if (n?.title || n?.body) {
        pushNotif('info', n.body || n.title, n.data);
      }
    }
    window.addEventListener('native-push', handleNativePush);
    return () => window.removeEventListener('native-push', handleNativePush);
  }, []);

  useEffect(() => {
    if (!userId) return;

    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }

    let cancelled = false;

    async function connect() {
      const { createSocket } = await import('../services/socket');
      if (cancelled) return;
      const token = localStorage.getItem('accessToken');
      const socket = createSocket('/notifications', token);
      socketRef.current = socket;

      socket.on('booking:accepted', (data) => pushNotif('success', data.message, data));
      socket.on('booking:status', (data) => pushNotif('info', data.message, data));
      socket.on('job:available', (data) => pushNotif('info', data.message || 'A new job is available', data));
      socket.on('message:new', (data) => {
        const name = data.senderName || 'Someone';
        const body = data.body?.length > 60 ? data.body.slice(0, 60) + '…' : data.body;
        pushNotif('message', `${name}: ${body}`, data);
      });
    }

    connect();

    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [userId]);

  const showBanner = userId && pushStatus && !pushStatus.subscribed && !pushBannerDismissed
    && pushStatus.reason !== 'no-vapid' && pushStatus.reason !== 'error';

  let bannerMessage = null;
  let bannerAction = null;
  if (showBanner) {
    if (pushStatus.reason === 'native-denied') {
      bannerMessage = 'Notifications are turned off for atyors. Go to Settings \u2192 atyors \u2192 Notifications and enable Allow Notifications.';
    } else if (pushStatus.reason === 'native-failed') {
      bannerMessage = 'We couldn\u2019t set up push notifications. Try closing and reopening the app, or check Settings \u2192 atyors \u2192 Notifications.';
    } else if (pushStatus.reason === 'denied') {
      bannerMessage = 'Notification permission was denied. Please enable notifications in your browser settings.';
    } else if (pushStatus.reason === 'ios-not-installed') {
      bannerMessage = 'To receive notifications on iPhone, download the atyors app from the App Store.';
      bannerAction = { label: 'Get the App', url: 'https://apps.apple.com/us/app/atyors/id6760164528' };
    } else if (pushStatus.reason === 'no-push-api') {
      bannerMessage = pushStatus.isIOS
        ? 'Download the atyors app from the App Store to receive push notifications.'
        : 'Your browser doesn\u2019t support push notifications. Try using Chrome, Edge, or Safari.';
      if (pushStatus.isIOS) {
        bannerAction = { label: 'Get the App', url: 'https://apps.apple.com/us/app/atyors/id6760164528' };
      }
    } else if (pushStatus.reason === 'no-sw') {
      bannerMessage = 'Notifications are not available in this browser. Try Chrome, Edge, or Safari.';
    }
  }

  return (
    <NotificationContext.Provider value={{ notifications, unreadBump, pushStatus }}>
      {children}

      {bannerMessage && (
        <div role="alert" aria-live="assertive" className="fixed bottom-20 left-4 right-4 z-[99] mx-auto max-w-sm animate-slide-in rounded-xl border border-amber-200 bg-amber-50 p-4 shadow-lg">
          <div className="flex items-start gap-3">
            <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-900">Notifications Unavailable</p>
              <p className="mt-1 text-xs text-amber-700">{bannerMessage}</p>
              {bannerAction && (
                <a href={bannerAction.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block rounded-lg bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-700">
                  {bannerAction.label}
                </a>
              )}
            </div>
            <button
              aria-label="Dismiss notification banner"
              onClick={() => {
                setPushBannerDismissed(true);
                try { sessionStorage.setItem('push-banner-dismissed', '1'); } catch {}
              }}
              className="shrink-0 rounded p-1 text-amber-500 hover:bg-amber-100"
            >
              <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        </div>
      )}

      <div aria-live="polite" aria-atomic="false" className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {notifications.map((n) => (
          <div key={n.id} role="status"
            className={`animate-slide-in rounded-xl p-4 shadow-lg ${
              n.type === 'success' ? 'bg-green-600 text-white'
              : n.type === 'message' ? 'bg-gray-800 text-white'
              : 'bg-brand-600 text-white'
            }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <svg aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {n.type === 'message' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  )}
                </svg>
                <p className="text-sm font-medium">{n.message}</p>
              </div>
              <button onClick={() => dismiss(n.id)} aria-label="Dismiss notification" className="shrink-0 rounded p-0.5 hover:bg-white/20">
                <svg aria-hidden="true" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
