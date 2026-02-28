import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

export async function registerNativePush(onToken) {
  if (!isNativeApp()) return;

  const permResult = await PushNotifications.requestPermissions();
  if (permResult.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', (token) => {
    if (onToken) onToken(token.value);
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
