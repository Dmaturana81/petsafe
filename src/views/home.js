import { latestSuccesses, countComments, myPets } from '../data.js';
import { esc, timeAgo } from '../ui.js';
import { SUPPORT_URL } from '../config.js';
import { supportCard } from './privacy.js';
import { homeNearby } from '../nearby.js';

const shortDay = (day) => new Date(`${day}T12:00:00`).toLocaleDateString('es-CL', { weekday: 'short', day: 'numeric', month: 'short' });

// Operativos de la municipalidad del tutor (según la comuna de su perfil).
async function homeDrives(box, user) {
  if (!user.comuna) {
    box.innerHTML = `
      <a class="register-cta" href="#/perfil">
        <span>🏛️</span>
        <span><strong>Elige tu comuna</strong><small>Te avisamos de los operativos de tu municipalidad</small></span>
        <span class="chev">›</span>
      </a>`;
    return;
  }
  const { comunaDrives } = await import('../clinic/data.js');
  const list = await comunaDrives();
  box.innerHTML = list.map((d) => `
    <a class="register-cta" href="#/operativo/${esc(d.id)}">
      <span>🏛️</span>
      <span><strong>${esc(d.title)}</strong><small>${esc(shortDay(d.day))}, ${esc(d.starts)} a ${esc(d.ends)}${d.place ? ` · ${esc(d.place)}` : ''} · ${esc(d.muni)}</small></span>
      <span class="chev">›</span>
    </a>`).join('');
}

export default async function home(el, _params, { user }) {
  const [successes, counts, pets] = await Promise.all([latestSuccesses(6), countComments(), myPets(user)]);
  const lostPets = pets.filter((p) => p.status === 'lost');

  el.innerHTML = `
    <section class="hero">
      <h1>Hola, ${esc(user.name.split(' ')[0])} 👋</h1>
      <p>Juntos llevamos a cada mascota de vuelta a casa.</p>
    </section>

    ${lostPets.length ? `
      <div class="alert-strip">
        <strong>Aviso activo:</strong> buscando a ${lostPets.map((p) => esc(p.name)).join(', ')}.
      </div>` : ''}

    <section class="big-actions">
      <a class="big-btn lost" href="#/perdi">
        <span class="big-emoji">😢</span>
        <span><strong>Perdí mi mascota</strong><small>Activa el aviso y buscamos coincidencias</small></span>
      </a>
      <a class="big-btn found" href="#/encontre">
        <span class="big-emoji">🔍</span>
        <span><strong>Encontré una mascota</strong><small>Escanea su cara y avisamos al dueño</small></span>
      </a>
      <a class="big-btn home" href="#/recuperada">
        <span class="big-emoji">🏡</span>
        <span><strong>Ya encontré mi mascota</strong><small>Quita el aviso de mascota perdida</small></span>
      </a>
    </section>

    <div id="nearby"></div>

    <div id="home-drives" class="home-drives"></div>

    <a class="register-cta clinics-cta" href="#/clinicas">
      <span>🏥</span>
      <span><strong>Clínicas cercanas</strong><small>Para una urgencia: llama o ve al tiro</small></span>
      <span class="chev">›</span>
    </a>

    <a class="register-cta" href="#/registrar">
      <span>🐾</span>
      <span><strong>Registrar mascota</strong><small>Gratis · escaneo facial en segundos</small></span>
      <span class="chev">›</span>
    </a>

    <section>
      <h2 class="section-title">Reencuentros felices 💛</h2>
      ${successes.length ? `
        <div class="success-grid">
          ${successes.map((s) => `
            <a class="success-card" href="#/caso/${s.id}">
              <img src="${esc(s.photo)}" alt="${esc(s.petName)}" loading="lazy">
              <div class="success-body">
                <strong>${esc(s.petName)}</strong>
                <small>${timeAgo(s.createdAt)} · 💬 ${counts[s.id] || 0}</small>
              </div>
            </a>`).join('')}
        </div>` : `
        <div class="empty">
          <div class="empty-emoji">🐕‍🦺</div>
          <p>Aquí aparecerán los últimos 6 reencuentros.</p>
        </div>`}
    </section>

    ${SUPPORT_URL ? supportCard() : ''}`;

  homeDrives(el.querySelector('#home-drives'), user).catch((err) => console.warn('Operativos', err));
  await homeNearby(el.querySelector('#nearby'), user).catch((err) => console.warn('Avisos cerca', err));
}
