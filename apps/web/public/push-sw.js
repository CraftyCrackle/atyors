self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'atyors', body: event.data.text() };
  }

  const isIOS = /iPhone|iPad|iPod/.test(self.navigator?.userAgent || '');

  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: payload.data || {},
    tag: payload.data?.type || 'default',
  };

  if (!isIOS) {
    options.vibrate = [200, 100, 200];
    options.renotify = true;
    options.requireInteraction = true;
    options.actions = [{ action: 'view', title: 'View' }];
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'atyors', options)
      .then(() => {
        if (self.navigator && self.navigator.setAppBadge) {
          return self.navigator.setAppBadge();
        }
      })
      .catch((err) => {
        console.error('[SW] showNotification failed:', err);
      })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (self.navigator && self.navigator.clearAppBadge) {
    self.navigator.clearAppBadge();
  }

  const url = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((c) => c.url.includes(url) && 'focus' in c);
      if (existing) return existing.focus();
      return self.clients.openWindow(url);
    })
  );
});
