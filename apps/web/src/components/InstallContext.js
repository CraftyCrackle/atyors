'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

import { getAppStoreUrl } from './AppStoreBadge';

const InstallCtx = createContext({
  canInstall: false,
  isIos: false,
  isAndroid: false,
  isStandalone: false,
  hasAppStore: false,
  triggerInstall: () => {},
  showIosGuide: false,
  setShowIosGuide: () => {},
  showAndroidGuide: false,
  setShowAndroidGuide: () => {},
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

function detectAndroid() {
  if (typeof window === 'undefined') return false;
  return /android/i.test(navigator.userAgent);
}

function detectStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.Capacitor?.isNativePlatform?.()) return true;
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true
  );
}

export default function InstallProvider({ children }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isIos, setIsIos] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [showAndroidGuide, setShowAndroidGuide] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  useEffect(() => {
    setIsStandalone(detectStandalone());
    setIsIos(detectIos());
    setIsAndroid(detectAndroid());

    if (detectStandalone()) return;

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const canInstall = !isStandalone && (!!deferredPrompt || isIos || isAndroid);

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
    if (isAndroid) {
      setShowAndroidGuide(true);
      return 'android-guide';
    }
    return null;
  }, [deferredPrompt, isIos, isAndroid]);

  const dismissBanner = useCallback(() => {
    setBannerDismissed(true);
    setShowIosGuide(false);
    setShowAndroidGuide(false);
    sessionStorage.setItem('pwa-install-dismissed', '1');
  }, []);

  return (
    <InstallCtx.Provider
      value={{
        canInstall,
        isIos,
        isAndroid,
        isStandalone,
        hasAppStore: !!getAppStoreUrl(),
        triggerInstall,
        showIosGuide,
        setShowIosGuide,
        showAndroidGuide,
        setShowAndroidGuide,
        dismissBanner,
        bannerDismissed,
      }}
    >
      {children}
    </InstallCtx.Provider>
  );
}
