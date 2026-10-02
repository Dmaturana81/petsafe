// Google Analytics 4 y Píxel de Meta, solo con permiso (Ley 21.719): mientras
// la persona no toca "Aceptar" no se carga nada de Google ni de Meta. Si no hay
// ningún código configurado (src/config.js), no aparece ni el aviso.
import { GA_ID, META_PIXEL_ID, SITE_URL } from './config.js';

const KEY = 'kiltrazo-cookies'; // 'si' | 'no'
export const analyticsOn = Boolean(GA_ID || META_PIXEL_ID);

// Eventos propios → evento estándar de Meta (para medir campañas).
const META_EVENTS = { registro_mascota: 'CompleteRegistration', pedir_hora: 'Schedule', crear_clinica: 'Lead' };

let loaded = false;

export function cookieChoice() {
  try { return localStorage.getItem(KEY); } catch { return null; }
}

function script(src) {
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function load() {
  if (loaded || !analyticsOn) return;
  loaded = true;
  if (GA_ID) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Las páginas se informan a mano (la app cambia de pantalla sin recargar).
    window.gtag('config', GA_ID, { send_page_view: false });
    script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(GA_ID)}`);
  }
  if (META_PIXEL_ID) {
    const f = window;
    const n = (f.fbq = function fbq() { n.callMethod ? n.callMethod(...arguments) : n.queue.push(arguments); });
    if (!f._fbq) f._fbq = n;
    n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
    // Sin lectura automática de botones ni formularios: solo lo que mandamos.
    window.fbq('set', 'autoConfig', false, META_PIXEL_ID);
    window.fbq('init', META_PIXEL_ID);
    script('https://connect.facebook.net/en_US/fbevents.js');
  }
}

// Pantalla vista. Solo el nombre de la pantalla (/perdida, nunca su número),
// y nada desde Kiltrazo Clínica ni el administrador: ahí hay fichas y datos
// de personas.
let lastHash = '#/';
export function pageView(hash = lastHash) {
  lastHash = hash;
  if (!loaded) return;
  const name = hash.replace(/^#\/?/, '').split('/')[0];
  if (['clinica', 'admin'].includes(name)) return;
  const slug = name === 'c' ? (hash.split('/')[2] || '') : '';
  const path = slug ? `/?c=${slug}` : name ? `/${name}` : '/';
  window.gtag?.('event', 'page_view', { page_location: SITE_URL + path, page_title: document.title });
  window.fbq?.('track', 'PageView');
}

export function track(event, params = {}) {
  if (!loaded) return;
  window.gtag?.('event', event, params);
  if (META_EVENTS[event]) window.fbq?.('track', META_EVENTS[event]);
}

export function setCookieChoice(yes) {
  const before = cookieChoice();
  try { localStorage.setItem(KEY, yes ? 'si' : 'no'); } catch { /* sin almacenamiento */ }
  document.querySelector('.cookie-bar')?.remove();
  if (yes) {
    load();
    pageView();
  } else if (before === 'si' && loaded) {
    // Ya estaban cargados: se recarga la página para dejar de usarlos.
    location.reload();
  }
}

function showBar() {
  if (document.querySelector('.cookie-bar')) return;
  const bar = document.createElement('div');
  bar.className = 'cookie-bar';
  bar.setAttribute('role', 'dialog');
  bar.setAttribute('aria-label', 'Cookies');
  bar.innerHTML = `
    <p>🍪 ¿Nos dejas usar cookies de Google y Meta? Nos ayudan a saber cómo se usa Kiltrazo y a medir nuestros anuncios. Son opcionales y no cambian nada en la app. <a href="#/privacidad">Más información</a></p>
    <div class="cookie-btns">
      <button type="button" class="btn small secondary" data-no>No, gracias</button>
      <button type="button" class="btn small primary" data-yes>Aceptar</button>
    </div>`;
  bar.querySelector('[data-yes]').addEventListener('click', () => setCookieChoice(true));
  bar.querySelector('[data-no]').addEventListener('click', () => setCookieChoice(false));
  document.body.appendChild(bar);
}

export function initAnalytics() {
  if (!analyticsOn) return;
  const choice = cookieChoice();
  if (choice === 'si') load();
  else if (!choice) showBar();
}
