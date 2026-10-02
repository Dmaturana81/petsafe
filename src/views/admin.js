import {
  allPets, savePet, allFound, saveFound, deleteFound, listUsers, moveUserPets, notify, notifyAll,
  latestSuccesses, deleteSuccess, commentsFor, deleteComment, addSuccess, markRecovered,
  trainingPhotos, CLOUD, isAdmin, claimAdmin, adminExists, listContacts, markContactRead, deleteContact, pushConfigured, savePushKey, enablePush,
} from '../data.js';
import { generateVapidKeys } from '../notify.js';
import { mountEmailLogin } from './login-email.js';
import { esc, timeAgo, toast, changed } from '../ui.js';
import { SPECIES, describe } from '../breeds.js';
import { zip, fromDataUrl } from '../zip.js';
import { THRESHOLDS, SUGGEST_MARGIN } from '../biometrics.js';

// PIN de prototipo. En producción el acceso de administrador debe
// validarse en el servidor con un rol de usuario.
const ADMIN_PIN = import.meta.env.VITE_ADMIN_PIN || '1234';

export default async function admin(el, _params, ctx) {
  if (CLOUD ? !(await isAdmin()) : sessionStorage.getItem('petsafe-admin') !== 'ok') {
    return CLOUD ? claim(el, ctx) : login(el, ctx);
  }

  const tab = sessionStorage.getItem('petsafe-admin-tab') || 'alertas';
  el.innerHTML = `
    <div class="admin-page">
    <div class="admin-head">
      <h1>Administrador</h1>
      <div class="tabs">
        ${[['alertas', '🚨 Alertas'], ['recon', '🎯 Reconocimiento'], ['mensajes', '📢 Mensajes'], ['usuarios', '👥 Usuarios'], ['clinicas', '🏥 Clínicas'], ['casos', '💛 Reencuentros'], ['datos', '📋 Datos']]
          .map(([k, l]) => `<button class="tab ${k === tab ? 'on' : ''}" data-tab="${k}">${l}</button>`).join('')}
      </div>
    </div>
    <div id="panel"></div>
    </div>`;

  el.querySelectorAll('.tab').forEach((b) =>
    b.addEventListener('click', () => {
      sessionStorage.setItem('petsafe-admin-tab', b.dataset.tab);
      ctx.refresh();
    }),
  );

  const panel = el.querySelector('#panel');
  await ({ alertas, recon, mensajes, usuarios, clinicas, casos, datos })[tab](panel, ctx);
}

// Con Supabase el permiso vive en el servidor: se entra con un correo de
// administrador. Solo mientras no haya ninguno, el primer usuario que lo pide
// queda como administrador (tabla admins).
async function claim(el, { refresh }) {
  el.innerHTML = `
    <div class="card">
      <h1>Administrador 🔐</h1>
      <p>Entra con tu correo y clave de administrador; así lo eres en cualquier dispositivo. Si aún no tienes clave, créala en Perfil → Tu cuenta, o toca "Olvidé mi contraseña".</p>
      <div id="email-login"></div>
    </div>
    <div class="card" id="first-time" hidden>
      <h2>¿Primera vez?</h2>
      <p>Si aún no hay administrador, el primer usuario que toque este botón lo será.</p>
      <button class="btn secondary" id="claim">Soy el administrador</button>
    </div>`;
  mountEmailLogin(el.querySelector('#email-login'), {
    after: '#/admin',
    async onDone() {
      if (!(await isAdmin())) toast('Entraste, pero ese correo no es administrador.', 'bad');
      window.dispatchEvent(new Event('petsafe:changed'));
      refresh();
    },
  });
  el.querySelector('#claim').addEventListener('click', async () => {
    if (await claimAdmin()) refresh();
    else toast('Ya hay un administrador. Pídele acceso.', 'bad');
  });
  if ((await adminExists()) === false) el.querySelector('#first-time').hidden = false;
}

function login(el, { refresh }) {
  el.innerHTML = `
    <div class="card">
      <h1>Administrador 🔐</h1>
      <form class="form" id="pin">
        <label>PIN<input name="pin" type="password" inputmode="numeric" required autocomplete="off"></label>
        <button class="btn primary big">Entrar</button>
      </form>
    </div>`;
  el.querySelector('#pin').addEventListener('submit', (e) => {
    e.preventDefault();
    if (new FormData(e.target).get('pin') === ADMIN_PIN) {
      sessionStorage.setItem('petsafe-admin', 'ok');
      refresh();
    } else toast('PIN incorrecto', 'bad');
  });
}

