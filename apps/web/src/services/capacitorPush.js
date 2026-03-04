import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

export function isNativeApp() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

let listenersAttached = false;
let registered = false;

export function isPushRegistered() {
  return registered;
}

export async function registerNativePush() {
  if (!isNativeApp()) {
    console.log('[Push] Not a native app, skipping');
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
      console.log('[Push] APNs token received (' + token.value.substring(0, 16) + '...)');
      try {
        await api.post('/push/device/register', {
          token: token.value,
          platform: Capacitor.getPlatform(),
        });
        registered = true;
        console.log('[Push] Device registered with server successfully');
      } catch (err) {
        console.error('[Push] Failed to register device token with server:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
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
    const permResult = await PushNotifications.requestPermissions();
    console.log('[Push] Permission result:', permResult.receive);
    if (permResult.receive !== 'granted') {
      console.warn('[Push] Permission not granted:', permResult.receive);
      return;
    }
  } catch (err) {
    console.error('[Push] requestPermissions failed:', err);
    return;
  }

  try {
    console.log('[Push] Calling PushNotifications.register()...');
    await PushNotifications.register();
    console.log('[Push] register() called successfully');
  } catch (err) {
    console.error('[Push] register() failed:', err);
  }
}
