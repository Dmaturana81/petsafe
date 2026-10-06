// Avisos de mascotas perdidas cerca (5 km). Solo con permiso: se guarda la
// zona aproximada (~1 km) de la persona y se puede desactivar en el perfil.

import { myArea, setMyArea, clearMyArea, enablePush } from './data.js';
import { askPermission } from './notify.js';
import { esc, getLocation, toast, timeAgo } from './ui.js';
import { NEARBY_KM } from './geo.js';

const DISMISSED = 'petsafe-nearby-later';
const why = `Si alguien pierde su mascota a ${NEARBY_KM} km o menos de ti, te llega un aviso con su foto.`;
const privacyNote = 'Guardamos solo tu zona aproximada (unos 1 km a la redonda), nunca tu ubicación exacta ni tu dirección. Nadie más la ve y puedes desactivarlo cuando quieras en tu perfil.';

/** Activa los avisos cerca: pide la ubicación y, si se puede, las notificaciones. */
export async function turnOnNearby(user) {
  const loc = await getLocation();
  if (!loc) {
    toast('No pudimos ver tu ubicación. Revisa que Kiltrazo tenga permiso de ubicación.', 'bad');
    return false;
  }
  await setMyArea(user, loc);
  if ((await askPermission()) === 'granted') await enablePush().catch(() => {});
  toast('¡Listo! Te avisaremos de mascotas perdidas cerca.', 'ok');
  return true;
}

/** Una vez al día, si ya dio permiso de ubicación, actualiza su zona en silencio. */
export async function refreshArea(user) {
  const area = await myArea(user);
  if (!area || Date.now() - new Date(area.updatedAt).getTime() < 86400000) return;
  const state = await navigator.permissions?.query({ name: 'geolocation' }).then((p) => p.state).catch(() => '');
  if (state !== 'granted') return;
  const loc = await getLocation();
  if (loc) await setMyArea(user, loc);
}

/** Tarjeta de la pantalla de inicio, mientras no lo active ni diga "Ahora no". */
export async function homeNearby(el, user) {
  try { if (localStorage.getItem(DISMISSED)) return; } catch { /* sin almacenamiento */ }
  if (await myArea(user)) return;
  el.innerHTML = `
    <div class="card nearby-ask">
      <h2>📣 ¿Te avisamos si se pierde una mascota cerca?</h2>
      <p>${why}</p>
      <p class="muted small">${privacyNote}</p>
      <button class="btn primary" data-on>Sí, avísame</button>
      <button class="btn ghost" data-later>Ahora no</button>
    </div>`;
  el.querySelector('[data-on]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    if (await turnOnNearby(user)) el.innerHTML = '';
    else e.target.disabled = false;
  });
  el.querySelector('[data-later]').addEventListener('click', () => {
    try { localStorage.setItem(DISMISSED, '1'); } catch { /* sin almacenamiento */ }
    el.innerHTML = '';
  });
}

/** Tarjeta del perfil: estado, actualizar zona y desactivar. */
export async function profileNearby(el, user, refresh) {
  const area = await myArea(user);
  el.innerHTML = `
    <div class="card">
      <h2>Mascotas perdidas cerca</h2>
      ${area
        ? `<p>✅ Activado. Te avisamos si se pierde una mascota a ${NEARBY_KM} km o menos de tu zona (actualizada ${esc(timeAgo(area.updatedAt))}).</p>
           <button class="btn secondary" data-on>📍 Usar mi ubicación actual</button>
           <button class="btn ghost" data-off>Desactivar</button>`
        : `<p>${why}</p><p class="muted small">${privacyNote}</p>
           <button class="btn secondary" data-on>Activar avisos cerca de mí</button>`}
    </div>`;
  el.querySelector('[data-on]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    if (await turnOnNearby(user)) refresh();
    else e.target.disabled = false;
  });
  el.querySelector('[data-off]')?.addEventListener('click', async () => {
    await clearMyArea(user);
    toast('Listo, borramos tu zona y ya no recibirás estos avisos.');
    refresh();
  });
}