// Qué tan bien reconoce la app: cómo terminó cada aviso de "encontré" y con
// qué parecido, para ajustar el umbral con datos reales.
async function recon(panel) {
  const [pets, found] = await Promise.all([allPets(), allFound()]);
  const petName = (id) => pets.find((p) => p.id === id)?.name || '?';
  const trainPets = pets.filter((p) => p.trainOk);
  const match = THRESHOLDS.dino, suggest = THRESHOLDS.dino - SUGGEST_MARGIN;
  const pct = (v) => `${Math.round(v * 100)}%`;
  const all = [...found].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Escaneos de una mascota propia sin ligar a otra: pruebas del dueño, aparte.
  const isTest = (f) => f.ownScore != null && !f.petId;
  const tests = all.filter(isTest);
  const list = all.filter((f) => !isTest(f));
  const count = (fn) => list.filter(fn).length;
  const auto = count((f) => f.petId && f.matchKind === 'auto');
  const people = count((f) => f.petId && (f.matchKind === 'finder' || f.matchKind === 'owner'));
  const old = count((f) => f.petId && !f.matchKind);
  const none = count((f) => !f.petId);
  const share = (n) => (list.length ? ` (${Math.round((n / list.length) * 100)}%)` : '');

  const how = (f) => (isTest(f) ? ['test', 'Prueba con tu propia mascota']
    : !f.petId ? ['none', 'Sin mascota ligada']
    : f.matchKind === 'auto' ? ['auto', `Match automático con ${esc(petName(f.petId))}`]
      : f.matchKind === 'finder' ? ['people', `Quien la encontró eligió a ${esc(petName(f.petId))}`]
        : f.matchKind === 'owner' ? ['people', `El dueño reconoció a ${esc(petName(f.petId))}`]
          : ['old', `Ligada a ${esc(petName(f.petId))} (antes de medir)`]);
  // Barra de 50% a 100% con marcas en los umbrales de sugerencia y de match.
  const pos = (v) => `${Math.min(100, Math.max(0, ((v - 0.5) / 0.5) * 100))}%`;
  const bar = (label, v) => (v == null ? '' : `
    <div class="score-row"><span>${label}</span><strong>${pct(v)}</strong></div>
    <div class="score-bar"><i class="mark suggest" style="left:${pos(suggest)}"></i><i class="mark match" style="left:${pos(match)}"></i><b class="${v >= match ? 'hi' : v >= suggest ? 'mid' : 'lo'}" style="width:${pos(v)}"></b></div>`);

  panel.innerHTML = `
    <div class="card">
      <h2>Resumen (${list.length} avisos de "encontré")</h2>
      <p class="muted small">Sin contar tus pruebas con mascotas propias.</p>
      <div class="stat-grid">
        <div class="stat hi"><strong>${auto}${share(auto)}</strong><small>Match automático</small></div>
        <div class="stat mid"><strong>${people}${share(people)}</strong><small>Confirmados por una persona</small></div>
        <div class="stat lo"><strong>${none}${share(none)}</strong><small>Sin mascota ligada</small></div>
        <div class="stat"><strong>${tests.length}</strong><small>Pruebas con mascotas propias</small></div>
      </div>
      ${old ? `<p class="muted small">${old} avisos se ligaron antes de empezar a medir y no se cuentan arriba.</p>` : ''}
      <p class="muted small">Match automático desde ${pct(match)} de parecido en la cara. Entre ${pct(suggest)} y ${pct(match)} se muestra como sugerencia "¿es esta?".</p>
    </div>

    <div class="card">
      <h2>Fotos para entrenar</h2>
      <p><strong>${trainPets.length}</strong> mascotas con permiso · <strong>${trainPets.reduce((n, p) => n + (p.trainPhotos || 0), 0)}</strong> fotos guardadas.</p>
      <p class="muted small">Se guardan solo cuando el dueño marca la casilla al registrar. Para entrenar bien hacen falta unas 100 mascotas.</p>
      ${trainPets.length ? '<button class="btn secondary" id="train-zip">Descargar fotos (ZIP)</button>' : ''}
    </div>

    <div class="card">
      <h2>Cómo calibrar</h2>
      <ol class="small">
        <li>Registra a tu mascota. Después, en "Encontré una mascota", escanéala desde tu misma cuenta: queda como prueba con tu mascota.</li>
        <li>Haz lo mismo con otra luz y otro ángulo, y también con un perro distinto.</li>
        <li>Si tus pruebas con la misma mascota quedan entre ${pct(suggest)} y ${pct(match)}, el umbral está alto. Si un perro distinto supera ${pct(match)}, está bajo.</li>
      </ol>
    </div>

    <div class="card">
      <h2>Cada escaneo</h2>
      ${all.length ? `<ul class="recon-list">${all.map((f) => {
        const [tone, text] = how(f);
        return `
        <li>
          <img src="${esc(f.photo)}" alt="">
          <div>
            <strong class="tone-${tone}">${text}</strong>
            <small>${timeAgo(f.createdAt)} · ${esc(f.finderName)}</small>
            ${bar('Parecido con la mascota ligada', f.matchScore)}
            ${f.petId ? '' : bar('Más parecida de otros dueños', f.bestScore)}
            ${bar('Parecido con tu propia mascota', f.ownScore)}
          </div>
        </li>`;
      }).join('')}</ul>` : '<p class="muted">Todavía no hay escaneos de mascotas encontradas.</p>'}
    </div>`;

  panel.querySelector('#train-zip')?.addEventListener('click', async (e) => {
    e.target.disabled = true;
    e.target.textContent = 'Preparando…';
    try {
      const files = await trainingPhotos();
      download(`kiltrazo-entrenamiento-${day(new Date().toISOString())}.zip`, zip(files));
    } catch (err) {
      toast(`No se pudo descargar: ${err.message}`, 'bad');
    } finally {
      e.target.disabled = false;
      e.target.textContent = 'Descargar fotos (ZIP)';
    }
  });
}

