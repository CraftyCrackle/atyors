import Link from 'next/link';

/**
 * Shared pricing block for the marketing home page and /pricing route.
 */
export default function LandingPricingSection({ id = 'pricing', className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 px-6 py-16 bg-gray-50 ${className}`.trim()}>
      <div className="mx-auto max-w-lg">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">
            Simple &amp; affordable
          </span>
        </div>
        <h2 className="text-center text-2xl font-bold text-gray-900">What does it cost?</h2>
        <p className="mt-2 text-center text-gray-500">Simple, transparent pricing. Pay per visit or subscribe monthly and never think about it again.</p>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Take barrels out</p>
              <p className="text-sm text-gray-500">We bring them to the curb for you</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Bring barrels back</p>
              <p className="text-sm text-gray-500">We put them back where they belong</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Both (out &amp; back) <span className="text-xs font-medium text-brand-600">Most popular</span></p>
              <p className="text-sm text-gray-500">The whole thing, start to finish</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$4.00<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Monthly (both)</p>
              <p className="text-sm text-gray-500">Up to 3 barrels weekly; +$3/mo each extra</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$30<span className="text-sm font-normal text-gray-400">/mo</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Curb items</p>
              <p className="text-sm text-gray-500">From your barrel storage to the curb, up to 25 lbs each, up to 10 items</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.00<span className="text-sm font-normal text-gray-400">/item</span></p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/signup" className="inline-block rounded-xl bg-brand-600 px-10 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]">
            Sign Up Free
          </Link>
          <p className="mt-3 text-xs text-gray-400">No card needed to sign up. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
