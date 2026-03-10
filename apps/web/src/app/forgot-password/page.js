'use client';

import { useState } from 'react';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { api } from '../../services/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSubmitted(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="lg" variant="full" />
        </Link>

        {submitted ? (
          <div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="mt-4 text-2xl font-bold">Check your email</h1>
            <p className="mt-2 text-sm text-gray-500">
              If an account exists for <span className="font-medium text-gray-700">{email}</span>, we sent a link to reset your password. It expires in 1 hour.
            </p>
            <p className="mt-4 text-sm text-gray-400">
              Didn't get it? Check your spam folder or try again.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button onClick={() => { setSubmitted(false); setEmail(''); }}
                className="w-full rounded-xl border border-gray-200 px-8 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 active:scale-[0.98]">
                Try a different email
              </button>
              <Link href="/login" className="text-center text-sm font-medium text-brand-600">
                Back to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <div>
            <h1 className="text-2xl font-bold">Reset your password</h1>
            <p className="mt-1 text-sm text-gray-500">
              Enter the email address on your account and we'll send you a link to reset your password.
            </p>

            {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <input
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              Remember your password? <Link href="/login" className="font-medium text-brand-600">Sign in</Link>
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
