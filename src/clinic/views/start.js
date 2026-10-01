// Entrada a Kiltrazo Clínica: entrar con correo, y crear la clínica o unirse
// a una con el código que da quien la administra.

import { createAccount } from '../../data.js';
import { mountEmailLogin } from '../../views/login-email.js';
import { esc, toast } from '../../ui.js';
import { createClinic, joinClinic, setActiveClinic } from '../data.js';

export default function start(el, { session, refresh, pendingCode }) {
  const intro = `
    <div class="ck-start-head">
      <img src="brand/kiltrazo.svg" alt="Kiltrazo" class="ck-logo big">
      <h1><b>Clínica</b></h1>
      <p>Ficha clínica, vacunas, exámenes y agenda de tu veterinaria. Funciona en el computador y en el celular, y es gratis.</p>
      ${pendingCode ? `<p class="note">Después de entrar se vinculará la mascota con el código <strong>${esc(pendingCode)}</strong>.</p>` : ''}
    </div>`;

  if (session.needsProfile) {
    el.innerHTML = `<div class="ck-start">${intro}<div class="card"><p>Primero crea tu perfil en Kiltrazo.</p><a class="btn primary" href="#/perfil">Crear mi perfil</a></div></div>`;
    return;
  }

  if (session.needsLogin) {
    el.innerHTML = `
      <div class="ck-start">${intro}
        <div class="ck-start-cols">
          <div class="card"><h2>Ya tengo cuenta</h2><div id="ck-login"></div></div>
          <div class="card">
            <h2>Soy nuevo</h2>
            <p class="muted small">Con este correo y clave entras desde cualquier computador o celular de la clínica.</p>
            <form class="form" id="ck-signup">
              <label>Correo<input name="email" type="email" required autocomplete="email"></label>
              <label>Crea una clave<input name="password" type="password" required minlength="6" autocomplete="new-password"></label>
              <button class="btn primary">Crear cuenta</button>
            </form>
          </div>
        </div>
      </div>`;
    mountEmailLogin(el.querySelector('#ck-login'), { after: location.hash, onDone: refresh });
    el.querySelector('#ck-signup').addEventListener('submit', async (e) => {
      e.preventDefault();
      const f = new FormData(e.target);
      const btn = e.target.querySelector('button');
      btn.disabled = true;
      try {
        if (await createAccount(String(f.get('email')).trim().toLowerCase(), f.get('password'))) refresh();
        else alert('Te enviamos un correo para confirmarlo. Ábrelo y después entra con tu clave.');
      } catch (err) {
        toast(err.message, 'bad');
      } finally {
        btn.disabled = false;
      }
    });
    return;
  }

  el.innerHTML = `
    <div class="ck-start">${intro}
      <div class="ck-start-cols">
        <div class="card">
          <h2>Crear mi clínica</h2>
          <form class="form" id="ck-create">
            <label>Nombre de la clínica<input name="name" required maxlength="120" placeholder="Clínica Veterinaria Los Aromos"></label>
            <label>Dirección<input name="address" placeholder="Calle, número, comuna"></label>
            <label>Teléfono<input name="phone" type="tel" placeholder="+56 2 2345 6789"></label>
            <label>Tu nombre<input name="memberName" required placeholder="Dra. Camila Rojas"></label>
            <label>Tu rol<select name="role"><option value="vet">Veterinario/a</option><option value="recepcion">Recepción</option></select></label>
            <button class="btn primary">Crear clínica</button>
          </form>
        </div>
        <div class="card">
          <h2>Me invitaron</h2>
          <p class="muted small">Pide el código a quien administra la clínica (en Equipo).</p>
          <form class="form" id="ck-join">
            <label>Código<input name="code" required maxlength="6" autocapitalize="characters" class="ck-code-input" placeholder="ABC234"></label>
            <label>Tu nombre<input name="memberName" required></label>
            <button class="btn secondary">Unirme</button>
          </form>
        </div>
      </div>
    </div>`;

  const submit = (sel, fn) => el.querySelector(sel).addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      setActiveClinic(await fn(data));
      toast('¡Listo!', 'ok');
      refresh();
    } catch (err) {
      toast(err.message, 'bad');
      btn.disabled = false;
    }
  });
  submit('#ck-create', (d) => createClinic({ ...d, name: d.name.trim(), memberName: d.memberName.trim() }));
  submit('#ck-join', (d) => joinClinic(d.code.trim().toUpperCase(), d.memberName.trim()));
}
