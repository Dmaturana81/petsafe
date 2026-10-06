// Service Worker: funciona sin conexión y muestra notificaciones.
import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// Motor de reconocimiento (ONNX Runtime) y teselas del mapa. Los modelos los
// guarda biometrics.js en su propio caché (petsafe-models).
registerRoute(
  ({ url }) => url.host === 'cdn.jsdelivr.net' && /@huggingface\/transformers@|onnxruntime-web@/.test(url.pathname),
  new CacheFirst({ cacheName: 'model', plugins: [new ExpirationPlugin({ maxEntries: 20 })] }),
);
// Detector de cabezas propio: se usa guardado y se actualiza en segundo plano
// cuando se publica uno nuevo.
registerRoute(
  ({ url }) => url.origin === self.location.origin && url.pathname.endsWith('/models/pet-head.onnx'),
  new StaleWhileRevalidate({ cacheName: 'head-model' }),
);
registerRoute(
  ({ url }) => url.host.endsWith('tile.openstreetmap.org'),
  new CacheFirst({ cacheName: 'tiles', plugins: [new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * 86400 })] }),
);

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

// Web Push de la función send-push: { id, title, body, url }.
// "¡Encontraron a tu mascota!" (url #/encontrada/…) llega como alarma: queda
// en pantalla hasta tocarla y vibra largo. Si la app está abierta, además
// suena la sirena (ver alarm.js).
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const alarm = /#\/encontrada\//.test(data.url || '');
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(data.title || 'Kiltrazo', {
        body: data.body,
        tag: data.id, // la app usa el mismo tag: no se repite al abrirla
        icon: 'icons/icon-192.png',
        badge: 'icons/icon-192.png',
        data: { url: data.url || '#/avisos' },
        ...(alarm ? { requireInteraction: true, renotify: true, vibrate: [800, 300, 800, 300, 1500], silent: false } : {}),
      });
      if (!alarm) return;
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      windows.forEach((w) => w.postMessage({ type: 'alarm', notification: data }));
    })(),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '#/avisos';
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      if (windows.length) {
        windows[0].postMessage({ type: 'navigate', url });
        return windows[0].focus();
      }
      return self.clients.openWindow(new URL(url, self.registration.scope).href);
    })(),
  );
});
