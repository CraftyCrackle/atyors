import Link from 'next/link';

const PLANS = [
  {
    name: 'Homeowner',
    tagline: 'Great for a single home',
    price: 'From $30',
    period: '/mo',
    color: 'border-gray-200',
    badge: null,
    items: [
      'Weekly trash barrel valet (up to 3 barrels)',
      'One-time curb item pickup',
      'Live tracking on every visit',
      'Cancel anytime',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlight: false,
  },
  {
    name: 'Landlord',
    tagline: 'For rentals and multi-unit properties',
    price: 'From $45',
    period: '/mo',
    color: 'border-brand-400',
    badge: 'Most Popular',
    items: [
      'Everything in Homeowner',
      'Building entrance cleaning',
      'Schedule for multiple addresses',
      'Priority booking slots',
    ],
    cta: 'Get Started',
    href: '/signup',
    highlight: true,
  },
  {
    name: 'HOA / Property Manager',
    tagline: 'For associations and large portfolios',
    price: 'Custom',
    period: '',
    color: 'border-gray-200',
    badge: null,
    items: [
      'Everything in Landlord',
      'Volume pricing across all units',
      'Dedicated support contact',
      'Monthly reporting',
    ],
    cta: 'Contact Us',
    href: '/support',
    highlight: false,
  },
];

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

        {/* Plan cards */}
        <div className="mt-8 space-y-4">
          {PLANS.map((plan) => (
            <div key={plan.name} className={`rounded-2xl border-2 bg-white p-5 shadow-sm ${plan.highlight ? 'border-brand-400' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-gray-900">{plan.name}</h3>
                    {plan.badge && (
                      <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">{plan.badge}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{plan.tagline}</p>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-2xl font-extrabold text-brand-600">{plan.price}</span>
                  {plan.period && <span className="text-sm text-gray-400">{plan.period}</span>}
                </div>
              </div>
              <ul className="mt-4 space-y-2">
                {plan.items.map((item) => (
                  <li key={item} className="flex items-start gap-2 text-sm text-gray-600">
                    <svg className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className={`mt-4 flex w-full items-center justify-center rounded-xl py-3 text-sm font-semibold transition active:scale-[0.98] ${plan.highlight ? 'bg-brand-600 text-white shadow-lg shadow-brand-600/25 hover:bg-brand-700' : 'border border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                {plan.cta}
              </Link>
            </div>
          ))}
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

        <p className="mt-6 text-xs font-bold uppercase tracking-wider text-gray-400">Other Property Services</p>
        <div className="mt-2 space-y-3">
          <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div>
              <p className="font-semibold text-gray-900">Move items to the curb</p>
              <p className="text-sm text-gray-500">Boxes, bags, or bulky stuff that needs to go out. We carry up to 10 items (each up to 25 lbs) from storage to the curb.</p>
            </div>
            <p className="text-xl font-bold text-brand-600">$2.00<span className="text-sm font-normal text-gray-400">/item</span></p>
          </div>
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-gray-900">Building entrance cleaning</p>
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
