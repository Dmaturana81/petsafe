import { saveUser, listUsers, switchUser, myPets, removeMyPet, savePet, contactAdmin, enablePush, loginEmail, createAccount, setPassword, signOut, CLOUD } from '../data.js';
import { mountEmailLogin } from './login-email.js';
import { askPermission, notificationsSupported } from '../notify.js';
import { esc, toast, go, isComplete } from '../ui.js';
import { SPECIES, breedOptions, describe } from '../breeds.js';

export default async function profile(el, _params, { user, refresh }) {
  // Con Supabase cada celular es un usuario; cambiar de usuario es solo para pruebas locales.
  const [users, pets, email] = await Promise.all([CLOUD ? [] : listUsers(), user ? myPets(user) : [], CLOUD ? loginEmail() : '']);
  const others = users.filter((u) => u.id !== user?.id);
  const perm = notificationsSupported() ? Notification.permission : 'unsupported';
  // Perfil ya guardado: se muestran los datos y solo se editan al tocar "Editar".
  const saved = isComplete(user);

  el.innerHTML = `
    ${CLOUD && !user ? `
      <div class="card">
        <h2>¿Ya tienes cuenta?</h2>
        <details><summary class="btn ghost">Entrar con mi correo y clave</summary><div id="email-login"></div></details>
      </div>` : ''}
    <div class="card">
      ${user ? '<h1>Tu perfil</h1>' : '<img src="brand/kiltrazo-completo.svg" alt="Kiltrazo" class="welcome-logo"><h1>¡Bienvenido! 🐾</h1>'}
      ${!user ? '<p>Cuéntanos quién eres.</p>' : saved ? '' : '<p class="note">Completa tus datos para seguir usando Kiltrazo.</p>'}
      ${saved ? `
        <dl class="info" id="profile-view">
          <dt>Nombre</dt><dd>${esc(`${user.firstName || user.name} ${user.lastName || ''}`.trim())}</dd>
          <dt>Teléfono (WhatsApp)</dt><dd>${esc(user.phone)}</dd>
          <dt>Correo</dt><dd>${esc(user.email)}</dd>
          <dt>Dirección</dt><dd>${esc(user.address)}</dd>
        </dl>
        <button class="btn secondary" id="edit-profile">✏️ Editar mis datos</button>` : ''}
      <form class="form" id="profile" ${saved ? 'hidden' : ''}>
        <label>Nombres<input name="firstName" required value="${esc(user?.firstName || user?.name)}" autocomplete="given-name"></label>
        <label>Apellidos<input name="lastName" required value="${esc(user?.lastName)}" autocomplete="family-name"></label>
        <label>Teléfono (WhatsApp)<input name="phone" type="tel" required placeholder="+56 9 1234 5678" value="${esc(user?.phone)}" autocomplete="tel"></label>
        <label>Correo<input name="email" type="email" required value="${esc(user?.email)}" autocomplete="email"></label>
        <label>Dirección<input name="address" required placeholder="Calle, número, comuna" value="${esc(user?.address)}" autocomplete="street-address"></label>
        ${CLOUD && !user ? `
          <label>Crea una clave<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
          <p class="muted small">Con tu correo y esta clave entras desde cualquier celular o computador.</p>` : ''}
        <p class="muted small">Tu nombre y teléfono solo se comparten con el dueño de una mascota que encuentres. El correo y la dirección solo los ve el administrador de Kiltrazo.</p>
        <button class="btn primary big">${user ? 'Guardar' : 'Comenzar'}</button>
        ${saved ? '<button type="button" class="btn ghost" id="cancel-profile">Cancelar</button>' : ''}
      </form>
    </div>

    ${user ? `
      <div class="card">
        <h2>Notificaciones</h2>
        <p>${perm === 'granted' ? '✅ Activadas en este celular.' : perm === 'denied' ? 'Bloqueadas. Actívalas desde la configuración del navegador.' : perm === 'unsupported' ? unsupportedHelp() : 'Actívalas para saber al instante si encuentran a tu mascota.'}</p>
        ${perm === 'default' ? '<button class="btn secondary" id="perm">Activar notificaciones</button>' : ''}
      </div>

      <div class="card">
        <h2>Mis mascotas</h2>
        ${pets.length ? `<ul class="pet-list my-pets">${pets.map((p) => `
          <li data-pet="${esc(p.id)}">
            <div class="pet-row">
              <img src="${esc(p.photo)}" alt="">
              <span><strong>${esc(p.name)}</strong><small>${[describe(p), p.status === 'lost' ? '🔴 Perdida' : '🟢 En casa'].filter(Boolean).map(esc).join(' · ')}</small></span>
              <button class="btn small secondary" data-editpet aria-label="Editar ${esc(p.name)}">Editar</button>
            </div>
            <form class="form pet-edit" hidden>
              <label>Nombre<input name="name" required value="${esc(p.name)}"></label>
              <label>Tipo<select name="species">
                <option value="">No sé</option>
                ${Object.entries(SPECIES).map(([v, t]) => `<option value="${v}" ${p.species === v ? 'selected' : ''}>${t}</option>`).join('')}
              </select></label>
              <label>Raza<input name="breed" list="breeds-${esc(p.id)}" value="${esc(p.breed)}" autocomplete="off"></label>
              <datalist id="breeds-${esc(p.id)}">${breedOptions(p.species)}</datalist>
              <label>Enfermedades<textarea name="diseases" rows="2">${esc(p.diseases)}</textarea></label>
              <label>Vacunas<textarea name="vaccines" rows="2">${esc(p.vaccines)}</textarea></label>
              <button class="btn primary">Guardar cambios</button>
              <button type="button" class="btn ghost" data-cancel>Cancelar</button>
              <button type="button" class="btn small danger" data-delpet="${esc(p.id)}">Eliminar a ${esc(p.name)}</button>
            </form>
          </li>`).join('')}</ul>`
        : '<p>Aún no registras mascotas.</p>'}
        <a class="btn secondary" href="#/registrar">Registrar mascota</a>
      </div>

      ${others.length ? `
        <div class="card">
          <h2>Cambiar de usuario</h2>
          <p class="muted">Útil para probar la app con dos personas en el mismo celular.</p>
          <div class="chips">${others.map((u) => `<button class="chip" data-user="${u.id}">${esc(u.name)}</button>`).join('')}</div>
        </div>` : ''}

      <div class="card">
        <h2>¿Necesitas ayuda?</h2>
        <p>Escríbele al administrador de Kiltrazo. Te responderá en Avisos 🔔.</p>
        <form class="form" id="contact">
          <label>Tu mensaje<textarea name="body" rows="3" required maxlength="1000"></textarea></label>
          <button class="btn secondary">Enviar al administrador</button>
        </form>
      </div>

      ${CLOUD ? `
        <div class="card">
          <h2>Tu cuenta</h2>
          ${email
            ? `<p>✅ Entraste con <strong>${esc(email)}</strong>. En otro celular o computador, entra con tu correo y clave y verás tus datos y mascotas.</p>
               <details><summary class="btn ghost">Cambiar mi clave</summary>
                 <form class="form" id="new-pass">
                   <label>Clave nueva<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
                   <button class="btn primary">Guardar clave</button>
                 </form>
               </details>
               <button class="btn ghost" id="logout">Cerrar sesión</button>`
            : `<p>Crea una clave para entrar a tu cuenta desde otro celular o computador. Tus datos y mascotas se mantienen.</p>
               <form class="form" id="make-account">
                 <label>Correo<input name="email" type="email" required value="${esc(user.email)}" autocomplete="email"></label>
                 <label>Clave<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
                 <button class="btn primary">Crear mi clave</button>
               </form>
               <details><summary class="btn ghost">Ya tengo cuenta: entrar</summary><div id="email-login"></div></details>`}
        </div>` : ''}

      <div class="card">
        ${CLOUD ? '' : '<button class="btn ghost" id="newuser">Agregar otro usuario</button>'}
        <a class="btn ghost" href="#/admin">Administrador</a>
      </div>` : ''}`;

  const loginBox = el.querySelector('#email-login');
  if (loginBox) mountEmailLogin(loginBox, { onDone: () => go('#/') });

  el.querySelector('#profile').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const data = Object.fromEntries(['firstName', 'lastName', 'phone', 'email', 'address'].map((k) => [k, f.get(k).trim()]));
    data.email = data.email.toLowerCase();
    if (f.get('password') && !(await makeAccount(data.email, f.get('password'), e.target))) return;
    await saveUser({ id: user?.id, ...data, name: `${data.firstName} ${data.lastName}` });
    if (!user && (await askPermission()) === 'granted') await enablePush().catch(() => {});
    toast('¡Listo!', 'ok');
    isComplete(user) ? refresh() : go('#/');
  });

  el.querySelector('#make-account')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    if (await makeAccount(f.get('email').trim().toLowerCase(), f.get('password'), e.target)) refresh();
  });

  el.querySelector('#new-pass')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await setPassword(new FormData(e.target).get('password'));
      toast('Clave guardada', 'ok');
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  el.querySelector('#logout')?.addEventListener('click', async () => {
    if (!confirm('¿Cerrar sesión en este dispositivo? Para volver, entra con tu correo y clave.')) return;
    await signOut();
    go('#/perfil');
    refresh();
  });

  const profileForm = el.querySelector('#profile');
  el.querySelector('#edit-profile')?.addEventListener('click', (e) => {
    profileForm.hidden = false;
    el.querySelector('#profile-view').hidden = true;
    e.target.hidden = true;
    profileForm.querySelector('input').focus();
  });
  el.querySelector('#cancel-profile')?.addEventListener('click', () => refresh());

  el.querySelectorAll('.my-pets li').forEach((li) => {
    const pet = pets.find((p) => p.id === li.dataset.pet);
    const form = li.querySelector('.pet-edit');
    const toggle = (open) => {
      form.hidden = !open;
      li.querySelector('[data-editpet]').hidden = open;
    };
    li.querySelector('[data-editpet]').addEventListener('click', () => toggle(true));
    form.querySelector('[data-cancel]').addEventListener('click', () => { form.reset(); toggle(false); });
    form.species.addEventListener('change', () => {
      li.querySelector('datalist').innerHTML = breedOptions(form.species.value);
    });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const btn = form.querySelector('button');
      btn.disabled = true;
      try {
        await savePet({
          ...pet,
          name: f.get('name').trim(),
          species: f.get('species'),
          breed: f.get('breed').trim(),
          diseases: f.get('diseases').trim(),
          vaccines: f.get('vaccines').trim(),
        });
        toast('Cambios guardados', 'ok');
        refresh();
      } catch (err) {
        toast(`No se pudo guardar: ${err.message}`);
        btn.disabled = false;
      }
    });
  });

  el.querySelectorAll('[data-delpet]').forEach((b) =>
    b.addEventListener('click', async () => {
      const pet = pets.find((p) => p.id === b.dataset.delpet);
      if (!confirm(`¿Eliminar a ${pet.name}? Se borrarán sus datos y su biometría, y no se podrá deshacer.`)) return;
      await removeMyPet(user, pet.id);
      toast(`${pet.name} fue eliminada`);
      refresh();
    }),
  );

  el.querySelector('#contact')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const body = new FormData(e.target).get('body').trim();
    if (!body) return;
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      await contactAdmin(user, body);
      e.target.reset();
      toast('Mensaje enviado. Te responderán en Avisos.', 'ok');
    } finally {
      btn.disabled = false;
    }
  });

  el.querySelector('#perm')?.addEventListener('click', async () => {
    if ((await askPermission()) === 'granted') await enablePush().catch(() => {});
    refresh();
  });

  el.querySelectorAll('[data-user]').forEach((b) =>
    b.addEventListener('click', async () => {
      await switchUser(b.dataset.user);
      toast(`Ahora eres ${b.textContent}`);
      go('#/');
    }),
  );

  el.querySelector('#newuser')?.addEventListener('click', async () => {
    const name = prompt('Nombre del nuevo usuario');
    if (!name) return;
    const phone = prompt('Teléfono (WhatsApp)') || '';
    await saveUser({ name, phone });
    go('#/');
  });
}

// Crea la cuenta con correo y clave. Devuelve true si quedó lista para usarse.
async function makeAccount(email, password, form) {
  const btn = form.querySelector('button');
  btn.disabled = true;
  try {
    if (!(await createAccount(email, password))) {
      alert(`Te enviamos un correo a ${email}. Ábrelo y toca el enlace para confirmarlo; después podrás entrar con tu clave en cualquier dispositivo.`);
    }
    return true;
  } catch (err) {
    toast(err.message, 'bad');
    return false;
  } finally {
    btn.disabled = false;
  }
}

// Por qué no hay notificaciones y cómo conseguirlas.
function unsupportedHelp() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installed = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (ios && !installed) {
    return 'En iPhone las notificaciones solo funcionan con la app instalada: abre esta página en Safari, toca Compartir → "Agregar a pantalla de inicio" y entra desde el ícono de Kiltrazo.';
  }
  return 'Aquí no se pueden activar. Abre la app directamente en Chrome o Safari (no dentro de otra app, como WhatsApp o Instagram) e instálala con "Agregar a pantalla de inicio".';
}
