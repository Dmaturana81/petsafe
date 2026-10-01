// Pacientes: lista con buscador, ficha nueva o editada, y vincular una
// mascota de Kiltrazo con el código que muestra el tutor.

import { esc, toast, go } from '../../ui.js';
import { SPECIES, breedOptions } from '../../breeds.js';
import { listPatients, getPatient, savePatient, saveAppointment, linkPet } from '../data.js';
import { avatar, speciesLine, age } from '../ui.js';

export default async function patients(el, _params, { clinic }) {
  const list = await listPatients(clinic.id);
  el.innerHTML = `
    <header class="ck-head">
      <div><h1>Pacientes</h1><p class="ck-sub">${list.length} ${list.length === 1 ? 'paciente' : 'pacientes'}</p></div>
      <div class="ck-actions">
        <a class="btn small secondary" href="#/clinica/vincular">Vincular mascota de Kiltrazo</a>
        <a class="btn small primary" href="#/clinica/pacientes/nuevo">+ Nuevo paciente</a>
      </div>
    </header>
    <input class="ck-search" type="search" placeholder="Buscar por nombre, tutor, teléfono o chip…" aria-label="Buscar paciente" id="ck-q">
    <div class="card ck-list" id="ck-plist"></div>`;

  const draw = (q = '') => {
    const t = q.trim().toLowerCase();
    const rows = t ? list.filter((p) => [p.name, p.tutorName, p.tutorPhone, p.chip, p.breed].join(' ').toLowerCase().includes(t)) : list;
    el.querySelector('#ck-plist').innerHTML = rows.length
      ? rows.map((p) => `
        <a class="ck-prow" href="#/clinica/paciente/${p.id}">
          ${avatar(p)}
          <span class="ck-prow-main"><strong>${esc(p.name)}</strong><small>${esc([speciesLine(p), age(p.birthDate)].filter(Boolean).join(' · '))}</small></span>
          <span class="ck-prow-tutor"><strong>${esc(p.tutorName)}</strong><small>${esc(p.tutorPhone)}</small></span>
          <span class="ck-tags">
            ${p.allergies ? '<span class="ck-tag red">Alergias</span>' : ''}
            ${p.petId ? '<span class="ck-tag green">Kiltrazo</span>' : ''}
          </span>
        </a>`).join('')
      : `<p class="ck-empty">${t ? 'Nada coincide con la búsqueda.' : 'Aún no hay pacientes. Crea uno, o vincula una mascota que ya esté en Kiltrazo con el código de su tutor.'}</p>`;
  };
  draw();
  el.querySelector('#ck-q').addEventListener('input', (e) => draw(e.target.value));
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

  el.innerHTML = `
    <header class="ck-head">
      <div><h1>${id ? `Editar ficha de ${v('name')}` : 'Nuevo paciente'}</h1>
      ${p.petId ? '<p class="ck-sub">Vinculado a Kiltrazo: el tutor ve sus vacunas y horas en su app.</p>' : ''}</div>
    </header>
    <form class="card form ck-form-grid" id="ck-pform">
      <h2 class="ck-span">Mascota</h2>
      <label class="ck-span2">Nombre<input name="name" required maxlength="80" value="${v('name')}"></label>
      <label>Especie<select name="species"><option value="">—</option>${Object.entries(SPECIES).map(([k, t]) => `<option value="${k}" ${p.species === k ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      <label>Raza<input name="breed" list="ck-breeds" value="${v('breed')}" autocomplete="off"></label>
      <datalist id="ck-breeds">${breedOptions(p.species)}</datalist>
      <label>Sexo<select name="sex"><option value="">—</option><option value="macho" ${p.sex === 'macho' ? 'selected' : ''}>Macho</option><option value="hembra" ${p.sex === 'hembra' ? 'selected' : ''}>Hembra</option></select></label>
      <label class="ck-check"><input type="checkbox" name="neutered" ${p.neutered ? 'checked' : ''}> Esterilizado/a</label>
      <label>Fecha de nacimiento<input name="birthDate" type="date" value="${v('birthDate')}"></label>
      <label>Color<input name="color" value="${v('color')}"></label>
      <label class="ck-span2">N° de chip<input name="chip" inputmode="numeric" value="${v('chip')}"></label>
      <label class="ck-span">Alergias<input name="allergies" value="${v('allergies')}" placeholder="Ej.: amoxicilina"></label>
      <label class="ck-span">Notas<textarea name="notes" rows="2">${v('notes')}</textarea></label>
      <h2 class="ck-span">Tutor</h2>
      <label class="ck-span2">Nombre<input name="tutorName" value="${v('tutorName')}" autocomplete="off"></label>
      <label>Teléfono<input name="tutorPhone" type="tel" value="${v('tutorPhone')}" placeholder="+56 9 1234 5678"></label>
      <label>Correo<input name="tutorEmail" type="email" value="${v('tutorEmail')}"></label>
      <div class="ck-span ck-row-end">
        <a class="btn ghost small" href="${id ? `#/clinica/paciente/${id}` : '#/clinica/pacientes'}">Cancelar</a>
        <button class="btn primary small">${id ? 'Guardar cambios' : 'Crear ficha'}</button>
      </div>
    </form>`;

  const form = el.querySelector('#ck-pform');
  form.species.addEventListener('change', () => { el.querySelector('#ck-breeds').innerHTML = breedOptions(form.species.value); });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(form));
    const row = {
      clinicId: clinic.id, name: f.name.trim(), species: f.species, breed: f.breed.trim(), sex: f.sex, neutered: Boolean(f.neutered),
      birthDate: f.birthDate || null, color: f.color.trim(), chip: f.chip.trim(), allergies: f.allergies.trim(), notes: f.notes.trim(),
      tutorName: f.tutorName.trim(), tutorPhone: f.tutorPhone.trim(), tutorEmail: f.tutorEmail.trim().toLowerCase(),
    };
    const btn = form.querySelector('button');
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
      toast('¡Mascota vinculada!', 'ok');
      go(`#/clinica/paciente/${id}`);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}
