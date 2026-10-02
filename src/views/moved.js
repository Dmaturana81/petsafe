import { myPets, enablePush } from '../data.js';
import { esc, go } from '../ui.js';
import { installCard, bindInstall } from '../install.js';
import { askPermission, notificationsSupported } from '../notify.js';
import { moveInfo } from '../move.js';

// Se ve una vez, al llegar desde la dirección antigua (ver move.js).
export default async function moved(el, _params, { user }) {
  const info = moveInfo() || { to: '#/', app: false };
  const pets = user ? await myPets(user) : [];
  const names = pets.map((p) => `<strong>${esc(p.name)}</strong>`).join(', ');
  const ask = notificationsSupported() && Notification.permission === 'default';
  const icon = await installCard({
    head: '<h2>📲 Cambia el ícono de Kiltrazo</h2><p class="small muted">Así se abre directo en la dirección nueva.</p>',
    first: info.app ? 'Mantén apretado el <b>ícono antiguo</b> de Kiltrazo y elige <b>Eliminar</b>.' : '',
  });
  el.innerHTML = `
    <div class="card save-account">
      <div class="save-icon">🏡</div>
      <h1>Kiltrazo se cambió de casa</h1>
      <p>Ahora estamos en <b>${esc(location.host)}</b>.
        ${names ? `${names} y todos tus datos se vinieron contigo.` : 'Todos tus datos se vinieron contigo.'}</p>
    </div>
    ${icon}
    ${ask ? `<div class="card">
      <h2>🔔 Vuelve a activar los avisos</h2>
      <p class="small muted">Con la dirección nueva, el celular pide permiso otra vez para avisarte si encuentran a tu mascota.</p>
      <button class="btn secondary" id="perm">Activar avisos</button>
    </div>` : ''}
    <button class="btn primary big" id="go">Seguir</button>`;

  bindInstall(el);
  el.querySelector('#perm')?.addEventListener('click', async (e) => {
    if ((await askPermission()) === 'granted') await enablePush().catch(() => {});
    e.target.closest('.card').remove();
  });
  el.querySelector('#go').addEventListener('click', () => {
    try { sessionStorage.removeItem('kiltrazo-mudanza'); } catch { /* sin almacenamiento */ }
    go(info.to === '#/mudanza' ? '#/' : info.to);
  });
}
