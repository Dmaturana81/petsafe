import { myPets, reportLost, claimFound } from '../data.js';
import { esc, go, changed, timeAgo, toast } from '../ui.js';
import { describe } from '../breeds.js';

// "Perdí mi mascota": activa el aviso y busca en los avisos de "encontré".
export default async function lost(el, _params, { user }) {
  const pets = await myPets(user);

  if (!pets.length) {
    el.innerHTML = `
      <div class="card center">
        <div class="empty-emoji">🐶</div>
        <h1>Primero registra a tu mascota</h1>
        <p>Para buscarla necesitamos su biometría facial.</p>
        <a class="btn primary big" href="#/registrar">Registrar mascota</a>
      </div>`;
    return;
  }

  el.innerHTML = `
    <div class="card">
      <h1>Perdí mi mascota</h1>
      <p>¿Cuál de tus mascotas se perdió? Buscaremos entre las mascotas que otras personas encontraron.</p>
      <div class="pick-list">
        ${pets.map((p) => `
          <button class="pick" data-id="${p.id}">
            <img src="${esc(p.photo)}" alt="">
            <span><strong>${esc(p.name)}</strong><small>${[describe(p), p.status === 'lost' ? 'Aviso activo · buscar otra vez' : 'En casa'].filter(Boolean).map(esc).join(' · ')}</small></span>
          </button>`).join('')}
      </div>
    </div>
    <div id="result"></div>`;

  el.querySelectorAll('.pick').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const pet = pets.find((p) => p.id === btn.dataset.id);
      const result = el.querySelector('#result');
      result.innerHTML = `<div class="card center"><div class="spinner"></div><p>Buscando a ${esc(pet.name)}…</p></div>`;
      result.scrollIntoView({ behavior: 'smooth' });
      let res;
      try {
        res = await reportLost(pet);
      } catch (err) {
        result.innerHTML = `<div class="card center"><h2>No se pudo activar el aviso</h2><p>${esc(err.message)}</p><p class="muted">Revisa tu conexión e inténtalo de nuevo.</p></div>`;
        return;
      }
      changed();
      if (res.match) return go(`#/encontrada/${res.match.id}`);
      result.innerHTML = `
        <div class="card center">
          <div class="empty-emoji">📣</div>
          <h2>Aviso activo para ${esc(pet.name)}</h2>
          <p>${res.suggestions.length ? 'No hay una coincidencia segura, pero alguien encontró mascotas parecidas. ¿Es alguna de estas?' : 'Todavía nadie la ha escaneado. Te enviaremos una notificación apenas alguien la encuentre.'}</p>
        </div>
        ${res.suggestions.length ? `
          <div class="card">
            <h2>¿Es ${esc(pet.name)}?</h2>
            <ul class="pet-list suggestions">
              ${res.suggestions.map((f) => `
                <li><img src="${esc(f.photo)}" alt=""><span><strong>Encontrada ${timeAgo(f.createdAt)}</strong><small>Parecido ${Math.round(f.score * 100)}%</small></span>
                <button class="btn small primary" data-claim="${esc(f.id)}">¡Es ${esc(pet.name)}!</button></li>`).join('')}
            </ul>
            <p class="muted small">Si es tu mascota, verás dónde está y el contacto de quien la encontró.</p>
          </div>` : ''}
        <a class="btn secondary" href="#/">Volver al inicio</a>`;
      result.querySelectorAll('[data-claim]').forEach((b) =>
        b.addEventListener('click', async () => {
          b.disabled = true;
          try {
            await claimFound(pet, b.dataset.claim);
            go(`#/encontrada/${b.dataset.claim}`);
          } catch (err) {
            toast(err.message);
            b.disabled = false;
          }
        }),
      );
    }),
  );
}