async function alertas(panel, { refresh }) {
  const [pets, found, users] = await Promise.all([allPets(), allFound(), listUsers()]);
  const userName = (id) => users.find((u) => u.id === id)?.name || '—';
  const lost = pets.filter((p) => p.status === 'lost');
  const petName = (id) => pets.find((p) => p.id === id)?.name;

  panel.innerHTML = `
    <div class="card">
      <h2>Mascotas perdidas (${lost.length})</h2>
      ${lost.length ? `<ul class="admin-list">${lost.map((p) => `
        <li>
          <img src="${esc(p.photo)}" alt="">
          <span><strong>${esc(p.name)}</strong><small>${describe(p) ? `${esc(describe(p))} · ` : ''}Dueño: ${esc(userName(p.ownerId))} · ${timeAgo(p.lostAt)}</small></span>
          <span class="row-actions">
            <button class="btn small" data-edit="${p.id}">Editar</button>
            <button class="btn small ghost" data-home="${p.id}">Quitar aviso</button>
          </span>
        </li>`).join('')}</ul>` : '<p class="muted">No hay mascotas perdidas.</p>'}
    </div>
    <div class="card">
      <h2>Avisos de mascotas encontradas (${found.length})</h2>
      ${found.length ? `<ul class="admin-list">${found.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).map((f) => `
        <li>
          <img src="${esc(f.photo)}" alt="">
          <span>
            <strong>${f.petId ? `Coincide con ${esc(petName(f.petId) || '?')}` : 'Sin coincidencia'}</strong>
            <small>${esc(f.finderName)} · ${timeAgo(f.createdAt)} · ${f.status === 'open' ? '🟠 Abierto' : '⚪ Cerrado'}${f.bestScore != null ? ` · parecido máx. ${Math.round(f.bestScore * 100)}%` : ''}</small>
          </span>
          <span class="row-actions">
            <button class="btn small" data-toggle="${f.id}">${f.status === 'open' ? 'Cerrar' : 'Reabrir'}</button>
            <button class="btn small danger" data-del="${f.id}">Eliminar</button>
          </span>
        </li>`).join('')}</ul>` : '<p class="muted">No hay avisos.</p>'}
    </div>`;

  panel.querySelectorAll('[data-edit]').forEach((b) =>
    b.addEventListener('click', async () => {
      const pet = pets.find((p) => p.id === b.dataset.edit);
      const name = prompt('Nombre de la mascota', pet.name);
      if (name === null) return;
      const diseases = prompt('Enfermedades', pet.diseases ?? '');
      if (diseases === null) return;
      const vaccines = prompt('Vacunas', pet.vaccines ?? '');
      if (vaccines === null) return;
      await savePet({ ...pet, name, diseases, vaccines });
      toast('Alerta actualizada', 'ok');
      refresh();
    }),
  );
  panel.querySelectorAll('[data-home]').forEach((b) =>
    b.addEventListener('click', async () => {
      await markRecovered(pets.find((p) => p.id === b.dataset.home));
      refresh();
    }),
  );
  panel.querySelectorAll('[data-toggle]').forEach((b) =>
    b.addEventListener('click', async () => {
      const f = found.find((x) => x.id === b.dataset.toggle);
      await saveFound({ ...f, status: f.status === 'open' ? 'closed' : 'open' });
      refresh();
    }),
  );
  panel.querySelectorAll('[data-del]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este aviso?')) return;
      await deleteFound(b.dataset.del);
      refresh();
    }),
  );
}

