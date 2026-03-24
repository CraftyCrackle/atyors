'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../stores/authStore';
import Logo from '../../components/Logo';
import { api } from '../../services/api';

const INITIAL_FORM = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  confirmPassword: '',
  street: '',
  unit: '',
  city: '',
  state: '',
  zip: '',
};

export default function SignupPage() {
  const [form, setForm] = useState(INITIAL_FORM);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const register = useAuthStore((s) => s.register);
  const router = useRouter();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const hasAnyAddress = [form.street, form.city, form.state, form.zip].some(Boolean);
  const hasFullAddress = form.street?.trim() && form.city?.trim() && form.state?.trim() && form.zip?.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (!agreedToTerms) { setError('You must agree to the Terms of Service to create an account.'); return; }
    if (form.password !== form.confirmPassword) { setError('Passwords do not match'); return; }
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return; }
    if (hasAnyAddress && !hasFullAddress) {
      setError('Please enter a complete address (street, city, state, and ZIP).');
      return;
    }
    setSubmitting(true);
    try {
      const data = await register({ firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone, password: form.password });
      if (data.pendingVerification) {
        if (hasFullAddress && typeof window !== 'undefined') {
          sessionStorage.setItem('atyors_pending_address', JSON.stringify({
            street: form.street.trim(),
            unit: form.unit?.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
            isDefault: true,
          }));
        }
        const qs = new URLSearchParams({ userId: data.userId, email: data.email });
        router.push(`/verify?${qs.toString()}`);
        return;
      }
      if (hasFullAddress) {
        try {
          await api.post('/addresses', {
            street: form.street.trim(),
            unit: form.unit?.trim() || undefined,
            city: form.city.trim(),
            state: form.state.trim(),
            zip: form.zip.trim(),
            isDefault: true,
          });
        } catch {
          // Address save failed silently — user can add from profile
        }
      }
      const role = data.user?.role;
      if (['admin', 'superadmin'].includes(role)) router.push('/admin/dashboard');
      else router.push('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main id="main-content" className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="lg" variant="full" />
        </Link>

        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-1 text-sm text-gray-500">Start scheduling your curbside services</p>

        {error && (
          <div role="alert" aria-live="assertive" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4 overflow-x-hidden">
          <div className="grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="signup-first-name" className="sr-only">First name</label>
              <input id="signup-first-name" type="text" placeholder="First name" value={form.firstName} onChange={update('firstName')} required autoComplete="given-name" className="w-full min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="min-w-0">
              <label htmlFor="signup-last-name" className="sr-only">Last name</label>
              <input id="signup-last-name" type="text" placeholder="Last name" value={form.lastName} onChange={update('lastName')} required autoComplete="family-name" className="w-full min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
          </div>
          <div>
            <label htmlFor="signup-email" className="sr-only">Email address</label>
            <input id="signup-email" type="email" placeholder="Email address" value={form.email} onChange={update('email')} required autoComplete="email" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <div>
            <label htmlFor="signup-phone" className="sr-only">Phone number (optional)</label>
            <input id="signup-phone" type="tel" placeholder="Phone number (optional)" value={form.phone} onChange={update('phone')} autoComplete="tel" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-gray-700">Home address <span className="font-normal text-gray-500">(optional — we need it to schedule service)</span></p>
            <div>
              <label htmlFor="signup-street" className="sr-only">Street address</label>
              <input id="signup-street" type="text" placeholder="Street address" value={form.street} onChange={update('street')} autoComplete="street-address" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div>
              <label htmlFor="signup-unit" className="sr-only">Unit, apartment, etc. (optional)</label>
              <input id="signup-unit" type="text" placeholder="Unit, apt, etc. (optional)" value={form.unit} onChange={update('unit')} autoComplete="address-line2" className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1 min-w-0">
                <label htmlFor="signup-city" className="sr-only">City</label>
                <input id="signup-city" type="text" placeholder="City" value={form.city} onChange={update('city')} autoComplete="address-level2" className="w-full min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div className="min-w-0">
                <label htmlFor="signup-state" className="sr-only">State</label>
                <input id="signup-state" type="text" placeholder="State" value={form.state} onChange={update('state')} autoComplete="address-level1" className="w-full min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
              <div className="min-w-0">
                <label htmlFor="signup-zip" className="sr-only">ZIP code</label>
                <input id="signup-zip" type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} autoComplete="postal-code" className="w-full min-w-0 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              </div>
            </div>
          </div>

          <div className="relative">
            <label htmlFor="signup-password" className="sr-only">Password</label>
            <input id="signup-password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={form.password} onChange={update('password')} required autoComplete="new-password" className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showPassword ? 'Hide password' : 'Show password'}>
              {showPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          <div className="relative">
            <label htmlFor="signup-confirm-password" className="sr-only">Confirm password</label>
            <input id="signup-confirm-password" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm password" value={form.confirmPassword} onChange={update('confirmPassword')} required autoComplete="new-password" className="w-full rounded-xl border border-gray-200 px-4 py-3 pr-11 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <button type="button" onClick={() => setShowConfirmPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600" aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}>
              {showConfirmPassword ? (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" checked={agreedToTerms} onChange={(e) => setAgreedToTerms(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500" />
            <span className="text-xs text-gray-500 leading-relaxed">
              I have read and agree to the{' '}
              <Link href="/terms" target="_blank" className="font-medium text-brand-600 underline hover:text-brand-700">
                Terms of Service
              </Link>
            </span>
          </label>
          <button type="submit" disabled={submitting || !agreedToTerms} className="w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50">
            {submitting ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account? <Link href="/login" className="font-medium text-brand-600">Sign in</Link>
        </p>
      </div>
    </main>
  );
}
