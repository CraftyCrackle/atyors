'use client';

import { Suspense, useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Logo from '../../components/Logo';
import { api } from '../../services/api';
import { useAuthStore } from '../../stores/authStore';

const RESEND_COOLDOWN = 60;

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-600 border-t-transparent" /></div>}>
      <VerifyContent />
    </Suspense>
  );
}

function VerifyContent() {
  const router = useRouter();
  const params = useSearchParams();

  const userId = params.get('userId');
  const email = params.get('email');

  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [destination, setDestination] = useState('');
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);
  const setUser = useAuthStore((s) => s.updateUser);
  const sentRef = useRef(false);

  useEffect(() => {
    if (!userId) { router.replace('/signup'); return; }
    if (sentRef.current) return;
    sentRef.current = true;
    sendCode();
  }, [userId]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const sendCode = useCallback(async () => {
    setError('');
    setSending(true);
    try {
      const res = await api.post('/auth/send-verification', { userId, method: 'email' });
      setDestination(res.data.destination);
      setCodeSent(true);
      setCooldown(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }, [userId]);

  async function handleVerify() {
    const joined = code.join('');
    if (joined.length < 6) { setError('Please enter all 6 digits'); return; }
    setError('');
    setVerifying(true);
    try {
      const res = await api.post('/auth/verify', { userId, code: joined });
      localStorage.setItem('accessToken', res.data.accessToken);
      localStorage.setItem('refreshToken', res.data.refreshToken);
      setUser(res.data.user);
      const role = res.data.user?.role;
      router.push(['admin', 'superadmin'].includes(role) ? '/admin/dashboard' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setVerifying(false);
    }
  }

  function handleInput(i, value) {
    if (!/^\d?$/.test(value)) return;
    const next = [...code];
    next[i] = value;
    setCode(next);
    if (value && i < 5) inputRefs.current[i + 1]?.focus();
  }

  function handleKeyDown(i, e) {
    if (e.key === 'Backspace' && !code[i] && i > 0) {
      inputRefs.current[i - 1]?.focus();
    }
  }

  function handlePaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setCode(pasted.split(''));
      inputRefs.current[5]?.focus();
      e.preventDefault();
    }
  }

  if (!userId) return null;

  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-white px-6 pt-safe pb-safe">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 inline-block">
          <Logo size="lg" variant="full" />
        </Link>

        <h1 className="text-2xl font-bold">Check your email</h1>
        <p className="mt-1 text-sm text-gray-500">
          {codeSent
            ? `We sent a 6-digit code to ${destination || maskEmail(email)}`
            : 'Sending verification code...'}
        </p>

        {error && <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>}

        <div className="mt-8">
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {code.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={d}
                onChange={(e) => handleInput(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-14 w-12 rounded-xl border border-gray-200 text-center text-xl font-bold focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
            ))}
          </div>

          <button
            onClick={handleVerify}
            disabled={verifying || code.join('').length < 6}
            className="mt-6 w-full rounded-xl bg-brand-600 py-3.5 font-semibold text-white shadow-lg shadow-brand-600/30 transition hover:bg-brand-700 active:scale-[0.98] disabled:opacity-50"
          >
            {verifying ? 'Verifying...' : 'Verify'}
          </button>

          <div className="mt-4 text-center">
            <button
              onClick={sendCode}
              disabled={cooldown > 0 || sending}
              className="text-sm font-medium text-brand-600 disabled:text-gray-400"
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend Code'}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-sm text-gray-500">
          Wrong account? <Link href="/signup" className="font-medium text-brand-600">Sign up again</Link>
        </p>
      </div>
    </main>
  );
}

function maskEmail(email) {
  if (!email) return '';
  const [local, domain] = email.split('@');
  if (!local || !domain) return '****';
  const m = local[0] + '***' + (local.length > 1 ? local[local.length - 1] : '');
  return `${m}@${domain}`;
}
