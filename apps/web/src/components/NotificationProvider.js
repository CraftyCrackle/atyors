'use client';

import { useEffect, useState, createContext, useContext, useCallback, useRef } from 'react';
import { useAuthStore } from '../stores/authStore';

const NotificationContext = createContext({ notifications: [], unreadBump: 0 });

export function useNotifications() {
  return useContext(NotificationContext);
}

export default function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadBump, setUnreadBump] = useState(0);
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
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    navigator.serviceWorker.ready.then(async (reg) => {
      try {
        const existing = await reg.pushManager.getSubscription();
        if (existing) return;
        const perm = await Notification.requestPermission();
        if (perm !== 'granted') return;
        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
        if (!vapidKey) return;
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
      } catch (_) {}
    });
  }, [userId]);

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

  return (
    <NotificationContext.Provider value={{ notifications, unreadBump }}>
      {children}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 w-80">
        {notifications.map((n) => (
          <div key={n.id}
            className={`animate-slide-in rounded-xl p-4 shadow-lg ${
              n.type === 'success' ? 'bg-green-600 text-white'
              : n.type === 'message' ? 'bg-gray-800 text-white'
              : 'bg-brand-600 text-white'
            }`}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <svg className="mt-0.5 h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {n.type === 'message' ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  )}
                </svg>
                <p className="text-sm font-medium">{n.message}</p>
              </div>
              <button onClick={() => dismiss(n.id)} className="shrink-0 rounded p-0.5 hover:bg-white/20">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}
