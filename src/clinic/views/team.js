// Equipo de la clínica: quién entra, con qué rol, y códigos para invitar.

import { esc, toast, getLocation } from '../../ui.js';
import { createInvite, removeMember, saveClinic } from '../data.js';
import { ROLES } from '../ui.js';

export default function team(el, _params, ctx) {
  const { clinic, team: people, me } = ctx;
  const admin = clinic.isAdmin;
  const link = `${location.origin}${location.pathname}#/clinica`;

  el.innerHTML = `
    <header class="ck-head"><div><h1>Equipo</h1><p class="ck-sub">${esc(clinic.name)}</p></div></header>
    <div class="ck-cols-2">
      <div class="card ck-list">
        <h2>Personas</h2>
        ${people.map((m) => `
          <div class="ck-member">
            <span><strong>${esc(m.name || 'Sin nombre')}</strong><small>${ROLES[m.role]}${m.isAdmin ? ' · administra' : ''}${m.userId === me.userId ? ' · tú' : ''}</small></span>
            ${admin && m.userId !== me.userId ? `<button class="link danger small" data-rm="${m.userId}">Quitar</button>` : ''}
          </div>`).join('')}
      </div>
      <div class="ck-stack">
        ${admin ? `
          <div class="card form">
            <h2>Invitar a alguien</h2>
            <p class="muted small">Genera un código y envíaselo. La persona entra a <span class="ck-mono">${esc(link)}</span>, crea su cuenta y toca "Me invitaron". Cada código sirve una vez y dura 7 días.</p>
            <label>Rol<select id="ck-inv-role"><option value="vet">Veterinario/a</option><option value="recepcion">Recepción</option></select></label>
            <button class="btn secondary" id="ck-inv">Generar código</button>
            <p class="ck-code" id="ck-inv-code" hidden></p>
          </div>
          <form class="card form" id="ck-clinic">
            <h2>Datos de la clínica</h2>
            <label>Nombre<input name="name" required maxlength="120" value="${esc(clinic.name)}"></label>
            <label>Dirección<input name="address" value="${esc(clinic.address)}"></label>
            <label>Teléfono<input name="phone" type="tel" value="${esc(clinic.phone)}"></label>
            <label>Horario<input name="hours" maxlength="120" value="${esc(clinic.hours || '')}" placeholder="Ej.: Lun a Vie 9 a 19, Sáb 10 a 14"></label>
            <label class="ck-check"><input type="checkbox" name="homeVisits" ${clinic.homeVisits ? 'checked' : ''}> Hacemos visitas a domicilio (los tutores podrán pedirlas)</label>
            <label class="ck-check"><input type="checkbox" name="emergencies" ${clinic.emergencies ? 'checked' : ''}> Atendemos urgencias</label>
            <label class="ck-check"><input type="checkbox" name="onMap" ${clinic.onMap ? 'checked' : ''}> Aparecer en el mapa de clínicas de Kiltrazo (los tutores ven nombre, dirección, teléfono y horario)</label>
            <div class="ck-map-pick">
              <p class="small muted">Marca la clínica en el mapa (toca o arrastra la huella).</p>
              <div class="ck-map" id="ck-map"></div>
              <button type="button" class="link small" id="ck-here">📍 Estoy en la clínica: usar mi ubicación</button>
            </div>
            <button class="btn primary small">Guardar</button>
          </form>` : '<div class="card"><p>Solo quien administra la clínica puede invitar o quitar personas.</p></div>'}
        <div class="card">
          <h2>Qué puede hacer cada rol</h2>
          <p class="small"><strong>Veterinario/a:</strong> todo, incluidas las consultas.</p>
          <p class="small"><strong>Recepción:</strong> agenda, sala de espera, pacientes, vacunas y exámenes. Ve el historial, pero no escribe consultas.</p>
        </div>
      </div>
    </div>`;

  el.querySelector('#ck-inv')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      const role = el.querySelector('#ck-inv-role').value;
      const code = await createInvite(clinic.id, role);
      const box = el.querySelector('#ck-inv-code');
      box.hidden = false;
      box.innerHTML = `<b>${esc(code)}</b><small>para ${ROLES[role].toLowerCase()}</small>`;
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      e.target.disabled = false;
    }
  });

  el.querySelectorAll('[data-rm]').forEach((b) => b.addEventListener('click', async () => {
    const m = people.find((x) => x.userId === b.dataset.rm);
    if (!confirm(`¿Quitar a ${m.name} del equipo? Ya no podrá entrar a la clínica.`)) return;
    await removeMember(clinic.id, m.userId);
    ctx.refresh();
  }));

  // Ubicación de la clínica para el mapa de urgencias.
  let point = clinic.lat != null && clinic.lng != null ? { lat: clinic.lat, lng: clinic.lng } : null;
  const mapEl = el.querySelector('#ck-map');
  if (mapEl) {
    import('../../map.js').then(({ pickPoint }) => {
      const picker = pickPoint(mapEl, point, (p) => { point = p; });
      el.querySelector('#ck-here').addEventListener('click', async () => {
        const loc = await getLocation();
        loc ? picker.set(loc) : toast('No pudimos obtener tu ubicación', 'bad');
      });
    });
  }

  el.querySelector('#ck-clinic')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    if (f.onMap && !point) return toast('Marca la clínica en el mapa para aparecer en él', 'bad');
    try {
      await saveClinic({
        id: clinic.id, name: f.name.trim(), address: f.address.trim(), phone: f.phone.trim(), hours: f.hours.trim(),
        homeVisits: Boolean(f.homeVisits), emergencies: Boolean(f.emergencies), onMap: Boolean(f.onMap),
        lat: point?.lat ?? null, lng: point?.lng ?? null,
      });
      toast('Datos guardados', 'ok');
      ctx.refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  });
}
