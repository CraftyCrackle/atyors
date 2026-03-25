'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '../stores/authStore';
import Logo from '../components/Logo';
import LandingPricingSection from '../components/LandingPricingSection';
import LandingCarousel from '../components/LandingCarousel';
import AppStoreBadge from '../components/AppStoreBadge';
import { useInstall } from '../components/InstallContext';

const SERVICES = [
  {
    icon: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
    title: 'Trash and Recycling',
    desc: 'We roll your barrels to the curb before pickup and bring them back in when done. Book once or every week.',
    color: 'bg-brand-100 text-brand-600',
    from: 'From $2.50/barrel',
    live: true,
  },
  {
    icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4',
    title: 'Curb Item Pickup',
    desc: 'Boxes, bags, or bulky items that need to go out? We carry them from storage to the curb so you do not have to lift a thing.',
    color: 'bg-accent-100 text-accent-600',
    from: 'From $2.00/item',
    live: true,
  },
  {
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    title: 'Building Entrance Cleaning',
    desc: 'We vacuum and mop shared hallways and stairways in apartment buildings and multi-family homes. Available Monday through Saturday.',
    color: 'bg-green-100 text-green-600',
    from: 'From $15/floor',
    live: true,
  },
  {
    icon: 'M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z',
    title: 'Lawn and Exterior',
    desc: 'Mowing, leaf cleanup, and exterior upkeep to keep your property looking sharp all season long.',
    color: 'bg-lime-100 text-lime-600',
    from: 'Coming Soon',
    live: false,
  },
  {
    icon: 'M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z',
    title: 'Snow Removal',
    desc: 'Shoveling, salting, and de-icing for driveways, walkways, and building entrances after every storm.',
    color: 'bg-blue-100 text-blue-600',
    from: 'Coming Soon',
    live: false,
  },
  {
    icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 3h6m-6 4h6m-2 4h2',
    title: 'Property Inspections',
    desc: 'Routine walkthroughs and photo reports so you always know the condition of your property even from a distance.',
    color: 'bg-purple-100 text-purple-600',
    from: 'Coming Soon',
    live: false,
  },
];

const PERSONAS = [
  {
    icon: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
    title: 'Landlords',
    desc: 'You own rental units and do not have time to manage every small task. We become your on-call property crew so your tenants stay happy.',
    color: 'bg-brand-100 text-brand-600',
  },
  {
    icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
    title: 'HOAs',
    desc: 'Keep shared spaces clean and residents happy without hiring full-time staff or chasing down volunteers.',
    color: 'bg-accent-100 text-accent-600',
  },
  {
    icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
    title: 'Homeowners',
    desc: 'You just want the trash out on time and your home looking great. We take care of it so you get your weekends back.',
    color: 'bg-green-100 text-green-600',
  },
];

const FEATURES = [
  {
    icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    title: 'You Pick the Day',
    desc: 'Tell us when you need help and we will be there. Book once or set it up to repeat every week.',
    color: 'bg-brand-100 text-brand-600',
  },
  {
    icon: 'M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7',
    title: 'Watch on a Live Map',
    desc: 'See exactly where your worker is on a live map while they are on the way. No guessing, no waiting around.',
    color: 'bg-accent-100 text-accent-600',
  },
  {
    icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
    title: 'Pay Only When Done',
    desc: 'Your card is only charged after the work is finished. No upfront costs and no surprise fees.',
    color: 'bg-yellow-100 text-yellow-600',
  },
];

const STEPS = [
  { num: '1', label: 'Create a Free Account', desc: 'Sign up in about 60 seconds. No credit card needed.' },
  { num: '2', label: 'Pick a Service and a Date', desc: 'Tell us your address, what you need, and when. We show you the price right away.' },
  { num: '3', label: 'We Take Care of It', desc: 'A local worker comes to your property and gets the job done. You will get a notification when it is finished.' },
];

function NativeAppLanding() {
  return (
    <main className="flex min-h-[100dvh] min-h-[100vh] flex-col bg-white">
      <div className="absolute -right-20 top-10 h-72 w-72 rounded-full bg-brand-50 blur-3xl" />
      <div className="absolute -left-16 bottom-20 h-56 w-56 rounded-full bg-accent-50 blur-3xl" />

      <div className="relative flex flex-1 flex-col items-center justify-center px-6">
        <div className="flex w-full max-w-sm flex-col items-center">
          <Logo size="lg" variant="wordmark" />

          <p className="mt-4 text-center text-lg font-medium text-gray-500">
            On-demand property management
          </p>
          <p className="mt-2 text-center text-sm text-gray-400">
            Trash barrels, building cleaning, and more. Book once or set it on autopilot. We handle the work so you do not have to.
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
        <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
          <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
          <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms</Link>
          <Link href="/support" className="hover:text-gray-600">Support</Link>
        </div>
        <p className="mt-2 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} atyors.com &middot; At Your Service
        </p>
      </footer>
    </main>
  );
}

