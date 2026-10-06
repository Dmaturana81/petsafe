import { setPassword } from '../data.js';
import { toast, go } from '../ui.js';

// Se llega aquí desde el correo de "Olvidé mi contraseña".
export default async function password(el) {
  el.innerHTML = `
    <div class="card">
      <h1>Crea tu clave nueva 🔑</h1>
      <form class="form">
        <label>Clave nueva<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
        <button class="btn primary big">Guardar clave</button>
      </form>
    </div>`;
  const form = el.querySelector('form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await setPassword(form.password.value);
      toast('Clave guardada. Ya puedes entrar con ella en cualquier dispositivo.', 'ok');
      let to = '#/perfil';
      try { to = localStorage.getItem('petsafe-after-reset') || to; localStorage.removeItem('petsafe-after-reset'); } catch { /* sin almacenamiento */ }
      go(to);
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
}
