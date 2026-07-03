/* Ronak Jewellers Firebase/Web Push service worker
   This file intentionally does not contain Firebase config keys.
   It registers safely and handles push notifications defensively. */

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch (err) {
    payload = {
      notification: {
        title: "Ronak Jewellers",
        body: event.data ? event.data.text() : "New notification from Ronak Jewellers",
      },
    };
  }

  const title =
    payload?.notification?.title ||
    payload?.data?.title ||
    "Ronak Jewellers";

  const options = {
    body:
      payload?.notification?.body ||
      payload?.data?.body ||
      "New notification from Ronak Jewellers",
    icon: payload?.notification?.icon || "/logo.png",
    badge: "/logo.png",
    data: {
      url: payload?.data?.url || "/",
      ...(payload?.data || {}),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = event.notification?.data?.url || "/";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            return;
          }
        }

        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
