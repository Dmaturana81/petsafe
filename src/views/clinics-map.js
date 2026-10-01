// Mapa de clínicas Kiltrazo cercanas, para una urgencia: llamar o ir al tiro.

import { esc, getLocation } from '../ui.js';
import { showClinics } from '../map.js';

export default async function clinicsMap(el) {
  el.innerHTML = '<div class="card"><h1>Clínicas cercanas</h1><p class="muted">Buscando tu ubicación…</p></div>';
  const [{ nearbyClinics, directions }, here] = await Promise.all([import('../clinic/data.js'), getLocation()]);
  let list = await nearbyClinics(here?.lat ?? null, here?.lng ?? null, 50);

  el.innerHTML = `
    <div class="card clinics-head">
      <h1>🏥 Clínicas cercanas</h1>
      <p class="small muted">${here ? 'Las más cercanas primero, con urgencias arriba.' : 'No pudimos ver tu ubicación: te mostramos todas.'}</p>
      ${list.length ? '<div class="clinics-map" id="clinics-map"></div>' : ''}
    </div>
    <div class="clinics-list">
      ${list.length ? list.map((c) => {
        const go = directions(c);
        return `
        <div class="card clinic-card" data-id="${c.id}">
          <div class="clinic-top">
            <strong>${esc(c.name)}</strong>
            ${c.km != null ? `<span class="clinic-km">${c.km < 1 ? 'a menos de 1 km' : `a ${String(c.km).replace('.', ',')} km`}</span>` : ''}
          </div>
          <div class="clinic-tags">
            ${c.emergencies ? '<span class="clinic-tag urgent">Urgencias</span>' : ''}
            ${c.homeVisits ? '<span class="clinic-tag">A domicilio</span>' : ''}
          </div>
          ${c.address ? `<p class="small">${esc(c.address)}</p>` : ''}
          ${c.hours ? `<p class="small muted">🕒 ${esc(c.hours)}</p>` : ''}
          <div class="clinic-btns">
            ${c.phone ? `<a class="btn call" href="tel:${esc(c.phone)}">📞 Llamar</a>` : ''}
            <a class="btn home" href="${go.google}" target="_blank" rel="noopener">🚗 Cómo llegar</a>
          </div>
        </div>`;
      }).join('') : `<div class="card"><p>Aún no hay clínicas Kiltrazo en el mapa${here ? ' cerca de ti' : ''}. Si es una urgencia, llama a la veterinaria más cercana que conozcas.</p></div>`}
    </div>`;

  const mapEl = el.querySelector('#clinics-map');
  if (mapEl) {
    showClinics(mapEl, list, here, (c) => {
      const card = el.querySelector(`.clinic-card[data-id="${c.id}"]`);
      el.querySelectorAll('.clinic-card.on').forEach((x) => x.classList.remove('on'));
      card.classList.add('on');
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
  }
}
