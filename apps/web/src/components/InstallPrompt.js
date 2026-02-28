'use client';

import { useEffect } from 'react';
import { useInstall } from './InstallContext';

export default function InstallPrompt() {
  const {
    canInstall,
    isIos,
    isStandalone,
    triggerInstall,
    showIosGuide,
    setShowIosGuide,
    dismissBanner,
    bannerDismissed,
  } = useInstall();

  useEffect(() => {
    if (isStandalone || bannerDismissed) return;
    if (sessionStorage.getItem('pwa-install-dismissed')) return;
    if (isIos) {
      const timer = setTimeout(() => setShowIosGuide(true), 3000);
      return () => clearTimeout(timer);
    }
  }, [isIos, isStandalone, bannerDismissed, setShowIosGuide]);

  if (bannerDismissed || isStandalone) return null;

  if (canInstall && !isIos) {
    return (
      <SmallCard onDismiss={dismissBanner}>
        <p className="mt-0.5 text-sm text-gray-500">Add to your home screen for quick access</p>
        <button
          onClick={triggerInstall}
          className="mt-3 w-full rounded-lg bg-brand-600 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-700"
        >
          Install App
        </button>
      </SmallCard>
    );
  }

  if (showIosGuide) {
    return <IosFullScreenGuide onDismiss={dismissBanner} />;
  }

  return null;
}

function SafariShareIcon({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 8.25H7.5a2.25 2.25 0 00-2.25 2.25v9a2.25 2.25 0 002.25 2.25h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25H15m0-3l-3-3m0 0l-3 3m3-3v11.25" />
    </svg>
  );
}

function IosFullScreenGuide({ onDismiss }) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col bg-black/60 backdrop-blur-sm animate-ios-overlay-in">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl animate-ios-card-in">
          <div className="flex flex-col items-center text-center">
            <img src="/icons/icon-192.png" alt="" className="h-20 w-20 rounded-2xl shadow-lg" />
            <h2 className="mt-4 text-xl font-bold text-gray-900">Install atyors</h2>
            <p className="mt-1 text-sm text-gray-500">Add to your home screen for one-tap access</p>
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">1</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Tap the Share button
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Look for <SafariShareIcon className="inline h-5 w-5 text-brand-600 align-text-bottom" /> at the bottom of Safari
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">2</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Tap &quot;Add to Home Screen&quot;
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Scroll down in the share menu if you don&apos;t see it right away
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl bg-gray-50 p-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">3</div>
              <div>
                <p className="text-sm font-semibold text-gray-900">
                  Tap &quot;Add&quot;
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  The app icon will appear on your home screen
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={onDismiss}
            className="mt-6 w-full rounded-xl bg-gray-100 py-3 text-sm font-semibold text-gray-600 transition hover:bg-gray-200 active:scale-[0.98]"
          >
            Maybe Later
          </button>
        </div>
      </div>

      <div className="pb-safe px-6 pb-4">
        <div className="flex items-center justify-center gap-2 animate-ios-arrow-bounce">
          <SafariShareIcon className="h-6 w-6 text-white" />
          <span className="text-sm font-medium text-white">Tap the Share button below</span>
        </div>
      </div>
    </div>
  );
}

function SmallCard({ children, onDismiss }) {
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
