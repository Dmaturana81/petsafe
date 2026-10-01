// "Mi veterinaria" en el perfil del tutor: el código (y QR) para que su
// clínica vincule a la mascota en Kiltrazo Clínica, y lo que la clínica
// registró: vacunas y próximas horas. Las notas clínicas no se muestran.

import { esc, toast } from '../ui.js';
import { createPetCode, petHealth, unlinkPet } from '../clinic/data.js';

const SERVICES = { consulta: 'Consulta', control: 'Control', vacuna: 'Vacuna', cirugia: 'Cirugía', peluqueria: 'Peluquería', otro: 'Hora' };
const fmt = (d) => (d ? String(d).slice(0, 10).split('-').reverse().join('-') : '');

export async function mountPetVet(box, pet) {
  box.innerHTML = '<p class="muted small">Cargando…</p>';
  let health = { clinics: [], vaccines: [], appointments: [] };
  try {
    health = await petHealth(pet.id);
  } catch (err) {
    console.warn('Mi veterinaria', err);
  }
  const t = new Date().toISOString().slice(0, 10);
  // La dosis más reciente de cada vacuna es la que manda.
  const seen = new Set();
  const current = health.vaccines.filter((v) => !seen.has(v.name.toLowerCase()) && seen.add(v.name.toLowerCase()));

  box.innerHTML = `
    ${health.appointments.length ? `<h3>Próximas horas</h3><ul class="vet-list">${health.appointments.map((a) => `
      <li><strong>${new Date(a.startsAt).toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</strong>
      <small>${SERVICES[a.service] || 'Hora'} · ${esc(a.clinic)}</small></li>`).join('')}</ul>` : ''}
    ${current.length ? `<h3>Carnet de vacunas</h3><ul class="vet-list">${current.map((v) => `
      <li><strong>${esc(v.name)}</strong><small>Puesta ${fmt(v.appliedOn)} en ${esc(v.clinic)}${v.nextDue ? ` · próxima <b class="${v.nextDue < t ? 'late' : ''}">${fmt(v.nextDue)}</b>` : ''}</small></li>`).join('')}</ul>` : ''}
    ${health.clinics.length ? `<p class="small">Compartida con ${health.clinics.map((c) => `<strong>${esc(c.name)}</strong> <button class="link small" data-unlink="${c.id}">dejar de compartir</button>`).join(', ')}.</p>` : ''}
    <div class="vet-code">
      <p class="small">Muestra este código en tu veterinaria para que registre las vacunas y horas de ${esc(pet.name)} y te avise antes de cada dosis. Verán su nombre, tipo, raza y foto, y tu nombre, teléfono y correo. Sirve una vez y dura 24 horas.</p>
      <button class="btn small secondary" data-code>Mostrar código para mi veterinaria</button>
      <div class="vet-code-out" hidden></div>
    </div>`;

  box.querySelector('[data-code]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const code = await createPetCode(pet.id);
      const url = `${location.origin}${location.pathname}#/clinica/vincular/${code}`;
      const out = box.querySelector('.vet-code-out');
      out.hidden = false;
      out.innerHTML = `<b class="vet-code-big">${esc(code)}</b>`;
      e.target.hidden = true;
      const QR = (await import('qrcode')).default;
      out.insertAdjacentHTML('beforeend', `<img alt="QR para la veterinaria" class="vet-qr" src="${await QR.toDataURL(url, { margin: 1, width: 220, color: { dark: '#4a3428' } })}">`);
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });

  box.querySelectorAll('[data-unlink]').forEach((b) => b.addEventListener('click', async () => {
    const c = health.clinics.find((x) => x.id === b.dataset.unlink);
    if (!confirm(`¿Dejar de compartir a ${pet.name} con ${c.name}? La clínica conserva su ficha, pero ya no te avisará por Kiltrazo.`)) return;
    await unlinkPet(pet.id, c.id);
    toast('Listo', 'ok');
    box.dataset.ready = '';
    mountPetVet(box, pet);
  }));
}
