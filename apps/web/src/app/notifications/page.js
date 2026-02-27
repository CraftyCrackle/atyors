'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../services/api';

const TYPE_CONFIG = {
  'booking:accepted': { icon: 'M5 13l4 4L19 7', color: 'bg-blue-100 text-blue-600', label: 'Accepted' },
  'booking:status': { icon: 'M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l4-2 4 2z', color: 'bg-purple-100 text-purple-600', label: 'Status' },
  'booking:completed': { icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', color: 'bg-green-100 text-green-600', label: 'Completed' },
  'booking:reviewed': { icon: 'M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442', color: 'bg-yellow-100 text-yellow-600', label: 'Review' },
  'message:new': { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'bg-indigo-100 text-indigo-600', label: 'Message' },
  'queue:position': { icon: 'M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z', color: 'bg-orange-100 text-orange-600', label: 'Queue' },
};

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NotificationsPage() {
  const { user, loading: authLoading } = useAuthStore();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading || !user) return;
    loadNotifications();
  }, [authLoading, user]);

  async function loadNotifications() {
    try {
      const res = await api.get('/notifications?limit=50');
      setNotifications(res.data.notifications || []);
    } catch { }
    setLoading(false);
  }

  async function handleMarkAllRead() {
    try {
      await api.patch('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: n.readAt || new Date().toISOString() })));
    } catch { }
  }

  async function handleClick(n) {
    if (!n.readAt) {
      try { await api.patch(`/notifications/${n._id}/read`); } catch { }
      setNotifications((prev) => prev.map((x) => x._id === n._id ? { ...x, readAt: new Date().toISOString() } : x));
    }

    if (n.bookingId) {
      const isServicer = user?.role === 'servicer';
      if (n.type === 'booking:completed' || n.type === 'booking:reviewed') {
        router.push(isServicer ? `/servicer/job/${n.bookingId}` : `/booking/${n.bookingId}`);
      } else if (n.type === 'message:new') {
        router.push(`/chat/${n.bookingId}`);
      } else {
        router.push(isServicer ? `/servicer/job/${n.bookingId}` : `/tracking/${n.bookingId}`);
      }
    }
  }

  const isServicer = user?.role === 'servicer';
  const unreadCount = notifications.filter((n) => !n.readAt).length;

  if (authLoading) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${isServicer ? 'bg-gray-900' : 'bg-gray-50'}`}>
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen pb-6 ${isServicer ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <header className={`sticky top-0 z-10 flex items-center gap-3 border-b px-4 py-3 ${isServicer ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
        <button onClick={() => router.back()} className={`rounded-lg p-2 ${isServicer ? 'text-gray-400 hover:bg-gray-800' : 'text-gray-500 hover:bg-gray-100'}`}>
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <h1 className={`flex-1 font-semibold ${isServicer ? 'text-white' : 'text-gray-900'}`}>Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="text-xs font-medium text-brand-600">
            Mark all read
          </button>
        )}
      </header>

      <div className="px-4 pt-2">
        {loading ? (
          <div className="py-16 text-center text-sm text-gray-400">Loading...</div>
        ) : notifications.length === 0 ? (
          <div className="py-16 text-center">
            <svg className={`mx-auto h-12 w-12 ${isServicer ? 'text-gray-700' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
            </svg>
            <p className={`mt-3 text-sm ${isServicer ? 'text-gray-500' : 'text-gray-400'}`}>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-1 mt-2">
            {notifications.map((n) => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG['booking:status'];
              const isUnread = !n.readAt;
              return (
                <button key={n._id} onClick={() => handleClick(n)}
                  className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${
                    isServicer
                      ? isUnread ? 'bg-gray-800 hover:bg-gray-750' : 'bg-gray-800/40 hover:bg-gray-800/60'
                      : isUnread ? 'bg-white shadow-sm hover:shadow' : 'bg-white/60 hover:bg-white'
                  }`}>
                  <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cfg.color}`}>
                    <svg className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={cfg.icon} />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold truncate ${isServicer ? 'text-white' : 'text-gray-900'}`}>{n.title}</p>
                      {isUnread && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-500" />}
                    </div>
                    <p className={`mt-0.5 text-xs leading-relaxed ${isServicer ? 'text-gray-400' : 'text-gray-500'}`}>{n.body}</p>
                    <p className={`mt-1 text-[11px] ${isServicer ? 'text-gray-600' : 'text-gray-400'}`}>{timeAgo(n.createdAt)}</p>
                  </div>
                  <svg className={`mt-1 h-4 w-4 shrink-0 ${isServicer ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
