// Ficha de un paciente: consulta nueva, historial, vacunas, exámenes y
// curvas de peso y signos vitales.

import { esc, toast, go } from '../../ui.js';
import {
  getPatient, listVisits, saveVisit, listVaccines, saveVaccine, deleteVaccine, currentDoses, listFiles, uploadFile,
  deleteFile, fileUrls, listAppointments, saveAppointment, today, localDay,
} from '../data.js';
import { avatar, speciesLine, sexLine, age, fmtDate, num, dueTone, dueLabel, waLink, lineChart, KINDS } from '../ui.js';
import { TEMPLATES, VACCINE_NAMES, NEXT_MONTHS } from '../templates.js';

const TABS = { consulta: 'Consulta', historial: 'Historial', vacunas: 'Vacunas', examenes: 'Exámenes', signos: 'Peso y signos' };

let poll = null;

export default async function patient(el, { id, tab }, ctx) {
  clearInterval(poll);
  const isVet = ctx.me.role === 'vet';
  tab = TABS[tab] ? tab : isVet ? 'consulta' : 'historial';
  const [p, visits, vaccines, files] = await Promise.all([getPatient(id), listVisits(id), listVaccines(id), listFiles(id)]);
  if (!p) {
    el.innerHTML = '<div class="card"><p>No encontramos este paciente.</p><a class="btn primary" href="#/clinica/pacientes">Ver pacientes</a></div>';
    return;
  }
  const t = today();
  const doses = currentDoses(vaccines).filter((v) => v.nextDue).sort((a, b) => a.nextDue.localeCompare(b.nextDue));
  const nextDose = doses[0];
  const lastWeight = visits.find((v) => v.weight != null);
  const wa = waLink(p.tutorPhone);

  el.innerHTML = `
    <div class="ck-patient">
      <div class="card ck-pat">
        ${avatar(p, 'big')}
        <div class="ck-pat-main">
          <h1>${esc(p.name)}</h1>
          <div class="ck-facts">
            ${[esc(speciesLine(p)), esc(sexLine(p)), esc(age(p.birthDate)), lastWeight ? `<b>${num(lastWeight.weight)} kg</b>` : '',
              p.chip ? `Chip <b class="ck-mono">${esc(p.chip)}</b>` : ''].filter(Boolean).map((x) => `<span>${x}</span>`).join('')}
          </div>
          <div class="ck-tags">
            ${p.allergies ? `<span class="ck-tag red">Alergia: ${esc(p.allergies)}</span>` : ''}
            ${nextDose ? `<span class="ck-tag ${dueTone(nextDose.nextDue, t)}">${esc(nextDose.name)} ${dueLabel(nextDose.nextDue, t)}</span>` : ''}
            ${p.petId ? '<span class="ck-tag green">Vinculada a Kiltrazo</span>' : ''}
          </div>
        </div>
        <div class="ck-tutor">
          <strong>${esc(p.tutorName || 'Sin tutor')}</strong>
          <span>Tutor/a</span>
          ${p.tutorPhone ? `<span class="ck-mono">${esc(p.tutorPhone)}</span>` : ''}
          <span class="ck-tutor-btns">
            ${wa ? `<a class="btn small whatsapp" href="${wa}" target="_blank" rel="noopener">WhatsApp</a>` : ''}
            <a class="btn small ghost" href="#/clinica/paciente/${p.id}/editar">Editar ficha</a>
          </span>
        </div>
      </div>

      <nav class="ck-tabs">${Object.entries(TABS).map(([k, label]) => `
        <a href="#/clinica/paciente/${p.id}/${k}" class="${k === tab ? 'on' : ''}">${label}${k === 'historial' && visits.length ? ` <small>${visits.length}</small>` : ''}${k === 'examenes' && files.length ? ` <small>${files.length}</small>` : ''}</a>`).join('')}
      </nav>

      <div class="ck-pgrid">
        <div class="ck-pcol" id="ck-tab"></div>
        <aside class="ck-pside">
          <div class="card">
            <h3>Peso</h3>
            ${lineChart([...visits].reverse().map((v) => ({ date: v.visitedAt, value: v.weight })), { unit: 'kg' })}
          </div>
          <div class="card">
            <h3>Vacunas y desparasitación</h3>
            ${doses.length ? doses.map((v) => `
              <div class="ck-vrow">
                <span>${esc(v.name)}<small>puesta ${fmtDate(v.appliedOn)}</small></span>
                <span class="ck-tag ${dueTone(v.nextDue, t)}">${fmtDate(v.nextDue)}</span>
              </div>`).join('') : '<p class="muted small">Sin registros.</p>'}
            ${p.tutorUser ? '<p class="muted small">El tutor recibe un aviso en su app Kiltrazo 7 días antes.</p>' : ''}
          </div>
          ${p.notes ? `<div class="card"><h3>Notas</h3><p class="ck-pre small">${esc(p.notes)}</p></div>` : ''}
        </aside>
      </div>
    </div>`;

  const box = el.querySelector('#ck-tab');
  const draw = { consulta: drawVisitForm, historial: drawHistory, vacunas: drawVaccines, examenes: drawFiles, signos: drawVitals }[tab];
  await draw(box, { p, visits, vaccines, files, ctx, isVet });
}

