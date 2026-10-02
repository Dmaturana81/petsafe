// Página propia de la clínica (…/?c=nombre) y cómo apuntar un dominio .cl a ella.

import { esc, toast } from '../ui.js';

export const clinicUrl = (slug) => `${location.origin}${location.pathname}?c=${encodeURIComponent(slug)}`;

const STEPS = (url) => [
  ['Crea una cuenta gratis en Cloudflare', 'Entra a cloudflare.com, crea tu cuenta y toca “Agregar un dominio”. Escribe tu dominio (por ejemplo, veterinarialosaromos.cl) y elige el plan Free.'],
  ['Copia los dos “servidores de nombres”', 'Cloudflare te muestra dos nombres parecidos a ana.ns.cloudflare.com y bob.ns.cloudflare.com.'],
  ['Cámbialos en nic.cl', 'Entra a nic.cl con tu cuenta, abre tu dominio y reemplaza los “servidores de nombre (DNS)” por los dos de Cloudflare. Guarda. El cambio puede demorar unas horas.'],
  ['Agrega dos registros en Cloudflare', 'En DNS → Registros, agrega un registro tipo A con nombre @ y dirección 192.0.2.1, con la nube naranja (Proxy) activada. Agrega otro igual con nombre www.'],
  ['Crea la redirección', `En Reglas → Reglas de redirección, crea una regla para “Todas las solicitudes entrantes”, tipo Estática, código 301 y URL de destino: ${url}`],
  ['Listo', 'Al abrir tu dominio .cl se abre tu página de Kiltrazo para pedir hora.'],
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
        <p class="small muted">💡 Si ya tienes un sitio web, basta con poner un botón “Pedir hora” que lleve a tu página de Kiltrazo.</p>
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
