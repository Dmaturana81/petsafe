// Horas que piden los tutores desde la app, y visitas a domicilio (pensada
// para el celular del veterinario: cómo llegar, avisar que va y que llegó).

import { esc, toast } from '../../ui.js';
import { pendingRequests, upcomingHomeVisits, saveAppointment, listPatients, directions, today, localDay } from '../data.js';
import { SERVICES, STATUS, fmtTime, fmtDay, waLink } from '../ui.js';
import { bindRows, tell } from './agenda.js';

const z = (n) => String(n).padStart(2, '0');
const timeOf = (iso) => { const d = new Date(iso); return `${z(d.getHours())}:${z(d.getMinutes())}`; };

export default async function requests(el, _params, ctx) {
  const { clinic, team } = ctx;
  const [list, patients] = await Promise.all([pendingRequests(clinic.id), listPatients(clinic.id)]);
  const vets = team.filter((m) => m.role === 'vet');
  const byId = new Map(patients.map((p) => [p.id, p]));

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Solicitudes de hora</h1><p class="ck-sub">Las pidieron los tutores desde Kiltrazo o desde tu página. Al confirmar o rechazar, les llega un aviso.</p></div>
    </header>
    ${list.length ? list.map((a) => {
      const p = byId.get(a.patientId) || {};
      const route = a.place === 'domicilio' && directions(a);
      return `
      <form class="card form ck-req" data-id="${a.id}">
        <div class="ck-req-head">
          <span><strong><a href="#/clinica/paciente/${a.patientId}">${esc(a.patientName)}</a></strong>
          <small>${esc(p.tutorName || '')}${p.tutorPhone ? ` · ${esc(p.tutorPhone)}` : ''}</small></span>
          <span class="ck-pill ${a.place === 'domicilio' ? 'en_camino' : 'solicitada'}">${a.place === 'domicilio' ? '🏠 A domicilio' : '🏥 En la clínica'}</span>
        </div>
        <p class="small"><strong>${SERVICES[a.service] || 'Hora'}</strong> · pidió el ${esc(fmtDay(localDay(new Date(a.startsAt))))} a las ${fmtTime(a.startsAt)}${a.notes ? `<br>“${esc(a.notes)}”` : ''}</p>
        ${!p.tutorUser && p.tutorPhone ? `<p class="ck-guest small">📵 Pidió sin la app: confírmale por WhatsApp.
          <a class="btn whatsapp small" target="_blank" rel="noopener" href="${waLink(p.tutorPhone)}?text=${encodeURIComponent(`Hola ${p.tutorName || ''}, te escribimos de ${clinic.name} por la hora de ${a.patientName} el ${fmtDay(localDay(new Date(a.startsAt)))} a las ${fmtTime(a.startsAt)}. ¿Te la confirmamos?`)}">💬 WhatsApp</a></p>` : ''}
        ${a.place === 'domicilio' ? `<p class="small">🏠 ${esc(a.address)}${route ? ` · <a href="${route.google}" target="_blank" rel="noopener">Ver en el mapa</a>` : ''}</p>` : ''}
        <div class="ck-req-grid" hidden>
          <label>Día<input type="date" name="day" required value="${localDay(new Date(a.startsAt))}"></label>
          <label>Hora<input type="time" name="time" required step="300" value="${timeOf(a.startsAt)}"></label>
          <label>Veterinario<select name="vetId"><option value="">Sin asignar</option>${vets.map((v) => `<option value="${v.userId}">${esc(v.name)}</option>`).join('')}</select></label>
        </div>
        <div class="ck-row-end">
          <button type="button" class="link small" data-change>Cambiar día u hora</button>
          <button type="button" class="btn ghost small" data-no>Rechazar</button>
          <button class="btn home small">Confirmar</button>
        </div>
      </form>`;
    }).join('') : '<div class="card"><p class="ck-empty">No hay solicitudes pendientes. Cuando un tutor pida hora desde Kiltrazo, aparecerá aquí y te llegará un aviso.</p></div>'}`;

  el.querySelectorAll('.ck-req').forEach((form) => {
    const a = list.find((x) => x.id === form.dataset.id);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = Object.fromEntries(new FormData(form));
      try {
        await saveAppointment({ id: a.id, status: 'agendada', startsAt: new Date(`${f.day}T${f.time}`).toISOString(), vetId: f.vetId || null });
        await tell(a.id, 'confirmada');
        toast(byId.get(a.patientId)?.tutorUser ? 'Confirmada. Le avisamos al tutor.' : 'Confirmada. Avísale al tutor por WhatsApp.', 'ok');
        ctx.refresh();
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
    form.querySelector('[data-change]').addEventListener('click', (e) => {
      form.querySelector('.ck-req-grid').hidden = false;
      e.target.hidden = true;
    });
    form.querySelector('[data-no]').addEventListener('click', async () => {
      if (!confirm(`¿Rechazar la hora de ${a.patientName}? Le avisaremos al tutor para que pida otra.`)) return;
      await saveAppointment({ id: a.id, status: 'cancelada' });
      await tell(a.id, 'rechazada');
      ctx.refresh();
    });
  });
}

export async function homeVisits(el, _params, ctx) {
  const { clinic, team } = ctx;
  const [list, patients] = await Promise.all([upcomingHomeVisits(clinic.id, today()), listPatients(clinic.id)]);
  const byId = new Map(patients.map((p) => [p.id, p]));
  const days = [...new Set(list.map((a) => localDay(new Date(a.startsAt))))];

  const card = (a) => {
    const p = byId.get(a.patientId) || {};
    const vet = team.find((m) => m.userId === a.vetId);
    const route = directions(a);
    const wa = waLink(p.tutorPhone);
    const main = {
      agendada: '<button class="btn home" data-act="camino">🚗 Voy en camino</button>',
      en_camino: '<button class="btn home" data-act="llegue">🏠 Llegué</button>',
      en_atencion: '<button class="btn ghost" data-act="terminar">Terminar visita</button>',
    }[a.status] || '';
    return `
      <div class="card ck-visit ${a.status}" data-appt="${a.id}">
        <div class="ck-req-head">
          <span class="ck-time-big">${fmtTime(a.startsAt)}</span>
          <span class="ck-pill ${a.status}">${STATUS[a.status]}</span>
        </div>
        <h2>${esc(a.patientName)} <small>${SERVICES[a.service] || ''}${vet ? ` · ${esc(vet.name)}` : ''}</small></h2>
        <p>${esc(p.tutorName || '')}</p>
        <p class="ck-visit-addr">🏠 ${esc(a.address || p.tutorAddress || 'Sin dirección')}</p>
        ${a.notes ? `<p class="small muted">“${esc(a.notes)}”</p>` : ''}
        ${route ? `<div class="ck-visit-go"><span>Cómo llegar:</span>
          <a class="btn small ghost" href="${route.google}" target="_blank" rel="noopener">Google Maps</a>
          <a class="btn small ghost" href="${route.waze}" target="_blank" rel="noopener">Waze</a></div>` : ''}
        <div class="ck-visit-btns">
          ${p.tutorPhone ? `<a class="btn small call" href="tel:${esc(p.tutorPhone)}">📞 Llamar</a>` : ''}
          ${wa ? `<a class="btn small whatsapp" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
          ${a.patientId ? `<a class="btn small secondary" href="#/clinica/paciente/${a.patientId}">📋 Abrir ficha</a>` : ''}
        </div>
        ${main ? `<div class="ck-visit-main">${main}</div>` : ''}
      </div>`;
  };

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Visitas a domicilio</h1><p class="ck-sub">Próximos 7 días. Desde el celular: cómo llegar, avisar al tutor y abrir la ficha.</p></div>
    </header>
    ${list.length ? days.map((d) => `
      <h3 class="ck-day-title">${d === today() ? 'Hoy' : esc(fmtDay(d))}</h3>
      <div class="ck-visits">${list.filter((a) => localDay(new Date(a.startsAt)) === d).map(card).join('')}</div>`).join('')
      : '<div class="card"><p class="ck-empty">No hay visitas a domicilio agendadas. Se agregan en la agenda (Lugar: a domicilio) o las piden los tutores.</p></div>'}`;

  bindRows(el, list, ctx, () => ctx.refresh());
}
