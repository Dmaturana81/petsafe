// Notificaciones al celular.
//
// Con la app abierta, los avisos se muestran desde el propio dispositivo.
// Con la app cerrada llegan por Web Push: la función send-push de Supabase
// los envía a la suscripción que guarda cada celular (ver subscribePush).

import { isAlarm, alarmOptions, startAlarm } from './alarm.js';

export function notificationsSupported() {
  return 'Notification' in window && 'serviceWorker' in navigator;
}

export async function askPermission() {
  if (!notificationsSupported()) return 'unsupported';
  if (Notification.permission === 'default') return Notification.requestPermission();
  return Notification.permission;
}

export async function pushLocal(n) {
  const { id, title, body, url } = n;
  // "¡Encontraron a tu mascota!" con la app abierta: alarma en pantalla.
  if (isAlarm(n) && !document.hidden) startAlarm(n);
  if (!notificationsSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    // Mismo tag que el push: si el aviso ya llegó con la app cerrada, no se repite.
    const options = {
      body, tag: id, icon: 'icons/icon-192.png', badge: 'icons/icon-192.png', data: { url }, vibrate: [120, 60, 120],
      ...(isAlarm(n) ? alarmOptions : {}),
    };
    if (reg) await reg.showNotification(title, options);
    else new Notification(title, options);
    return true;
  } catch (err) {
    console.warn('No se pudo mostrar la notificación', err);
    return false;
  }
}

export function pushSupported() {
  return notificationsSupported() && 'PushManager' in window;
}

/**
 * Suscribe este celular a Web Push con la clave pública de la app. Devuelve
 * { endpoint, p256dh, auth } o null si no se puede (sin permiso, iPhone sin
 * instalar la app, navegador sin soporte).
 */
export async function subscribePush(publicKey) {
  if (!publicKey || !pushSupported() || Notification.permission !== 'granted') return null;
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  // Si la clave cambió, la suscripción anterior ya no sirve.
  if (sub && localStorage.getItem('petsafe-push-key') !== publicKey) {
    await sub.unsubscribe().catch(() => {});
    sub = null;
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: fromBase64Url(publicKey) });
  try { localStorage.setItem('petsafe-push-key', publicKey); } catch { /* sin almacenamiento */ }
  const { endpoint, keys } = sub.toJSON();
  return { endpoint, p256dh: keys.p256dh, auth: keys.auth };
}

/** Par de claves VAPID nuevo (P-256), en el formato que usa web-push. */
export async function generateVapidKeys() {
  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', pair.privateKey);
  const point = new Uint8Array([4, ...fromBase64Url(jwk.x), ...fromBase64Url(jwk.y)]);
  return { publicKey: toBase64Url(point), privateKey: jwk.d };
}

function fromBase64Url(s) {
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4);
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

function toBase64Url(bytes) {
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
