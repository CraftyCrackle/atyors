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
        <h2 className="text-center text-2xl font-bold text-gray-900">How much does it cost?</h2>
        <p className="mt-2 text-center text-gray-500">You only pay for what you use. No hidden fees. You see the full price before you confirm.</p>

        <div className="mt-8 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Roll barrels out to the curb</p>
              <p className="text-sm text-gray-500">We come to your home and wheel them out before pickup</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Bring barrels back in</p>
              <p className="text-sm text-gray-500">We come back after pickup and put them away for you</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Both out &amp; back <span className="text-xs font-medium text-brand-600 ml-1">Most popular</span></p>
              <p className="text-sm text-gray-500">We take them out AND bring them back in — the full job</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$4.00<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Monthly plan <span className="text-xs font-medium text-green-600 ml-1">Best value</span></p>
              <p className="text-sm text-gray-500">We do it every week automatically — up to 3 barrels included, +$3/mo per extra barrel</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$30<span className="text-sm font-normal text-gray-400">/mo</span></p>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Move items to the curb</p>
              <p className="text-sm text-gray-500">Have boxes, bags, or other stuff to put out? We move up to 10 items (each up to 25 lbs) from your storage to the curb</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.00<span className="text-sm font-normal text-gray-400">/item</span></p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <Link href="/signup" className="inline-block rounded-xl bg-brand-600 px-10 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]">
            Sign Up Free
          </Link>
          <p className="mt-3 text-xs text-gray-400">No credit card needed to sign up. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
