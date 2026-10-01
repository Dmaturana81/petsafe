// Agenda del día y sala de espera.

import { esc, toast, go } from '../../ui.js';
import { listAppointments, saveAppointment, listPatients, notifyAppointment, directions, today, addDays, localDay } from '../data.js';
import { SERVICES, STATUS, fmtTime, fmtDay } from '../ui.js';

export default async function agenda(el, { day = today() }, ctx) {
  const { clinic, team, me } = ctx;
  const [list, patients] = await Promise.all([listAppointments(clinic.id, day), listPatients(clinic.id)]);
  const vets = team.filter((m) => m.role === 'vet');
  let vetFilter = '';
  try { vetFilter = sessionStorage.getItem('ck-vet') || ''; } catch { /* sin almacenamiento */ }
  const isToday = day === today();

  el.innerHTML = `
    <header class="ck-head">
      <div>
        <h1>${isToday ? 'Agenda de hoy' : 'Agenda'}</h1>
        <p class="ck-sub">${esc(fmtDay(day))}</p>
      </div>
      <div class="ck-actions">
        <a class="btn small ghost" href="#/clinica/agenda/${addDays(day, -1)}" aria-label="Día anterior">‹</a>
        ${isToday ? '' : '<a class="btn small ghost" href="#/clinica">Hoy</a>'}
        <a class="btn small ghost" href="#/clinica/agenda/${addDays(day, 1)}" aria-label="Día siguiente">›</a>
        <select class="ck-select" id="ck-vet" aria-label="Veterinario">
          <option value="">Todo el equipo</option>
          ${vets.map((v) => `<option value="${v.userId}" ${vetFilter === v.userId ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}
        </select>
        ${isToday ? '<button class="btn small secondary" id="ck-walkin">Llegó sin hora</button>' : ''}
        <button class="btn small primary" id="ck-new">+ Nueva hora</button>
      </div>
    </header>

    <form class="card form ck-form-grid" id="ck-appt" hidden>
      <h2 class="ck-span">Nueva hora</h2>
      <label class="ck-span2">Paciente<input name="patient" list="ck-patients" required autocomplete="off" placeholder="Nombre de la mascota (o una nueva)"></label>
      <datalist id="ck-patients">${patients.map((p) => `<option value="${esc(p.name)} · ${esc(p.tutorName)}"></option>`).join('')}</datalist>
      <label>Servicio<select name="service">${Object.entries(SERVICES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Veterinario<select name="vetId"><option value="">Sin asignar</option>${vets.map((v) => `<option value="${v.userId}" ${v.userId === me.userId ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></label>
      <label>Día<input name="day" type="date" required value="${day}"></label>
      <label>Hora<input name="time" type="time" required step="300" value="${nextSlot(list, day)}"></label>
      <label>Minutos<input name="minutes" type="number" min="5" max="600" step="5" value="30"></label>
      ${clinic.homeVisits ? `<label>Lugar<select name="place"><option value="clinica">En la clínica</option><option value="domicilio">A domicilio</option></select></label>
      <label class="ck-span2 ck-addr" hidden>Dirección<input name="address" placeholder="Calle, número, depto, comuna"></label>` : ''}
      <label class="ck-span2">Notas<input name="notes" placeholder="Ej.: viene con exámenes"></label>
      <div class="ck-span ck-row-end"><button type="button" class="btn ghost small" data-cancel>Cancelar</button><button class="btn primary small">Guardar hora</button></div>
    </form>

    <div class="card ck-list" id="ck-day"></div>`;

  const draw = () => {
    const rows = vetFilter ? list.filter((a) => a.vetId === vetFilter || !a.vetId) : list;
    el.querySelector('#ck-day').innerHTML = rows.length
      ? rows.map((a) => apptRow(a, team)).join('')
      : `<p class="ck-empty">No hay horas ${isToday ? 'hoy' : 'este día'}. Agrega una con <strong>+ Nueva hora</strong>.</p>`;
  };
  draw();
  bindRows(el, list, ctx, draw);

  el.querySelector('#ck-vet').addEventListener('change', (e) => {
    vetFilter = e.target.value;
    try { sessionStorage.setItem('ck-vet', vetFilter); } catch { /* sin almacenamiento */ }
    draw();
  });

  const form = el.querySelector('#ck-appt');
  // A domicilio: la dirección viene de la ficha del tutor, si la tiene.
  const syncPlace = () => {
    if (!form.place) return;
    const home = form.place.value === 'domicilio';
    form.querySelector('.ck-addr').hidden = !home;
    form.address.required = home;
    const p = findPatient(patients, form.patient.value);
    if (home && !form.address.value && p?.tutorAddress) form.address.value = p.tutorAddress;
  };
  form.place?.addEventListener('change', syncPlace);
  form.patient.addEventListener('change', syncPlace);
  el.querySelector('#ck-new').addEventListener('click', () => { delete form.dataset.walkin; form.hidden = false; form.patient.focus(); });
  form.querySelector('[data-cancel]').addEventListener('click', () => { form.reset(); form.hidden = true; delete form.dataset.walkin; });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const p = findPatient(patients, f.patient);
    const home = !form.dataset.walkin && f.place === 'domicilio';
    try {
      const saved = await saveAppointment({
        clinicId: clinic.id, patientId: p?.id || null, patientName: p?.name || f.patient.split(' · ')[0].trim(),
        service: f.service, vetId: f.vetId || null, startsAt: new Date(`${f.day}T${f.time}`).toISOString(),
        minutes: Number(f.minutes) || 30, notes: f.notes.trim(),
        place: home ? 'domicilio' : 'clinica', address: home ? f.address.trim() : '',
        ...(form.dataset.walkin ? { status: 'en_sala', arrivedAt: new Date().toISOString() } : { status: 'agendada' }),
      });
      // Si la mascota está en Kiltrazo, el tutor recibe la hora en su celular.
      if (!form.dataset.walkin && p?.tutorUser) await tell(saved.id, 'confirmada');
      toast(p?.tutorUser && !form.dataset.walkin ? 'Hora guardada. Le avisamos al tutor.' : 'Hora guardada', 'ok');
      f.day === day ? ctx.refresh() : go(`#/clinica/agenda/${f.day}`);
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  // Llegó sin hora: entra directo a la sala de espera.
  el.querySelector('#ck-walkin')?.addEventListener('click', () => {
    form.hidden = false;
    form.time.value = new Date().toTimeString().slice(0, 5);
    form.dataset.walkin = '1';
    form.patient.focus();
  });
}

export async function waiting(el, _params, ctx) {
  const { clinic, team } = ctx;
  const list = await listAppointments(clinic.id, today());
  const room = list.filter((a) => a.status === 'en_sala').sort((a, b) => (a.arrivedAt || '').localeCompare(b.arrivedAt || ''));
  const busy = list.filter((a) => a.status === 'en_atencion');
  const coming = list.filter((a) => a.status === 'agendada');

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Sala de espera</h1><p class="ck-sub">En orden de llegada</p></div>
      <div class="ck-actions"><a class="btn small primary" href="#/clinica">Ir a la agenda</a></div>
    </header>
    <div class="ck-cols-2">
      <div class="card ck-list" id="ck-room">
        <h2>Esperando <span class="ck-count hot">${room.length}</span></h2>
        ${room.length ? room.map((a, i) => apptRow(a, team, i + 1)).join('') : '<p class="ck-empty">Nadie esperando. Cuando llegue alguien, toca <strong>Llegó</strong> en la agenda.</p>'}
      </div>
      <div class="ck-stack">
        <div class="card ck-list"><h2>En atención</h2>${busy.length ? busy.map((a) => apptRow(a, team)).join('') : '<p class="ck-empty">Nadie en box.</p>'}</div>
        <div class="card ck-list"><h2>Por llegar hoy</h2>${coming.length ? coming.map((a) => apptRow(a, team)).join('') : '<p class="ck-empty">No quedan horas por llegar.</p>'}</div>
      </div>
    </div>`;
  bindRows(el, list, ctx, () => ctx.refresh());
}

// ---------- Filas de la agenda ----------

export function apptRow(a, team, order = 0) {
  const vet = team.find((m) => m.userId === a.vetId);
  const name = a.patientId ? `<a href="#/clinica/paciente/${a.patientId}">${esc(a.patientName)}</a>` : esc(a.patientName);
  const waited = a.status === 'en_sala' && a.arrivedAt ? Math.max(0, Math.round((Date.now() - new Date(a.arrivedAt)) / 60000)) : null;
  const home = a.place === 'domicilio';
  const route = home && directions(a);
  const actions = {
    solicitada: '<button class="btn small home" data-act="confirmar">Confirmar</button><button class="btn small ghost" data-act="rechazar">Rechazar</button>',
    agendada: home
      ? '<button class="btn small home" data-act="camino">Voy en camino</button><button class="btn small ghost" data-act="no_vino">No estaba</button>'
      : '<button class="btn small home" data-act="llego">Llegó</button><button class="btn small ghost" data-act="no_vino">No vino</button>',
    en_camino: '<button class="btn small home" data-act="llegue">Llegué</button>',
    en_sala: '<button class="btn small primary" data-act="atender">Atender</button>',
    en_atencion: '<button class="btn small primary" data-act="ficha">Abrir ficha</button><button class="btn small ghost" data-act="terminar">Terminar</button>',
  }[a.status] || '';
  return `
    <div class="ck-appt ${a.status}" data-appt="${a.id}">
      <span class="ck-time">${order ? `<b class="ck-order">${order}</b>` : fmtTime(a.startsAt)}</span>
      <span class="ck-appt-main">
        <strong>${name}</strong>
        <small>${SERVICES[a.service] || ''}${vet ? ` · ${esc(vet.name)}` : ''}${a.notes ? ` · ${esc(a.notes)}` : ''}${waited != null ? ` · esperando hace ${waited} min` : ''}</small>
        ${home ? `<small class="ck-home">🏠 ${esc(a.address || 'A domicilio')}${route ? ` · <a href="${route.google}" target="_blank" rel="noopener">Cómo llegar</a>` : ''}</small>` : ''}
      </span>
      <span class="ck-pill ${a.status}">${STATUS[a.status]}</span>
      <span class="ck-row-actions">${actions}</span>
    </div>`;
}

/** Avisa al tutor; si falla el aviso, la hora igual queda guardada. */
export async function tell(id, kind) {
  try { await notifyAppointment(id, kind); } catch (err) { console.warn('Aviso al tutor', err); }
}

export function bindRows(el, list, ctx, redraw) {
  el.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const a = list.find((x) => x.id === btn.closest('[data-appt]').dataset.appt);
    const act = btn.dataset.act;
    btn.disabled = true;
    try {
      if (act === 'confirmar') {
        Object.assign(a, await saveAppointment({ id: a.id, status: 'agendada' }));
        await tell(a.id, 'confirmada');
        toast('Confirmada. Le avisamos al tutor.', 'ok');
        return ctx.refresh();
      }
      if (act === 'rechazar') {
        if (!confirm(`¿Rechazar la hora de ${a.patientName}? Le avisaremos al tutor para que pida otra.`)) return (btn.disabled = false);
        Object.assign(a, await saveAppointment({ id: a.id, status: 'cancelada' }));
        await tell(a.id, 'rechazada');
        return ctx.refresh();
      }
      if (act === 'camino') {
        Object.assign(a, await saveAppointment({ id: a.id, status: 'en_camino', ...(!a.vetId && ctx.me.role === 'vet' ? { vetId: ctx.me.userId } : {}) }));
        await tell(a.id, 'en_camino');
        toast('Le avisamos al tutor que vas en camino 🚗', 'ok');
      }
      if (act === 'llegue') {
        Object.assign(a, await saveAppointment({ id: a.id, status: 'en_atencion', arrivedAt: new Date().toISOString() }));
        await tell(a.id, 'llego');
        toast('Le avisamos al tutor que llegaste', 'ok');
      }
      if (act === 'llego') Object.assign(a, await saveAppointment({ id: a.id, status: 'en_sala', arrivedAt: new Date().toISOString() }));
      if (act === 'no_vino') Object.assign(a, await saveAppointment({ id: a.id, status: 'no_vino' }));
      if (act === 'terminar') Object.assign(a, await saveAppointment({ id: a.id, status: 'atendida' }));
      if (act === 'atender') {
        const patch = { id: a.id, status: 'en_atencion' };
        if (!a.vetId && ctx.me.role === 'vet') patch.vetId = ctx.me.userId;
        await saveAppointment(patch);
        return openPatient(a);
      }
      if (act === 'ficha') return openPatient(a);
      redraw();
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}

// Sin ficha todavía: se crea al tiro, con el nombre de la hora.
function openPatient(a) {
  if (a.patientId) return go(`#/clinica/paciente/${a.patientId}`);
  try { sessionStorage.setItem('ck-new-patient', JSON.stringify({ name: a.patientName, apptId: a.id })); } catch { /* sin almacenamiento */ }
  go('#/clinica/pacientes/nuevo');
}

function findPatient(patients, text) {
  const t = text.trim().toLowerCase();
  return patients.find((p) => `${p.name} · ${p.tutorName}`.toLowerCase() === t) || patients.filter((p) => p.name.toLowerCase() === t).at(0);
}

// Primera hora libre del día (cada 30 min, entre 9 y 19), o la próxima media hora si es hoy.
function nextSlot(list, day) {
  const taken = new Set(list.map((a) => fmtTime(a.startsAt)));
  const start = new Date(`${day}T09:00`);
  const nowish = new Date();
  for (let t = start; localDay(t) === day && t.getHours() < 19; t = new Date(t.getTime() + 30 * 60000)) {
    const hhmm = t.toTimeString().slice(0, 5);
    if (t > nowish && !taken.has(hhmm)) return hhmm;
  }
  return '09:00';
}
