import Link from 'next/link';
import Logo from '../../components/Logo';
import LandingPricingSection from '../../components/LandingPricingSection';

export const metadata = {
  title: 'Pricing | atyors',
  description: 'Transparent trash barrel service pricing — per barrel, curb items, and monthly options at atyors.com.',
};

export default function PricingPage() {
  return (
    <main className="min-h-screen-safe bg-white">
      <nav className="sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 bg-white/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
        <Link href="/" className="shrink-0" aria-label="atyors home">
          <Logo size="sm" variant="wordmark" />
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 sm:gap-x-4">
          <span className="text-sm font-semibold text-brand-600" aria-current="page">Pricing</span>
          <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">Sign In</Link>
          <Link href="/signup" className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700 sm:px-4">Get Started</Link>
        </div>
      </nav>

      <div className="border-b border-gray-100 bg-gray-50 px-6 py-8 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Pricing</h1>
        <p className="mx-auto mt-2 max-w-md text-gray-500">No hidden fees. You&apos;ll see the full total before you confirm any booking.</p>
      </div>

      <LandingPricingSection id="pricing" />

      <section className="border-t border-gray-100 bg-gray-50 px-6 py-10">
        <div className="mx-auto max-w-lg text-center">
          <p className="text-sm text-gray-600">Questions about rates or your address?</p>
          <Link href="/support" className="mt-2 inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">Visit support</Link>
          <span className="mx-2 text-gray-300" aria-hidden>·</span>
          <Link href="/" className="inline-block text-sm font-semibold text-brand-600 hover:text-brand-700">Back to home</Link>
        </div>
      </section>

      <footer className="border-t border-gray-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-4">
          <Logo size="sm" variant="wordmark" />
          <div className="flex flex-wrap justify-center gap-4 text-xs text-gray-400">
            <Link href="/pricing" className="hover:text-gray-600">Pricing</Link>
            <Link href="/privacy" className="hover:text-gray-600">Privacy</Link>
            <Link href="/terms" className="hover:text-gray-600">Terms</Link>
            <Link href="/support" className="hover:text-gray-600">Support</Link>
          </div>
          <p className="text-center text-xs text-gray-400">
            &copy; {new Date().getFullYear()} atyors.com &middot; At Your Service
          </p>
        </div>
      </footer>
    </main>
  );
}
