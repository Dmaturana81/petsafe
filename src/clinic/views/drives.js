// Kiltrazo Municipal: operativos (vacunación, esterilización, microchip…) con
// cupos que los vecinos reservan desde un enlace, con o sin la app.

import { esc, toast, go } from '../../ui.js';
import { listDrives, getDrive, saveDrive, muniBookings, driveBookings, driveCapacity, listPatients, today } from '../data.js';
import { DRIVE_SERVICES, STATUS, fmtDay, fmtTime, waLink, avatar, speciesLine } from '../ui.js';

const hm = (t) => String(t || '').slice(0, 5);
const live = (a) => a.status !== 'cancelada';
const driveUrl = (id) => `${location.origin}${location.pathname}#/operativo/${id}`;
const services = (d) => `<span class="ck-tags">${(d.services || []).map((k) => `<span class="ck-tag">${DRIVE_SERVICES[k] || esc(k)}</span>`).join('')}</span>`;

export default async function drives(el, _params, { clinic }) {
  const [all, booked] = await Promise.all([listDrives(clinic.id), muniBookings(clinic.id)]);
  const t = today();
  const next = all.filter((d) => d.day >= t);
  const past = all.filter((d) => d.day < t).reverse();
  const row = (d) => {
    const n = booked.filter((a) => a.driveId === d.id && live(a)).length;
    const cap = driveCapacity(d);
    const date = new Date(`${d.day}T12:00:00`);
    return `
      <a class="ck-drive" href="#/clinica/operativo/${d.id}">
        <span class="ck-drive-date"><b>${date.getDate()}</b><small>${date.toLocaleDateString('es-CL', { month: 'short' })}</small></span>
        <span class="ck-drive-main">
          <strong>${esc(d.title)}</strong>
          <small>${esc(fmtDay(d.day))} · ${hm(d.starts)} a ${hm(d.ends)}${d.place ? ` · ${esc(d.place)}` : ''}</small>
          ${services(d)}
        </span>
        <span class="ck-drive-count">
          <b>${n} de ${cap}</b><small>cupos reservados</small>
          ${d.day >= t ? `<span class="ck-tag ${d.open === false ? '' : 'green'}">${d.open === false ? 'Inscripciones cerradas' : 'Inscripciones abiertas'}</span>` : ''}
        </span>
      </a>`;
  };

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Operativos</h1><p class="ck-sub">Jornadas con cupos que los vecinos reservan desde el celular</p></div>
      <div class="ck-actions"><a class="btn small primary" href="#/clinica/operativos/nuevo">+ Nuevo operativo</a></div>
    </header>
    ${clinic.approved === false ? '<p class="ck-tip small">🕒 Puedes preparar operativos desde ya. Los vecinos podrán reservar con el enlace cuando Kiltrazo apruebe tu municipalidad.</p>' : ''}
    <div class="card ck-list">
      <h2>Próximos</h2>
      ${next.map(row).join('') || '<p class="ck-empty">No hay operativos próximos. Crea uno con <strong>+ Nuevo operativo</strong>: eliges el día, el lugar y cuántos animales atienden, y te damos un enlace para compartir con los vecinos.</p>'}
    </div>
    ${past.length ? `<details class="card ck-list"><summary><b>Anteriores (${past.length})</b></summary>${past.map(row).join('')}</details>` : ''}`;
}

export async function driveForm(el, { id }, { clinic }) {
  const d = id ? await getDrive(id) : { services: ['cara'], slotMinutes: 20, perSlot: 2, starts: '09:00', ends: '13:00', day: today() };
  const v = (k) => esc(d[k] ?? '');
  el.innerHTML = `
    <header class="ck-head"><div><h1>${id ? 'Editar operativo' : 'Nuevo operativo'}</h1><p class="ck-sub">${esc(clinic.name)}</p></div></header>
    <form class="card form ck-form-grid" id="ck-dform">
      <label class="ck-span">Nombre del operativo<input name="title" required maxlength="120" value="${v('title')}" placeholder="Operativo de esterilización Villa Los Aromos"></label>
      <fieldset class="ck-span ck-drive-services">
        <legend>Qué se hará</legend>
        ${Object.entries(DRIVE_SERVICES).map(([k, t]) => `<label class="spec-chip"><input type="checkbox" name="services" value="${k}" ${(d.services || []).includes(k) ? 'checked' : ''}><span>${t}</span></label>`).join('')}
      </fieldset>
      <label class="ck-span2">Lugar<input name="place" maxlength="120" value="${v('place')}" placeholder="Sede vecinal Villa Los Aromos"></label>
      <label class="ck-span2">Dirección<input name="address" maxlength="160" value="${v('address')}" placeholder="Los Aromos 1234"></label>
      <label>Día<input name="day" type="date" required value="${v('day')}"></label>
      <label>Desde<input name="starts" type="time" required step="300" value="${hm(d.starts)}"></label>
      <label>Hasta<input name="ends" type="time" required step="300" value="${hm(d.ends)}"></label>
      <label>Minutos por cupo<select name="slotMinutes">${[10, 15, 20, 30, 45, 60].map((n) => `<option value="${n}" ${Number(d.slotMinutes) === n ? 'selected' : ''}>${n} minutos</option>`).join('')}</select></label>
      <label>Animales por cupo<input name="perSlot" type="number" min="1" max="50" required value="${v('perSlot')}"></label>
      <p class="ck-span ck-total" id="ck-total"></p>
      <label class="ck-span">Indicaciones para el vecino<textarea name="notes" rows="2" maxlength="600" placeholder="Ej.: ayuno de 12 horas, traer collar y correa, perros con bozal si muerden.">${v('notes')}</textarea></label>
      <div class="ck-span ck-row-end">
        <a class="btn ghost small" href="${id ? `#/clinica/operativo/${id}` : '#/clinica/operativos'}">Cancelar</a>
        <button class="btn primary small">${id ? 'Guardar cambios' : 'Crear operativo'}</button>
      </div>
    </form>`;

  const form = el.querySelector('#ck-dform');
  const read = () => {
    const f = new FormData(form);
    return {
      clinicId: clinic.id, title: String(f.get('title')).trim(), services: f.getAll('services'), place: String(f.get('place')).trim(),
      address: String(f.get('address')).trim(), day: f.get('day'), starts: f.get('starts'), ends: f.get('ends'),
      slotMinutes: Number(f.get('slotMinutes')), perSlot: Math.max(1, Number(f.get('perSlot')) || 1), notes: String(f.get('notes')).trim(),
    };
  };
  const total = () => {
    const r = read();
    const cap = r.starts && r.ends && r.ends > r.starts ? driveCapacity(r) : 0;
    el.querySelector('#ck-total').innerHTML = cap
      ? `Total: <b>${cap / r.perSlot} horarios × ${r.perSlot} = ${cap} cupos</b>`
      : '<span class="warn">La hora de término tiene que ser después de la de inicio.</span>';
  };
  form.addEventListener('input', total);
  total();
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const r = read();
    if (!(r.ends > r.starts)) return toast('La hora de término tiene que ser después de la de inicio', 'bad');
    if (!r.services.length) return toast('Elige qué se hará en el operativo', 'bad');
    const btn = form.querySelector('button.primary');
    btn.disabled = true;
    try {
      const saved = await saveDrive(id ? { id, ...r } : { ...r, open: true });
      toast(id ? 'Operativo guardado' : 'Operativo creado', 'ok');
      go(`#/clinica/operativo/${saved?.id || id}`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}

export async function drive(el, { id }, { clinic }) {
  const [d, list, patients] = await Promise.all([getDrive(id), driveBookings(id), listPatients(clinic.id)]);
  if (!d) {
    el.innerHTML = '<div class="card"><p>No encontramos este operativo.</p><a class="btn primary" href="#/clinica/operativos">Ver operativos</a></div>';
    return;
  }
  const booked = list.filter(live);
  const cap = driveCapacity(d);
  const url = driveUrl(d.id);
  const upcoming = d.day >= today();
  const pat = (a) => patients.find((p) => p.id === a.patientId) || { name: a.patientName };
  const msg = `${clinic.name} te invita al ${d.title}: ${fmtDay(d.day)}, de ${hm(d.starts)} a ${hm(d.ends)}${d.place ? `, en ${d.place}` : ''}. Es gratis y con cupos: reserva el tuyo aquí ${url}`;

  // Reservas por horario.
  const groups = {};
  for (const a of booked) (groups[a.startsAt] ||= []).push(a);

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>${esc(d.title)}</h1><p class="ck-sub">${esc(fmtDay(d.day))} · ${hm(d.starts)} a ${hm(d.ends)}${d.place ? ` · ${esc(d.place)}` : ''}${d.address ? `, ${esc(d.address)}` : ''}</p></div>
      <div class="ck-actions">
        <a class="btn small ghost" href="#/clinica/operativo/${d.id}/editar">Editar</a>
        ${upcoming ? `<button class="btn small ghost" id="ck-open">${d.open === false ? 'Abrir inscripciones' : 'Cerrar inscripciones'}</button>` : ''}
        <a class="btn small secondary" href="#/clinica/agenda/${d.day}">Ver en la agenda del día</a>
      </div>
    </header>
    <div class="ck-cols-2 ck-drive-cols">
      <div class="card ck-list">
        <h2>Reservas <small class="muted">${booked.length} de ${cap} cupos</small></h2>
        ${Object.keys(groups).sort().map((at) => `
          <h3 class="ck-slot">${fmtTime(at)}</h3>
          ${groups[at].map((a) => {
            const p = pat(a);
            const wa = waLink(p.tutorPhone);
            return `
            <div class="ck-prow">
              ${avatar(p)}
              <a class="ck-prow-main" href="${a.patientId ? `#/clinica/paciente/${a.patientId}` : '#'}"><strong>${esc(p.name)}</strong><small>${esc(speciesLine(p))}</small></a>
              <span class="ck-prow-tutor"><strong>${esc(p.tutorName || '')}</strong><small>${esc(p.tutorPhone || '')}</small></span>
              <span class="ck-tags">
                <span class="ck-pill ${a.status}">${STATUS[a.status] || a.status}</span>
                ${p.petId ? '<span class="ck-tag green">Kiltrazo</span>' : ''}
                ${wa ? `<a class="btn small whatsapp" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
              </span>
            </div>`;
          }).join('')}`).join('') || '<p class="ck-empty">Aún no hay reservas. Comparte el enlace con los vecinos.</p>'}
      </div>
      <div class="ck-stack">
        <div class="card ck-share">
          <h2>Comparte el operativo</h2>
          ${clinic.approved === false ? '<p class="ck-tip small">🕒 El enlace funcionará cuando Kiltrazo apruebe tu municipalidad.</p>' : ''}
          ${d.open === false && upcoming ? '<p class="ck-tip small">Las inscripciones están cerradas: el enlace muestra el operativo, pero no deja reservar.</p>' : ''}
          <p class="small muted">Los vecinos abren el enlace o escanean el QR, eligen un horario y reservan, con o sin la app Kiltrazo.</p>
          <span class="ck-mono small ck-web-url">${esc(url)}</span>
          <div class="ck-tutor-btns">
            <a class="btn small whatsapp" href="https://wa.me/?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">Compartir por WhatsApp</a>
            <button class="btn small ghost" data-copy>Copiar enlace</button>
            <a class="btn small ghost" href="#/operativo/${d.id}" target="_blank" rel="noopener">Ver como vecino</a>
          </div>
          <img class="ck-transfer-qr" id="ck-drive-qr" alt="QR del operativo">
          <p class="small muted">Imprime el QR para la sede vecinal o los afiches.</p>
        </div>
        <div class="card">
          <h2>Qué se hará</h2>
          ${services(d)}
          ${d.notes ? `<p class="ck-pre small">${esc(d.notes)}</p>` : ''}
          ${(d.services || []).includes('cara') ? '<p class="small muted">📷 En la ficha de cada animal toca <b>Filmar su cara</b>. Así, si algún día se pierde, cualquier vecino lo reconoce con su celular, sin lector de microchip.</p>' : ''}
        </div>
      </div>
    </div>`;

  el.querySelector('[data-copy]').addEventListener('click', () => navigator.clipboard?.writeText(url).then(() => toast('Enlace copiado', 'ok')));
  import('qrcode').then(async ({ default: QR }) => {
    el.querySelector('#ck-drive-qr').src = await QR.toDataURL(url, { margin: 1, width: 220, color: { dark: '#4a3428' } });
  });
  el.querySelector('#ck-open')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      await saveDrive({ id: d.id, open: d.open === false });
      toast(d.open === false ? 'Inscripciones abiertas' : 'Inscripciones cerradas', 'ok');
      go(`#/clinica/operativo/${d.id}`);
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });
}
