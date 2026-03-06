'use client';

import Link from 'next/link';

export default function Support() {
  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <img src="/icons/favicon-48x48.png" alt="atyors" className="mb-4 h-10 w-10" />
        <h1 className="text-3xl font-extrabold text-gray-900">Support</h1>
        <p className="mt-2 text-gray-500">We're here to help. Reach out anytime.</p>

        <div className="mt-10 space-y-6">
          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
                <svg className="h-5 w-5 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Email</h2>
                <p className="mt-1 text-sm text-gray-500">Send us an email and we'll get back to you within 24 hours.</p>
                <a href="mailto:support@atyors.com" className="mt-2 inline-block text-sm font-medium text-brand-600 hover:underline">
                  support@atyors.com
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Common Questions</h2>
                <div className="mt-3 space-y-3 text-sm text-gray-600">
                  <div>
                    <p className="font-medium text-gray-800">How do I book a service?</p>
                    <p className="mt-0.5">Tap "Book" in the bottom menu, pick your address, choose a service, select your date and time, and confirm.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">Can I cancel a booking?</p>
                    <p className="mt-0.5">Yes. Cancellations within 2 minutes are free. After that, a $1.00 cancellation fee applies.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">When am I charged?</p>
                    <p className="mt-0.5">You are charged after your servicer completes the job, not upfront.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">How do I track my servicer?</p>
                    <p className="mt-0.5">When your servicer is en route, a live map appears on your dashboard showing their location in real time.</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">How do I update my payment method?</p>
                    <p className="mt-0.5">Go to Profile, scroll to Payment Methods, and tap "+ Add Card" to add a new card or remove an existing one.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100">
                <svg className="h-5 w-5 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
              </div>
              <div>
                <h2 className="font-semibold text-gray-900">Service Area</h2>
                <p className="mt-1 text-sm text-gray-500">We currently serve the greater Boston area including Everett, Dorchester, Somerville, Cambridge, and surrounding communities.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-10 flex justify-center gap-6 text-sm text-gray-400">
          <Link href="/privacy" className="hover:text-gray-600">Privacy Policy</Link>
          <Link href="/terms" className="hover:text-gray-600">Terms of Service</Link>
        </div>

        <div className="mt-6 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} atyors. At Your Service.
        </div>
      </div>
    </div>
  );
}