// ---------- Consulta nueva ----------

function drawVisitForm(box, { p, ctx, isVet }) {
  if (!isVet) {
    box.innerHTML = '<div class="card"><p>Solo los veterinarios registran consultas. Desde recepción puedes registrar vacunas y subir exámenes.</p></div>';
    return;
  }
  const key = `ck-draft-${p.id}`;
  let draft = {};
  try { draft = JSON.parse(localStorage.getItem(key) || '{}'); } catch { /* nada */ }
  const d = (k) => esc(draft[k] ?? '');
  const pending = [];

  box.innerHTML = `
    <form class="card form ck-visit" id="ck-visit">
      <div class="ck-templates"><span>Plantilla:</span>${Object.entries(TEMPLATES).map(([k, tpl]) => `<button type="button" class="ck-tpl ${draft.template === k ? 'on' : ''}" data-tpl="${k}">${tpl.name}</button>`).join('')}</div>
      <label class="ck-span">Motivo de consulta<input name="reason" value="${d('reason')}" placeholder="Ej.: se rasca las orejas hace una semana"></label>
      <label class="ck-span">Anamnesis<textarea name="anamnesis" rows="4">${d('anamnesis')}</textarea></label>
      <div class="ck-vitals">
        <label>Peso (kg)<input name="weight" inputmode="decimal" value="${d('weight')}"></label>
        <label>Temp. (°C)<input name="temperature" inputmode="decimal" value="${d('temperature')}"></label>
        <label>FC (lpm)<input name="heartRate" inputmode="numeric" value="${d('heartRate')}"></label>
        <label>FR (rpm)<input name="respRate" inputmode="numeric" value="${d('respRate')}"></label>
        <label>Mucosas<input name="mucous" value="${d('mucous')}" placeholder="Rosadas, TLLC < 2 s"></label>
      </div>
      <label class="ck-span">Examen físico<textarea name="exam" rows="5">${d('exam')}</textarea></label>
      <label class="ck-span">Diagnóstico<input name="diagnosis" value="${d('diagnosis')}"></label>
      <label class="ck-span">Tratamiento<textarea name="treatment" rows="3">${d('treatment')}</textarea></label>
      <label class="ck-short">Próximo control<input name="nextControl" type="date" value="${d('nextControl')}"></label>
      <div class="ck-attach">
        <label class="btn small ghost">📎 Adjuntar foto o PDF<input type="file" accept="image/*,application/pdf" multiple hidden id="ck-vfiles"></label>
        <span id="ck-pending" class="ck-pending"></span>
      </div>
      <div class="ck-row-end"><button class="btn primary">Guardar consulta</button></div>
    </form>`;

  const form = box.querySelector('#ck-visit');
  const saveDraft = () => {
    const f = Object.fromEntries(new FormData(form));
    try { localStorage.setItem(key, JSON.stringify({ ...f, template: form.dataset.template || draft.template || '' })); } catch { /* sin espacio */ }
  };
  form.addEventListener('input', saveDraft);

  form.querySelectorAll('[data-tpl]').forEach((b) => b.addEventListener('click', () => {
    const tpl = TEMPLATES[b.dataset.tpl];
    const dirty = (form.anamnesis.value.trim() || form.exam.value.trim()) && !confirm(`¿Reemplazar la anamnesis y el examen con la plantilla "${tpl.name}"?`);
    if (dirty) return;
    form.anamnesis.value = tpl.anamnesis;
    form.exam.value = tpl.exam;
    form.dataset.template = b.dataset.tpl;
    form.querySelectorAll('[data-tpl]').forEach((x) => x.classList.toggle('on', x === b));
    saveDraft();
  }));

  const pendingBox = box.querySelector('#ck-pending');
  const showPending = () => {
    pendingBox.innerHTML = pending.map((f, i) => `<span class="ck-file-chip">${esc(f.name)} <button type="button" data-rm="${i}" aria-label="Quitar">×</button></span>`).join('');
  };
  box.querySelector('#ck-vfiles').addEventListener('change', (e) => {
    pending.push(...e.target.files);
    e.target.value = '';
    showPending();
  });
  pendingBox.addEventListener('click', (e) => {
    if (e.target.dataset.rm == null) return;
    pending.splice(Number(e.target.dataset.rm), 1);
    showPending();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const btn = form.querySelector('.ck-row-end button');
    btn.disabled = true;
    btn.textContent = 'Guardando…';
    try {
      const visit = await saveVisit({
        clinicId: ctx.clinic.id, patientId: p.id, vetName: ctx.me.name || '', visitedAt: new Date().toISOString(),
        template: form.dataset.template || draft.template || '', reason: f.reason.trim(), anamnesis: f.anamnesis.trim(),
        exam: f.exam.trim(), weight: decimal(f.weight), temperature: decimal(f.temperature), heartRate: int(f.heartRate),
        respRate: int(f.respRate), mucous: f.mucous.trim(), diagnosis: f.diagnosis.trim(), treatment: f.treatment.trim(),
        nextControl: f.nextControl || null,
      });
      for (const file of pending) await uploadFile(ctx.clinic.id, p.id, file, { visitId: visit.id });
      // Si estaba en atención por la agenda, queda atendida.
      const appts = await listAppointments(ctx.clinic.id, today());
      for (const a of appts) if (a.patientId === p.id && a.status === 'en_atencion') await saveAppointment({ id: a.id, status: 'atendida' });
      try { localStorage.removeItem(key); } catch { /* nada */ }
      toast('Consulta guardada', 'ok');
      go(`#/clinica/paciente/${p.id}/historial`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
      btn.textContent = 'Guardar consulta';
    }
  });
}

const decimal = (s) => (String(s ?? '').trim() === '' ? null : Number(String(s).replace(',', '.'))) ?? null;
const int = (s) => (String(s ?? '').trim() === '' ? null : Math.round(Number(String(s).replace(',', '.'))));

// ---------- Historial ----------

async function drawHistory(box, { visits, files, p, isVet }) {
  const urls = await fileUrls(files.filter((f) => f.visitId));
  box.innerHTML = visits.length ? `<div class="card ck-history">${visits.map((v) => {
    const vitals = [v.weight != null && `${num(v.weight)} kg`, v.temperature != null && `${num(v.temperature)} °C`,
      v.heartRate != null && `${v.heartRate} lpm`, v.respRate != null && `${v.respRate} rpm`, v.mucous].filter(Boolean);
    const vf = files.filter((f) => f.visitId === v.id);
    return `
      <details class="ck-visit-row">
        <summary>
          <span class="ck-date">${fmtDate(localDay(new Date(v.visitedAt)))}</span>
          <span><strong>${esc(v.diagnosis || v.reason || 'Consulta')}</strong>
          <small>${esc([v.reason && v.diagnosis ? v.reason : '', v.vetName].filter(Boolean).join(' · '))}</small></span>
        </summary>
        <div class="ck-visit-body">
          ${vitals.length ? `<p class="ck-vitals-line">${vitals.map(esc).join(' · ')}</p>` : ''}
          ${v.anamnesis ? `<h4>Anamnesis</h4><p class="ck-pre">${esc(v.anamnesis)}</p>` : ''}
          ${v.exam ? `<h4>Examen físico</h4><p class="ck-pre">${esc(v.exam)}</p>` : ''}
          ${v.treatment ? `<h4>Tratamiento</h4><p class="ck-pre">${esc(v.treatment)}</p>` : ''}
          ${v.nextControl ? `<p><strong>Próximo control:</strong> ${fmtDate(v.nextControl)}</p>` : ''}
          ${vf.length ? `<p>${vf.map((f) => `<a class="ck-file-chip" href="${urls[f.id]}" target="_blank" rel="noopener">${esc(f.name)}</a>`).join('')}</p>` : ''}
        </div>
      </details>`;
  }).join('')}</div>`
    : `<div class="card"><p class="ck-empty">Aún no hay consultas.${isVet ? ` <a href="#/clinica/paciente/${p.id}/consulta">Registrar la primera</a>.` : ''}</p></div>`;
  box.querySelector('details')?.setAttribute('open', '');
}

// ---------- Vacunas ----------

function drawVaccines(box, { p, vaccines, ctx }) {
  const t = today();
  const current = new Set(currentDoses(vaccines).map((v) => v.id));
  box.innerHTML = `
    <form class="card form ck-form-grid" id="ck-vac">
      <h2 class="ck-span">Registrar dosis</h2>
      <label>Tipo<select name="kind">${Object.entries(KINDS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Nombre<input name="name" list="ck-vnames" required maxlength="80" autocomplete="off"></label>
      <datalist id="ck-vnames"></datalist>
      <label>Puesta el<input name="appliedOn" type="date" required value="${t}"></label>
      <label>Próxima dosis<input name="nextDue" type="date"></label>
      <label class="ck-span2">Lote<input name="batch"></label>
      <div class="ck-row-end ck-span2"><button class="btn primary small">Guardar dosis</button></div>
    </form>
    <div class="card ck-list">
      ${vaccines.length ? `<div class="ck-table-wrap"><table class="ck-table">
        <thead><tr><th>Dosis</th><th>Puesta</th><th>Próxima</th><th>Lote</th><th></th></tr></thead>
        <tbody>${vaccines.map((v) => `
          <tr class="${current.has(v.id) ? '' : 'old'}">
            <td><strong>${esc(v.name)}</strong><small>${KINDS[v.kind]}${v.vetName ? ` · ${esc(v.vetName)}` : ''}</small></td>
            <td class="ck-mono">${fmtDate(v.appliedOn)}</td>
            <td>${v.nextDue ? (current.has(v.id) ? `<span class="ck-tag ${dueTone(v.nextDue, t)}">${fmtDate(v.nextDue)}</span>` : `<span class="ck-mono muted">${fmtDate(v.nextDue)}</span>`) : '—'}</td>
            <td class="ck-mono">${esc(v.batch || '')}</td>
            <td><button class="link danger small" data-delvac="${v.id}">Borrar</button></td>
          </tr>`).join('')}</tbody></table></div>` : '<p class="ck-empty">Sin vacunas registradas.</p>'}
    </div>`;

  const form = box.querySelector('#ck-vac');
  const suggest = () => {
    box.querySelector('#ck-vnames').innerHTML = VACCINE_NAMES[form.kind.value].map((n) => `<option value="${n}"></option>`).join('');
    const d = new Date(`${form.appliedOn.value || t}T12:00:00`);
    d.setMonth(d.getMonth() + NEXT_MONTHS[form.kind.value]);
    form.nextDue.value = localDay(d);
  };
  suggest();
  form.kind.addEventListener('change', suggest);
  form.appliedOn.addEventListener('change', suggest);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    try {
      await saveVaccine({
        clinicId: ctx.clinic.id, patientId: p.id, kind: f.kind, name: f.name.trim(), appliedOn: f.appliedOn,
        nextDue: f.nextDue || null, batch: f.batch.trim(), vetName: ctx.me.name || '',
      });
      toast('Dosis guardada', 'ok');
      ctx.refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  });
  box.querySelectorAll('[data-delvac]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar esta dosis?')) return;
    await deleteVaccine(b.dataset.delvac);
    ctx.refresh();
  }));
}

