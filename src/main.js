import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { currentUser, myNotifications, deliverPending, enablePush, finishEmailLink } from './data.js';
import { esc, isComplete } from './ui.js';
import { unlockAudio, startAlarm, checkAlarms } from './alarm.js';
import { refreshArea } from './nearby.js';
import './install.js';

import home from './views/home.js';
import profile from './views/profile.js';
import register from './views/register.js';
import lost from './views/lost.js';
import lostAlert from './views/lost-alert.js';
import found from './views/found.js';
import match from './views/match.js';
import recovered from './views/recovered.js';
import saveAccount from './views/save-account.js';
import success from './views/success.js';
import inbox from './views/inbox.js';
import admin from './views/admin.js';
import password from './views/password.js';
import privacy from './views/privacy.js';
import terms from './views/terms.js';
import receive, { pendingTransfer, TRANSFER_KEY } from './views/receive.js';
import clinicsMap from './views/clinics-map.js';
import appointment from './views/appointment.js';
import clinicPage from './views/clinic-page.js';
import finder from './views/finder.js';
import landing from './views/landing.js';

registerSW({ immediate: true });

// Si publicamos una versión nueva mientras alguien tenía Kiltrazo abierto, sus
// archivos viejos ya no existen ("Failed to fetch dynamically imported
// module"). Se recarga sola una vez para traer la versión nueva.
const STALE = /dynamically imported module|Importing a module script failed|Unable to preload/i;
function reloadIfStale(err) {
  if (!STALE.test(String(err?.message || err))) return false;
  try {
    if (Date.now() - Number(sessionStorage.getItem('kiltrazo-recarga') || 0) < 30000) return false;
    sessionStorage.setItem('kiltrazo-recarga', String(Date.now()));
  } catch {
    return false;
  }
  location.reload();
  return true;
}
const oops = (err) => (STALE.test(String(err?.message))
  ? '<div class="card"><h2>Hay una versión nueva de Kiltrazo</h2><p>Recarga la página para seguir.</p><button class="btn primary" onclick="location.reload()">Recargar</button></div>'
  : `<div class="card"><h2>Ups…</h2><p>${esc(err.message)}</p></div>`);
window.addEventListener('vite:preloadError', (e) => { if (reloadIfStale(e.payload)) e.preventDefault(); });
window.addEventListener('unhandledrejection', (e) => reloadIfStale(e.reason));

// Enlace corto de la página de una clínica (…/?c=nombre, el que apunta su dominio .cl).
const shortSlug = new URLSearchParams(location.search).get('c');
if (shortSlug && (!location.hash || location.hash === '#/')) {
  history.replaceState(null, '', `${location.pathname}#/c/${encodeURIComponent(shortSlug)}`);
}

const routes = [
  ['', home],
  ['perfil', profile],
  ['registrar', register],
  ['perdi', lost],
  ['encontre', found],
  ['perdida/:id', lostAlert],
  ['encontrada/:id', match],
  ['recuperada', recovered],
  ['caso/:id', success],
  ['avisos', inbox],
  ['admin', admin],
  ['clave', password],
  ['guardar', saveAccount],
  ['privacidad', privacy],
  ['terminos', terms],
  ['recibir/:code', receive],
  ['clinicas', clinicsMap],
  ['hora/:id', appointment],
  ['veterinarios', finder],
  ['kiltrazo', landing],
  ['c/:slug', clinicPage],
  ['c/:slug/:step', clinicPage],
];

