// Cómo instalar Kiltrazo en el celular, para que lleguen los avisos (en iPhone
// solo funcionan con la app agregada a la pantalla de inicio).

import { loginEmail, CLOUD } from './data.js';
import { isComplete } from './ui.js';

let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

const ua = navigator.userAgent;
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const ios = /iPhone|iPad|iPod/.test(ua);
const android = /Android/.test(ua);
const inApp = /Instagram|FBAN|FBAV|Line\/|WhatsApp|TikTok/i.test(ua);

/**
 * Pasos para instalarla en este celular (sin el título).
 * `first` agrega un primer paso; `fresh` es para quien aún no crea su perfil:
 * en iPhone le conviene crearlo ya desde el ícono, así no necesita correo y clave.
 */
async function steps({ first = '', fresh = false } = {}) {
  first &&= `<li>${first}</li>`;
  const end = fresh
    ? '<li>Crea tu perfil ahí y registra a tus mascotas.</li>'
    : '<li>En <b>Perfil</b>, toca <b>Activar notificaciones</b>.</li>';
  if (inApp) {
    return `<ol class="install-steps">${first}
      <li>Toca <b>⋯</b> arriba y elige <b>Abrir en ${ios ? 'Safari' : 'Chrome'}</b>.</li>
      <li>Ahí te mostramos cómo instalarla.</li></ol>`;
  }
  if (ios) {
    // En iPhone la app instalada no comparte datos con Safari: entra con correo y clave.
    const needAccount = !fresh && CLOUD && !(await loginEmail().catch(() => null));
    return `<ol class="install-steps">${first}
      ${needAccount ? '<li><a href="#/guardar">Guarda tu cuenta con correo y clave</a>, para entrar con ella desde el ícono.</li>' : ''}
      <li>Abajo en Safari, toca <b>Compartir</b> <span class="install-ico">⬆︎</span>.</li>
      <li>Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.</li>
      <li>Abre Kiltrazo desde el ícono${needAccount ? ' y entra con tu correo y clave' : ''}.</li>
      ${end}</ol>`;
  }
  return `${deferred ? '<button class="btn primary" data-install>📲 Instalar Kiltrazo</button>' : ''}
    <ol class="install-steps">${first}
      ${deferred ? '' : '<li>En Chrome, toca el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>Instalar app</b> (o <b>Agregar a pantalla de inicio</b>).</li>'}
      <li>Abre Kiltrazo desde el ícono.</li>
      ${end}</ol>`;
}

/**
 * Tarjeta con los pasos; vacía en el computador o si ya está instalada.
 * `head` cambia el título y `first` agrega un primer paso (ver #/mudanza).
 */
export async function installCard({ head, first = '' } = {}) {
  if (installed() || (!ios && !android)) return '';
  head ??= '<h2>📲 Instala Kiltrazo para recibir los avisos</h2><p class="small muted">Así te llega la confirmación de tu hora y el recordatorio 1 hora antes.</p>';
  return `<div class="card install-card">${head}${await steps({ first })}</div>`;
}

export function bindInstall(el, done) {
  el.querySelector('[data-install]')?.addEventListener('click', async (e) => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'accepted') {
      e.target.remove();
      done?.();
    }
  });
}

const SEEN = 'kiltrazo-instalar-visto';

/**
 * Aviso que ve una sola vez quien abre Kiltrazo en el navegador del celular
 * (no en el computador ni desde el ícono), al llegar al inicio o a la presentación.
 */
export async function installPopup(user) {
  if (installed() || (!ios && !android) || document.querySelector('.install-sheet')) return;
  try {
    if (localStorage.getItem(SEEN)) return;
    localStorage.setItem(SEEN, String(Date.now()));
  } catch {
    return; // Sin almacenamiento aparecería en cada visita.
  }
  const fresh = !isComplete(user);
  const back = document.createElement('div');
  back.className = 'tips-sheet install-sheet';
  back.setAttribute('role', 'dialog');
  back.setAttribute('aria-modal', 'true');
  back.setAttribute('aria-labelledby', 'install-title');
  back.innerHTML = `
    <div class="tips-body install-card">
      <button type="button" class="tips-close" aria-label="Cerrar">✕</button>
      <img src="icons/icon-192.png" alt="" class="install-logo">
      <h2 id="install-title">Instala Kiltrazo en tu celular</h2>
      <p>Es gratis y no ocupa espacio. Así te llega el aviso al tiro si alguien encuentra a tu mascota.</p>
      ${await steps({ fresh })}
      <button type="button" class="btn secondary" data-ok>${deferred && !ios && !inApp ? 'Ahora no' : 'Entendido'}</button>
    </div>`;
  const close = () => back.remove();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('.tips-close, [data-ok], a')) close();
  });
  bindInstall(back, close);
  document.body.append(back);
}
