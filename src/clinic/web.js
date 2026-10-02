// Página propia de la clínica (…/?c=nombre) y cómo apuntar un dominio .cl a ella.

import { esc, toast } from '../ui.js';

export const clinicUrl = (slug) => `${location.origin}${location.pathname}?c=${encodeURIComponent(slug)}`;

// NIC Chile tiene un "Redireccionamiento web" gratis: no hace falta otro servicio.
const STEPS = (url) => [
  ['Entra a tu cuenta de NIC Chile', 'Ve a clientes.nic.cl (botón “Ingresar” en nic.cl) con tu usuario y clave.'],
  ['Abre tu dominio', 'Toca el dominio que quieres usar, por ejemplo veterinarialosaromos.cl.'],
  ['Elige “Redireccionamiento web”', 'En la sección “4 Configuración Técnica”, selecciona la opción redireccionamiento web. Ojo: si tenías servidores DNS informados, se borran.'],
  ['Pega tu enlace de Kiltrazo', `En la dirección web escribe: ${url} y acepta las condiciones de uso.`],
  ['Prueba y guarda', 'Toca “Probar” (debe decir “Es una URL válida”) y luego el botón verde “Actualizar datos del dominio”.'],
  ['Listo', 'Te llega un correo de NIC confirmando el cambio. Puede tardar hasta 24 horas en funcionar. Desde ahí, al escribir tu dominio .cl se abre tu página para pedir hora.'],
];

export function webCard(clinic) {
  const url = clinicUrl(clinic.slug || '');
  return `
    <div class="card ck-web">
      <h2>Tu página para pedir hora</h2>
      <p class="small muted">Compártela en Instagram, WhatsApp o tu sitio. Cualquiera puede pedir hora, tenga o no la app.${clinic.approved === false ? ' <b>Se activa cuando Kiltrazo apruebe tu clínica.</b>' : ''}</p>
      <p class="ck-web-url"><span class="ck-mono">${esc(url)}</span></p>
      <div class="ck-row-end">
        <button type="button" class="btn small secondary" data-web-copy>Copiar enlace</button>
        <a class="btn small ghost" href="${esc(url)}" target="_blank" rel="noopener">Abrir mi página</a>
      </div>
      <details class="ck-domain">
        <summary>¿Tienes un dominio .cl? Úsalo para tu página</summary>
        <ol class="ck-steps">${STEPS(url).map(([t, d]) => `<li><b>${t}</b><br><span class="small">${esc(d)}</span></li>`).join('')}</ol>
        <p class="small muted">⚠️ Si usas ese dominio para el correo o ya tiene un sitio web, esto los apagaría. En ese caso, mejor pon en tu sitio un botón “Pedir hora” con tu enlace de Kiltrazo.</p>
      </details>
      <button type="button" class="btn small primary" data-web-mail>✉️ Enviarme las instrucciones por correo</button>
    </div>`;
}

export function bindWebCard(el, clinic, email) {
  const url = clinicUrl(clinic.slug || '');
  el.querySelector('[data-web-copy]')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(url); toast('Enlace copiado', 'ok'); } catch { prompt('Copia el enlace:', url); }
  });
  el.querySelector('[data-web-mail]')?.addEventListener('click', () => {
    const body = [`Tu página de Kiltrazo para pedir hora: ${url}`, '', 'Cómo usar tu dominio .cl para esa página:', '',
      ...STEPS(url).map(([t, d], i) => `${i + 1}. ${t}\n${d}`), '', 'Kiltrazo Clínica'].join('\n');
    location.href = `mailto:${encodeURIComponent(email || '')}?subject=${encodeURIComponent(`Tu dominio .cl para ${clinic.name}`)}&body=${encodeURIComponent(body)}`;
  });
}