function resolve(hash) {
  const path = hash.replace(/^#\/?/, '');
  for (const [pattern, view] of routes) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    const m = path.match(re);
    if (m) return { view, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return { view: home, params: {} };
}

const app = document.getElementById('app');

app.innerHTML = `
  <header class="topbar">
    <a href="#/" class="brand"><img src="brand/kiltrazo.svg" alt="Kiltrazo" class="brand-logo"></a>
    <a href="#/avisos" class="bell" aria-label="Avisos">🔔<span class="badge" hidden></span></a>
  </header>
  <main id="view"></main>
  <nav class="tabbar">
    <a href="#/" data-tab="">🏠<span>Inicio</span></a>
    <a href="#/registrar" data-tab="registrar">🐶<span>Registrar</span></a>
    <a href="#/avisos" data-tab="avisos">🔔<span>Avisos</span></a>
    <a href="#/perfil" data-tab="perfil">🙂<span>Perfil</span></a>
  </nav>`;

const viewEl = document.getElementById('view');

let pushTried = false;

async function render() {
  const user = await currentUser();
  // Una vez por visita: renueva la suscripción push de este celular.
  if (user && !pushTried) {
    pushTried = true;
    enablePush().catch((err) => console.warn('Push no disponible', err));
    refreshArea(user).catch((err) => console.warn('Zona no actualizada', err));
  }
  const hash = location.hash || '#/';
  // Kiltrazo Clínica (para veterinarias): se carga aparte, con su propio menú.
  const clinic = /^#\/clinica(\/|$)/.test(hash);
  document.body.classList.toggle('clinic-mode', clinic);
  if (clinic) return renderClinic(hash);
  let { view, params } = resolve(hash);
  // En el computador el administrador usa todo el ancho de la pantalla.
  document.body.classList.toggle('admin-mode', view === admin);
  // Ficha enviada por la veterinaria a alguien sin perfil: se retoma al terminarlo.
  if (view === receive && !isComplete(user)) {
    try { localStorage.setItem(TRANSFER_KEY, JSON.stringify({ code: params.code, waiting: true })); } catch { /* sin almacenamiento */ }
  }
  const later = pendingTransfer();
  if (later?.waiting && isComplete(user) && view === home) {
    location.hash = `#/recibir/${later.code}`;
    return;
  }
  // Quien llega por primera vez, sin perfil, ve la presentación de Kiltrazo.
  if (!isComplete(user) && view === home) view = landing;
  // Estas páginas se ven sin la app: sin menú y sin pedir el perfil.
  document.body.classList.toggle('web-mode', [clinicPage, finder, landing].includes(view));
  document.body.classList.toggle('finder-mode', view === finder || view === landing);
  // Primer uso, o perfil creado antes de pedir todos los datos: completar perfil.
  if (!isComplete(user) && ![profile, admin, password, privacy, terms, clinicPage, finder, landing].includes(view)) view = profile;

  const tab = hash.replace(/^#\/?/, '').split('/')[0];
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));

  viewEl.innerHTML = '';
  viewEl.className = 'view';
  window.scrollTo(0, 0);
  try {
    await view(viewEl, params, { user, refresh: render });
  } catch (err) {
    console.error(err);
    if (reloadIfStale(err)) return;
    viewEl.innerHTML = oops(err);
  }
  await updateBadge(user);
}

async function renderClinic(hash) {
  viewEl.className = '';
  window.scrollTo(0, 0);
  try {
    const { default: clinicApp } = await import('./clinic/index.js');
    await clinicApp(viewEl, hash.replace(/^#\/?/, ''), { refresh: render });
  } catch (err) {
    console.error(err);
    if (reloadIfStale(err)) return;
    viewEl.innerHTML = oops(err);
  }
}

async function updateBadge(user) {
  user ??= await currentUser();
  const badge = document.querySelector('.bell .badge');
  if (!user) return (badge.hidden = true);
  await deliverPending(user);
  const list = await myNotifications(user);
  checkAlarms(list);
  const unread = list.filter((n) => !n.read).length;
  badge.hidden = !unread;
  badge.textContent = unread;
}

window.addEventListener('hashchange', render);
// Las pantallas avisan cuando cambian datos que afectan el contador de avisos.
window.addEventListener('petsafe:changed', () => updateBadge());
// Al volver a la app, y cada 30 s mientras está abierta, se buscan avisos
// nuevos: en iPhone la conexión en vivo se corta en segundo plano.
document.addEventListener('visibilitychange', () => document.hidden || updateBadge());
setInterval(() => document.hidden || updateBadge(), 30000);
// Al tocar una notificación con la app abierta, el Service Worker pide navegar.
navigator.serviceWorker?.addEventListener('message', (e) => {
  if (e.data?.type === 'navigate') location.hash = e.data.url.replace(/^.*#/, '#');
  // Aviso push de "¡Encontraron a tu mascota!" con la app abierta.
  if (e.data?.type === 'alarm' && !document.hidden) startAlarm(e.data.notification);
});
// El navegador deja sonar la alarma solo después de un toque en la pantalla.
document.addEventListener('pointerdown', unlockAudio, { once: true });
// Vuelta desde un enlace del correo: confirmar el correo, o "Olvidé mi
// contraseña" (type=recovery), que lleva a crear una clave nueva.
(async () => {
  const recovery = /(^|[#&])type=recovery(&|$)/.test(location.hash);
  const error = await finishEmailLink().catch((err) => err.message);
  if (error !== null) {
    let to = '#/perfil';
    try { to = localStorage.getItem('petsafe-after-login') || to; localStorage.removeItem('petsafe-after-login'); } catch { /* sin almacenamiento */ }
    if (recovery && !error) {
      try { localStorage.setItem('petsafe-after-reset', to); } catch { /* sin almacenamiento */ }
      to = '#/clave';
    }
    history.replaceState(null, '', location.pathname + to);
    if (error) alert(`El enlace no sirvió (${error}). Pide uno nuevo desde la app.`);
  }
  render();
})();