async function mensajes(panel, { refresh }) {
  const [users, contacts] = await Promise.all([listUsers(), listContacts()]);
  // "Responder" o "Enviar mensaje" desde otra pestaña dejan elegido al destinatario.
  let to = sessionStorage.getItem('petsafe-admin-to') || '*';
  sessionStorage.removeItem('petsafe-admin-to');
  const unread = contacts.filter((c) => !c.read).length;

  panel.innerHTML = `
    <div class="card">
      <h2>Mensajes recibidos${unread ? ` (${unread} sin leer)` : ''}</h2>
      ${contacts.length ? contacts.map((c) => `
        <div class="contact-msg ${c.read ? '' : 'unread'}">
          <strong>${esc(c.name || 'Usuario')}</strong>
          <small class="muted">${esc(c.phone)} · ${timeAgo(c.createdAt)}</small>
          <p>${esc(c.body)}</p>
          <span class="row-actions">
            <button class="btn small" data-reply="${esc(c.userId)}" data-cid="${c.id}">Responder</button>
            ${c.read ? '' : `<button class="btn small ghost" data-readc="${c.id}">Marcar leído</button>`}
            <button class="btn small danger" data-delm="${c.id}">Eliminar</button>
          </span>
        </div>`).join('') : '<p class="muted">Todavía no hay mensajes de usuarios.</p>'}
    </div>
    <div class="card" id="send">
      <h2>Enviar mensaje</h2>
      <form class="form" id="msg">
        <div class="recipient"><strong>Para:</strong> <span id="to-label"></span>
          <button type="button" class="link" id="to-all">Enviar a todos</button></div>
        <input class="search" type="search" id="q" placeholder="Buscar usuario por nombre, teléfono o correo" autocomplete="off">
        <ul class="user-results" id="results"></ul>
        <label>Título<input name="title" required maxlength="80"></label>
        <label>Mensaje<textarea name="body" rows="4" required maxlength="500"></textarea></label>
        <button class="btn primary big">Enviar notificación</button>
      </form>
    </div>`;

  const setTo = (id) => {
    to = users.some((u) => u.id === id) ? id : '*';
    const u = users.find((x) => x.id === to);
    panel.querySelector('#to-label').textContent = u ? `${u.name} · ${u.phone}` : `Todos los usuarios (${users.length})`;
    panel.querySelector('#to-all').hidden = to === '*';
  };
  setTo(to);
  panel.querySelector('#to-all').addEventListener('click', () => setTo('*'));
  userSearch(panel.querySelector('#q'), panel.querySelector('#results'), users, (u) => `
    <li><span><strong>${esc(u.name)}</strong><small>${esc(u.phone)}${u.email ? ` · ${esc(u.email)}` : ''}</small></span>
    <button type="button" class="btn small" data-pick="${esc(u.id)}">Elegir</button></li>`, (el) => {
    el.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () => {
      setTo(b.dataset.pick);
      panel.querySelector('#q').value = '';
      el.innerHTML = '';
    }));
  });

  panel.querySelectorAll('[data-reply]').forEach((b) =>
    b.addEventListener('click', async () => {
      setTo(b.dataset.reply);
      await markContactRead(b.dataset.cid);
      b.closest('.contact-msg').classList.remove('unread');
      panel.querySelector('#send').scrollIntoView({ behavior: 'smooth' });
      panel.querySelector('input[name=title]').focus({ preventScroll: true });
    }),
  );
  panel.querySelectorAll('[data-readc]').forEach((b) =>
    b.addEventListener('click', async () => {
      await markContactRead(b.dataset.readc);
      refresh();
    }),
  );
  panel.querySelectorAll('[data-delm]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este mensaje?')) return;
      await deleteContact(b.dataset.delm);
      refresh();
    }),
  );

  panel.querySelector('#msg').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const msg = { type: 'admin', title: f.get('title').trim(), body: f.get('body').trim() };
    if (to === '*') await notifyAll(msg);
    else await notify(to, msg);
    changed();
    e.target.reset();
    setTo('*');
    toast('Mensaje enviado ✉️', 'ok');
  });
}

// Buscador de usuarios por nombre, apellido, teléfono, correo o dirección
// (sin distinguir mayúsculas ni tildes). Muestra hasta 10 resultados.
function userSearch(input, list, users, row, bind) {
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const digits = (t) => String(t ?? '').replace(/\D/g, '');
  input.addEventListener('input', () => {
    const q = norm(input.value.trim());
    if (!q) return (list.innerHTML = '');
    const qd = digits(q);
    const found = users.filter((u) =>
      [u.name, u.firstName, u.lastName, u.email, u.address].some((v) => norm(v).includes(q)) ||
      (qd.length >= 3 && digits(u.phone).includes(qd)));
    list.innerHTML = found.slice(0, 10).map(row).join('') ||
      '<li><span class="muted">Ningún usuario coincide.</span></li>';
    if (found.length > 10) list.insertAdjacentHTML('beforeend', `<li><span class="muted">y ${found.length - 10} más: escribe algo más específico.</span></li>`);
    bind(list);
  });
}

