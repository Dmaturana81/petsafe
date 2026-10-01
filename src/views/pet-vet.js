// "Mi veterinaria" en el perfil del tutor: el código (y QR) para que su
// clínica vincule a la mascota en Kiltrazo Clínica, y lo que la clínica
// registró: vacunas y próximas horas. Las notas clínicas no se muestran.
// Desde aquí también se pide hora en la clínica o a domicilio.

import { esc, toast, getLocation } from '../ui.js';
import { currentUser } from '../data.js';
import { createPetCode, petHealth, unlinkPet, requestAppointment, cancelMyAppointment } from '../clinic/data.js';

const SERVICES = { consulta: 'Consulta', control: 'Control', vacuna: 'Vacuna', cirugia: 'Cirugía', peluqueria: 'Peluquería', otro: 'Hora' };
const STATUS = {
  solicitada: ['Esperando confirmación', 'wait'],
  agendada: ['Confirmada', 'ok'],
  en_camino: ['La veterinaria va en camino 🚗', 'go'],
};
const fmt = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('-') : '');

export async function mountPetVet(box, pet) {
  box.innerHTML = '<p class="muted small">Cargando…</p>';
  let health = { clinics: [], vaccines: [], appointments: [] };
  try {
    health = await petHealth(pet.id);
  } catch (err) {
    console.warn('Mi veterinaria', err);
  }
  const t = new Date().toISOString().slice(0, 10);
  // La dosis más reciente de cada vacuna es la que manda.
  const seen = new Set();
  const current = health.vaccines.filter((v) => !seen.has(v.name.toLowerCase()) && seen.add(v.name.toLowerCase()));

  box.innerHTML = `
    ${health.appointments.length ? `<h3>Próximas horas</h3><ul class="vet-list">${health.appointments.map((a) => `
      <li><strong>${new Date(a.startsAt).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
      <small>${SERVICES[a.service] || 'Hora'}${a.place === 'domicilio' ? ' a domicilio 🏠' : ''} · ${esc(a.clinic)}</small>
      <span class="vet-appt-foot"><span class="vet-status ${STATUS[a.status]?.[1] || ''}">${STATUS[a.status]?.[0] || ''}</span>
      ${['solicitada', 'agendada'].includes(a.status) ? `<button class="link small" data-cancel="${a.id}">cancelar</button>` : ''}</span></li>`).join('')}</ul>` : ''}
    ${health.clinics.length ? `<button class="btn small primary" data-book>📅 Pedir hora</button>
      <form class="form vet-book" hidden>${bookForm(health.clinics)}</form>` : ''}
    ${current.length ? `<h3>Carnet de vacunas</h3><ul class="vet-list">${current.map((v) => `
      <li><strong>${esc(v.name)}</strong><small>Puesta ${fmt(v.appliedOn)} en ${esc(v.clinic)}${v.nextDue ? ` · próxima <b class="${v.nextDue < t ? 'late' : ''}">${fmt(v.nextDue)}</b>` : ''}</small></li>`).join('')}</ul>` : ''}
    ${health.clinics.length ? `<p class="small">Compartida con ${health.clinics.map((c) => `<strong>${esc(c.name)}</strong> <button class="link small" data-unlink="${c.id}">dejar de compartir</button>`).join(', ')}.</p>` : ''}
    <div class="vet-code">
      <p class="small">Muestra este código en tu veterinaria para que registre las vacunas y horas de ${esc(pet.name)} y te avise antes de cada dosis. Verán su nombre, tipo, raza y foto, y tu nombre, teléfono y correo. Sirve una vez y dura 24 horas.</p>
      <button class="btn small secondary" data-code>Mostrar código para mi veterinaria</button>
      <div class="vet-code-out" hidden></div>
    </div>`;

  const reload = () => { box.dataset.ready = ''; mountPetVet(box, pet); };

  box.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Cancelar esta hora? Le avisaremos a la clínica.')) return;
    try {
      await cancelMyAppointment(b.dataset.cancel);
      toast('Hora cancelada', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }));

  const form = box.querySelector('.vet-book');
  if (form) bindBook(form, box.querySelector('[data-book]'), health.clinics, pet, reload);

  box.querySelector('[data-code]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const code = await createPetCode(pet.id);
      const url = `${location.origin}${location.pathname}#/clinica/vincular/${code}`;
      const out = box.querySelector('.vet-code-out');
      out.hidden = false;
      out.innerHTML = `<b class="vet-code-big">${esc(code)}</b>`;
      e.target.hidden = true;
      const QR = (await import('qrcode')).default;
      out.insertAdjacentHTML('beforeend', `<img alt="QR para la veterinaria" class="vet-qr" src="${await QR.toDataURL(url, { margin: 1, width: 220, color: { dark: '#4a3428' } })}">`);
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });

  box.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', async () => {
    const c = health.clinics.find((x) => x.id === b.dataset.unlink);
    if (!confirm(`¿Dejar de compartir a ${pet.name} con ${c.name}? La clínica conserva su ficha, pero ya no te avisará por Kiltrazo.`)) return;
    await unlinkPet(pet.id, c.id);
    toast('Listo', 'ok');
    reload();
  }));
}

