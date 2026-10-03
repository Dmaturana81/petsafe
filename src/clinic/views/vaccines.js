// Vacunas por vencer en toda la clínica: para llamar o agendar a tiempo.

import { esc } from '../../ui.js';
import { dueVaccines, listPatients, today } from '../data.js';
import { fmtDate, dueTone, dueLabel, KINDS, waLink } from '../ui.js';

export default async function vaccines(el, _params, { clinic }) {
  const [all, patients] = await Promise.all([dueVaccines(clinic.id, 30), listPatients(clinic.id)]);
  const due = all.filter((v) => !patients.find((p) => p.id === v.patientId)?.removedAt);
  const t = today();
  const byId = Object.fromEntries(patients.map((p) => [p.id, p]));

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Vacunas por vencer</h1><p class="ck-sub">Vencidas hasta hace 60 días y las de los próximos 30 días</p></div>
    </header>
    <div class="card ck-list">
      ${due.length ? `<div class="ck-table-wrap"><table class="ck-table">
        <thead><tr><th>Paciente</th><th>Dosis</th><th>Próxima</th><th>Tutor</th><th>Aviso</th></tr></thead>
        <tbody>${due.map((v) => {
          const p = byId[v.patientId] || {};
          const wa = waLink(p.tutorPhone);
          const notice = p.tutorUser
            ? (v.remindedAt ? '<span class="ck-tag green">Avisado en la app</span>' : '<span class="ck-tag">Se avisará en la app</span>')
            : '<span class="ck-tag sun">Sin app: contactar</span>';
          return `<tr>
            <td><a href="#/clinica/paciente/${v.patientId}/vacunas"><strong>${esc(p.name || '')}</strong></a></td>
            <td>${esc(v.name)}<small>${KINDS[v.kind]}</small></td>
            <td><span class="ck-tag ${dueTone(v.nextDue, t)}">${fmtDate(v.nextDue)}</span><small>${dueLabel(v.nextDue, t)}</small></td>
            <td>${esc(p.tutorName || '')}<small>${wa ? `<a href="${wa}" target="_blank" rel="noopener">${esc(p.tutorPhone)}</a>` : esc(p.tutorPhone || '')}</small></td>
            <td>${notice}</td>
          </tr>`;
        }).join('')}</tbody></table></div>` : '<p class="ck-empty">No hay vacunas por vencer en los próximos 30 días.</p>'}
    </div>
    <p class="muted small">Los tutores que vincularon su mascota con Kiltrazo reciben un aviso en su celular 7 días antes de la fecha.</p>`;
}
