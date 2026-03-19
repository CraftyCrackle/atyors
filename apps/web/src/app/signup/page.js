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
        } catch (addrErr) {
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('atyors_address_save_failed', '1');
          }
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
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="lg" variant="full" />
        </Link>

        <h1 className="text-2xl font-bold">Create Account</h1>
        <p className="mt-1 text-sm text-gray-500">Start scheduling your curbside services</p>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="flex gap-3">
            <input type="text" placeholder="First name" value={form.firstName} onChange={update('firstName')} required className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <input type="text" placeholder="Last name" value={form.lastName} onChange={update('lastName')} required className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          </div>
          <input type="email" placeholder="Email address" value={form.email} onChange={update('email')} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <input type="tel" placeholder="Phone number (optional)" value={form.phone} onChange={update('phone')} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-gray-700">Home address <span className="font-normal text-gray-500">(optional — we need it to schedule service)</span></p>
            <input type="text" placeholder="Street address" value={form.street} onChange={update('street')} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <input type="text" placeholder="Unit, apt, etc. (optional)" value={form.unit} onChange={update('unit')} className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            <div className="grid grid-cols-3 gap-2">
              <input type="text" placeholder="City" value={form.city} onChange={update('city')} className="col-span-1 rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              <input type="text" placeholder="State" value={form.state} onChange={update('state')} className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
              <input type="text" placeholder="ZIP" value={form.zip} onChange={update('zip')} className="rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
            </div>
          </div>

          <input type="password" placeholder="Password" value={form.password} onChange={update('password')} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
          <input type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={update('confirmPassword')} required className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
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
