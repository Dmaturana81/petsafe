// "#/hora/ID": el aviso de 1 hora antes. El tutor confirma que va, o avisa
// que no puede y la hora se cancela.

import { esc, toast } from '../ui.js';

const SERVICES = { consulta: 'Consulta', control: 'Control', vacuna: 'Vacuna', cirugia: 'Cirugía', peluqueria: 'Peluquería', urgencia: 'Urgencia', otro: 'Hora' };

export default async function appointment(el, { id }) {
  const { myAppointment, confirmMyAppointment, cancelMyAppointment, directions } = await import('../clinic/data.js');
  const a = await myAppointment(id).catch(() => null);
  if (!a) {
    el.innerHTML = '<div class="card"><h1>No encontramos esta hora</h1><p>Puede que la clínica la haya cambiado.</p><a class="btn primary" href="#/">Ir al inicio</a></div>';
    return;
  }
  const at = new Date(a.startsAt);
  const day = at.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' }).replace(/^./, (c) => c.toUpperCase());
  const time = at.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: false });
  const home = a.place === 'domicilio';
  const go = !home && a.lat != null ? directions(a) : null;
  const open = ['agendada', 'en_camino'].includes(a.status);

  el.innerHTML = `
    <div class="card appt-card">
      <p class="appt-when">${esc(day)}</p>
      <p class="appt-time">${esc(time)}</p>
      <h1>${esc(a.pet)} · ${SERVICES[a.service] || 'Hora'}</h1>
      <p>${home ? `🏠 A domicilio${a.address ? `: ${esc(a.address)}` : ''}` : `🏥 ${esc(a.clinic)}${a.clinicAddress ? `<br><span class="muted">${esc(a.clinicAddress)}</span>` : ''}`}</p>
      ${!open ? `<p class="appt-state">${a.status === 'cancelada' ? 'Esta hora está cancelada.' : 'Esta hora ya pasó.'}</p>`
        : a.confirmedAt ? `<p class="appt-state ok">✓ Confirmaste que ${home ? 'estarás' : 'vas'}. ¡Te esperamos!</p>`
        : `<div class="appt-btns">
            <button class="btn home big" data-yes>✓ Confirmo, ${home ? 'estaré' : 'voy'}</button>
            <button class="btn ghost" data-no>No puedo ir</button>
          </div>`}
      <div class="clinic-btns">
        ${a.clinicPhone ? `<a class="btn call" href="tel:${esc(a.clinicPhone)}">📞 Llamar</a>` : ''}
        ${go && open ? `<a class="btn secondary" href="${go.google}" target="_blank" rel="noopener">🚗 Cómo llegar</a>` : ''}
      </div>
    </div>`;

  el.querySelector('[data-yes]')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      await confirmMyAppointment(id);
      toast('¡Listo! La clínica sabe que vas.', 'ok');
      appointment(el, { id });
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });
  el.querySelector('[data-no]')?.addEventListener('click', async () => {
    if (!confirm('¿Cancelar esta hora? Le avisaremos a la clínica para que la ocupe otra mascota.')) return;
    try {
      await cancelMyAppointment(id);
      toast('Hora cancelada. Le avisamos a la clínica.', 'ok');
      appointment(el, { id });
    } catch (err) {
      toast(err.message, 'bad');
    }
  });
}
