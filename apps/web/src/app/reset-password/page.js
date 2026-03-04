'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { api } from '../../services/api';

function ResetForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!token) {
    return (
      <div>
        <h1 className="text-2xl font-bold">Invalid link</h1>
        <p className="mt-2 text-sm text-gray-500">This reset link is missing or malformed.</p>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm font-medium text-brand-600">
          Request a new reset link
        </Link>
      </div>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    }
    setSubmitting(false);
  }

  if (success) {
    return (
      <div>
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
          <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h1 className="mt-4 text-2xl font-bold">Password updated</h1>
        <p className="mt-2 text-sm text-gray-500">Your password has been reset. You can now sign in with your new password.</p>
        <Link href="/login"
          className="mt-6 flex w-full items-center justify-center rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98]">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold">Set a new password</h1>
      <p className="mt-1 text-sm text-gray-500">Enter your new password below.</p>

      {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          autoFocus
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <input
          type="password"
          placeholder="Confirm new password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          minLength={8}
          className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
        />
        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
        >
          {submitting ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen-safe flex-col items-center justify-center bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="sm" variant="full" />
        </Link>
        <Suspense fallback={<div className="text-sm text-gray-400">Loading...</div>}>
          <ResetForm />
        </Suspense>
      </div>
    </main>
  );
}
