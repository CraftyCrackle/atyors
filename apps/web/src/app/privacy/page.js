'use client';

import Link from 'next/link';

export default function PrivacyPolicy() {
  return (
    <div className="min-h-[100dvh] bg-white">
      <div className="mx-auto max-w-2xl px-6 py-12">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          Back
        </Link>

        <img src="/icons/favicon-48x48.png" alt="atyors" className="mb-4 h-10 w-10" />
        <h1 className="text-3xl font-extrabold text-gray-900">Privacy Policy</h1>
        <p className="mt-2 text-sm text-gray-500">Last updated: March 6, 2026</p>

        <div className="mt-8 space-y-8 text-[15px] leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-bold text-gray-900">1. Who We Are</h2>
            <p className="mt-2">
              atyors ("At Your Service") is a curbside services platform operated in the Boston, Massachusetts area. 
              This policy explains how we collect, use, and protect your personal information when you use our website 
              at atyors.com and our mobile application.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">2. Information We Collect</h2>
            <p className="mt-2"><strong>Account information:</strong> When you create an account, we collect your name, email address, and phone number.</p>
            <p className="mt-2"><strong>Service addresses:</strong> We collect the street addresses where you want services performed, along with any instructions or photos you provide to help servicers complete the job.</p>
            <p className="mt-2"><strong>Payment information:</strong> Credit card details are collected and processed securely by Stripe, our payment processor. We do not store your full card number on our servers.</p>
            <p className="mt-2"><strong>Location data:</strong> With your permission, we collect location data from servicers during active service routes to provide live tracking to customers. Location data is only collected while a servicer is actively completing a route.</p>
            <p className="mt-2"><strong>Device information:</strong> If you use our mobile app, we may collect device tokens for push notifications and basic device information to deliver notifications about your service status.</p>
            <p className="mt-2"><strong>Photos:</strong> Servicers may take completion photos to confirm service was performed. Customers may upload photos of their barrel locations to assist servicers.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">3. How We Use Your Information</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>To create and manage your account</li>
              <li>To schedule, assign, and fulfill curbside services</li>
              <li>To process payments and issue refunds</li>
              <li>To provide live tracking of your servicer during active jobs</li>
              <li>To send you notifications about booking status, service updates, and account activity</li>
              <li>To send password reset emails when requested</li>
              <li>To improve our services and fix issues</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">4. How We Share Your Information</h2>
            <p className="mt-2">We do not sell your personal information. We share data only as needed to provide our services:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li><strong>Servicers</strong> receive your service address, barrel details, photos, and instructions so they can complete your job.</li>
              <li><strong>Stripe</strong> processes your payments securely.</li>
              <li><strong>Amazon Web Services (AWS)</strong> hosts our infrastructure, including email delivery via SES.</li>
              <li><strong>Apple Push Notification service (APNs)</strong> delivers mobile notifications.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">5. Data Security</h2>
            <p className="mt-2">
              We take reasonable measures to protect your information, including encrypted connections (HTTPS), 
              secure password hashing, account lockout after repeated failed login attempts, and storing sensitive 
              credentials in AWS Systems Manager Parameter Store rather than in code.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">6. Data Retention</h2>
            <p className="mt-2">
              We retain your account information and service history for as long as your account is active. 
              If you delete your account, we will remove your personal information within 30 days, except where 
              we are required to keep records for legal or financial purposes (such as payment transaction records).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">7. Your Rights</h2>
            <p className="mt-2">You can:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>View and update your profile information at any time</li>
              <li>Delete your service addresses</li>
              <li>Remove your saved payment methods</li>
              <li>Request deletion of your account by contacting us</li>
              <li>Opt out of push notifications through your device settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">8. Children</h2>
            <p className="mt-2">
              Our services are not intended for children under 18. We do not knowingly collect personal 
              information from children.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">9. Changes to This Policy</h2>
            <p className="mt-2">
              We may update this privacy policy from time to time. If we make significant changes, we will 
              notify you through the app or by email.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-gray-900">10. Contact Us</h2>
            <p className="mt-2">
              If you have questions about this privacy policy or your data, contact us at{' '}
              <a href="mailto:atyors.support@gmail.com" className="text-brand-600 hover:underline">atyors.support@gmail.com</a>.
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
