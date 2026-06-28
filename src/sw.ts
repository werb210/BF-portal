/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches, matchPrecache } from "workbox-precaching";
import { registerRoute, NavigationRoute, setCatchHandler } from "workbox-routing";
import { NetworkFirst, StaleWhileRevalidate, CacheFirst } from "workbox-strategies";
import { ExpirationPlugin } from "workbox-expiration";
import { CacheableResponsePlugin } from "workbox-cacheable-response";

declare const self: ServiceWorkerGlobalScope;

const WB_MANIFEST_MARKER = "__WB_MANIFEST";

precacheAndRoute(self.__WB_MANIFEST || []);
cleanupOutdatedCaches();

// BF_PORTAL_SW_v710_NO_API_INTERCEPT - the SW must NEVER intercept /api/ calls.
// A prior NetworkFirst("/api/") route cached status-0 (opaque/failed) responses
// from the cross-origin API host; once a bad entry was cached it was replayed on
// every call, breaking the whole portal with net::ERR_FAILED while the server was
// healthy. install->skipWaiting + activate->clients.claim ensure this fixed SW
// takes over immediately, and we purge the poisoned runtime cache for any client
// still carrying it, so users self-heal on next load (no manual unregister).
self.addEventListener("install", () => {
  void self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    await caches.delete("bf-portal-api");
    await caches.delete("bf-portal-images");
    await self.clients.claim();
  })());
});

const navHandler = new NetworkFirst({
  cacheName: "bf-portal-navigations",
  networkTimeoutSeconds: 4,
  plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })]
});
registerRoute(new NavigationRoute(navHandler, {
  denylist: [/^\/api\//, /^\/_/, /\.\w+$/]
}));

// BF_PORTAL_SW_v710_NO_API_INTERCEPT - API requests bypass the SW entirely and
// always go straight to the network. They are authenticated + cross-origin and
// must never be cached or replayed.

// BF_PORTAL_SW_SAMEORIGIN_IMAGES_v1 - only cache SAME-ORIGIN images. Cross-origin images
// (email logo on server.boreal.financial, hero/marketing images on
// *.blob.core.windows.net) must bypass the SW and hit the network, exactly like
// /api/. A prior CacheFirst here cached a status-0 (failed) cross-origin logo
// response and replayed it as net::ERR_FAILED. Same-origin images are always 200,
// so status 0 is dropped from the cacheable list to prevent re-poisoning.
registerRoute(
  ({ request, url }) => request.destination === "image" && url.origin === self.location.origin,
  new CacheFirst({
    cacheName: "bf-portal-images",
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 30 })
    ]
  })
);

registerRoute(
  ({ request }) => request.destination === "font",
  new StaleWhileRevalidate({ cacheName: "bf-portal-fonts" })
);

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === WB_MANIFEST_MARKER) return;
});

self.addEventListener("push", (event) => {
  let payload: { title?: string; body?: string; url?: string; icon?: string; tag?: string } = {};
  try { payload = event.data ? event.data.json() : {}; }
  catch { payload = { title: "Boreal Portal", body: event.data ? event.data.text() : "" }; }
  const title = payload.title || "Boreal Portal";
  const options: NotificationOptions = {
    body: payload.body || "",
    icon: payload.icon || "/icons/icon-192x192.png",
    badge: "/icons/icon-96x96.png",
    tag: payload.tag,
    data: { url: payload.url || "/" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          (c as WindowClient).navigate(targetUrl).catch(() => {});
          return (c as WindowClient).focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});

self.addEventListener("sync", (event: any) => {
  if (event.tag === "bf-portal-bg-sync") {
    event.waitUntil(self.clients.matchAll().then((cs) => {
      cs.forEach((c) => c.postMessage({ type: "BG_SYNC_TRIGGER" }));
    }));
  }
});

// BF_PORTAL_SW_OFFLINE_FALLBACK_v1 - when an uncached document navigation fails
// (offline), serve the precached offline.html instead of the browser error page.
setCatchHandler(async ({ request }) => {
  if (request.destination === "document") {
    const cached = await matchPrecache("/offline.html");
    if (cached) return cached;
  }
  return Response.error();
});
