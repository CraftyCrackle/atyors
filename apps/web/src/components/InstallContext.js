'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const InstallCtx = createContext({
  canInstall: false,
  isIos: false,
  isStandalone: false,
  triggerInstall: () => {},
  showIosGuide: false,
  setShowIosGuide: () => {},
  dismissBanner: () => {},
  bannerDismissed: false,
});

export function useInstall() {
  return useContext(InstallCtx);
}

function detectIos() {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  const isIosUA = /iphone|ipad|ipod/i.test(ua) && !window.MSStream;
  const isMacSafari = /Macintosh/i.test(ua) && navigator.maxTouchPoints > 1;
  return (isIosUA || isMacSafari) && !('beforeinstallprompt' in window);
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIos(detectIos());

    if (detectStandalone()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const triggerInstall = useCallback(async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setIsStandalone(true);
      }
      return outcome;
    }
    if (isIos) {
      setShowIosGuide(true);
      return 'ios-guide';
    }
    return null;
  }, [deferredPrompt, isIos]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    setShowIosGuide(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  return (
    <InstallCtx.Provider
      value={{
        canInstall: !!deferredPrompt || isIos,
        isIos,
        isStandalone,
        triggerInstall,
        showIosGuide,
        setShowIosGuide,
        dismissBanner,
        bannerDismissed,
      }}
    >
      {children}
    </InstallCtx.Provider>
  );
}
