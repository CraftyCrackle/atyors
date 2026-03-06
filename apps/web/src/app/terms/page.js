'use client';

import Link from 'next/link';

export default function TermsOfService() {
  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <img src="/icons/favicon-48x48.png" alt="atyors" className="mb-4 h-10 w-10" />
        <h1 className="text-3xl font-extrabold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 6, 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Agreement to Terms</h2>
            <p className="mt-2">
              By creating an account or using atyors ("At Your Service"), you agree to these Terms of Service. 
              If you do not agree, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Description of Service</h2>
            <p className="mt-2">
              atyors is a platform that connects customers with local servicers who perform curbside services, 
              starting with trash barrel put out and bring in. The platform handles scheduling, payment processing, 
              live tracking, and communication between customers and servicers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. Accounts</h2>
            <p className="mt-2">
              You must provide accurate information when creating an account. You are responsible for 
              keeping your login credentials secure. You must be at least 18 years old to use our services.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. Bookings and Payments</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>A valid payment method must be on file before booking a service.</li>
              <li>You are charged after a servicer completes your job.</li>
              <li>Bookings cancelled within the first 2 minutes are free. After the grace period, a $1.00 cancellation fee applies.</li>
              <li>Prices are shown before you confirm a booking. The amount charged will match the confirmed price.</li>
              <li>Payments are processed securely by Stripe. atyors does not store your full card number.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Service Expectations</h2>
            <p className="mt-2">
              Please provide accurate instructions and up-to-date photos for your service address. If conditions 
              differ from the request when the servicer arrives, the servicer may use their best judgment or 
              service only the barrels you requested.
            </p>
            <p className="mt-2">
              atyors connects you with independent servicers. While we work to ensure quality, specific 
              outcomes may vary based on conditions at the time of service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Servicer Terms</h2>
            <p className="mt-2">
              Servicers access the platform through accounts provided by atyors. Servicers agree to complete 
              accepted jobs professionally and in a timely manner, provide accurate status updates, and respect 
              customer property.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">7. Prohibited Conduct</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Do not use the platform for any unlawful purpose</li>
              <li>Do not create fake accounts or provide false information</li>
              <li>Do not interfere with the platform's operation or other users' experience</li>
              <li>Do not attempt to circumvent payment through the platform</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">8. Limitation of Liability</h2>
            <p className="mt-2">
              atyors provides the platform "as is." We are not liable for damages arising from service delays, 
              property damage during service, or servicer conduct beyond our reasonable control. Our total 
              liability for any claim is limited to the amount you paid for the specific service in question.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">9. Termination</h2>
            <p className="mt-2">
              You may close your account at any time. We may suspend or terminate accounts that violate these 
              terms or engage in abusive behavior. Outstanding charges remain due after termination.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">10. Changes to Terms</h2>
            <p className="mt-2">
              We may update these terms from time to time. Continued use of the platform after changes 
              constitutes acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">11. Governing Law</h2>
            <p className="mt-2">
              These terms are governed by the laws of the Commonwealth of Massachusetts, United States.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">12. Contact</h2>
            <p className="mt-2">
              Questions about these terms? Contact us at{' '}
              <a href="mailto:support@atyors.com" className="text-brand-600 hover:underline">support@atyors.com</a>.
            </p>
          </section>
        </div>

        <div className="mt-12 border-t border-gray-100 pt-6 text-center text-xs text-gray-400">
          &copy; {new Date().getFullYear()} atyors. At Your Service.
        </div>
      </div>
    </div>
  );
}
