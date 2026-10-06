// "#/operativo/ID": un operativo municipal (vacunación, esterilización,
// microchip…). El vecino elige un horario y reserva su cupo, con su mascota de
// Kiltrazo o dejando sus datos, sin necesitar la app.

import { esc, toast, go, returnHereLater } from '../ui.js';
import { currentUser, myPets, CLOUD } from '../data.js';
import { SPECIES } from '../breeds.js';
import { DRIVE_SERVICES } from '../clinic/ui.js';
import { setPage } from '../seo.js';

const time = (iso) => new Date(iso).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
const longDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' });

export default async function drivePage(el, { id }) {
  el.innerHTML = '<div class="card"><p class="muted">Cargando…</p></div>';
  const [{ publicDrive, bookDrive }, user] = await Promise.all([import('../clinic/data.js'), currentUser().catch(() => null)]);
  const d = await publicDrive(id).catch(() => null);
  if (!d) {
    el.innerHTML = '<div class="card"><h1>No encontramos este operativo</h1><p>Revisa el enlace o pregunta en tu municipalidad.</p></div>';
    return;
  }
  // Sus mascotas de Kiltrazo, aunque al perfil le falte algún dato.
  const pets = user ? await myPets(user).catch(() => []) : [];
  // Se comparan fechas, no textos: la base puede mandar "+00:00" o "-03:00".
  const slots = d.slots.filter((s) => new Date(s.at).getTime() > Date.now());
  const free = slots.reduce((n, s) => n + s.left, 0);
  const where = [d.place, d.address, d.comuna].filter(Boolean).join(', ');
  setPage({ title: `${d.title} · ${d.muni}`, description: `${longDay(d.day)}. ${where}. Reserva tu cupo gratis.`, path: `/#/operativo/${d.id}` });

  el.innerHTML = `
    <div class="web-page">
      <div class="card web-head">
        ${d.logo ? `<img src="${esc(d.logo)}" alt="${esc(d.muni)}" class="web-logo">` : ''}
        <p class="muted small">${esc(d.muni)}</p>
        <h1>${esc(d.title)}</h1>
        <div class="clinic-tags">${(d.services || []).map((k) => `<span class="clinic-tag">${DRIVE_SERVICES[k] || esc(k)}</span>`).join('')}</div>
        <p>📅 <b>${esc(longDay(d.day))}</b>, de ${esc(d.starts)} a ${esc(d.ends)}</p>
        ${where ? `<p>📍 ${esc(where)}</p>` : ''}
        <div class="clinic-btns">
          ${where ? `<a class="btn home" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(d.lat != null ? `${d.lat},${d.lng}` : where)}" target="_blank" rel="noopener">🚗 Cómo llegar</a>` : ''}
          ${d.phone ? `<a class="btn call" href="tel:${esc(d.phone)}">📞 Llamar</a>` : ''}
        </div>
        ${d.notes ? `<p class="drive-notes">ℹ️ ${esc(d.notes)}</p>` : ''}
        <p class="web-by">by <img src="brand/kiltrazo.svg" alt="kiltrazo"> <b>Municipal</b></p>
      </div>
      <div id="drive-step"></div>
    </div>`;

  const box = el.querySelector('#drive-step');
  if (!d.open || !free) {
    const title = !d.open ? 'Las inscripciones están cerradas' : d.slots.length && !slots.length ? 'El horario de este operativo ya pasó' : 'No quedan cupos';
    box.innerHTML = `<div class="card"><h2>${title}</h2>
      <p>${d.phone ? `Si tienes dudas, llama a la municipalidad al ${esc(d.phone)}.` : 'Si tienes dudas, pregunta en tu municipalidad.'}</p></div>`;
    return;
  }

  box.innerHTML = `
    <form class="card form" id="drive-form">
      <h2>Reserva tu cupo</h2>
      <p class="small muted">Es gratis. Elige a qué hora vas a llegar.</p>
      <div class="drive-slots">${slots.map((s) => `
        <label class="drive-slot ${s.left ? '' : 'full'}"><input type="radio" name="at" value="${s.at}" ${s.left ? '' : 'disabled'} required>
          <b>${time(s.at)}</b><small>${s.left ? `${s.left} ${s.left === 1 ? 'cupo' : 'cupos'}` : 'Lleno'}</small></label>`).join('')}
      </div>
      <div id="drive-who"></div>
      <button class="btn primary big">Reservar cupo</button>
    </form>`;
  const form = box.querySelector('form');
  const who = form.querySelector('#drive-who');
  const u = user || {};

  // Con la app: elige una de sus mascotas; si no, deja sus datos.
  let mode = pets.length ? 'app' : 'guest';
  const draw = () => {
    who.innerHTML = mode === 'app' ? `
      <h3>¿Quién va?</h3>
      <div class="pick-list">${pets.map((p, i) => `
        <label class="pick"><input type="radio" name="pet" value="${esc(p.id)}" ${i ? '' : 'checked'}><img src="${esc(p.photo)}" alt=""><span><strong>${esc(p.name)}</strong><small>${esc(SPECIES[p.species] || '')}</small></span></label>`).join('')}
      </div>
      <button type="button" class="link small" data-other>Es otra mascota</button>` : `
      <h3>Tus datos</h3>
      <label>Nombre y apellido<input name="tName" required autocomplete="name" value="${esc([u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '')}"></label>
      <label>Teléfono (WhatsApp)<input name="tPhone" type="tel" required autocomplete="tel" placeholder="+56 9 1234 5678" value="${esc(u.phone || '')}"></label>
      <h3>Tu mascota</h3>
      <label>Nombre<input name="mName" required maxlength="80"></label>
      <fieldset class="vet-place">
        <label class="pick"><input type="radio" name="mSpecies" value="perro" checked> 🐶 Perro</label>
        <label class="pick"><input type="radio" name="mSpecies" value="gato"> 🐱 Gato</label>
        <label class="pick"><input type="radio" name="mSpecies" value="otro"> Otro</label>
      </fieldset>
      <p class="small muted">Tus datos los recibe ${esc(d.muni)} solo para este operativo.</p>
      ${pets.length ? '<button type="button" class="link small" data-mine>Elegir una de mis mascotas</button>' : CLOUD && !user ? '<button type="button" class="link small" data-login>¿Ya usas Kiltrazo? Entra y elige a tu mascota</button>' : ''}`;
    who.querySelector('[data-other]')?.addEventListener('click', () => { mode = 'guest'; draw(); });
    who.querySelector('[data-mine]')?.addEventListener('click', () => { mode = 'app'; draw(); });
    who.querySelector('[data-login]')?.addEventListener('click', () => { returnHereLater(location.hash); go('#/perfil'); });
  };
  draw();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const at = form.at.value;
    if (!at) return toast('Elige un horario', 'bad');
    const btn = form.querySelector('button.primary');
    btn.disabled = true;
    try {
      const petName = mode === 'app' ? pets.find((p) => p.id === form.pet.value)?.name : form.mName.value.trim();
      await bookDrive(mode === 'app'
        ? { driveId: d.id, at, petId: form.pet.value }
        : { driveId: d.id, at, tutor: { name: form.tName.value.trim(), phone: form.tPhone.value.trim() },
          pet: { name: form.mName.value.trim(), species: form.mSpecies.value } });
      box.innerHTML = `
        <div class="card">
          <p class="clinic-done">✓ ¡Listo! Te esperamos con ${esc(petName)} el ${esc(longDay(d.day))} a las ${time(at)}${d.place ? ` en ${esc(d.place)}` : ''}.</p>
          ${d.notes ? `<p class="small">ℹ️ ${esc(d.notes)}</p>` : ''}
          <p class="small muted">Saca una captura de esta pantalla para no olvidarlo.</p>
          ${(d.services || []).includes('cara') && mode !== 'app' ? `<p class="small">📷 Ese día filmaremos la cara de ${esc(petName)}. Después puedes recibirla en Kiltrazo, la app gratis que la reconoce si algún día se pierde.</p>` : ''}
        </div>`;
      box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}
