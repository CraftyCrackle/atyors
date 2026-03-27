import Link from 'next/link';


export default function LandingPricingSection({ id = 'pricing', className = '' }) {
  return (
    <section id={id} className={`scroll-mt-20 bg-gray-50 px-6 py-16 ${className}`.trim()}>
      <div className="mx-auto max-w-lg">
        <div className="mx-auto mb-4 flex items-center justify-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-4 py-1.5 text-sm font-semibold text-brand-800">
            Simple and affordable
          </span>
        </div>
        <h2 className="text-center text-2xl font-bold text-gray-900">Pick the plan that fits your property</h2>
        <p className="mt-2 text-center text-gray-500">No hidden fees. You see the exact price before you confirm anything. Cancel anytime.</p>

        {/* Build your plan card */}
        <div className="mt-8 rounded-2xl border-2 border-brand-400 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-bold text-gray-900">Build Your Property Care Plan</h3>
              <p className="text-sm text-gray-500">For homeowners, landlords, and anyone who owns a property</p>
            </div>
            <div className="shrink-0 text-right">
              <span className="text-2xl font-extrabold text-brand-600">From $2.50</span>
            </div>
          </div>
          <ul className="mt-4 space-y-2">
            {[
              'Pick only the services you need — no bundles, no guessing',
              'Book once or set it to repeat every week automatically',
              'Add multiple properties to one account',
              'Live tracking and a photo when every job is done',
              'Cancel anytime with no long-term commitment',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
          <Link href="/signup" className="mt-4 flex w-full items-center justify-center rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]">
            Get Started Free
          </Link>
        </div>

        {/* HOA / Property Manager contact card */}
        <div className="mt-4 rounded-2xl border border-gray-200 bg-gray-50 p-5">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
              <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-gray-900">HOA or Property Manager?</h3>
              <p className="mt-1 text-sm text-gray-500">Managing a large building or multiple properties? Reach out and we will put together something that works for your situation.</p>
              <a href="mailto:atyors.support@gmail.com" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                atyors.support@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Detailed price breakdown */}
        <p className="mt-10 text-xs font-bold uppercase tracking-wider text-gray-400">Trash Barrel Pricing</p>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Roll barrels out to the curb</p>
              <p className="text-sm text-gray-500">We come before pickup and wheel them out for you</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Bring barrels back in</p>
              <p className="text-sm text-gray-500">We come back after pickup and put them away</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.50<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Both out and back <span className="ml-1 text-xs font-medium text-brand-600">Most popular</span></p>
              <p className="text-sm text-gray-500">The full job. We take them out and bring them back in.</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$4.00<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Weekly subscription <span className="ml-1 text-xs font-medium text-green-600">Best value</span></p>
              <p className="text-sm text-gray-500">We show up every week automatically. Up to 3 barrels included, plus $3/mo per extra barrel.</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$30<span className="text-sm font-normal text-gray-400">/mo</span></p>
          </div>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">Cleaning Services</p>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Move items to the curb</p>
              <p className="text-sm text-gray-500">Boxes, bags, or bulky stuff that needs to go out. We carry up to 10 items (each up to 25 lbs) from storage to the curb.</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.00<span className="text-sm font-normal text-gray-400">/item</span></p>
          </div>
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Barrel cleaning</p>
              <p className="text-sm text-gray-500">Deep clean of your trash and recycling barrels, inside and out. Eliminates odors and buildup.</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$10<span className="text-sm font-normal text-gray-400">/barrel</span></p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Entrance and hallway cleaning</p>
                <p className="text-sm text-gray-500">We vacuum and mop shared hallways and stairways. Available Monday through Saturday, 10 AM to 4 PM.</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold text-brand-600">$15<span className="text-sm font-normal text-gray-400">/floor</span></p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">$15/floor (vacuum and mop)</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">$8/staircase</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">+$15 front entrance</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">+$15 back entrance</span>
            </div>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
              <p className="font-semibold text-gray-900">Property cleanout</p>
              <p className="text-sm text-gray-500">Full cleanout for vacant apartments and homes. Base price includes 1 bedroom, common area, kitchen, bath, and vacuuming. Add $50 per additional bedroom.</p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-xl font-bold text-brand-600">From $250</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-500">
              <span className="rounded-full bg-gray-100 px-2.5 py-1">Studio / 1BR $250</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">2BR $300</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">3BR $350</span>
              <span className="rounded-full bg-gray-100 px-2.5 py-1">4BR+ custom quote</span>
            </div>
          </div>
        </div>

        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">Outdoor Services</p>
        <div className="mt-2 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <p className="text-sm font-semibold text-gray-700">Priced by lot size</p>
          <p className="mt-0.5 text-xs text-gray-500">Small up to 2,000 sq ft · Medium up to 5,000 sq ft · Large 5,000+ sq ft</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-2 pr-4 text-left text-xs font-semibold text-gray-500">Service</th>
                  <th className="pb-2 px-3 text-center text-xs font-semibold text-gray-500">Small</th>
                  <th className="pb-2 px-3 text-center text-xs font-semibold text-gray-500">Medium</th>
                  <th className="pb-2 pl-3 text-center text-xs font-semibold text-gray-500">Large</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { name: 'Lawn Care', small: '$35', medium: '$55', large: '$85' },
                  { name: 'Leaf Cleanup', small: '$45', medium: '$65', large: '$95' },
                  { name: 'Snow Shoveling', small: '$40', medium: '$60', large: '$90' },
                ].map((row) => (
                  <tr key={row.name}>
                    <td className="py-2.5 pr-4 font-medium text-gray-900">{row.name}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-brand-600">{row.small}</td>
                    <td className="py-2.5 px-3 text-center font-bold text-brand-600">{row.medium}</td>
                    <td className="py-2.5 pl-3 text-center font-bold text-brand-600">{row.large}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-gray-400">Outdoor services are contact-based for now. <a href="mailto:atyors.support@gmail.com" className="font-semibold text-brand-600 hover:underline">Get a quote</a></p>
        </div>

        <div className="mt-8 text-center">
          <Link href="/signup" className="inline-block rounded-xl bg-brand-600 px-10 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/25 transition hover:bg-brand-700 active:scale-[0.98]">
            Get Started Free
          </Link>
          <p className="mt-3 text-xs text-gray-400">No credit card needed to sign up. Cancel anytime.</p>
        </div>
      </div>
    </section>
  );
}
