// Kiltrazo Municipal: animales perdidos y encontrados en la comuna. Lo mismo
// que ya ven los vecinos en sus avisos (foto, nombre, zona aproximada), sin
// datos del dueño ni de quien lo encontró.

import { esc, toast, go } from '../../ui.js';
import { SPECIES } from '../../breeds.js';
import { muniBoard, listPatients, savePatient } from '../data.js';
import { avatar, speciesLine, statusTag, waLink } from '../ui.js';

const ago = (iso) => {
  const days = Math.floor((Date.now() - new Date(iso)) / 86400000);
  return days < 1 ? 'hoy' : days === 1 ? 'ayer' : `hace ${days} días`;
};
const zone = (p) => `https://www.google.com/maps/search/?api=1&query=${p.lat},${p.lng}`;
const photo = (src, alt) => (src ? `<img class="ck-board-photo" src="${esc(src)}" alt="${esc(alt)}">` : '<span class="ck-board-photo">🐾</span>');

export default async function board(el, _params, { clinic }) {
  const [b, patients] = await Promise.all([muniBoard(clinic.id), listPatients(clinic.id)]);
  const mine = patients.filter((p) => !p.removedAt && ['extraviado', 'encontrado', 'en_recuperacion'].includes(p.status));
  const head = `
    <header class="ck-head">
      <div><h1>Perdidos y encontrados</h1>
        <p class="ck-sub">${b.lost ? `A menos de ${Number(clinic.areaKm ?? 5)} km del centro de ${esc(clinic.comuna || 'la comuna')}` : esc(clinic.comuna || '')}</p></div>
      <div class="ck-actions">
        <a class="btn small secondary" href="#/placa" target="_blank" rel="noopener">📷 Reconocer un animal por su cara</a>
      </div>
    </header>`;
  const mineCard = `
    <div class="card ck-list">
      <h2>En tus fichas <small class="muted">${mine.length}</small></h2>
      ${mine.map((p) => `
        <a class="ck-prow" href="#/clinica/paciente/${p.id}">
          ${avatar(p)}
          <span class="ck-prow-main"><strong>${esc(p.name)}</strong><small>${esc(speciesLine(p))}</small></span>
          <span class="ck-prow-tutor"><strong>${esc(p.tutorName || '')}</strong><small>${esc(p.tutorPhone || '')}</small></span>
          <span class="ck-tags">${statusTag(p.status)}</span>
        </a>`).join('') || '<p class="ck-empty">Ninguna ficha está como extraviado, encontrado o en recuperación.</p>'}
    </div>`;

  if (b.pending || b.noArea) {
    el.innerHTML = `${head}
      <div class="card"><p>${b.pending
        ? '🕒 Verás aquí los animales perdidos y encontrados de la comuna cuando Kiltrazo apruebe tu municipalidad.'
        : `Marca el centro de la comuna en <a href="#/clinica/equipo">Equipo → Datos de la municipalidad</a> para ver los perdidos y encontrados cerca.`}</p></div>
      ${mineCard}`;
    return;
  }

  const matches = b.matches || [];
  const thanks = (m) => `Hola${m.finderName ? ` ${m.finderName.split(' ')[0]}` : ''}, te escribo de ${clinic.name}. Gracias por avisar en Kiltrazo: el animal que encontraste es ${m.name}, que está en nuestras fichas. ¿Sigue contigo?`;
  const matchCard = matches.length ? `
    <div class="card ck-list ck-board-matches">
      <h2>🐾 Reconocidos de tus fichas <small class="muted">${matches.length}</small></h2>
      <p class="small muted">Un vecino escaneó su cara en la calle y Kiltrazo lo reconoció entre los animales que filmaste. Contacta a quien lo encontró y a su responsable.</p>
      ${matches.map((m) => {
        const wa = waLink(m.finderPhone);
        return `
        <div class="ck-board-row">
          <span class="ck-board-pair">${photo(m.petPhoto, m.name)}${photo(m.photo, 'Foto de quien lo encontró')}</span>
          <span class="ck-prow-main"><a href="#/clinica/paciente/${m.patientId}"><strong>${esc(m.name)}</strong></a>
            <small>Lo encontró ${esc(m.finderName || 'un vecino')} ${ago(m.at)} · <a href="${zone(m)}" target="_blank" rel="noopener">Ver dónde</a></small>
            ${m.finderPhone ? `<small class="ck-mono">${esc(m.finderPhone)}</small>` : ''}</span>
          <span class="ck-tutor-btns">
            ${wa ? `<a class="btn small whatsapp" href="${wa}?text=${encodeURIComponent(thanks(m))}" target="_blank" rel="noopener">WhatsApp a quien lo encontró</a>` : ''}
            <a class="btn small ghost" href="#/clinica/paciente/${m.patientId}">Ver ficha</a>
          </span>
        </div>`;
      }).join('')}
    </div>` : '';

  el.innerHTML = `${head}${matchCard}
    <div class="card ck-board-map-card">
      <div class="ck-board-map" id="ck-board-map"></div>
      <p class="small muted">🔴 Perdidos (últimos 90 días) · 🟢 Encontrados (últimos 30 días) · 🟡 Encontrados que ya tienen dueño o ficha. Los puntos son aproximados (~100 m), igual que en los avisos a los vecinos.</p>
    </div>
    <div class="ck-cols-2">
      <div class="card ck-list">
        <h2>🔴 Perdidos <small class="muted">${b.lost.length}</small></h2>
        <p class="small muted">Sus dueños ya recibieron el aviso de Kiltrazo, y los vecinos a 5 km también.</p>
        ${b.lost.map((p) => `
          <div class="ck-board-row">
            ${photo(p.photo, p.name)}
            <span class="ck-prow-main"><strong>${esc(p.name)}</strong>
              <small>${esc([SPECIES[p.species], p.breed].filter(Boolean).join(' · '))}</small>
              <small>Se perdió ${ago(p.at)} · <a href="${zone(p)}" target="_blank" rel="noopener">Ver zona</a></small></span>
          </div>`).join('') || '<p class="ck-empty">No hay animales perdidos en la comuna.</p>'}
      </div>
      <div class="card ck-list">
        <h2>🟢 Encontrados <small class="muted">${b.found.length}</small></h2>
        <p class="small muted">Vecinos que escanearon la cara de un animal en la calle. Kiltrazo ya lo buscó entre las mascotas de la app y tus fichas.</p>
        ${b.found.map((f, i) => `
          <div class="ck-board-row">
            ${photo(f.photo, 'Animal encontrado')}
            <span class="ck-prow-main"><strong>${esc(SPECIES[f.species] || 'Animal')} encontrado</strong>
              <small>${ago(f.at)} · <a href="${zone(f)}" target="_blank" rel="noopener">Ver zona</a></small></span>
            ${f.reunited ? '<span class="ck-tag green">Kiltrazo avisó a su dueño</span>' : f.known ? '<span class="ck-tag sun">De tus fichas</span>' : `<button class="btn small ghost" data-take="${i}">Ingresar a fichas</button>`}
          </div>`).join('') || '<p class="ck-empty">No hay reportes de animales encontrados en la comuna.</p>'}
      </div>
    </div>
    ${mineCard}`;

  import('../../map.js').then(({ showBoard }) => {
    showBoard(el.querySelector('#ck-board-map'), { lat: clinic.lat, lng: clinic.lng }, Number(clinic.areaKm ?? 5), [
      ...b.lost.map((p) => ({ lat: p.lat, lng: p.lng, kind: 'lost', label: `${p.name}: se perdió ${ago(p.at)}` })),
      ...b.found.map((f) => ({ lat: f.lat, lng: f.lng, kind: f.reunited || f.known ? 'home' : 'found', label: `Encontrado ${ago(f.at)}` })),
    ]);
  });

  // El municipio lo recibe (rescate, recuperación): queda una ficha "Encontrado".
  el.querySelectorAll('[data-take]').forEach((btn) => btn.addEventListener('click', async () => {
    const f = b.found[Number(btn.dataset.take)];
    btn.disabled = true;
    try {
      const day = new Date(f.at).toLocaleDateString('es-CL');
      const p = await savePatient({
        clinicId: clinic.id, name: `Encontrado el ${day}`, species: f.species || '', photo: f.photo || null, status: 'encontrado',
        notes: `Reportado en Kiltrazo el ${day}, cerca de ${f.lat}, ${f.lng}.`,
      });
      toast('Ficha creada. Completa sus datos.', 'ok');
      go(`#/clinica/paciente/${p.id}/editar`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  }));
}