// Lista de usuarios; al tocar uno se ven sus datos y sus mascotas.
async function usuarios(panel, { refresh }) {
  const [users, pets] = await Promise.all([listUsers(), allPets()]);
  const petsOf = (id) => pets.filter((p) => p.ownerId === id);
  const fullName = (u) => (u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.name) || 'Sin nombre';
  const sorted = [...users].sort((a, b) => fullName(a).localeCompare(fullName(b), 'es'));
  const orphans = pets.filter((p) => !users.some((u) => u.id === p.ownerId));

  const petItem = (p) => `
    <li>
      ${p.photo ? `<img src="${esc(p.photo)}" alt="">` : ''}
      <span><strong>${esc(p.name || 'Sin nombre')}</strong>
        <small>${[describe(p), p.status === 'lost' ? '🔴 Perdida' : '🟢 En casa'].filter(Boolean).map(esc).join(' · ')}</small>
        <small>Enfermedades: ${esc(p.diseases || 'No informó')}</small>
        <small>Vacunas: ${esc(p.vaccines || 'No informó')}</small>
        <small>Registrada ${timeAgo(p.createdAt)}</small></span>
    </li>`;

  panel.innerHTML = `
    <div class="card wide">
      <h2>Usuarios (${users.length}) · Mascotas (${pets.length})</h2>
      <input class="search" type="search" id="uq" placeholder="🔍 Buscar usuario: nombre, teléfono o correo" autocomplete="off">
      <ul class="user-list">${sorted.map((u) => {
        const own = petsOf(u.id);
        return `
        <li data-u="${esc(u.id)}" data-text="${esc([fullName(u), u.phone, u.email, u.address].join(' '))}">
          <button type="button" class="user-row" aria-expanded="false">
            <span><strong>${esc(fullName(u))}</strong><small>${esc([u.email, u.phone].filter(Boolean).join(' · ') || 'Sin datos de contacto')}</small></span>
            <span class="count">🐾 ${own.length}</span>
          </button>
          <div class="user-detail" hidden>
            <p class="small">📞 ${esc(u.phone || 'No informó')}<br>✉️ ${esc(u.email || 'No informó')}<br>🏠 ${esc(u.address || 'No informó')}<br>Usuario desde ${esc(day(u.createdAt) || '—')}<br>${u.promos ? `✅ Acepta ofertas${u.promosAt ? ` desde ${esc(day(u.promosAt))}` : ''}` : '🚫 No acepta ofertas'}</p>
            ${own.length ? `<ul class="pet-list">${own.map(petItem).join('')}</ul>` : '<p class="muted">Sin mascotas registradas.</p>'}
            <span class="row-actions">
              <button type="button" class="btn small" data-msg="${esc(u.id)}">Enviar mensaje</button>
              ${own.length ? `<button type="button" class="btn small ghost" data-move="${esc(u.id)}">Pasar mascotas a otra cuenta</button>` : ''}
            </span>
            <div class="move-box" hidden>
              <p class="small">¿Perdió su celular y no tenía clave? Pídele que abra Kiltrazo en el celular nuevo y escriba su nombre en Perfil. Llámalo a este teléfono para confirmar que es la persona y busca aquí su cuenta nueva.</p>
              <input class="search" type="search" placeholder="🔍 Buscar la cuenta nueva" autocomplete="off">
              <ul class="user-results"></ul>
            </div>
          </div>
        </li>`;
      }).join('') || '<li class="muted">Todavía no hay usuarios.</li>'}</ul>
    </div>
    ${orphans.length ? `
      <div class="card">
        <h2>Mascotas sin perfil de dueño (${orphans.length})</h2>
        <ul class="pet-list">${orphans.map(petItem).join('')}</ul>
      </div>` : ''}`;

  panel.querySelectorAll('.user-row').forEach((b) => b.addEventListener('click', () => {
    const open = b.getAttribute('aria-expanded') !== 'true';
    b.setAttribute('aria-expanded', String(open));
    b.nextElementSibling.hidden = !open;
  }));
  const norm = (t) => String(t ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  panel.querySelector('#uq').addEventListener('input', (e) => {
    const q = norm(e.target.value.trim());
    const qd = q.replace(/\D/g, '');
    panel.querySelectorAll('[data-u]').forEach((li) => {
      const t = norm(li.dataset.text);
      li.hidden = !!q && !t.includes(q) && !(qd.length >= 3 && t.replace(/\D/g, '').includes(qd));
    });
  });
  panel.querySelectorAll('[data-move]').forEach((b) => b.addEventListener('click', () => {
    const from = users.find((u) => u.id === b.dataset.move);
    const box = b.closest('.user-detail').querySelector('.move-box');
    box.hidden = !box.hidden;
    if (box.dataset.ready) return;
    box.dataset.ready = '1';
    const others = users.filter((u) => u.id !== from.id);
    userSearch(box.querySelector('input'), box.querySelector('ul'), others, (u) => `
      <li><span><strong>${esc(fullName(u))}</strong><small>${esc([u.phone, u.email].filter(Boolean).join(' · ') || 'Sin datos')} · desde ${esc(day(u.createdAt))}</small></span>
      <button type="button" class="btn small primary" data-to="${esc(u.id)}">Pasar aquí</button></li>`, (list) => {
      list.querySelectorAll('[data-to]').forEach((t) => t.addEventListener('click', async () => {
        const to = users.find((u) => u.id === t.dataset.to);
        const n = petsOf(from.id).length;
        if (!confirm(`¿Pasar ${n === 1 ? 'la mascota' : `las ${n} mascotas`} de ${fullName(from)} (${from.phone || 'sin teléfono'}) a ${fullName(to)} (${to.phone || 'sin teléfono'})?`)) return;
        try {
          await moveUserPets(from.id, to.id);
          await notify(to.id, { type: 'admin', title: 'Recuperamos tus mascotas 🐾', body: 'Tus mascotas ya están en esta cuenta. Crea una clave en Perfil → Tu cuenta para no perderlas si cambias de celular.' });
          toast('Mascotas traspasadas', 'ok');
          refresh();
        } catch (err) {
          toast(err.message, 'bad');
        }
      }));
    });
  }));
  panel.querySelectorAll('[data-msg]').forEach((b) => b.addEventListener('click', () => {
    sessionStorage.setItem('petsafe-admin-to', b.dataset.msg);
    sessionStorage.setItem('petsafe-admin-tab', 'mensajes');
    refresh();
  }));
}

// Todas las clínicas de Kiltrazo y su equipo. El administrador de Kiltrazo
// maneja cuentas (quién administra cada clínica), no ve fichas clínicas.
async function clinicas(panel, { refresh }) {
  const { allClinics, setClinicAdmin, createInvite, deleteClinic } = await import('../clinic/data.js');
  const { ROLES } = await import('../clinic/ui.js');
  const [clinics, users] = await Promise.all([allClinics(), listUsers()]);
  const emailOf = (id) => users.find((u) => u.id === id)?.email || '';
  const link = `${location.origin}${location.pathname}#/clinica`;

  panel.innerHTML = `
    <div class="card">
      <h2>Si alguien pierde su clave</h2>
      <p class="small"><strong>Recuerda su correo:</strong> que toque "Olvidé mi contraseña" al entrar y siga el enlace que le llega.</p>
      <p class="small"><strong>Perdió también el correo:</strong> quien administra su clínica lo quita del equipo y lo invita de nuevo. Las fichas son de la clínica, no se pierde nada.</p>
      <p class="small"><strong>La clínica se quedó sin administrador:</strong> nombra a otra persona del equipo con "Hacer administrador", o crea un código para alguien nuevo.</p>
    </div>
    <div class="card wide">
      <h2>Clínicas (${clinics.length})</h2>
      <div class="admin-clinics">${clinics.map((c) => {
        const admins = c.members.filter((m) => m.isAdmin).length;
        return `
        <div class="admin-clinic" data-c="${esc(c.id)}">
          <div class="admin-clinic-head">
            <strong>${esc(c.name)}</strong>
            <small>${esc([c.address, c.phone].filter(Boolean).join(' · ') || 'Sin dirección')}</small>
            ${admins ? '' : '<span class="warn">⚠️ Sin administrador</span>'}
          </div>
          <ul class="admin-team">${c.members.map((m) => `
            <li><span><strong>${esc(m.name || 'Sin nombre')}</strong>
              <small>${esc([ROLES[m.role], emailOf(m.userId)].filter(Boolean).join(' · '))}${m.isAdmin ? ' · <b>administra</b>' : ''}</small></span>
              ${m.isAdmin
                ? (admins > 1 ? `<button class="link small" data-adm="${esc(m.userId)}" data-on="">Quitar administrador</button>` : '')
                : `<button class="btn small" data-adm="${esc(m.userId)}" data-on="1">Hacer administrador</button>`}
            </li>`).join('') || '<li class="muted">Sin equipo.</li>'}</ul>
          <details class="admin-invite"><summary class="link small">Código para un nuevo administrador</summary>
            <div class="row-actions">
              <select data-role><option value="vet">Veterinario/a</option><option value="recepcion">Recepción</option></select>
              <button class="btn small secondary" data-inv>Crear código</button>
            </div>
            <p class="invite-code" data-code hidden></p>
            <p class="muted small">La persona entra a ${esc(link)}, crea su cuenta, toca "Me invitaron" y escribe el código. Queda como administradora. Sirve una vez y dura 7 días.</p>
          </details>
          <button type="button" class="link danger small admin-del" data-delclinic>Eliminar clínica</button>
        </div>`;
      }).join('') || '<p class="muted">Todavía no hay clínicas.</p>'}</div>
    </div>`;

  panel.querySelectorAll('[data-adm]').forEach((b) => b.addEventListener('click', async () => {
    const clinic = clinics.find((c) => c.id === b.closest('[data-c]').dataset.c);
    const m = clinic.members.find((x) => x.userId === b.dataset.adm);
    const on = Boolean(b.dataset.on);
    if (!confirm(on ? `¿Dejar a ${m.name} como administrador/a de ${clinic.name}?` : `¿Quitarle a ${m.name} la administración de ${clinic.name}?`)) return;
    try {
      await setClinicAdmin(clinic.id, m.userId, on);
      toast(on ? `${m.name} ahora administra ${clinic.name}` : 'Listo', 'ok');
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }));
  panel.querySelectorAll('[data-delclinic]').forEach((b) => b.addEventListener('click', async () => {
    const clinic = clinics.find((c) => c.id === b.closest('[data-c]').dataset.c);
    const typed = prompt(`Se borrará "${clinic.name}" con todo su equipo, pacientes, horas y fichas. No se puede deshacer.\n\nPara confirmar, escribe el nombre de la clínica:`);
    if (typed == null) return;
    if (typed.trim().toLowerCase() !== clinic.name.trim().toLowerCase()) return toast('El nombre no coincide. No se borró nada.', 'bad');
    try {
      await deleteClinic(clinic.id);
      toast(`${clinic.name} fue eliminada`, 'ok');
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  }));
  panel.querySelectorAll('[data-inv]').forEach((b) => b.addEventListener('click', async () => {
    const box = b.closest('[data-c]');
    const role = box.querySelector('[data-role]').value;
    b.disabled = true;
    try {
      const code = await createInvite(box.dataset.c, role, true);
      const out = box.querySelector('[data-code]');
      out.hidden = false;
      out.innerHTML = `<b>${esc(code)}</b><small>administrador/a · ${esc(ROLES[role].toLowerCase())}</small>`;
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      b.disabled = false;
    }
  }));
}

async function casos(panel, { refresh }) {
  const list = await latestSuccesses(50);
  const withComments = await Promise.all(list.map(async (s) => ({ ...s, comments: await commentsFor(s.id) })));

  panel.innerHTML = `
    <div class="card">
      <h2>Reencuentros (${list.length})</h2>
      ${withComments.map((s) => `
        <div class="admin-case">
          <div class="admin-list-row">
            <img src="${esc(s.photo)}" alt="">
            <span><strong>${esc(s.petName)}</strong><small>${timeAgo(s.createdAt)}</small></span>
            <button class="btn small danger" data-dels="${s.id}">Eliminar</button>
          </div>
          ${s.comments.map((c) => `
            <div class="admin-comment"><span><strong>${esc(c.author)}:</strong> ${esc(c.text)}</span>
            <button class="link danger" data-delc="${c.id}">borrar</button></div>`).join('')}
        </div>`).join('') || '<p class="muted">Aún no hay reencuentros.</p>'}
    </div>
    <div class="card">
      <h2>Datos de ejemplo</h2>
      <p class="muted">Agrega reencuentros de muestra para ver cómo se ve la pantalla de inicio.</p>
      <button class="btn secondary" id="demo">Cargar ejemplos</button>
    </div>`;

  panel.querySelectorAll('[data-dels]').forEach((b) =>
    b.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este reencuentro?')) return;
      await deleteSuccess(b.dataset.dels);
      refresh();
    }),
  );
  panel.querySelectorAll('[data-delc]').forEach((b) =>
    b.addEventListener('click', async () => {
      await deleteComment(b.dataset.delc);
      refresh();
    }),
  );
  panel.querySelector('#demo').addEventListener('click', async () => {
    const demo = [
      ['Canela', '#E9A66B', 'La encontraron a dos cuadras del parque. ¡Gracias vecinos!'],
      ['Toby', '#8B5E3C', 'Estaba asustado en una plaza, lo escanearon y en 20 minutos estábamos juntos.'],
      ['Luna', '#F4D6A0', 'Una señora muy amable la cuidó toda la tarde.'],
      ['Rocky', '#5C4033', ''],
      ['Mía', '#D98C5F', 'Se había escapado por la reja. Ya arreglamos la reja 😅'],
      ['Bruno', '#C9B79C', ''],
    ];
    for (const [petName, color, story] of demo) await addSuccess({ petName, photo: dogAvatar(color), story });
    toast('Ejemplos cargados', 'ok');
    refresh();
  });
}

function dogAvatar(fur) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
    <rect width="200" height="200" fill="#FFE8CC"/>
    <ellipse cx="52" cy="80" rx="26" ry="46" fill="${fur}" transform="rotate(18 52 80)" opacity=".85"/>
    <ellipse cx="148" cy="80" rx="26" ry="46" fill="${fur}" transform="rotate(-18 148 80)" opacity=".85"/>
    <circle cx="100" cy="108" r="62" fill="${fur}"/>
    <ellipse cx="100" cy="135" rx="34" ry="26" fill="#FFF4E6"/>
    <circle cx="78" cy="98" r="8" fill="#3B2A20"/><circle cx="122" cy="98" r="8" fill="#3B2A20"/>
    <circle cx="80" cy="95" r="2.5" fill="#fff"/><circle cx="124" cy="95" r="2.5" fill="#fff"/>
    <ellipse cx="100" cy="124" rx="11" ry="8" fill="#3B2A20"/>
    <path d="M88 140 q12 12 24 0" stroke="#3B2A20" stroke-width="4" fill="none" stroke-linecap="round"/>
    <ellipse cx="100" cy="152" rx="7" ry="9" fill="#F28C8C"/>
  </svg>`;
  return 'data:image/svg+xml;utf8,' + encodeURIComponent(svg);
}

// Descarga de usuarios y mascotas para el administrador. Estos datos no se
// muestran en ninguna otra parte de la app.
async function datos(panel, { refresh }) {
  const [users, pets, push] = await Promise.all([listUsers(), allPets(), pushConfigured()]);
  panel.innerHTML = `
    ${CLOUD ? `
      <div class="card" id="push">
        <h2>Notificaciones push</h2>
        <p>${push
          ? '✅ Claves listas. Si ya publicaste la función send-push con sus secretos, los avisos llegan aunque la app esté cerrada.'
          : 'Para que los avisos lleguen con la app cerrada, genera las claves y cópialas en Supabase (Edge Functions → Secrets).'}</p>
        <button class="btn ${push ? 'ghost' : 'primary'}" id="vapid">${push ? 'Generar claves nuevas' : 'Generar claves'}</button>
        <div id="keys"></div>
      </div>` : ''}
    <div class="card">
      <h2>Usuarios y mascotas</h2>
      <p>${users.length} usuario${users.length === 1 ? '' : 's'} · ${pets.length} mascota${pets.length === 1 ? '' : 's'} registrada${pets.length === 1 ? '' : 's'}</p>
      <p class="muted small">Una fila por mascota con los datos de su dueño; los usuarios sin mascotas aparecen en una fila sin mascota. Se abre en Excel o Google Sheets. El ZIP trae además la foto de cada mascota, con el nombre de archivo en la columna Foto.</p>
      <button class="btn primary big" id="zip">Descargar CSV con fotos (ZIP)</button>
      <button class="btn secondary" id="csv">Solo CSV</button>
    </div>
    <div class="card">
      <h2>Buscar usuario</h2>
      <input class="search" type="search" id="q" placeholder="Nombre, teléfono, correo o dirección" autocomplete="off">
      <ul class="user-results" id="results"></ul>
    </div>`;
  panel.querySelector('#vapid')?.addEventListener('click', async (e) => {
    if (push && !confirm('Con claves nuevas, cada celular debe abrir la app otra vez para volver a recibir notificaciones, y debes actualizar los secretos en Supabase. ¿Seguir?')) return;
    e.target.disabled = true;
    const { publicKey, privateKey } = await generateVapidKeys();
    await savePushKey(publicKey);
    enablePush().catch(() => {});
    const box = (name, value) => `
      <label>${name}<textarea readonly rows="3" data-copy>${esc(value)}</textarea></label>`;
    panel.querySelector('#keys').innerHTML = `
      <div class="form">
        <p class="note">Copia estos 3 secretos en Supabase → Edge Functions → Secrets. La clave privada se muestra solo ahora y no se la des a nadie.</p>
        ${box('VAPID_PUBLIC_KEY', publicKey)}
        ${box('VAPID_PRIVATE_KEY', privateKey)}
        ${box('VAPID_SUBJECT', 'mailto:tu-correo@ejemplo.com')}
      </div>`;
    panel.querySelectorAll('[data-copy]').forEach((t) => t.addEventListener('focus', () => t.select()));
    toast('Claves generadas', 'ok');
  });

  userSearch(panel.querySelector('#q'), panel.querySelector('#results'), users, (u) => {
    const own = pets.filter((p) => p.ownerId === u.id);
    return `<li><span><strong>${esc(u.firstName ? `${u.firstName} ${u.lastName}` : u.name)}</strong>
      <small>📞 ${esc(u.phone)}${u.email ? ` · ✉️ ${esc(u.email)}` : ''}</small>
      ${u.address ? `<small>🏠 ${esc(u.address)}</small>` : ''}
      <small>🐾 ${own.length ? own.map((p) => `${esc(p.name)}${describe(p) ? ` (${esc(describe(p))})` : ''}${p.status === 'lost' ? ' (perdida)' : ''}`).join(', ') : 'Sin mascotas'}</small></span>
      <button type="button" class="btn small" data-msg="${esc(u.id)}">Mensaje</button></li>`;
  }, (el) => {
    el.querySelectorAll('[data-msg]').forEach((b) => b.addEventListener('click', () => {
      sessionStorage.setItem('petsafe-admin-to', b.dataset.msg);
      sessionStorage.setItem('petsafe-admin-tab', 'mensajes');
      refresh();
    }));
  });
  // Foto de cada mascota como archivo: fotos/<nombre>-<id>.jpg
  const photos = new Map();
  for (const p of pets) {
    const img = fromDataUrl(p.photo);
    if (!img) continue;
    const slug = (p.name || 'mascota').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '') || 'mascota';
    photos.set(p.id, { name: `fotos/${slug}-${String(p.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6)}.${img.ext}`, data: img.data });
  }
  const table = () => {
    const header = [
      'Nombres', 'Apellidos', 'Teléfono', 'Correo', 'Dirección', 'Usuario desde', 'Acepta ofertas', 'Aceptó ofertas el',
      'Mascota', 'Tipo', 'Raza', 'Nombre del dueño (registro)', 'Estado', 'Enfermedades', 'Vacunas', 'Mascota registrada', 'Foto',
    ];
    // Celdas vacías con texto, para distinguir "no lo llenó" de un error.
    const or = (v, empty = 'No informó') => (v && String(v).trim()) || empty;
    const person = (u) => (u
      ? [u.firstName || u.name, u.lastName, u.phone, u.email, u.address, day(u.createdAt), u.promos ? 'Sí' : 'No', u.promos ? day(u.promosAt) || '' : '']
      : ['Sin perfil', '', '', '', '', '', '', '']);
    const rows = pets.map((p) => [
      ...person(users.find((u) => u.id === p.ownerId)),
      or(p.name, 'Sin nombre'), SPECIES[p.species] || 'No informó', or(p.breed), or(p.ownerName), p.status === 'lost' ? 'Perdida' : 'En casa',
      or(p.diseases), or(p.vaccines), day(p.createdAt), photos.get(p.id)?.name || 'Sin foto',
    ]);
    // Personas que crearon perfil pero aún no registran mascotas: al final.
    for (const u of users) if (!pets.some((p) => p.ownerId === u.id)) rows.push([...person(u), 'Sin mascota', '', '', '', '', '', '', '', '']);
    return toCsv([header, ...rows]);
  };
  const name = `kiltrazo-datos-${day(new Date().toISOString())}`;
  panel.querySelector('#csv').addEventListener('click', () => {
    download(`${name}.csv`, new Blob([table()], { type: 'text/csv;charset=utf-8' }));
  });
  panel.querySelector('#zip').addEventListener('click', () => {
    const csv = { name: `${name}.csv`, data: new TextEncoder().encode(table()) };
    download(`${name}.zip`, zip([csv, ...photos.values()]));
  });
}

const day = (iso) => (iso ? String(iso).slice(0, 10) : '');

// Separado por punto y coma y con BOM, para que Excel en español lo abra bien.
// Los valores que empiezan con = + - @ se anteponen con ' para que Excel no
// los ejecute como fórmula.
function toCsv(rows) {
  const cell = (v) => {
    let t = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(t)) t = "'" + t;
    return `"${t.replace(/"/g, '""')}"`;
  };
  return '\ufeff' + rows.map((r) => r.map(cell).join(';')).join('\r\n');
}

function download(name, blob) {
  const url = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
