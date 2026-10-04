// Registro Nacional de Mascotas (registratumascota.cl): Kiltrazo no inscribe
// por el municipio (no hay una conexión pública para hacerlo). Deja los datos
// listos para copiar, abre el sitio y anota cuándo quedó inscrito.

import { esc, toast } from '../ui.js';
import { SPECIES } from '../breeds.js';
import { savePatient, today } from './data.js';
import { fmtDate } from './ui.js';

export const RNM_URL = 'https://registratumascota.cl';

/** Lo que falta para poder inscribirlo. */
export function rnmMissing(p) {
  return [!p.chip && 'microchip', !p.tutorName && 'responsable', !p.tutorRut && 'RUT del responsable'].filter(Boolean);
}

/** ¿Hay que inscribirlo? (no los fallecidos ni los comunitarios sin responsable) */
export const rnmPending = (p) => !p.rnmAt && !p.removedAt && !['fallecido', 'comunitario'].includes(p.status);

export function rnmCard(p) {
  if (p.rnmAt) {
    return `<div class="card ck-rnm">
      <h3>Registro Nacional de Mascotas</h3>
      <p class="small ck-scan-ok">✓ Inscrito el ${fmtDate(p.rnmAt)}${p.rnmNumber ? ` · N° <b class="ck-mono">${esc(p.rnmNumber)}</b>` : ''}</p>
      <button class="link small" data-rnm-undo>No está inscrito</button>
    </div>`;
  }
  const missing = rnmMissing(p);
  const rows = [
    ['Microchip', p.chip], ['Nombre', p.name], ['Especie', SPECIES[p.species] || ''], ['Sexo', p.sex === 'macho' ? 'Macho' : p.sex === 'hembra' ? 'Hembra' : ''],
    ['Raza', p.breed], ['Color', p.color], ['Fecha de nacimiento', fmtDate(p.birthDate)], ['Esterilizado', p.neutered ? 'Sí' : 'No'],
    ['Responsable', p.tutorName], ['RUT', p.tutorRut], ['Teléfono', p.tutorPhone], ['Correo', p.tutorEmail], ['Dirección', p.tutorAddress],
  ].filter(([, v]) => v);
  return `<div class="card ck-rnm">
    <h3>Registro Nacional de Mascotas</h3>
    <p class="small">Aún no está inscrito.${missing.length ? ` <span class="warn">Falta: ${missing.join(', ')}.</span> <a href="#/clinica/paciente/${p.id}/editar">Completar ficha</a>` : ''}</p>
    <a class="btn small secondary" href="${RNM_URL}" target="_blank" rel="noopener" data-rnm-open>Inscribir en registratumascota.cl ↗</a>
    <div class="ck-rnm-copy">
      <p class="small muted">Copia cada dato en el formulario del registro:</p>
      ${rows.map(([k, v]) => `<div class="ck-rnm-row"><span><small>${k}</small>${esc(v)}</span><button type="button" class="link small" data-copy="${esc(v)}">Copiar</button></div>`).join('')}
      <form class="form ck-rnm-done">
        <label>N° o folio de inscripción (opcional)<input name="number" maxlength="40"></label>
        <button class="btn primary small">✓ Ya quedó inscrito</button>
      </form>
    </div>
  </div>`;
}

export function bindRnm(el, p, refresh) {
  const box = el.querySelector('.ck-rnm');
  if (!box) return;
  box.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', () =>
    navigator.clipboard?.writeText(b.dataset.copy).then(() => toast('Copiado', 'ok'))));
  box.querySelector('.ck-rnm-done')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await savePatient({ id: p.id, rnmAt: today(), rnmNumber: e.target.number.value.trim() });
      toast('Anotado como inscrito', 'ok');
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  });
  box.querySelector('[data-rnm-undo]')?.addEventListener('click', async () => {
    await savePatient({ id: p.id, rnmAt: null, rnmNumber: '' });
    refresh();
  });
}
