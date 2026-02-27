'use client';
import { useState, useEffect, useCallback } from 'react';

function isRealIos() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIosUA = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  const isMacSafari = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return (isIosUA || isMacSafari) && !('beforeinstallprompt' in window);
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

function Card({ children, onDismiss }) {
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="rounded-2xl border border-brand-200 bg-white p-4 shadow-xl">
        <div className="flex items-start gap-3">
          <img src="/icons/icon-192.png" alt="" className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between">
              <p className="font-semibold text-gray-900">Install atyors</p>
              <button onClick={onDismiss} className="shrink-0 text-gray-400 hover:text-gray-600 ml-2">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isStandalone()) return;
    if (sessionStorage.getItem('pwa-install-dismissed')) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);

    if (isRealIos()) {
      const timer = setTimeout(() => setShowIosGuide(true), 3000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', handler);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setDeferredPrompt(null);
    dismiss();
  }, [deferredPrompt]);

  const dismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    setShowIosGuide(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  };

  if (dismissed || isStandalone()) return null;

  if (deferredPrompt) {
    return (
      <Card onDismiss={dismiss}>
        <p className="mt-0.5 text-sm text-gray-500">Add to your home screen for quick access</p>
        <button
          onClick={handleInstall}
          className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Install App
        </button>
      </Card>
    );
  }

  if (showIosGuide) {
    return (
      <Card onDismiss={dismiss}>
        <p className="mt-0.5 text-sm text-gray-500">Add to your home screen for quick access</p>
        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">1</span>
            <span>
              Tap{' '}
              <svg className="inline h-4 w-4 text-brand-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
              </svg>{' '}
              <strong>Share</strong>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">2</span>
            <span>Tap <strong>Add to Home Screen</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-600">3</span>
            <span>Tap <strong>Add</strong></span>
          </div>
        </div>
      </Card>
    );
  }

  return null;
}
