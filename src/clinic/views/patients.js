// Pacientes: lista con buscador, ficha nueva o editada, y vincular una
// mascota de Kiltrazo con el código que muestra el tutor.

import { esc, toast, go } from '../../ui.js';
import { SPECIES, breedOptions } from '../../breeds.js';
import { listPatients, getPatient, savePatient, saveAppointment, linkPet, removePatient, restorePatient, isMuni } from '../data.js';
import { avatar, speciesLine, age, statusTag, PET_STATUS, chipOk } from '../ui.js';
import { rnmPending } from '../rnm.js';
import { rutOk, formatRut } from '../review.js';

export default async function patients(el, _params, { clinic }) {
  const everyone = await listPatients(clinic.id);
  const list = everyone.filter((p) => !p.removedAt);
  const removed = everyone.filter((p) => p.removedAt);
  const muni = isMuni(clinic);
  el.innerHTML = `
    <header class="ck-head">
      <div><h1>${muni ? 'Animales' : 'Pacientes'}</h1><p class="ck-sub">${list.length} ${muni ? (list.length === 1 ? 'animal' : 'animales') : list.length === 1 ? 'paciente' : 'pacientes'}</p></div>
      <div class="ck-actions">
        <a class="btn small secondary" href="#/clinica/vincular">Vincular mascota de Kiltrazo</a>
        <a class="btn small primary" href="#/clinica/pacientes/nuevo">${muni ? '+ Nuevo animal' : '+ Nuevo paciente'}</a>
      </div>
    </header>
    <input class="ck-search" type="search" placeholder="Buscar por nombre, ${muni ? 'responsable' : 'tutor'}, teléfono o chip…" aria-label="Buscar" id="ck-q">
    ${muni ? `<div class="ck-actions"><label class="spec-chip"><input type="checkbox" id="ck-rnm-only"><span>Por inscribir en el Registro Nacional (${list.filter(rnmPending).length})</span></label></div>` : ''}
    <div class="card ck-list" id="ck-plist"></div>
    ${removed.length ? `<details class="ck-removed">
      <summary>Pacientes quitados (${removed.length})</summary>
      <p class="small muted">Los quitaste de tu lista. Si vuelven a pedir hora, aparecen solos con su historial.</p>
      <div class="card ck-list">${removed.map((p) => `
        <div class="ck-prow">
          ${avatar(p)}
          <span class="ck-prow-main"><strong>${esc(p.name)}</strong><small>${esc(speciesLine(p))}</small></span>
          <span class="ck-prow-tutor"><strong>${esc(p.tutorName)}</strong><small>${esc(p.tutorPhone)}</small></span>
          <button type="button" class="btn small ghost" data-restore="${p.id}">Volver a agregar</button>
        </div>`).join('')}</div>
    </details>` : ''}`;

  const draw = (q = el.querySelector('#ck-q')?.value || '') => {
    const t = q.trim().toLowerCase();
    const base = el.querySelector('#ck-rnm-only')?.checked ? list.filter(rnmPending) : list;
    const rows = t ? base.filter((p) => [p.name, p.tutorName, p.tutorPhone, p.chip, p.breed].join(' ').toLowerCase().includes(t)) : base;
    el.querySelector('#ck-plist').innerHTML = rows.length
      ? rows.map((p) => `
        <a class="ck-prow" href="#/clinica/paciente/${p.id}">
          ${avatar(p)}
          <span class="ck-prow-main"><strong>${esc(p.name)}</strong><small>${esc([speciesLine(p), age(p.birthDate)].filter(Boolean).join(' · '))}</small></span>
          <span class="ck-prow-tutor"><strong>${esc(p.tutorName || (muni && p.status === 'comunitario' ? 'Sin responsable' : ''))}</strong><small>${esc(p.tutorPhone)}</small></span>
          <span class="ck-tags">
            ${muni && p.status && p.status !== 'con_responsable' ? statusTag(p.status) : ''}
            ${muni && p.rnmAt ? '<span class="ck-tag green">Registro Nacional</span>' : ''}
            ${p.allergies ? '<span class="ck-tag red">Alergias</span>' : ''}
            ${p.petId ? '<span class="ck-tag green">Kiltrazo</span>' : ''}
          </span>
        </a>`).join('')
      : `<p class="ck-empty">${t ? 'Nada coincide con la búsqueda.' : muni ? 'Aún no hay animales. Crea una ficha, o llegarán solos cuando los vecinos reserven en un operativo.' : 'Aún no hay pacientes. Crea uno, o vincula una mascota que ya esté en Kiltrazo con el código de su tutor.'}</p>`;
  };
  draw();
  el.querySelector('#ck-q').addEventListener('input', (e) => draw(e.target.value));
  el.querySelector('#ck-rnm-only')?.addEventListener('change', () => draw());
  el.querySelectorAll('[data-restore]').forEach((b) => b.addEventListener('click', async () => {
    b.disabled = true;
    try {
      await restorePatient(b.dataset.restore);
      toast('Paciente agregado de nuevo', 'ok');
      go(`#/clinica/paciente/${b.dataset.restore}`);
    } catch (err) {
      toast(err.message, 'bad');
      b.disabled = false;
    }
  }));
}

