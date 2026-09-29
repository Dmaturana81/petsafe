import { sendLoginCode, verifyLoginCode } from '../data.js';
import { toast } from '../ui.js';

// Entrar con correo: Supabase envía un correo con un enlace (o un código, si
// se configura un correo propio). Así la misma persona es el mismo usuario en
// cualquier dispositivo. `after` es la pantalla a la que se vuelve.
export function mountEmailLogin(root, { button = 'Enviarme el enlace', after = '#/perfil', onDone }) {
  root.innerHTML = `
    <form class="form" data-step="email">
      <label>Tu correo<input name="email" type="email" required autocomplete="email"></label>
      <button class="btn primary">${button}</button>
    </form>
    <form class="form" data-step="code" hidden>
      <p class="note">📧 Te enviamos un correo a <strong data-to></strong>. Ábrelo <strong>en este mismo dispositivo</strong> y toca el enlace (dice "Sign in" o "Confirm"). Si no llega, revisa spam o espera unos minutos.</p>
      <details><summary class="muted small">¿Tu correo trae un código en vez de un enlace?</summary>
        <label>Código<input name="code" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6,10}" maxlength="10"></label>
        <button class="btn primary">Entrar</button>
      </details>
      <button type="button" class="btn ghost" data-back>Usar otro correo</button>
    </form>`;
  const [emailForm, codeForm] = root.querySelectorAll('form');
  let email = '';

  emailForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = emailForm.querySelector('button');
    email = emailForm.email.value.trim().toLowerCase();
    btn.disabled = true;
    try {
      try { localStorage.setItem('petsafe-after-login', after); } catch { /* sin almacenamiento */ }
      await sendLoginCode(email);
      emailForm.hidden = true;
      codeForm.hidden = false;
      codeForm.querySelector('[data-to]').textContent = email;
    } catch (err) {
      toast(`No se pudo enviar el código: ${err.message}`, 'bad');
    } finally {
      btn.disabled = false;
    }
  });

  codeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = codeForm.querySelector('button');
    btn.disabled = true;
    try {
      await verifyLoginCode(email, codeForm.code.value.trim());
      toast('¡Listo, entraste!', 'ok');
      onDone?.();
    } catch {
      toast('El código no es correcto o ya venció. Pide uno nuevo.', 'bad');
      btn.disabled = false;
    }
  });

  codeForm.querySelector('[data-back]').addEventListener('click', () => {
    codeForm.hidden = true;
    emailForm.hidden = false;
  });
}