/** Mañana a las 10:00, en el formato de <input type="datetime-local">. */
function tomorrowAt10() {
  const d = new Date(Date.now() + 86400000);
  d.setHours(10, 0, 0, 0);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}T10:00`;
}

function bookForm(clinics) {
  return `
    ${clinics.length > 1 ? `<label>Clínica<select name="clinic">${clinics.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></label>`
      : `<input type="hidden" name="clinic" value="${clinics[0].id}">`}
    <fieldset class="vet-place">
      <label class="pick"><input type="radio" name="place" value="clinica" checked> 🏥 En la clínica</label>
      <label class="pick" data-home><input type="radio" name="place" value="domicilio"> 🏠 A domicilio</label>
    </fieldset>
    <label>Motivo<select name="service">
      ${Object.entries(SERVICES).filter(([k]) => k !== 'cirugia').map(([k, v]) => `<option value="${k}">${v === 'Hora' ? 'Otro' : v}</option>`).join('')}
    </select></label>
    <label>Día y hora que te acomoda<input type="datetime-local" name="when" required value="${tomorrowAt10()}"></label>
    <div class="vet-address" hidden>
      <label>Dirección para la visita<input name="address" autocomplete="street-address" placeholder="Calle, número, depto, comuna"></label>
      <button type="button" class="link small" data-here>📍 Usar mi ubicación actual (para que lleguen más fácil)</button>
      <small class="muted" data-here-ok hidden>Ubicación agregada ✓</small>
    </div>
    <label>Comentario (opcional)<textarea name="notes" rows="2" maxlength="300" placeholder="Ej: tose desde ayer"></textarea></label>
    <p class="small muted">La clínica confirmará la hora y te avisaremos aquí.</p>
    <button class="btn primary">Enviar solicitud</button>`;
}

async function bindBook(form, openBtn, clinics, pet, reload) {
  let point = null;
  const user = await currentUser().catch(() => null);
  form.address.value = user?.address || '';
  const sync = () => {
    const c = clinics.find((x) => x.id === form.clinic.value) || clinics[0];
    const home = form.querySelector('[data-home]');
    home.hidden = !c.homeVisits;
    if (!c.homeVisits) form.place.value = 'clinica';
    const isHome = form.place.value === 'domicilio';
    form.querySelector('.vet-address').hidden = !isHome;
    form.address.required = isHome;
  };
  sync();
  form.addEventListener('change', sync);
  openBtn.addEventListener('click', () => { form.hidden = !form.hidden; openBtn.hidden = !form.hidden; });
  form.querySelector('[data-here]').addEventListener('click', async () => {
    point = await getLocation();
    form.querySelector('[data-here-ok]').hidden = !point;
    if (!point) toast('No pudimos obtener tu ubicación. Basta con la dirección.', 'bad');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button:not([type])');
    btn.disabled = true;
    const place = form.place.value;
    try {
      await requestAppointment({
        petId: pet.id, clinicId: form.clinic.value, place, service: form.service.value,
        startsAt: new Date(form.when.value).toISOString(),
        address: place === 'domicilio' ? form.address.value : '',
        lat: place === 'domicilio' ? point?.lat ?? null : null, lng: place === 'domicilio' ? point?.lng ?? null : null,
        notes: form.notes.value,
      });
      toast('¡Solicitud enviada! Te avisaremos cuando la confirmen.', 'ok');
      reload();
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}
