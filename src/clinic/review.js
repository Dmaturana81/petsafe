// Revisión de Kiltrazo antes de aprobar una clínica: RUT y título de quien
// está a cargo, patente si tiene local, y aceptar los términos de uso.
// Los documentos van a la carpeta "revision" del bucket privado: solo los ven
// el equipo de la clínica y el administrador de Kiltrazo. No se publican.

import { TERMS_VERSION } from '../config.js';
import { esc, toast } from '../ui.js';
import { uploadReviewDoc, saveReview } from './data.js';

const DOCS = { titulo: 'Título o certificado de título', patente: 'Patente municipal' };

/** RUT chileno con dígito verificador correcto (acepta puntos y guion). */
export function rutOk(rut) {
  const s = String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
  if (!/^\d{7,8}[\dK]$/.test(s)) return false;
  let sum = 0;
  let mul = 2;
  for (let i = s.length - 2; i >= 0; i--) {
    sum += Number(s[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const dv = 11 - (sum % 11);
  return s.at(-1) === (dv === 11 ? '0' : dv === 10 ? 'K' : String(dv));
}

/** 12345678-9 → 12.345.678-9 */
export function formatRut(rut) {
  const s = String(rut || '').replace(/[.\s-]/g, '').toUpperCase();
  if (s.length < 2) return s;
  return `${s.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}-${s.at(-1)}`;
}

const docOf = (c, kind) => (c.docs || []).filter((d) => d.kind === kind).at(-1);

/** Campos del formulario. Con `c` (clínica ya creada) muestra lo que ya subió. */
export function reviewFields(c = {}) {
  const doc = (kind, optional) => {
    const had = docOf(c, kind);
    return `
      <div class="ck-doc" ${kind === 'patente' ? 'data-k="clinica"' : ''}>
        <span class="ck-doc-label">${DOCS[kind]}${optional ? ' <small class="muted">(si tienes)</small>' : ''}</span>
        <label class="btn small secondary">${had ? 'Cambiar' : 'Subir foto o PDF'}<input type="file" accept="image/*,application/pdf" data-doc="${kind}" hidden></label>
        <small class="ck-doc-name ${had ? 'ok' : 'muted'}" data-doc-name="${kind}">${had ? `✓ ${esc(had.name)}` : optional ? 'Opcional' : 'Falta'}</small>
      </div>`;
  };
  return `
    <fieldset class="ck-review-box">
      <legend>Para que Kiltrazo apruebe tu clínica</legend>
      <p class="small muted">Revisamos que quien atiende sea veterinario/a. Solo lo ve el equipo de Kiltrazo, no se publica.</p>
      <label>RUT del veterinario/a a cargo<input name="rut" required placeholder="12.345.678-9" autocomplete="off" value="${esc(c.rut || '')}"></label>
      ${doc('titulo')}
      ${doc('patente', true)}
      <label class="consent">
        <input type="checkbox" name="terms" ${c.termsVersion === TERMS_VERSION ? 'checked' : ''}>
        <span>Acepto los <a href="#/terminos" target="_blank" rel="noopener">términos de uso</a>: la atención la dan veterinarios titulados y la clínica responde por ella. Kiltrazo es la herramienta.</span>
      </label>
    </fieldset>`;
}

/** Conecta los campos. Devuelve { check, save }: check() antes de crear, save(id) después. */
export function bindReview(form, c = {}) {
  const picked = {};
  form.querySelectorAll('[data-doc]').forEach((input) => input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    picked[input.dataset.doc] = file;
    const name = form.querySelector(`[data-doc-name="${input.dataset.doc}"]`);
    name.textContent = `✓ ${file.name}`;
    name.className = 'ck-doc-name ok';
  }));
  form.rut.addEventListener('blur', () => { if (rutOk(form.rut.value)) form.rut.value = formatRut(form.rut.value); });

  const check = () => {
    if (!rutOk(form.rut.value)) throw new Error('Revisa el RUT: el dígito verificador no calza.');
    if (!picked.titulo && !docOf(c, 'titulo')) throw new Error('Sube una foto o PDF del título del veterinario/a.');
    if (!form.terms.checked) throw new Error('Para seguir, acepta los términos de uso.');
  };

  const save = async (clinicId) => {
    const docs = [...(c.docs || [])];
    for (const [kind, file] of Object.entries(picked)) {
      const i = docs.findIndex((d) => d.kind === kind);
      const d = await uploadReviewDoc(clinicId, file, kind);
      i >= 0 ? docs.splice(i, 1, d) : docs.push(d);
    }
    await saveReview(clinicId, { rut: formatRut(form.rut.value), docs, termsVersion: TERMS_VERSION });
  };
  return { check, save };
}

/** #/clinica/revision: para clínicas que aún no suben su RUT y título. */
export default function review(el, params, { clinic, refresh }) {
  if (!clinic.isAdmin) {
    el.innerHTML = '<div class="card"><p>Esto lo completa quien administra la clínica.</p></div>';
    return;
  }
  el.innerHTML = `
    <header class="ck-head"><div><h1>Revisión de Kiltrazo</h1><p class="ck-sub">${esc(clinic.name)}</p></div></header>
    <div class="card ck-review-card">
      ${clinic.approved === false ? '' : '<p class="note">✅ Tu clínica ya está aprobada. Si cambió quien está a cargo, actualiza sus datos aquí.</p>'}
      <form class="form" id="ck-review">
        ${reviewFields(clinic)}
        <button class="btn primary">Enviar a revisión</button>
      </form>
    </div>`;
  const form = el.querySelector('#ck-review');
  form.querySelectorAll('[data-k]').forEach((x) => { x.hidden = x.dataset.k === 'clinica' && clinic.onlyHome; });
  const r = bindReview(form, clinic);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button:not([type="button"])');
    btn.disabled = true;
    try {
      r.check();
      await r.save(clinic.id);
      toast('¡Listo! Te avisaremos cuando la revisemos.', 'ok');
      location.hash = '#/clinica';
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}
