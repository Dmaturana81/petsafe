import { createAccount, loginEmail, myPets, CLOUD } from '../data.js';
import { esc, toast, go } from '../ui.js';

// Después de registrar la primera mascota: guardar la cuenta con correo y
// clave para no perderla al cambiar de celular. Se puede saltar.
export default async function saveAccount(el, _params, { user }) {
  const pet = user ? (await myPets(user))[0] : null;
  el.innerHTML = `
    <div class="card save-account">
      <div class="save-icon">🔐</div>
      <h1>Guarda tu cuenta</h1>
      <p>Si cambias o pierdes el celular, con tu correo y una clave recuperas${pet ? ` a <strong>${esc(pet.name)}</strong> y` : ''} todos tus datos.</p>
      <form class="form" id="save">
        <label>Correo<input name="email" type="email" required value="${esc(user?.email || '')}" autocomplete="email"></label>
        <label>Clave<input name="password" type="password" required minlength="6" autocomplete="new-password" placeholder="Mínimo 6 letras o números"></label>
        <button class="btn primary big">Guardar mi cuenta</button>
      </form>
      <button class="btn ghost" id="later">Ahora no</button>
    </div>`;

  el.querySelector('#later').addEventListener('click', () => go('#/'));
  el.querySelector('#save').addEventListener('submit', async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const email = f.get('email').trim().toLowerCase();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      if (!(await createAccount(email, f.get('password')))) {
        alert(`Te enviamos un correo a ${email}. Ábrelo y toca el enlace para confirmarlo.`);
      }
      toast('Cuenta guardada 🔐', 'ok');
      go('#/');
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      btn.disabled = false;
    }
  });
}

// Solo se ofrece con Supabase, a quien aún entra sin correo y acaba de
// registrar su primera mascota.
export async function shouldOfferAccount(user) {
  if (!CLOUD) return false;
  return !(await loginEmail()) && (await myPets(user)).length === 1;
}
