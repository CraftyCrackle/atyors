'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import AuthGuard from '../../../components/AuthGuard';
import { api } from '../../../services/api';
import { useAuthStore } from '../../../stores/authStore';

const STATUS_LABELS = {
  active: 'Active',
  'en-route': 'En Route',
  arrived: 'Arrived',
  'in-progress': 'In Progress',
  completed: 'Completed',
};

function Initials({ name, size = 'sm' }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const sz = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10 text-sm';
  return (
    <div className={`flex ${sz} shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-semibold`}>
      {initials}
    </div>
  );
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
}

function formatDateLabel(date) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (isSameDay(date, today)) return 'Today';
  if (isSameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export default function ChatPage() {
  const { bookingId } = useParams();
  const router = useRouter();
  const { user, init } = useAuthStore();
  const [messages, setMessages] = useState([]);
  const [booking, setBooking] = useState(null);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const prevCountRef = useRef(0);

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (bookingId) loadData();
  }, [bookingId]);

  // Poll for new messages every 3 seconds
  useEffect(() => {
    if (!bookingId || loading) return;
    const interval = setInterval(async () => {
      try {
        const res = await api.get(`/bookings/${bookingId}/messages`);
        const fresh = res.data.messages || [];
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m._id));
          const newMsgs = fresh.filter((m) => !existingIds.has(m._id));
          if (newMsgs.length === 0) return prev;
          return [...prev, ...newMsgs];
        });
      } catch { }
    }, 3000);
    return () => clearInterval(interval);
  }, [bookingId, loading]);

  useEffect(() => {
    if (messages.length > prevCountRef.current) {
      scrollToBottom();
    }
    prevCountRef.current = messages.length;
  }, [messages]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }));
  }, []);

  async function loadData() {
    try {
      const [bookingRes, msgRes] = await Promise.all([
        api.get(`/bookings/${bookingId}`),
        api.get(`/bookings/${bookingId}/messages`),
      ]);
      setBooking(bookingRes.data.booking);
      setMessages(msgRes.data.messages || []);
    } catch { }
    setLoading(false);
  }

  async function handleSend(e) {
    e.preventDefault();
    const body = input.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/bookings/${bookingId}/messages`, { body });
      const newMsg = res.data.message;
      setMessages((prev) => {
        if (prev.some((m) => m._id === newMsg._id)) return prev;
        return [...prev, newMsg];
      });
      setInput('');
      inputRef.current?.focus();
    } catch { }
    setSending(false);
  }

  const isServicer = user && ['servicer', 'admin', 'superadmin'].includes(user.role);
  const otherParty = booking
    ? isServicer ? booking.userId : booking.assignedTo
    : null;
  const otherName = otherParty
    ? `${otherParty.firstName || ''} ${otherParty.lastName || ''}`.trim()
    : isServicer ? 'Customer' : 'Servicer';
  const serviceName = booking?.serviceTypeId?.name || 'Service';
  const canMessage = booking && ['active', 'en-route', 'arrived', 'in-progress'].includes(booking.status);

  const dark = isServicer;
  const bg = dark ? 'bg-gray-900' : 'bg-gray-50';

  if (loading) {
    return (
      <AuthGuard>
        <div className={`flex min-h-screen-safe items-center justify-center ${bg}`}>
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" />
        </div>
      </AuthGuard>
    );
  }

  let lastDate = null;

  return (
    <AuthGuard>
      <div className={`flex h-screen-safe flex-col ${bg}`}>
        {/* Header */}
        <header className={`sticky top-0 z-10 flex items-center gap-3 px-4 pb-3 pt-sticky-safe shadow-sm ${dark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
          <button onClick={() => router.back()} className={`rounded-lg p-2 transition ${dark ? 'hover:bg-gray-800 text-gray-400' : 'hover:bg-gray-100 text-gray-600'}`}>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <Initials name={otherName} />
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold truncate ${dark ? 'text-white' : 'text-gray-900'}`}>{otherName}</p>
            <div className="flex items-center gap-1.5">
              <span className={`text-xs truncate ${dark ? 'text-gray-400' : 'text-gray-500'}`}>{serviceName}</span>
              {booking && (
                <>
                  <span className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-300'}`}>·</span>
                  <span className={`inline-flex items-center gap-1 text-xs ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
                    <span className={`inline-block h-1.5 w-1.5 rounded-full ${canMessage ? 'bg-green-500' : 'bg-gray-400'}`} />
                    {STATUS_LABELS[booking.status] || booking.status}
                  </span>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <div className={`flex h-16 w-16 items-center justify-center rounded-full ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <svg className={`h-8 w-8 ${dark ? 'text-gray-600' : 'text-gray-300'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className={`text-sm font-medium ${dark ? 'text-gray-400' : 'text-gray-500'}`}>No messages yet</p>
              <p className={`text-xs ${dark ? 'text-gray-600' : 'text-gray-400'}`}>
                Send a message to {otherName} about your {serviceName.toLowerCase()} booking.
              </p>
            </div>
          )}

          {messages.map((msg, idx) => {
            const isMine = (msg.senderId?._id || msg.senderId) === user?._id;
            const msgDate = new Date(msg.createdAt);
            let showDate = false;
            if (!lastDate || !isSameDay(lastDate, msgDate)) {
              showDate = true;
              lastDate = msgDate;
            }

            const senderName = !isMine
              ? `${msg.senderId?.firstName || ''} ${msg.senderId?.lastName || ''}`.trim()
              : '';

            const prevMsg = idx > 0 ? messages[idx - 1] : null;
            const prevSame = prevMsg && (prevMsg.senderId?._id || prevMsg.senderId) === (msg.senderId?._id || msg.senderId);
            const showAvatar = !isMine && !prevSame;

            return (
              <div key={msg._id}>
                {showDate && (
                  <div className="my-4 flex items-center gap-3">
                    <div className={`flex-1 border-t ${dark ? 'border-gray-800' : 'border-gray-200'}`} />
                    <span className={`text-[11px] font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{formatDateLabel(msgDate)}</span>
                    <div className={`flex-1 border-t ${dark ? 'border-gray-800' : 'border-gray-200'}`} />
                  </div>
                )}

                <div className={`flex ${isMine ? 'justify-end' : 'justify-start'} ${prevSame && !showDate ? 'mt-0.5' : 'mt-3'}`}>
                  {!isMine && (
                    <div className="mr-2 mt-auto">
                      {showAvatar ? <Initials name={senderName || otherName} /> : <div className="h-8 w-8" />}
                    </div>
                  )}
                  <div className="max-w-[70%]">
                    {showAvatar && senderName && (
                      <p className={`mb-1 ml-1 text-[11px] font-medium ${dark ? 'text-gray-500' : 'text-gray-400'}`}>{senderName}</p>
                    )}
                    <div className={`rounded-2xl px-3.5 py-2.5 ${
                      isMine
                        ? 'bg-brand-600 text-white rounded-br-md'
                        : dark
                          ? 'bg-gray-800 text-gray-100 rounded-bl-md'
                          : 'bg-white text-gray-900 rounded-bl-md shadow-sm border border-gray-100'
                    }`}>
                      <p className="text-[14px] leading-relaxed whitespace-pre-wrap break-words">{msg.body}</p>
                      <p className={`mt-1 text-[10px] text-right ${
                        isMine ? 'text-white/50' : dark ? 'text-gray-600' : 'text-gray-400'
                      }`}>
                        {msgDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {canMessage ? (
          <form onSubmit={handleSend} className={`border-t px-3 py-3 ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <div className="flex items-end gap-2">
              <div className={`flex flex-1 items-end rounded-2xl px-4 py-2.5 ${dark ? 'bg-gray-800' : 'bg-gray-100'}`}>
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e);
                    }
                  }}
                  placeholder="Type a message..."
                  maxLength={1000}
                  rows={1}
                  className={`w-full resize-none bg-transparent text-sm leading-relaxed outline-none ${dark ? 'text-white placeholder-gray-500' : 'text-gray-900 placeholder-gray-400'}`}
                  style={{ maxHeight: '120px' }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || sending}
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition ${
                  input.trim()
                    ? 'bg-brand-600 text-white hover:bg-brand-700 active:scale-95'
                    : dark ? 'bg-gray-800 text-gray-600' : 'bg-gray-200 text-gray-400'
                }`}
              >
                <svg className="h-5 w-5 -rotate-45" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                </svg>
              </button>
            </div>
          </form>
        ) : (
          <div className={`border-t px-4 py-4 text-center ${dark ? 'border-gray-800 bg-gray-900' : 'border-gray-200 bg-white'}`}>
            <p className={`text-xs ${dark ? 'text-gray-500' : 'text-gray-400'}`}>
              {booking?.status === 'completed' ? 'This booking is completed. Messaging is closed.' : 'Messaging is available during active bookings only.'}
            </p>
          </div>
        )}
      </div>
    </AuthGuard>
  );
}
