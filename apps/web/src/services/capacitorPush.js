import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { api } from './api';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function registerNativePush() {
  if (!isNativeApp()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async (token) => {
    try {
      await api.post('/push/device/register', {
        token: token.value,
        platform: Capacitor.getPlatform(),
      });
    } catch (err) {
      console.error('Failed to register device token:', err);
    }
  });

  PushNotifications.addListener('registrationError', (err) => {
    console.error('Native push registration failed:', err);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received in foreground:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    const data = action.notification?.data;
    if (data?.url) {
      window.location.href = data.url;
    }
  });
}
