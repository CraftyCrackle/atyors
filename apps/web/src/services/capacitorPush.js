import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

let listenersAttached = false;

export async function registerNativePush() {
  if (!isNativeApp()) return;

  if (!listenersAttached) {
    listenersAttached = true;

    await PushNotifications.removeAllListeners();

    await PushNotifications.addListener('registration', async (token) => {
      console.log('[Push] APNs token received, registering with server...');
      try {
        await api.post('/push/device/register', {
          token: token.value,
          platform: Capacitor.getPlatform(),
        });
        console.log('[Push] Device registered successfully');
      } catch (err) {
        console.error('[Push] Failed to register device token:', err);
      }
    });

    await PushNotifications.addListener('registrationError', (err) => {
      console.error('[Push] APNs registration failed:', err);
    });

    await PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('[Push] Notification received in foreground:', notification);
    });

    await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      const data = action.notification?.data;
      if (data?.url) {
        window.location.href = data.url;
      }
    });
  }

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') {
    console.warn('[Push] Permission not granted:', permResult.receive);
    return;
  }

  console.log('[Push] Permission granted, calling register()...');
  await PushNotifications.register();
}
