'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../stores/authStore';
import Logo from '../../components/Logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const login = useAuthStore((s) => s.login);
  const router = useRouter();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const data = await login(email, password);
      if (data.pendingVerification) {
        const qs = new URLSearchParams({ userId: data.userId });
        if (data.email) qs.set('email', data.email);
        router.push(`/verify?${qs.toString()}`);
        return;
      }
      const role = data.user?.role;
      if (['admin', 'superadmin'].includes(role)) router.push('/admin/dashboard');
      else if (role === 'servicer') router.push('/servicer/dashboard');
      else router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="lg" variant="full" />
        </Link>

        <h1 className="text-2xl font-bold">Welcome Back</h1>
        <p className="mt-1 text-sm text-gray-500">Sign in to your account</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <input type="email" placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
            {submitting ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm">
          <Link href="/forgot-password" className="font-medium text-gray-500 hover:text-gray-700">Forgot your password?</Link>
        </p>
        <p className="mt-3 text-center text-sm text-gray-500">
          Don&apos;t have an account? <Link href="/signup" className="font-medium text-brand-600">Sign up</Link>
        </p>
      </div>
    </main>
  );
}
