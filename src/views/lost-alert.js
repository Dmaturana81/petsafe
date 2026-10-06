import { lostAlert } from '../data.js';
import { esc, timeAgo } from '../ui.js';
import { describe } from '../breeds.js';
import { showArea } from '../map.js';

// Aviso de mascota perdida cerca: foto, nombre y zona aproximada. Ningún dato
// del dueño: si la ves, la escaneas en "Encontré una mascota" y le avisamos.
export default async function lostAlertView(el, { id }) {
  const pet = await lostAlert(id);
  if (!pet) {
    el.innerHTML = '<div class="card center"><div class="empty-emoji">🔎</div><h1>Aviso no disponible</h1><a class="btn secondary" href="#/">Volver al inicio</a></div>';
    return;
  }
  const home = pet.status !== 'lost';
  el.innerHTML = `
    <div class="card center lost-alert">
      <img class="lost-photo" src="${esc(pet.photo)}" alt="${esc(pet.name)}">
      <h1>${home ? `¡${esc(pet.name)} ya volvió a casa! 🏡` : `Se perdió ${esc(pet.name)}`}</h1>
      <p>${[describe(pet), !home && pet.lostAt && `perdida ${timeAgo(pet.lostAt)}`].filter(Boolean).map(esc).join(' · ')}</p>
      ${home ? '<p>Gracias por estar atento. Ya no hace falta buscarla.</p>' : ''}
    </div>
    ${home ? '' : `
      ${pet.lat != null ? `
        <div class="card">
          <h2>Zona donde se perdió</h2>
          <div class="map" id="map"></div>
          <p class="muted small">Es una zona aproximada.</p>
        </div>` : ''}
      <div class="card">
        <h2>¿La viste?</h2>
        <p>Escanea su cara con Kiltrazo. Si es ${esc(pet.name)}, le avisamos a su dueño al instante con tu ubicación y tu contacto.</p>
        <a class="btn primary big" href="#/encontre">🔍 La encontré: escanear</a>
      </div>`}
    <a class="btn secondary" href="#/">Volver al inicio</a>`;
  if (!home && pet.lat != null) showArea(el.querySelector('#map'), { lat: pet.lat, lng: pet.lng });
}
