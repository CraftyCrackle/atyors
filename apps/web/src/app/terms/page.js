'use client';

import Link from 'next/link';
import Logo from '../../components/Logo';

const LAST_UPDATED = 'February 25, 2026';

export default function TermsPage() {
  return (
    <main className="min-h-screen-safe bg-white">
      <nav className="flex items-center justify-between border-b border-gray-100 px-6 pb-4 pt-sticky-safe">
        <Link href="/">
          <Logo size="sm" variant="wordmark" />
        </Link>
        <Link href="/signup" className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700">
          Sign Up
        </Link>
      </nav>

      <div className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl font-bold text-gray-900">Terms of Service</h1>
        <p className="mt-2 text-sm text-gray-400">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-8 text-sm leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. What This Agreement Is</h2>
            <p className="mt-2">
              These Terms of Service (&quot;Terms&quot;) are an agreement between you and atyors.com (&quot;atyors,&quot; &quot;we,&quot; &quot;us&quot;). By creating an account or using our services, you agree to follow these Terms. If you don&apos;t agree, please don&apos;t use our app.
            </p>
            <p className="mt-2">
              We may update these Terms from time to time. If we make a big change, we&apos;ll let you know by email or through the app. If you keep using the service after a change, that means you accept the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. What We Do</h2>
            <p className="mt-2">
              atyors.com is a platform that connects homeowners (&quot;Customers&quot;) with people who provide curbside trash barrel services (&quot;Servicers&quot;). Our services include:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Put-Out:</strong> Moving your trash barrels from your property to the curb for pickup.</li>
              <li><strong>Bring-In:</strong> Moving your trash barrels from the curb back to your property after pickup.</li>
              <li><strong>Both:</strong> Put-Out and Bring-In as two separate jobs.</li>
            </ul>
            <p className="mt-2">
              We are a technology platform. Servicers are independent workers, not employees of atyors.com.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Who Can Use Our Service</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>You must be at least 18 years old.</li>
              <li>You must live in or own property in an area we currently serve (Massachusetts).</li>
              <li>You must provide accurate information when you sign up.</li>
              <li>You are responsible for keeping your account information and password safe.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Your Account</h2>
            <p className="mt-2">
              When you create an account, everything you enter must be truthful. You are responsible for all activity under your account. If you think someone else is using your account, contact us immediately.
            </p>
            <p className="mt-2">
              We can suspend or close your account if you break these Terms, use the service to do something illegal, or behave in a way that is harmful to others.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Booking and Scheduling</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Services are available Monday through Saturday. No services on Sundays.</li>
              <li>There is a daily limit on how many homes we can serve. If a day is full, you&apos;ll need to pick another day.</li>
              <li>Once you book, a Servicer will accept your job. You&apos;ll get a notification when someone accepts.</li>
              <li>You can cancel a booking up to 24 hours before the scheduled date at no charge.</li>
              <li>Cancellations made less than 24 hours before the scheduled date may not be refunded.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Pricing and Payment</h2>
            <p className="mt-2">
              We believe in honest, upfront pricing with no hidden fees. This is in line with Massachusetts consumer protection law (M.G.L. c. 93A).
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>One-Time Service:</strong> You pay per barrel, per service. The price is shown before you confirm your booking.</li>
              <li><strong>Monthly Subscription:</strong> You pay a flat monthly rate that includes weekly service for up to 3 barrels. Extra barrels cost more, and that price is shown clearly when you sign up.</li>
              <li>All prices are shown in U.S. dollars and include the full cost — no extra fees are added later.</li>
              <li>Payment is collected through our payment processor (Stripe). We do not store your full credit card number.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Subscriptions</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Monthly subscriptions renew automatically each month until you cancel.</li>
              <li>You can cancel your subscription at any time from your account. Cancellation takes effect at the end of your current billing period.</li>
              <li>We do not offer partial refunds for unused portions of a billing period.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Ratings and Reviews</h2>
            <p className="mt-2">
              After a job is completed, both Customers and Servicers can rate each other. Ratings should be honest and fair. We may remove reviews that contain hateful language, threats, or false information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">9. Your Responsibilities</h2>
            <p className="mt-2"><strong>As a Customer, you agree to:</strong></p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Make sure your barrels are accessible and in the location you described.</li>
              <li>Provide accurate address and barrel details.</li>
              <li>Not place hazardous or prohibited materials in your barrels.</li>
              <li>Treat Servicers with respect.</li>
            </ul>
            <p className="mt-3"><strong>As a Servicer, you agree to:</strong></p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Complete accepted jobs on time and as described.</li>
              <li>Handle barrels with care and return them to the correct location.</li>
              <li>Take a completion photo to confirm the job is done.</li>
              <li>Treat Customers and their property with respect.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">10. What We Are Not Responsible For</h2>
            <p className="mt-2">
              We do our best to provide a reliable service, but there are some things we can&apos;t guarantee:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>We are not responsible for damage to barrels that were already in poor condition.</li>
              <li>We are not responsible for missed trash pickups by your city or town.</li>
              <li>We are not responsible if a Servicer cannot access your barrels due to weather, blocked access, or safety concerns.</li>
              <li>Our app may have downtime for maintenance or technical issues. We&apos;ll try to keep this to a minimum.</li>
            </ul>
            <p className="mt-2">
              To the maximum extent allowed by Massachusetts law, atyors.com is not liable for indirect, incidental, or consequential damages arising from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">11. Privacy</h2>
            <p className="mt-2">
              We collect personal information like your name, email, phone number, and address to provide our service. We also collect location data from Servicers during active jobs for live tracking.
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>We will never sell your personal information to third parties.</li>
              <li>We use your data only to operate the service, communicate with you, and improve the app.</li>
              <li>Photos uploaded (barrel photos, completion photos, profile photos) are stored securely and only used for service purposes.</li>
              <li>You can request deletion of your account and data by contacting us.</li>
            </ul>
            <p className="mt-2">
              Our data practices comply with applicable Massachusetts privacy laws.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">12. Disputes</h2>
            <p className="mt-2">
              If you have a problem with a booking or a Servicer, contact us first and we&apos;ll try to help resolve it.
            </p>
            <p className="mt-2">
              If we can&apos;t resolve a dispute informally, you agree that any legal claim will be handled under the laws of the Commonwealth of Massachusetts, and any legal proceedings will take place in the courts of Suffolk County, Massachusetts.
            </p>
            <p className="mt-2">
              Nothing in these Terms limits your rights under the Massachusetts Consumer Protection Act (M.G.L. c. 93A).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">13. Ending Your Account</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>You can stop using the service and close your account at any time.</li>
              <li>If you have an active subscription, cancel it before closing your account to avoid future charges.</li>
              <li>We may close accounts that are inactive for more than 12 months.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">14. Contact Us</h2>
            <p className="mt-2">
              If you have questions about these Terms or need help with your account, reach out to us:
            </p>
            <div className="mt-2 rounded-xl bg-gray-50 p-4">
              <p className="font-medium text-gray-900">atyors.com</p>
              <p className="mt-1">Email: <a href="mailto:support@atyors.com" className="text-brand-600 hover:underline">support@atyors.com</a></p>
              <p>Boston, Massachusetts</p>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-5">
            <p className="text-xs text-gray-500">
              These Terms of Service are governed by the laws of the Commonwealth of Massachusetts. By using atyors.com, you acknowledge that you have read, understood, and agree to be bound by these Terms.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
