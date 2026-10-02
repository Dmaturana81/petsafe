// Logo propio de la clínica: se achica en el navegador y se guarda como imagen
// chica (data URL), así no hace falta un servidor de archivos.

import { esc, toast } from '../ui.js';

const MAX = 320;

export function logoField(current) {
  return `
    <div class="ck-logo-field">
      <span class="ck-logo-label">Logo (opcional)</span>
      <div class="ck-logo-row">
        <span class="ck-logo-prev">${current ? `<img src="${esc(current)}" alt="Logo">` : '<span>🏥</span>'}</span>
        <label class="btn small secondary ck-logo-pick">Subir logo<input type="file" accept="image/*" data-logo-file hidden></label>
        <button type="button" class="link small" data-logo-clear ${current ? '' : 'hidden'}>Quitar</button>
      </div>
      <small class="muted">Se verá tu logo y abajo, pequeño, “by kiltrazo Clínica”.</small>
    </div>`;
}

/** Devuelve una función con el logo elegido: undefined si no cambió, null si se quitó. */
export function bindLogo(form) {
  let value;
  const prev = form.querySelector('.ck-logo-prev');
  const clear = form.querySelector('[data-logo-clear]');
  form.querySelector('[data-logo-file]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      value = await shrink(file);
      prev.innerHTML = `<img src="${value}" alt="Logo">`;
      clear.hidden = false;
    } catch {
      toast('No pudimos leer esa imagen. Prueba con un PNG o JPG.', 'bad');
    }
  });
  clear.addEventListener('click', () => {
    value = null;
    prev.innerHTML = '<span>🏥</span>';
    clear.hidden = true;
  });
  return () => value;
}

async function shrink(file) {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  // PNG mantiene el fondo transparente; si queda muy pesado, WebP.
  let url = c.toDataURL('image/png');
  if (url.length > 350000) url = c.toDataURL('image/webp', 0.85);
  return url;
}

/** Encabezado con el logo de la clínica y "by kiltrazo Clínica" pequeño. */
export function brandWithLogo(logo, name) {
  return `<span class="ck-own"><img src="${esc(logo)}" alt="${esc(name)}" class="ck-own-logo">
    <small class="ck-by">by <img src="brand/kiltrazo.svg" alt="kiltrazo"> <b>Clínica</b></small></span>`;
}
