import { Capacitor } from '@capacitor/core';

let PushNotificationsPlugin = null;

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let listenersAttached = false;
let registered = false;
let lastError = null;
let permissionState = null;
let tokenValue = null;

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
    pluginLoaded: !!PushNotificationsPlugin,
  };
}

async function loadPlugin() {
  if (PushNotificationsPlugin) return PushNotificationsPlugin;
  try {
    const mod = await import('@capacitor/push-notifications');
    PushNotificationsPlugin = mod.PushNotifications;
    console.log('[Push] Plugin loaded successfully');
    return PushNotificationsPlugin;
  } catch (err) {
    console.error('[Push] Failed to load PushNotifications plugin:', err);
    lastError = `Plugin load failed: ${err.message}`;
    return null;
  }
}

export async function registerNativePush() {
  if (!isNativeApp()) {
    console.log('[Push] Not a native app, skipping');
    return;
  }

  console.log('[Push] Starting native push registration...');

  const PushNotifications = await loadPlugin();
  if (!PushNotifications) {
    lastError = 'Plugin not available';
    return;
  }

  if (!listenersAttached) {
    listenersAttached = true;

    try {
      await PushNotifications.removeAllListeners();
    } catch (e) {
      console.warn('[Push] removeAllListeners failed:', e.message);
    }

    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] APNs token received (' + token.value.substring(0, 16) + '...)');
      tokenValue = token.value;
      try {
        const { api } = await import('./api');
        await api.post('/push/device/register', {
          token: token.value,
          platform: Capacitor.getPlatform(),
        });
        registered = true;
        lastError = null;
        console.log('[Push] Device registered with server successfully');
      } catch (err) {
        lastError = `Server register failed: ${err.message}`;
        console.error('[Push] Failed to register device token with server:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      lastError = `APNs error: ${JSON.stringify(err)}`;
      console.error('[Push] APNs registration error:', JSON.stringify(err));
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Foreground notification:', notification.title, notification.body);
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
  }

  try {
    const checkResult = await PushNotifications.checkPermissions();
    console.log('[Push] Current permission:', checkResult.receive);
    permissionState = checkResult.receive;
  } catch (err) {
    console.warn('[Push] checkPermissions failed:', err.message);
  }

  try {
    const permResult = await PushNotifications.requestPermissions();
    permissionState = permResult.receive;
    console.log('[Push] Permission result:', permResult.receive);
    if (permResult.receive !== 'granted') {
      lastError = `Permission ${permResult.receive}`;
      console.warn('[Push] Permission not granted:', permResult.receive);
      return;
    }
  } catch (err) {
    lastError = `requestPermissions failed: ${err.message}`;
    console.error('[Push] requestPermissions failed:', err);
    return;
  }

  try {
    console.log('[Push] Calling PushNotifications.register()...');
    await PushNotifications.register();
    console.log('[Push] register() called successfully');
  } catch (err) {
    lastError = `register() failed: ${err.message}`;
    console.error('[Push] register() failed:', err);
  }
}
