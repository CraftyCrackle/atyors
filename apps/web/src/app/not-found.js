'use client';

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <img src="/icons/favicon-48x48.png" alt="atyors" className="mb-6 h-12 w-12" />
      <h1 className="text-6xl font-extrabold text-gray-900">404</h1>
      <p className="mt-3 text-lg text-gray-500">Page not found</p>
      <p className="mt-1 text-sm text-gray-400">The page you're looking for doesn't exist or has been moved.</p>
      <Link
        href="/dashboard"
        className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
