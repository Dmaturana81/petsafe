// Buscador de veterinarios (…/#/veterinarios): la página de entrada para quien
// llega por la web, sin la app. Junta todas las clínicas y veterinarios a
// domicilio que usan Kiltrazo, con filtro por especialidad, y lleva a la
// página de cada uno para pedir hora.

import { esc, getLocation } from '../ui.js';
import { showClinics } from '../map.js';
import { SPECIALTIES, specTags } from '../clinic/specialties.js';

const plain = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const kmText = (km) => (km == null ? '' : km < 1 ? 'a menos de 1 km' : `a ${String(km).replace('.', ',')} km`);

export default async function finder(el) {
  document.title = 'Encuentra veterinario · Kiltrazo';
  el.innerHTML = '<div class="card"><p class="muted">Cargando veterinarios…</p></div>';
  const { nearbyClinics, listBanners, bannerClick } = await import('../clinic/data.js');
  let here = null;
  let [all, banners] = await Promise.all([nearbyClinics(null, null, 50).catch(() => []), listBanners().catch(() => [])]);
  const st = { q: '', spec: '', urgent: false, home: false };

  el.innerHTML = `
    <div class="fd">
      <header class="fd-top">
        <a href="#/veterinarios" class="fd-brand"><img src="brand/kiltrazo.svg" alt="Kiltrazo"></a>
        <nav><a href="#/clinica">¿Eres veterinario?</a><a class="btn small secondary" href="#/perfil">Abrir la app</a></nav>
      </header>
      <section class="fd-hero">
        <h1>Encuentra veterinario cerca de ti</h1>
        <p>Clínicas y veterinarios a domicilio que usan Kiltrazo. Pide hora en línea, tengas o no la app.</p>
        <form class="form fd-search" role="search">
          <label class="fd-q"><span class="sr">Comuna o nombre</span><input name="q" type="search" placeholder="Comuna o nombre, por ejemplo Ñuñoa" autocomplete="off"></label>
          <label class="fd-spec"><span class="sr">Especialidad</span><select name="spec"><option value="">Todas las especialidades</option>
            ${Object.entries(SPECIALTIES).map(([k, l]) => `<option value="${k}">${l}</option>`).join('')}</select></label>
          <button type="button" class="btn primary" data-near>📍 Cerca de mí</button>
        </form>
        <div class="fd-toggles">
          <label class="chip"><input type="checkbox" name="urgent"> 🚨 Urgencias</label>
          <label class="chip"><input type="checkbox" name="home"> 🏠 A domicilio</label>
        </div>
      </section>
      ${banners.length ? `<section class="fd-ads" aria-label="Publicidad">
        <span class="fd-ad-label">Publicidad</span>
        ${banners.map((b, i) => `<a class="fd-ad ${i ? '' : 'on'}" data-ad="${esc(b.id)}" ${b.link ? `href="${esc(b.link)}" target="_blank" rel="noopener sponsored"` : ''}><img src="${esc(b.image)}" alt="${esc(b.title)}"></a>`).join('')}
        ${banners.length > 1 ? `<div class="fd-ad-dots">${banners.map((_, i) => `<button type="button" aria-label="Ver aviso ${i + 1}" data-dot="${i}" class="${i ? '' : 'on'}"></button>`).join('')}</div>` : ''}
      </section>` : ''}
      <section class="fd-body">
        <div class="fd-list" id="fd-list"></div>
        <div class="fd-map-wrap"><div class="fd-map" id="fd-map"></div></div>
      </section>
      <section class="fd-app card">
        <img src="brand/kiltrazo.svg" alt="" class="fd-app-logo">
        <div>
          <h2>Kiltrazo, la app gratis para tu mascota</h2>
          <ul class="web-list">
            <li>🐶 La registras escaneando su cara, como Face ID.</li>
            <li>🔎 Si se pierde, avisamos a los vecinos y la reconocemos cuando alguien la encuentra.</li>
            <li>📅 Pides hora en segundos y te avisamos 1 hora antes.</li>
          </ul>
          <a class="btn primary" href="#/perfil">Crear mi cuenta gratis</a>
        </div>
      </section>
      <footer class="fd-foot">
        <p><b>¿Tienes una veterinaria o atiendes a domicilio?</b> Kiltrazo Clínica es gratis: agenda, fichas y tu página para pedir hora. <a href="#/clinica">Súmate</a></p>
      </footer>
    </div>`;

  const form = el.querySelector('.fd-search');
  const listEl = el.querySelector('#fd-list');
  let map = null;

  const match = (c) => (!st.spec || c.specialties?.includes(st.spec))
    && (!st.urgent || c.emergencies) && (!st.home || c.homeVisits || c.onlyHome)
    && (!st.q || plain(`${c.name} ${c.address}`).includes(plain(st.q)));

  const card = (c) => `
    <article class="card fd-card" data-id="${c.id}">
      <div class="clinic-top"><strong>${esc(c.name)}</strong>${c.km != null ? `<span class="clinic-km">${kmText(c.km)}</span>` : ''}</div>
      <div class="clinic-tags">
        ${c.onlyHome ? '<span class="clinic-tag home">🏠 Veterinario a domicilio</span>' : ''}
        ${c.emergencies ? '<span class="clinic-tag urgent">Urgencias</span>' : ''}
        ${c.homeVisits && !c.onlyHome ? '<span class="clinic-tag">A domicilio</span>' : ''}
      </div>
      ${c.specialties?.length ? `<div class="spec-tags">${specTags(c.specialties)}</div>` : ''}
      ${c.address ? `<p class="small">${c.onlyHome ? 'Atiende en: ' : '📍 '}${esc(c.address)}</p>` : ''}
      ${c.hours ? `<p class="small muted">🕒 ${esc(c.hours)}</p>` : ''}
      <div class="fd-card-btns">
        ${c.slug ? `<a class="btn primary small" href="#/c/${esc(c.slug)}">📅 ${c.onlyHome ? 'Pedir visita' : 'Ver y pedir hora'}</a>` : ''}
        ${c.phone ? `<a class="btn small call" href="tel:${esc(c.phone)}">📞 Llamar</a>` : ''}
      </div>
    </article>`;

  const draw = () => {
    const shown = all.filter(match);
    listEl.innerHTML = `
      <p class="fd-count">${shown.length ? `${shown.length} ${shown.length === 1 ? 'resultado' : 'resultados'}${here ? ', los más cercanos primero' : ''}` : ''}</p>
      ${shown.map(card).join('') || `<div class="card"><p>No encontramos veterinarios con esa búsqueda.</p><p class="small muted">Prueba con otra comuna o especialidad. Kiltrazo recién está sumando clínicas.</p></div>`}`;
    const old = el.querySelector('#fd-map');
    const fresh = document.createElement('div');
    fresh.className = 'fd-map';
    fresh.id = 'fd-map';
    old.replaceWith(fresh);
    map = showClinics(fresh, shown, here, (c) => {
      const cardEl = listEl.querySelector(`[data-id="${c.id}"]`);
      listEl.querySelectorAll('.fd-card.on').forEach((x) => x.classList.remove('on'));
      cardEl?.classList.add('on');
      cardEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    if (!here && shown.length > 1) map.fitBounds(shown.map((c) => [c.lat, c.lng]), { padding: [30, 30], maxZoom: 14 });
  };

  form.addEventListener('input', () => { st.q = form.q.value.trim(); st.spec = form.spec.value; draw(); });
  form.addEventListener('submit', (e) => e.preventDefault());
  el.querySelectorAll('.fd-toggles input').forEach((i) => i.addEventListener('change', () => {
    st[i.name] = i.checked;
    i.closest('.chip').classList.toggle('on', i.checked);
    draw();
  }));
  el.querySelector('[data-near]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Buscando…';
    here = await getLocation();
    if (here) all = await nearbyClinics(here.lat, here.lng, 50).catch(() => all);
    e.target.disabled = false;
    e.target.textContent = here ? '📍 Cerca de ti' : '📍 Cerca de mí';
    draw();
  });
  // Publicidad: uno a la vez, rotando cada 6 segundos.
  const ads = [...el.querySelectorAll('.fd-ad')];
  const dots = [...el.querySelectorAll('[data-dot]')];
  let at = 0;
  const showAd = (i) => {
    at = (i + ads.length) % ads.length;
    ads.forEach((a, k) => a.classList.toggle('on', k === at));
    dots.forEach((d, k) => d.classList.toggle('on', k === at));
  };
  dots.forEach((d) => d.addEventListener('click', () => showAd(Number(d.dataset.dot))));
  ads.forEach((a) => a.addEventListener('click', () => bannerClick(a.dataset.ad)));
  if (ads.length > 1) {
    const timer = setInterval(() => (document.body.contains(el.querySelector('.fd-ads')) ? showAd(at + 1) : clearInterval(timer)), 6000);
  }
  draw();
}
