'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { api } from '../services/api';

const HOME_ICON  = 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6';
const BOOK_ICON  = 'M12 4v16m8-8H4';
const USER_ICON  = 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';

const TABS = [
  { href: '/dashboard', label: 'Home',    icon: HOME_ICON  },
  { href: '/book',      label: 'Book',    icon: BOOK_ICON, primary: true },
  { href: '/profile',   label: 'Profile', icon: USER_ICON  },
];

export default function BottomNav() {
  const pathname    = usePathname();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    async function load() {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
        if (!token) return;
        const res = await api.get('/bookings/messages/unread');
        setUnread(res.data.count || 0);
      } catch {}
    }
    load();
    const id = setInterval(load, 15000);
    return () => clearInterval(id);
  }, [pathname]);

  return (
    <>
      {/* ── MOBILE bottom bar ─────────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 pb-safe">
        {/* frosted glass backdrop */}
        <div className="absolute inset-0 bg-white/88 backdrop-blur-2xl border-t border-gray-200/70 shadow-[0_-6px_24px_rgba(0,0,0,0.07)]" />

        <div className="relative mx-auto flex max-w-lg items-center justify-around gap-1.5 px-3 py-2">
          {TABS.map((tab) => {
            const active = pathname.startsWith(tab.href);

            if (tab.primary) {
              return (
                <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
                  className="relative flex flex-1 flex-col items-center">
                  <div className={`flex w-full max-w-[88px] flex-col items-center justify-center gap-0.5 rounded-2xl py-2.5 transition-all duration-200 active:scale-95
                    ${active
                      ? 'bg-brand-700 shadow-lg shadow-brand-700/40 text-white'
                      : 'bg-brand-600 shadow-md shadow-brand-600/35 text-white'
                    }`}>
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                    </svg>
                    <span className="text-[11px] font-bold tracking-wide leading-none">Book</span>
                  </div>
                </Link>
              );
            }

            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
                className="relative flex flex-1 flex-col items-center">
                <div className={`flex w-full max-w-[88px] flex-col items-center justify-center gap-0.5 rounded-2xl py-2.5 transition-all duration-200 active:scale-95
                  ${active
                    ? 'bg-brand-50 text-brand-600 shadow-sm shadow-brand-100'
                    : 'bg-gray-100/80 text-gray-500 hover:bg-gray-200/70'
                  }`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                  </svg>
                  <span className={`text-[11px] font-semibold tracking-wide leading-none ${active ? 'text-brand-600' : 'text-gray-500'}`}>
                    {tab.label}
                  </span>
                </div>
                {tab.href === '/dashboard' && unread > 0 && (
                  <span className="absolute -top-0.5 right-[calc(50%-26px)] flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-1 ring-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* ── DESKTOP floating dock ──────────────────────────────────────── */}
      <nav aria-label="Main navigation" className="hidden md:flex fixed bottom-6 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-1.5 rounded-2xl border border-gray-200/70 bg-white/92 px-2.5 py-2 shadow-[0_8px_32px_rgba(0,0,0,0.13)] backdrop-blur-2xl">

          {/* Brand mark */}
          <Link href="/dashboard" aria-label="Go to dashboard" aria-current={pathname.startsWith('/dashboard') ? 'page' : undefined}
            className="mr-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-600 shadow-sm shadow-brand-600/30 transition hover:bg-brand-700">
            <svg className="h-5 w-5 text-white" aria-hidden="true" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <div className="mx-1 h-6 w-px bg-gray-200" />

          {TABS.filter(t => !t.primary).map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} aria-current={active ? 'page' : undefined}
                className={`relative flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all duration-150 hover:scale-[1.02] active:scale-[0.97]
                  ${active
                    ? 'bg-brand-50 text-brand-700 shadow-sm'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-800'
                  }`}>
                <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={tab.icon} />
                </svg>
                {tab.label}
                {tab.href === '/dashboard' && unread > 0 && (
                  <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="mx-1 h-6 w-px bg-gray-200" />

          {/* Primary Book CTA */}
          <Link href="/book"
            className={`flex items-center gap-2 rounded-xl px-5 py-2 text-sm font-bold text-white shadow-md transition-all duration-150 hover:scale-[1.03] active:scale-[0.97]
              ${pathname.startsWith('/book')
                ? 'bg-brand-700 shadow-brand-700/40'
                : 'bg-brand-600 shadow-brand-600/35 hover:bg-brand-700'
              }`}>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d={BOOK_ICON} />
            </svg>
            Book a Service
          </Link>
        </div>
      </nav>
    </>
  );
}
