import './styles.css';
import { registerSW } from 'virtual:pwa-register';
import { currentUser, myNotifications, deliverPending, enablePush, finishEmailLink } from './data.js';
import { esc, isComplete } from './ui.js';
import { unlockAudio, startAlarm, checkAlarms } from './alarm.js';
import { refreshArea } from './nearby.js';

import home from './views/home.js';
import profile from './views/profile.js';
import register from './views/register.js';
import lost from './views/lost.js';
import lostAlert from './views/lost-alert.js';
import found from './views/found.js';
import match from './views/match.js';
import recovered from './views/recovered.js';
import success from './views/success.js';
import inbox from './views/inbox.js';
import admin from './views/admin.js';
import password from './views/password.js';
import privacy from './views/privacy.js';
import receive, { pendingTransfer, TRANSFER_KEY } from './views/receive.js';
import clinicsMap from './views/clinics-map.js';

registerSW({ immediate: true });

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
  ['privacidad', privacy],
  ['recibir/:code', receive],
  ['clinicas', clinicsMap],
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
  // Ficha enviada por la veterinaria a alguien sin perfil: se retoma al terminarlo.
  if (view === receive && !isComplete(user)) {
    try { localStorage.setItem(TRANSFER_KEY, JSON.stringify({ code: params.code, waiting: true })); } catch { /* sin almacenamiento */ }
  }
  const later = pendingTransfer();
  if (later?.waiting && isComplete(user) && view === home) {
    location.hash = `#/recibir/${later.code}`;
    return;
  }
  // Primer uso, o perfil creado antes de pedir todos los datos: completar perfil.
  if (!isComplete(user) && view !== profile && view !== admin && view !== password && view !== privacy) view = profile;

  const tab = hash.replace(/^#\/?/, '').split('/')[0];
  document.querySelectorAll('.tabbar a').forEach((a) => a.classList.toggle('active', a.dataset.tab === tab));

  viewEl.innerHTML = '';
  viewEl.className = 'view';
  window.scrollTo(0, 0);
  try {
    await view(viewEl, params, { user, refresh: render });
  } catch (err) {
    console.error(err);
    viewEl.innerHTML = `<div class="card"><h2>Ups…</h2><p>${esc(err.message)}</p></div>`;
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
    viewEl.innerHTML = `<div class="card"><h2>Ups…</h2><p>${esc(err.message)}</p></div>`;
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
