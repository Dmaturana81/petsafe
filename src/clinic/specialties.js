// Especialidades de los veterinarios: lista fija para poder buscar por ellas.
// Las claves son las mismas que acepta la base de datos.

import { esc } from '../ui.js';

export const SPECIALTIES = {
  general: 'Medicina general',
  felinos: 'Gatos',
  exoticos: 'Exóticos',
  dermatologia: 'Dermatología',
  cirugia: 'Cirugía',
  traumatologia: 'Traumatología',
  cardiologia: 'Cardiología',
  oftalmologia: 'Oftalmología',
  odontologia: 'Odontología',
  oncologia: 'Oncología',
  comportamiento: 'Comportamiento',
  imagenologia: 'Imagenología',
};

export const specLabels = (list = []) => list.filter((k) => SPECIALTIES[k]).map((k) => SPECIALTIES[k]);

/** Etiquetas cortas para mostrar en tarjetas. */
export const specTags = (list = []) => specLabels(list).map((l) => `<span class="spec-tag">${esc(l)}</span>`).join('');

/** Casillas para marcar especialidades (name="spec"). */
export function specPick(selected = [], legend = 'Especialidades') {
  return `
    <fieldset class="spec-pick">
      <legend>${legend} <small>(opcional)</small></legend>
      ${Object.entries(SPECIALTIES).map(([k, l]) => `<label class="spec-chip"><input type="checkbox" name="spec" value="${k}" ${selected.includes(k) ? 'checked' : ''}><span>${l}</span></label>`).join('')}
    </fieldset>`;
}

export const readSpecs = (root) => [...root.querySelectorAll('input[name="spec"]:checked')].map((i) => i.value);
