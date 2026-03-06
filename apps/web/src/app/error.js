'use client';

export default function ErrorPage({ error, reset }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-gray-50 px-6 text-center">
      <img src="/icons/favicon-48x48.png" alt="atyors" className="mb-6 h-12 w-12" />
      <h1 className="text-4xl font-extrabold text-gray-900">Something went wrong</h1>
      <p className="mt-3 text-sm text-gray-500">
        {error?.message || 'An unexpected error occurred. Please try again.'}
      </p>
      <button
        onClick={() => reset()}
        className="mt-8 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
      >
        Try Again
      </button>
    </div>
  );
}
