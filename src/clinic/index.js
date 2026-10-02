// Kiltrazo Clínica: software para veterinarias dentro de Kiltrazo (#/clinica).
// Se carga aparte (import dinámico), así la app de los tutores no cambia.
// En el computador muestra un menú lateral; en el celular, uno arriba.

import './clinic.css';
import { esc } from '../ui.js';
import { session, myClinics, members, activeClinicId, setActiveClinic, listAppointments, dueVaccines, runReminders, pendingRequests, today } from './data.js';
import { ROLES } from './ui.js';
import start from './views/start.js';
import agenda, { waiting } from './views/agenda.js';
import patients, { patientForm, linkForm } from './views/patients.js';
import patient from './views/patient.js';
import vaccines from './views/vaccines.js';
import team from './views/team.js';
import requests, { homeVisits } from './views/requests.js';

const ROUTES = [
  ['', agenda, 'agenda'],
  ['agenda/:day', agenda, 'agenda'],
  ['sala', waiting, 'sala'],
  ['solicitudes', requests, 'solicitudes'],
  ['domicilio', homeVisits, 'domicilio'],
  ['pacientes', patients, 'pacientes'],
  ['pacientes/nuevo', patientForm, 'pacientes'],
  ['vincular', linkForm, 'pacientes'],
  ['vincular/:code', linkForm, 'pacientes'],
  ['paciente/:id', patient, 'pacientes'],
  ['paciente/:id/editar', patientForm, 'pacientes'],
  ['paciente/:id/:tab', patient, 'pacientes'],
  ['vacunas', vaccines, 'vacunas'],
  ['equipo', team, 'equipo'],
];

function resolve(path) {
  for (const [pattern, view, section] of ROUTES) {
    const keys = [];
    const re = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)')) + '$');
    const m = path.match(re);
    if (m) return { view, section, params: Object.fromEntries(keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return { view: agenda, section: 'agenda', params: {} };
}

let remindersRun = false;

export default async function clinicApp(el, path, { refresh }) {
  const sub = path.replace(/^clinica\/?/, '');
  const s = await session();
  if (!s.user) return start(el, { session: s, refresh, pendingCode: pendingLink(sub) });

  const clinics = await myClinics(s.user.id);
  if (!clinics.length) return start(el, { session: s, refresh, pendingCode: pendingLink(sub) });
  const clinic = clinics.find((c) => c.id === activeClinicId()) || clinics[0];
  setActiveClinic(clinic.id);

  // Una vez por visita: avisos de próximas vacunas a los tutores (también los
  // manda la base cada mañana, si tiene pg_cron).
  if (!remindersRun) {
    remindersRun = true;
    runReminders().catch((err) => console.warn('Recordatorios', err));
  }

  const [team, todayList, due, asked] = await Promise.all([
    members(clinic.id),
    listAppointments(clinic.id, today()),
    dueVaccines(clinic.id, 14),
    pendingRequests(clinic.id),
  ]);
  const me = team.find((m) => m.userId === s.user.id) || { userId: s.user.id, name: '', role: clinic.role };
  const { view, section, params } = resolve(sub);
  const pending = todayList.filter((a) => ['agendada', 'en_camino', 'en_sala', 'en_atencion'].includes(a.status)).length;
  const homeToday = todayList.filter((a) => a.place === 'domicilio' && ['agendada', 'en_camino', 'en_atencion'].includes(a.status)).length;
  const inRoom = todayList.filter((a) => a.status === 'en_sala').length;

  const link = (key, href, label, badge = 0, hot = false) =>
    `<a href="${href}" class="ck-nav ${section === key ? 'on' : ''}">${label}${badge ? `<span class="ck-count ${hot ? 'hot' : ''}">${badge}</span>` : ''}</a>`;
  const later = (label, phase) => `<span class="ck-nav later">${label}<span class="ck-count">Fase ${phase}</span></span>`;

  el.innerHTML = `
    <div class="ck">
      <aside class="ck-side">
        <div class="ck-brand"><img src="brand/kiltrazo.svg" alt="Kiltrazo" class="ck-logo"><b>Clínica</b></div>
        ${clinics.length > 1
          ? `<select class="ck-clinic-pick" aria-label="Clínica">${clinics.map((c) => `<option value="${c.id}" ${c.id === clinic.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`
          : `<div class="ck-clinic">${esc(clinic.name)}</div>`}
        ${clinic.approved === false ? '<p class="ck-review">🕒 Tu clínica está en revisión por Kiltrazo. Ya puedes usar la agenda y las fichas. Cuando la aprobemos, podrás aparecer en el mapa y recibir horas desde la app.</p>' : ''}
        <nav class="ck-navs">
          ${link('agenda', '#/clinica', 'Agenda de hoy', pending, true)}
          ${link('solicitudes', '#/clinica/solicitudes', 'Solicitudes de hora', asked.length, true)}
          ${clinic.homeVisits ? link('domicilio', '#/clinica/domicilio', 'A domicilio', homeToday) : ''}
          ${link('pacientes', '#/clinica/pacientes', 'Pacientes')}
          ${link('sala', '#/clinica/sala', 'Sala de espera', inRoom)}
          ${link('vacunas', '#/clinica/vacunas', 'Vacunas por vencer', due.length)}
          ${link('equipo', '#/clinica/equipo', 'Equipo')}
          ${later('Hospitalización', 2)}${later('Documentos', 2)}${later('Inventario', 3)}${later('Caja y boletas', 4)}${later('Reportes', 5)}
        </nav>
        <div class="ck-me">
          <strong>${esc(me.name || s.user.email || '')}</strong>
          <span>${esc(ROLES[me.role] || '')}</span>
          <a href="#/">Volver a Kiltrazo</a>
        </div>
      </aside>
      <section class="ck-main" id="ck-main"></section>
    </div>`;

  el.querySelector('.ck-clinic-pick')?.addEventListener('change', (e) => {
    setActiveClinic(e.target.value);
    location.hash = '#/clinica';
    refresh();
  });

  const main = el.querySelector('#ck-main');
  await view(main, params, { clinic, me, team, user: s.user, refresh });
}

// "#/clinica/vincular/ABC123" abierto por alguien que aún no entra: se guarda
// el código para después.
function pendingLink(sub) {
  const m = sub.match(/^vincular\/(\w+)/);
  return m ? m[1] : '';
}