function WebLanding() {
  const { isIos, hasAppStore, canInstall, isStandalone, triggerInstall } = useInstall();

  return (
    <main className="min-h-screen-safe bg-white">
      <nav className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 pb-3 pt-sticky-safe backdrop-blur-sm sm:px-6 sm:pb-4">
        <Link href="/" className="shrink-0" aria-label="atyors home">
          <Logo size="sm" variant="wordmark" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
          <Link href="/pricing" className="text-sm font-semibold text-brand-600 hover:text-brand-800">Pricing</Link>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
          <Link href="/signup" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:px-4">Get Started</Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden px-6 pb-16 pt-12">
        <div className="absolute -right-20 -top-20 h-80 w-80 rounded-full bg-brand-50 blur-3xl" />
        <div className="absolute -left-10 bottom-0 h-60 w-60 rounded-full bg-accent-50 blur-3xl" />

        <div className="relative mx-auto max-w-lg text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-4 py-1.5 text-sm font-medium text-brand-700">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Trusted by landlords and HOAs in Greater Boston
          </div>

          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl">
            Your property,<br />
            <span className="bg-gradient-to-r from-brand-600 to-accent-500 bg-clip-text text-transparent">handled.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-md text-lg text-gray-500">
            We take care of the weekly tasks that eat your weekends. Trash barrels, building cleaning, curb items, and more. Book once or put it on autopilot.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:items-center sm:justify-center">
              <Link href="/signup" className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-8 py-4 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98] sm:w-auto">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                Build Your Property Care Plan
              </Link>
              <Link href="/login" className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-8 py-4 font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98] sm:w-auto">
                I already have an account
              </Link>
            </div>
            <a href="#pricing" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 underline decoration-brand-200 underline-offset-4 transition hover:text-brand-800 hover:decoration-brand-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
              See pricing
            </a>
          </div>

          {!isStandalone && (
            <div className="mt-6 flex justify-center gap-3">
              {isIos && hasAppStore && <AppStoreBadge />}
              {!isIos && canInstall && (
                <button onClick={triggerInstall} className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-gray-800 active:scale-[0.97]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Install App
                </button>
              )}
            </div>
          )}
        </div>
      </section>

      <LandingCarousel />

      {/* Who It's For */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-600">Who It Is For</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">Built for people who own property</p>
          <p className="mt-2 text-center text-sm text-gray-500">No matter what kind of property you manage, atyors fits right in.</p>

          <div className="mt-8 space-y-3">
            {PERSONAS.map((p, i) => (
              <div key={i} className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${p.color}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={p.icon} />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{p.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-gray-500">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What We Handle */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-600">What We Handle</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">One platform for your whole property</p>
          <p className="mt-2 text-center text-sm text-gray-500">Start with one service and add more whenever you are ready. Live tracking and job photos included on every booking.</p>

          <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {SERVICES.map((s, i) => (
              <div key={i} className={`flex items-start gap-3 rounded-2xl border p-4 ${s.live ? 'border-gray-200 bg-white shadow-sm' : 'border-dashed border-gray-200 bg-gray-50'}`}>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${s.live ? s.color : 'bg-gray-100 text-gray-400'}`}>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className={`font-semibold ${s.live ? 'text-gray-900' : 'text-gray-400'}`}>{s.title}</h3>
                    {!s.live && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold text-gray-500">Coming Soon</span>}
                  </div>
                  <p className={`mt-0.5 text-sm leading-relaxed ${s.live ? 'text-gray-500' : 'text-gray-400'}`}>{s.desc}</p>
                  {s.live && <p className="mt-1 text-xs font-semibold text-brand-600">{s.from}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-brand-600">How It Works</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">3 steps and you are done.</p>

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

      {/* Why Us */}
      <section className="bg-gray-50 px-6 py-16">
        <div className="mx-auto max-w-lg">
          <h2 className="text-center text-sm font-semibold uppercase tracking-widest text-accent-600">Why People Use Us</h2>
          <p className="mt-2 text-center text-2xl font-bold text-gray-900">Less work for you</p>

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

      <LandingPricingSection id="pricing" />

      {/* Bottom CTA */}
      <section className="bg-brand-600 px-6 py-16">
        <div className="mx-auto max-w-lg text-center">
          <h2 className="text-2xl font-bold text-white">Ready to get your property handled?</h2>
          <p className="mt-2 text-brand-100">Sign up for free. Tell us about your property and we will build a care plan that fits. You only pay when the work is done.</p>
          <div className="mt-6 flex flex-col items-center gap-4">
            <Link href="/signup" className="inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 font-semibold text-brand-600 shadow-lg transition hover:bg-brand-50 active:scale-[0.98]">
              Build Your Property Care Plan
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
            </Link>
            {!isStandalone && isIos && hasAppStore && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-brand-200">or get the app</p>
                <AppStoreBadge />
              </div>
            )}
            {!isStandalone && !isIos && canInstall && (
              <div className="flex flex-col items-center gap-2">
                <p className="text-sm text-brand-200">or get the app</p>
                <button onClick={triggerInstall} className="inline-flex items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/20 active:scale-[0.97]">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                  Install App
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
          <Logo size="sm" variant="wordmark" />
          <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/support" className="hover:text-gray-600">Support</Link>
          </div>
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} atyors.com &middot; Property management, on your terms.
          </p>
        </div>
      </footer>
    </main>
  );
}

export default function Home() {
  const { user, loading, init } = useAuthStore();
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);

  useEffect(() => {
    setIsNative(!!window.Capacitor?.isNativePlatform?.());
  }, []);

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

  if (isNative) return <NativeAppLanding />;

  return <WebLanding />;
}
