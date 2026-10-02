// Mapa de clínicas Kiltrazo cercanas, para una urgencia: llamar o ir al tiro.

import { esc, toast, getLocation } from '../ui.js';
import { showClinics } from '../map.js';
import { currentUser, myPets } from '../data.js';
import { bookForm, bindBook, petPick } from './pet-vet.js';

export default async function clinicsMap(el) {
  el.innerHTML = '<div class="card"><h1>Clínicas cercanas</h1><p class="muted">Buscando tu ubicación…</p></div>';
  const [{ nearbyClinics, directions, alertEmergency }, here, user] = await Promise.all([import('../clinic/data.js'), getLocation(), currentUser().catch(() => null)]);
  const list = await nearbyClinics(here?.lat ?? null, here?.lng ?? null, 50);
  const pets = user ? await myPets(user).catch(() => []) : [];

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
            ${c.onlyHome ? '<span class="clinic-tag home">🏠 Veterinario a domicilio</span>' : ''}
            ${c.emergencies ? '<span class="clinic-tag urgent">Urgencias</span>' : ''}
            ${c.homeVisits && !c.onlyHome ? '<span class="clinic-tag">A domicilio</span>' : ''}
          </div>
          ${c.address ? `<p class="small">${c.onlyHome ? 'Atiende en: ' : ''}${esc(c.address)}</p>` : ''}
          ${c.hours ? `<p class="small muted">🕒 ${esc(c.hours)}</p>` : ''}
          <div class="clinic-btns">
            ${c.phone ? `<a class="btn call" href="tel:${esc(c.phone)}">📞 Llamar</a>` : ''}
            ${c.onlyHome ? '' : `<a class="btn home" href="${go.google}" target="_blank" rel="noopener">🚗 Cómo llegar</a>`}
          </div>
          <div class="clinic-btns">
            ${c.emergencies ? '<button class="btn urgent" data-urgent>🚨 Voy con una urgencia</button>' : ''}
            <button class="btn secondary" data-book>📅 ${c.onlyHome ? 'Pedir visita a domicilio' : 'Pedir hora'}</button>
          </div>
          ${pets.length ? `
          <form class="form clinic-urgent" hidden>
            ${petPick(pets)}
            <label>¿Qué le pasa? (opcional)<input name="notes" maxlength="300" placeholder="Ej: lo atropellaron, comió veneno"></label>
            <p class="small muted">Le avisamos a la clínica que vas en camino, con tu nombre y teléfono para que te llamen.</p>
            <button class="btn urgent">Avisar que voy</button>
          </form>
          <form class="form vet-book" hidden>${bookForm([c], pets)}</form>` : ''}
        </div>`;
      }).join('') : `<div class="card"><p>Aún no hay clínicas Kiltrazo en el mapa${here ? ' cerca de ti' : ''}. Si es una urgencia, llama a la veterinaria más cercana que conozcas.</p></div>`}
    </div>`;

  el.querySelectorAll('.clinic-card').forEach((card) => {
    const c = list.find((x) => x.id === card.dataset.id);
    const urgentBtn = card.querySelector('[data-urgent]');
    const bookBtn = card.querySelector('[data-book]');
    if (!pets.length) {
      const need = () => toast('Primero registra a tu mascota en Kiltrazo', 'bad');
      urgentBtn?.addEventListener('click', need);
      bookBtn.addEventListener('click', need);
      return;
    }
    const book = card.querySelector('.vet-book');
    const done = (msg) => { book.outerHTML = `<p class="clinic-done">✓ ${msg}</p>`; bookBtn.hidden = true; };
    bindBook(book, bookBtn, [c], null, () => done('Solicitud enviada. La verás en Perfil → Mis mascotas → Mi veterinaria.'));
    const urgent = card.querySelector('.clinic-urgent');
    if (!urgentBtn) return;
    urgentBtn.addEventListener('click', () => { urgent.hidden = false; urgentBtn.hidden = true; });
    urgent.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = urgent.querySelector('button');
      btn.disabled = true;
      try {
        await alertEmergency(urgent.pet.value, c.id, urgent.notes.value);
        urgent.outerHTML = `<p class="clinic-done">✓ Le avisamos a ${esc(c.name)} que vas en camino.${c.phone ? ' Si puedes, llámalos.' : ''}</p>`;
      } catch (err) {
        toast(err.message, 'bad');
        btn.disabled = false;
      }
    });
  });

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
