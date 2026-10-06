// Actualización automática de las pantallas que cambian solas (avisos, agenda,
// solicitudes, sala de espera…). main.js las vuelve a dibujar aparte y las
// cambia de una vez, así no parpadean. Nunca mientras la persona está
// escribiendo, tiene algo abierto o está seleccionando texto.

// Pantallas que se actualizan: en la app, al volver a ella; en Kiltrazo
// Clínica, además cada 20 s.
export const LIVE_APP = /^(|avisos|hora\/[^/]+)$/;
export const LIVE_CLINIC = /^(clinica|municipio|municipal)(\/(agenda\/[^/]+|sala|solicitudes|domicilio|vacunas))?\/?$/;

/** Anota lo que la pantalla dibujó escondido (formularios, detalles). */
export function markHidden(root) {
  root.querySelectorAll('[hidden]').forEach((e) => { e.dataset.wasHidden = ''; });
}

const FIELDS = 'input, textarea, select, [contenteditable]';

function edited(field) {
  if (field.matches('select')) {
    const opts = [...field.options];
    if (field.multiple) return opts.some((o) => o.selected !== o.defaultSelected);
    // Sin opción marcada, el navegador elige la primera.
    return field.selectedIndex !== Math.max(0, opts.findIndex((o) => o.defaultSelected));
  }
  if (/^(checkbox|radio)$/.test(field.type)) return field.checked !== field.defaultChecked;
  if (/^(hidden|submit|button|file)$/.test(field.type)) return field.type === 'file' && field.files?.length > 0;
  return field.value !== field.defaultValue;
}

/** ¿La persona está usando la pantalla? Entonces no se toca. */
export function busy(root) {
  const active = document.activeElement;
  if (active?.matches?.(FIELDS)) return true;
  // Algo abierto encima (avisos para el tutor, instalar la app, alarma…).
  if ([...document.body.children].some((c) => c.id !== 'app' && !c.matches('script, .toast, .cookie-bar'))) return true;
  if (String(window.getSelection?.() || '')) return true;
  // Abrió un formulario o una sección que venía escondida.
  if (root.querySelector('[data-was-hidden]:not([hidden])')) return true;
  return [...root.querySelectorAll(`form ${FIELDS}`)].some(edited);
}
