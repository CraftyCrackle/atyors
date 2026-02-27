'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';

const FEATURES = [
  {
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    title: 'Pick a Day',
    desc: 'Just choose which day you need help. We\'ll take care of the rest.',
    color: 'bg-brand-100 text-brand-600',
  },
  {
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    title: 'Watch Us Come to You',
    desc: 'See exactly where your servicer is on a live map, just like tracking a delivery.',
    color: 'bg-accent-100 text-accent-600',
  },
  {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Pay Only for What You Need',
    desc: 'Pay per barrel each time, or save with a monthly plan. No tricks, no surprises.',
    color: 'bg-yellow-100 text-yellow-600',
  },
];

const STEPS = [
  { num: '1', label: 'Sign Up', desc: 'Create an account — it only takes a minute' },
  { num: '2', label: 'Book', desc: 'Tell us how many barrels and pick a day' },
  { num: '3', label: 'We Handle It', desc: 'Someone comes to your house and takes care of your barrels' },
];

export default function Home() {
  const { user, loading, init } = useAuthStore();
  const router = useRouter();

  useEffect(() => { init(); }, [init]);
  useEffect(() => {
    if (!loading && user) {
      router.push(user.role === 'servicer' ? '/servicer/dashboard' : '/dashboard');
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
    <main className="min-h-screen-safe bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 pb-4 pt-sticky-safe">
        <Logo size="sm" variant="wordmark" />
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
          <Link href="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-12">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-50 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-60 w-60 rounded-full bg-accent-50 blur-3xl" />

        <div className="relative mx-auto max-w-lg text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-accent-50 px-4 py-1.5 text-sm font-medium text-accent-700">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-500" />
            Now serving Boston &amp; surrounding areas
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            We take your<br />trash barrels<br />
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">to the curb &amp; back.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-md text-lg text-gray-500">
            Hate dragging your trash barrels out? We do it for you. Just tell us what day, and someone will come put them out and bring them back in.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link href="/signup" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98] sm:w-auto">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
              Get Started
            </Link>
            <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-8 py-4 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] sm:w-auto">
              I already have an account
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-600">How It Works</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">It&apos;s really this easy.</p>

          <div className="mt-10 space-y-6">
            {STEPS.map((step, i) => (
              <div key={i} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-600 text-lg font-bold text-white shadow-md shadow-brand-600/30">
                  {step.num}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{step.label}</h3>
                  <p className="mt-0.5 text-sm text-gray-500">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent-600">Why People Love Us</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">Because barrel day shouldn&apos;t be a chore</p>

          <div className="mt-10 space-y-4">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${f.color}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={f.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{f.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-brand-600 px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold text-white">Never drag a barrel again.</h2>
          <p className="mt-2 text-brand-100">Sign up, book your first service, and let us do the heavy lifting.</p>
          <Link href="/signup" className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-brand-600 shadow-lg transition hover:bg-brand-50 active:scale-[0.98]">
            Get Started
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
          <Logo size="sm" variant="wordmark" />
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} atyors.com &middot; At Your Service
          </p>
        </div>
      </footer>
    </main>
  );
}
