import { signIn, resetPassword } from '../data.js';
import { toast } from '../ui.js';

// Entrar con correo y clave: la misma persona es el mismo usuario en cualquier
// dispositivo. "Olvidé mi contraseña" envía un correo con un enlace que vuelve
// a la app para crear una clave nueva. `after` es la pantalla a la que se
// vuelve desde ese enlace.
export function mountEmailLogin(root, { after = '#/perfil', onDone }) {
  root.innerHTML = `
    <form class="form">
      <label>Correo<input name="email" type="email" required autocomplete="email"></label>
      <label>Clave<input name="password" type="password" required minlength="6" autocomplete="current-password"></label>
      <button class="btn primary">Entrar</button>
      <button type="button" class="btn ghost small" data-forgot>Olvidé mi contraseña</button>
    </form>`;
  const form = root.querySelector('form');
  const email = () => form.email.value.trim().toLowerCase();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button');
    btn.disabled = true;
    try {
      await signIn(email(), form.password.value);
      toast('¡Listo, entraste!', 'ok');
      onDone?.();
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      btn.disabled = false;
    }
  });

  form.querySelector('[data-forgot]').addEventListener('click', async (e) => {
    if (!form.email.reportValidity()) return;
    e.target.disabled = true;
    try {
      try { localStorage.setItem('petsafe-after-login', after); } catch { /* sin almacenamiento */ }
      await resetPassword(email());
      alert(`Te enviamos un correo a ${email()}. Ábrelo en este mismo dispositivo y toca el enlace para crear una clave nueva. Si no llega, revisa spam.`);
    } catch (err) {
      toast(err.message, 'bad');
    } finally {
      e.target.disabled = false;
    }
  });
}