// ---------- Exámenes ----------

async function drawFiles(box, { p, files, ctx }) {
  const urls = await fileUrls(files);
  box.innerHTML = `
    <form class="card form ck-upload" id="ck-up">
      <label>Nombre del examen<input name="name" placeholder="Ej.: Radiografía de cadera, Hemograma"></label>
      <div class="ck-upload-btns">
        <label class="btn primary">📷 Tomar foto<input type="file" accept="image/*" capture="environment" hidden data-file></label>
        <label class="btn secondary">Subir foto o PDF<input type="file" accept="image/*,application/pdf" multiple hidden data-file></label>
      </div>
      <p class="muted small">Desde el celular puedes fotografiar una radiografía o un informe, y aparece al tiro en el computador.</p>
    </form>
    <div class="ck-files">
      ${files.length ? files.map((f) => `
        <div class="ck-file">
          <a href="${urls[f.id]}" target="_blank" rel="noopener" class="ck-thumb">
            ${f.mime.startsWith('image/') ? `<img src="${urls[f.id]}" alt="" loading="lazy">` : '<span>PDF</span>'}
          </a>
          <strong>${esc(f.name)}</strong>
          <small>${fmtDate(localDay(new Date(f.createdAt)))}${f.uploadedFrom ? ` · desde el ${esc(f.uploadedFrom)}` : ''}</small>
          <button class="link danger small" data-delfile="${f.id}">Borrar</button>
        </div>`).join('') : '<div class="card"><p class="ck-empty">Aún no hay exámenes.</p></div>'}
    </div>`;

  const form = box.querySelector('#ck-up');
  form.querySelectorAll('[data-file]').forEach((input) => input.addEventListener('change', async () => {
    const list = [...input.files];
    if (!list.length) return;
    const label = form.name.value.trim();
    toast(`Subiendo ${list.length === 1 ? 'archivo' : `${list.length} archivos`}…`);
    try {
      for (const [i, file] of list.entries()) {
        await uploadFile(ctx.clinic.id, p.id, file, { name: label ? (list.length > 1 ? `${label} (${i + 1})` : label) : '' });
      }
      toast('Listo', 'ok');
      ctx.refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }));
  box.querySelectorAll('[data-delfile]').forEach((b) => b.addEventListener('click', async () => {
    if (!confirm('¿Borrar este archivo?')) return;
    await deleteFile(files.find((f) => f.id === b.dataset.delfile));
    ctx.refresh();
  }));

  // Lo que se sube desde otro dispositivo aparece solo.
  const hash = location.hash;
  poll = setInterval(async () => {
    if (location.hash !== hash) return clearInterval(poll);
    if (document.hidden) return;
    const now = await listFiles(p.id).catch(() => files);
    if (now.length !== files.length) ctx.refresh();
  }, 15000);
}

// ---------- Peso y signos ----------

function drawVitals(box, { visits }) {
  const asc = [...visits].reverse();
  const rows = visits.filter((v) => v.weight != null || v.temperature != null || v.heartRate != null || v.respRate != null);
  box.innerHTML = `
    <div class="ck-cols-2">
      <div class="card"><h3>Peso (kg)</h3>${lineChart(asc.map((v) => ({ date: v.visitedAt, value: v.weight })), { unit: 'kg', height: 150 })}</div>
      <div class="card"><h3>Temperatura (°C)</h3>${lineChart(asc.map((v) => ({ date: v.visitedAt, value: v.temperature })), { unit: '°C', height: 150 })}</div>
    </div>
    <div class="card ck-list">
      ${rows.length ? `<div class="ck-table-wrap"><table class="ck-table">
        <thead><tr><th>Fecha</th><th>Peso</th><th>Temp.</th><th>FC</th><th>FR</th><th>Mucosas</th></tr></thead>
        <tbody>${rows.map((v) => `<tr>
          <td class="ck-mono">${fmtDate(localDay(new Date(v.visitedAt)))}</td><td>${v.weight != null ? `${num(v.weight)} kg` : ''}</td>
          <td>${v.temperature != null ? `${num(v.temperature)} °C` : ''}</td><td>${v.heartRate ?? ''}</td><td>${v.respRate ?? ''}</td><td>${esc(v.mucous || '')}</td>
        </tr>`).join('')}</tbody></table></div>` : '<p class="ck-empty">Los signos se registran en cada consulta.</p>'}
    </div>`;
}
