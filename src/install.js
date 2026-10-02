// Cómo instalar Kiltrazo en el celular, para que lleguen los avisos (en iPhone
// solo funcionan con la app agregada a la pantalla de inicio).

import { loginEmail, CLOUD } from './data.js';

let deferred = null;
addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });

const ua = navigator.userAgent;
const installed = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const ios = /iPhone|iPad|iPod/.test(ua);
const android = /Android/.test(ua);
const inApp = /Instagram|FBAN|FBAV|Line\/|WhatsApp|TikTok/i.test(ua);

/** Tarjeta con los pasos; vacía en el computador o si ya está instalada. */
export async function installCard() {
  if (installed() || (!ios && !android)) return '';
  const head = '<h2>📲 Instala Kiltrazo para recibir los avisos</h2><p class="small muted">Así te llega la confirmación de tu hora y el recordatorio 1 hora antes.</p>';
  const end = '<li>En <b>Perfil</b>, toca <b>Activar notificaciones</b>.</li>';
  if (inApp) {
    return `<div class="card install-card">${head}<ol class="install-steps">
      <li>Toca <b>⋯</b> arriba y elige <b>Abrir en ${ios ? 'Safari' : 'Chrome'}</b>.</li>
      <li>Ahí te mostramos cómo instalarla.</li></ol></div>`;
  }
  if (ios) {
    // En iPhone la app instalada no comparte datos con Safari: entra con correo y clave.
    const needAccount = CLOUD && !(await loginEmail().catch(() => null));
    return `<div class="card install-card">${head}<ol class="install-steps">
      ${needAccount ? '<li><a href="#/guardar">Guarda tu cuenta con correo y clave</a>, para entrar con ella desde el ícono.</li>' : ''}
      <li>Abajo en Safari, toca <b>Compartir</b> <span class="install-ico">⬆︎</span>.</li>
      <li>Elige <b>Agregar a pantalla de inicio</b> y luego <b>Agregar</b>.</li>
      <li>Abre Kiltrazo desde el ícono${needAccount ? ' y entra con tu correo y clave' : ''}.</li>
      ${end}</ol></div>`;
  }
  return `<div class="card install-card">${head}
    ${deferred ? '<button class="btn primary" data-install>📲 Instalar Kiltrazo</button>' : ''}
    <ol class="install-steps">
      ${deferred ? '' : '<li>En Chrome, toca el menú <b>⋮</b> arriba a la derecha.</li><li>Elige <b>Instalar app</b> (o <b>Agregar a pantalla de inicio</b>).</li>'}
      <li>Abre Kiltrazo desde el ícono.</li>
      ${end}</ol></div>`;
}

export function bindInstall(el) {
  el.querySelector('[data-install]')?.addEventListener('click', async (e) => {
    if (!deferred) return;
    deferred.prompt();
    const { outcome } = await deferred.userChoice;
    deferred = null;
    if (outcome === 'accepted') e.target.remove();
  });
}
