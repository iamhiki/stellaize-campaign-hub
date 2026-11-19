// 캠페인 허브 앱 알림 (11/19). Shows a push the server sent (app/api/chat → lib/server/push.ts) and opens the
// conversation when it is tapped. Nothing is cached here: the hub always loads fresh from the server.

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "캠페인 허브", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "새 메시지", {
      body: data.body || "",
      icon: "/icon-192.png",
      badge: "/icon-192.png",
      tag: data.tag, // a newer message in the same room replaces the older notification
      renotify: !!data.tag,
      data: { url: data.url || "/chat" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "/chat", self.location.origin).href;
  event.waitUntil(
    (async () => {
      const wins = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const hub = wins.find((w) => new URL(w.url).origin === self.location.origin);
      if (hub) {
        await hub.focus();
        return hub.navigate(url);
      }
      return self.clients.openWindow(url);
    })(),
  );
});
