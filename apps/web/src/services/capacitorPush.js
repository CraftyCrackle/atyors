'use client';

let Capacitor = null;
let PushNotifications = null;
let initPromise = null;

let listenersAttached = false;
let registered = false;
let lastError = null;
let permissionState = null;
let tokenValue = null;

async function initCapacitor() {
  if (initPromise) return initPromise;
  initPromise = (async () => {
    try {
      const core = await import('@capacitor/core');
      Capacitor = core.Capacitor;
    } catch (err) {
      lastError = `Capacitor core load failed: ${err.message}`;
    }
    try {
      const push = await import('@capacitor/push-notifications');
      PushNotifications = push.PushNotifications;
    } catch (err) {
      lastError = `Push plugin load failed: ${err.message}`;
    }
  })();
  return initPromise;
}

export function isNativeApp() {
  try {
    if (typeof window !== 'undefined' && window.Capacitor?.isNativePlatform) {
      return window.Capacitor.isNativePlatform();
    }
    return Capacitor?.isNativePlatform?.() ?? false;
  } catch {
    return false;
  }
}

export function isPushRegistered() {
  return registered;
}

export function getPushDiagnostics() {
  return {
    isNative: isNativeApp(),
    registered,
    permissionState,
    lastError,
    hasToken: !!tokenValue,
    pluginLoaded: !!PushNotifications,
    capacitorLoaded: !!Capacitor,
  };
}

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export async function registerNativePush() {
  await initCapacitor();

  if (!isNativeApp()) {
    console.log('[Push] Not a native app, skipping');
    return;
  }

  if (!PushNotifications) {
    lastError = lastError || 'PushNotifications plugin not available';
    console.error('[Push]', lastError);
    return;
  }

  console.log('[Push] Starting native push registration...');

  if (!listenersAttached) {
    listenersAttached = true;

    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.warn('[Push] removeAllListeners failed:', e.message);
    }

    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] APNs token received:', token.value.substring(0, 20) + '...');
      tokenValue = token.value;
      try {
        const { api } = await import('./api');
        const platform = Capacitor.getPlatform();
        await api.post('/push/device/register', { token: token.value, platform });
        registered = true;
        lastError = null;
        console.log('[Push] Device registered with server OK');
      } catch (err) {
        lastError = `Server register failed: ${err.message}`;
        console.error('[Push] Failed to register device token:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      lastError = `APNs registration error: ${JSON.stringify(err)}`;
      console.error('[Push] APNs registration error:', JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Foreground notification:', notification.title, notification.body);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('native-push', { detail: notification }));
      }
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      console.log('[Push] Notification tapped:', action.notification?.data);
      const data = action.notification?.data;
      if (data?.url) {
        window.location.href = data.url;
      } else if (data?.bookingId) {
        window.location.href = `/tracking/${data.bookingId}`;
      }
    });

    console.log('[Push] Listeners attached');
  }

  try {
    const checkResult = await withTimeout(
      PushNotifications.checkPermissions(),
      5000,
      'checkPermissions'
    );
    permissionState = checkResult.receive;
    console.log('[Push] Current permission:', checkResult.receive);
  } catch (err) {
    console.warn('[Push] checkPermissions failed:', err.message);
    lastError = `checkPermissions: ${err.message}`;
  }

  try {
    const permResult = await withTimeout(
      PushNotifications.requestPermissions(),
      10000,
      'requestPermissions'
    );
    permissionState = permResult.receive;
    console.log('[Push] Permission result:', permResult.receive);
    if (permResult.receive !== 'granted') {
      lastError = `Permission ${permResult.receive}`;
      console.warn('[Push] Permission not granted:', permResult.receive);
      return;
    }
  } catch (err) {
    lastError = `requestPermissions: ${err.message}`;
    console.error('[Push] requestPermissions failed:', err);
    return;
  }

  try {
    console.log('[Push] Calling register()...');
    await withTimeout(PushNotifications.register(), 10000, 'register');
    console.log('[Push] register() completed');
  } catch (err) {
    lastError = `register: ${err.message}`;
    console.error('[Push] register() failed:', err);
  }
}

export async function clearNativeBadge() {
  await initCapacitor();
  if (!PushNotifications || !isNativeApp()) return;
  try {
    await PushNotifications.removeAllDeliveredNotifications();
  } catch {}
}
