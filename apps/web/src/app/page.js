'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';

export default function Home() {
  const { user, loading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (!loading && user) {
      if (['admin', 'superadmin'].includes(user.role)) router.push('/admin/dashboard');
      else if (user.role === 'servicer') router.push('/servicer/dashboard');
      else router.push('/dashboard');
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <div className="flex min-h-screen-safe items-center justify-center bg-white">
        <div className="flex flex-col items-center gap-4">
          <Logo size="md" variant="icon" />
          <div className="h-1 w-24 overflow-hidden rounded-full bg-brand-100">
            <div className="h-full w-1/2 animate-pulse rounded-full bg-brand-600" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-white">
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />
      <div className="absolute -left-16 bottom-20 h-56 w-56 rounded-full bg-accent-50 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col items-center">
          <Logo size="lg" variant="wordmark" />

          <p className="mt-4 text-center text-lg font-medium text-gray-500">
            Curbside trash barrel service
          </p>
          <p className="mt-2 text-center text-sm text-gray-400">
            We put your barrels out and bring them back in&nbsp;&mdash; so you don&apos;t have to.
          </p>

          <div className="mt-12 flex w-full flex-col gap-3">
            <Link
              href="/signup"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-8 py-4 text-base font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>

      <footer className="px-6 pb-safe pb-6">
        <p className="text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} atyors.com &middot; At Your Service
        </p>
      </footer>
    </main>
  );
}