export async function patientForm(el, { id }, { clinic }) {
  const p = id ? await getPatient(id) : {};
  // Desde la agenda ("Atender" a alguien sin ficha): viene el nombre y la hora.
  let fromAppt = null;
  if (!id) {
    try { fromAppt = JSON.parse(sessionStorage.getItem('ck-new-patient') || 'null'); sessionStorage.removeItem('ck-new-patient'); } catch { /* nada */ }
    if (fromAppt) p.name = fromAppt.name;
  }
  const v = (k) => esc(p[k] ?? '');
  const muni = isMuni(clinic);
  const who = muni ? 'Responsable' : 'Tutor';

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>${id ? `Editar ficha de ${v('name')}` : muni ? 'Nuevo animal' : 'Nuevo paciente'}</h1>
      ${p.petId ? `<p class="ck-sub">Vinculado a Kiltrazo: ${muni ? 'el responsable' : 'el tutor'} ve sus vacunas y horas en su app.</p>` : ''}</div>
    </header>
    <form class="card form ck-form-grid" id="ck-pform">
      <h2 class="ck-span">${muni ? 'Animal' : 'Mascota'}</h2>
      ${muni ? `<label class="ck-span">Estado<select name="status">${Object.entries(PET_STATUS).map(([k, [t]]) => `<option value="${k}" ${(p.status || 'con_responsable') === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>` : ''}
      <label class="ck-span2">Nombre<input name="name" required maxlength="80" value="${v('name')}"></label>
      <label>Especie<select name="species"><option value="">—</option>${Object.entries(SPECIES).map(([k, t]) => `<option value="${k}" ${p.species === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Raza<input name="breed" list="ck-breeds" value="${v('breed')}" autocomplete="off"></label>
      <datalist id="ck-breeds">${breedOptions(p.species)}</datalist>
      <label>Sexo<select name="sex"><option value="">—</option><option value="macho" ${p.sex === 'macho' ? 'selected' : ''}>Macho</option><option value="hembra" ${p.sex === 'hembra' ? 'selected' : ''}>Hembra</option></select></label>
      <label class="ck-check"><input type="checkbox" name="neutered" ${p.neutered ? 'checked' : ''}> Esterilizado/a</label>
      <label>Fecha de nacimiento<input name="birthDate" type="date" value="${v('birthDate')}"></label>
      <label>Color<input name="color" value="${v('color')}"></label>
      <label class="ck-span2">${muni ? 'N° de microchip (15 números)' : 'N° de chip'}<input name="chip" inputmode="numeric" value="${v('chip')}" ${muni ? 'maxlength="20" placeholder="Ej.: 900 123 456 789 012"' : ''}></label>
      <label class="ck-span">Alergias<input name="allergies" value="${v('allergies')}" placeholder="Ej.: amoxicilina"></label>
      <label class="ck-span">Notas<textarea name="notes" rows="2">${v('notes')}</textarea></label>
      <div class="ck-span ck-photo-row">
        <img class="ck-avatar big" id="ck-photo-prev" src="${v('photo')}" alt="" ${p.photo ? '' : 'hidden'}>
        <label class="btn small ghost">📷 ${p.photo ? 'Cambiar foto' : 'Agregar foto'}<input type="file" accept="image/*" hidden id="ck-photo"></label>
      </div>
      <h2 class="ck-span">${who}</h2>
      ${muni ? '<p class="ck-span small muted">Si es un animal comunitario o no se sabe de quién es, déjalo en blanco.</p>' : ''}
      <label class="ck-span2">Nombre<input name="tutorName" value="${v('tutorName')}" autocomplete="off"></label>
      ${muni ? `<label class="ck-span2">RUT (lo pide el Registro Nacional)<input name="tutorRut" value="${v('tutorRut')}" placeholder="12.345.678-9" autocomplete="off"></label>` : ''}
      <label>Teléfono<input name="tutorPhone" type="tel" value="${v('tutorPhone')}" placeholder="+56 9 1234 5678"></label>
      <label>Correo<input name="tutorEmail" type="email" value="${v('tutorEmail')}"></label>
      <label class="ck-span">${muni ? 'Dirección' : 'Dirección (para visitas a domicilio)'}<input name="tutorAddress" value="${v('tutorAddress')}" placeholder="Calle, número, depto, comuna"></label>
      <div class="ck-span ck-row-end">
        <a class="btn ghost small" href="${id ? `#/clinica/paciente/${id}` : '#/clinica/pacientes'}">Cancelar</a>
        <button class="btn primary small">${id ? 'Guardar cambios' : 'Crear ficha'}</button>
      </div>
    </form>
    ${id && !p.removedAt ? `<div class="card ck-danger">
      <button type="button" class="link danger" id="ck-remove">Quitar a ${v('name')} de mis pacientes</button>
      <div id="ck-remove-box" hidden>
        <h3>¿Quitar a ${v('name')} de tus pacientes?</h3>
        <ul class="small">
          <li>Deja de aparecer en tu lista de pacientes${p.petId ? ' y en "Mi veterinaria" del tutor' : ''}. Sus horas pendientes contigo se cancelan.</li>
          <li>No se borra de Kiltrazo: ${p.petId ? 'la mascota sigue en la app de su tutor y otra clínica la puede atender.' : 'su ficha queda guardada.'}</li>
          <li>Si vuelve a pedir hora contigo, reaparece con todo su historial.</li>
        </ul>
        <span class="ck-row-end">
          <button type="button" class="btn ghost small" id="ck-remove-no">Cancelar</button>
          <button type="button" class="btn danger small" id="ck-remove-yes">Sí, quitar</button>
        </span>
      </div>
    </div>` : ''}`;

  const box = el.querySelector('#ck-remove-box');
  el.querySelector('#ck-remove')?.addEventListener('click', (e) => { e.target.hidden = true; box.hidden = false; box.scrollIntoView({ block: 'nearest' }); });
  el.querySelector('#ck-remove-no')?.addEventListener('click', () => { box.hidden = true; el.querySelector('#ck-remove').hidden = false; });
  el.querySelector('#ck-remove-yes')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      await removePatient(id);
      toast(`${p.name} ya no está en tus pacientes`, 'ok');
      go('#/clinica/pacientes');
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });

  const form = el.querySelector('#ck-pform');
  form.species.addEventListener('change', () => { el.querySelector('#ck-breeds').innerHTML = breedOptions(form.species.value); });
  let photo;
  el.querySelector('#ck-photo').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    photo = await smallPhoto(file);
    const prev = el.querySelector('#ck-photo-prev');
    prev.src = photo;
    prev.hidden = false;
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const row = {
      clinicId: clinic.id, name: f.name.trim(), species: f.species, breed: f.breed.trim(), sex: f.sex, neutered: Boolean(f.neutered),
      birthDate: f.birthDate || null, color: f.color.trim(), chip: f.chip.trim(), allergies: f.allergies.trim(), notes: f.notes.trim(),
      tutorName: f.tutorName.trim(), tutorPhone: f.tutorPhone.trim(), tutorEmail: f.tutorEmail.trim().toLowerCase(),
      tutorAddress: f.tutorAddress.trim(), ...(photo ? { photo } : {}), ...(muni ? { status: f.status } : {}),
    };
    if (muni && !chipOk(row.chip)) return toast('El microchip tiene 15 números. Revísalo o déjalo en blanco.', 'bad');
    if (muni) {
      if (f.tutorRut.trim() && !rutOk(f.tutorRut)) return toast('Revisa el RUT del responsable', 'bad');
      row.tutorRut = f.tutorRut.trim() ? formatRut(f.tutorRut) : '';
    }
    if (muni) row.chip = row.chip.replace(/\s/g, '');
    const btn = form.querySelector('button.primary');
    btn.disabled = true;
    try {
      const saved = await savePatient(id ? { id, ...row } : row);
      if (fromAppt?.apptId) await saveAppointment({ id: fromAppt.apptId, patientId: saved.id, patientName: saved.name });
      toast(id ? 'Ficha guardada' : 'Paciente creado', 'ok');
      go(`#/clinica/paciente/${saved.id}`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}

export function linkForm(el, { code = '' }, { clinic }) {
  el.innerHTML = `
    <header class="ck-head"><div><h1>Vincular mascota de Kiltrazo</h1></div></header>
    <div class="ck-cols-2">
      <form class="card form" id="ck-link">
        <p>El tutor abre Kiltrazo en su celular, va a <strong>Perfil → su mascota → Mi veterinaria</strong> y te muestra un código de 6 letras o un QR.</p>
        <label>Código<input name="code" required maxlength="6" autocapitalize="characters" class="ck-code-input" value="${esc(code.toUpperCase())}" placeholder="ABC234"></label>
        <button class="btn primary">Vincular</button>
      </form>
      <div class="card ck-explain">
        <h2>Qué pasa al vincular</h2>
        <ul>
          <li>Se crea la ficha con el nombre, especie, raza y foto que el tutor ya registró, y su nombre, teléfono y correo.</li>
          <li>El tutor ve en su app las vacunas y las horas que registres, y recibe un aviso 7 días antes de cada próxima dosis.</li>
          <li>El tutor no ve tus notas clínicas ni diagnósticos.</li>
          <li>Si escaneas el QR con la cámara del celular, se abre esta pantalla con el código puesto.</li>
        </ul>
      </div>
    </div>`;
  const form = el.querySelector('#ck-link');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      const id = await linkPet(clinic.id, form.code.value);
      await restorePatient(id);
      toast('¡Mascota vinculada!', 'ok');
      go(`#/clinica/paciente/${id}`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}

/** Foto chica (400 px) guardada dentro de la ficha. */
async function smallPhoto(file, max = 400) {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
  img.close?.();
  const url = canvas.toDataURL('image/jpeg', 0.82);
  canvas.width = canvas.height = 0;
  return url;
}
