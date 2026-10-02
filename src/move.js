// Cambio de dirección (dominio propio, por ejemplo kiltrazo.cl).
//
// El celular guarda la sesión por dirección: sin esto, al pasar de
// andresmaturana-ui.github.io/petsafe a la nueva, todos entrarían "como nuevos"
// y no verían sus mascotas. Cuando GitHub Pages empieza a redirigir la
// dirección antigua, la app que ya estaba en el celular sigue abriendo ahí
// (desde el caché del service worker): detecta la redirección y lleva la
// sesión a la nueva dirección en el # (no viaja a ningún servidor). Allá se
// retoma la misma cuenta y se muestra #/mudanza una vez.

import { CLOUD, sessionToken, adoptSession } from './data.js';

const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;

/** En la dirección antigua: si ya se cambió, se va a la nueva con la sesión. */
export async function leaveIfMoved() {
  if (!/\.github\.io$/.test(location.hostname)) return;
  let res;
  try {
    // Con un parámetro propio no lo responde el caché: va a GitHub Pages, que
    // redirige a la nueva dirección si ya está el dominio.
    res = await fetch(`index.html?mudanza=${Date.now()}`, { cache: 'no-store' });
  } catch {
    return; // sin conexión
  }
  const to = new URL('./', res.url);
  if (!res.ok || to.origin === location.origin) return;
  const token = CLOUD ? await sessionToken() : '';
  // Los avisos de esta dirección dejan de llegar; en la nueva se activan de nuevo.
  const reg = await navigator.serviceWorker?.getRegistration().catch(() => null);
  await (await reg?.pushManager?.getSubscription().catch(() => null))?.unsubscribe().catch(() => {});
  const p = new URLSearchParams({ mudanza: token, ir: location.hash || '#/' });
  if (installed()) p.set('app', '1');
  location.replace(`${to.href}#${p}`);
}

/** En la nueva dirección: retoma la cuenta que venía. Antes de pedir la sesión. */
export async function arriveAfterMove() {
  const p = new URLSearchParams(location.hash.slice(1));
  if (!p.has('mudanza')) return;
  const to = p.get('ir') || '#/';
  history.replaceState(null, '', location.pathname + location.search + to);
  if (CLOUD && p.get('mudanza')) await adoptSession(p.get('mudanza')).catch((err) => console.warn('No se retomó la cuenta', err));
  // Kiltrazo Clínica sigue directo; en la app se explica el cambio una vez.
  if (/^#\/clinica(\/|$)/.test(to)) return;
  try { sessionStorage.setItem('kiltrazo-mudanza', JSON.stringify({ to, app: p.get('app') === '1' })); } catch { /* sin almacenamiento */ }
  history.replaceState(null, '', location.pathname + location.search + '#/mudanza');
}

/** Datos de la mudanza para #/mudanza: { to, app } o null. */
export function moveInfo() {
  try { return JSON.parse(sessionStorage.getItem('kiltrazo-mudanza')); } catch { return null; }
}
