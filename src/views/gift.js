// "#/regalo/CODIGO": el dueño anterior le pasa su mascota a otra persona (se
// la regaló o la dio en adopción). Al recibirla queda a nombre de quien abre
// el enlace, con su cara ya registrada.

import { petGiftInfo, acceptPetGift } from '../data.js';
import { esc, toast, go } from '../ui.js';
import { SPECIES } from '../breeds.js';

export const GIFT_KEY = 'kiltrazo-gift';

export function pendingGift() {
  try { return localStorage.getItem(GIFT_KEY); } catch { return null; }
}
const forget = () => { try { localStorage.removeItem(GIFT_KEY); } catch { /* sin almacenamiento */ } };

export default async function gift(el, { code }) {
  forget();
  const info = await petGiftInfo(code).catch(() => null);
  if (!info) {
    el.innerHTML = `<div class="card"><h1>Este enlace ya no sirve</h1>
      <p>Ya se usó o venció. Pídele uno nuevo a quien te pasó la mascota.</p><a class="btn primary" href="#/">Ir al inicio</a></div>`;
    return;
  }
  const kind = [SPECIES[info.species], info.breed].filter(Boolean).join(' · ');
  if (info.mine) {
    el.innerHTML = `<div class="card receive">
      ${info.photo ? `<img class="receive-photo" src="${esc(info.photo)}" alt="">` : '<span class="receive-photo">🐾</span>'}
      <h1>Este es tu enlace para pasar a ${esc(info.name)}</h1>
      <p>Envíaselo a la persona que va a quedar con ${esc(info.name)}. Cuando lo abra en su celular, pasará a su cuenta.</p>
      <a class="btn primary" href="#/perfil">Volver a mi perfil</a></div>`;
    return;
  }
  el.innerHTML = `
    <div class="card receive">
      ${info.photo ? `<img class="receive-photo" src="${esc(info.photo)}" alt="">` : '<span class="receive-photo">🐾</span>'}
      <h1>${info.from ? `${esc(info.from)} te pasa a ${esc(info.name)}` : `Te pasan a ${esc(info.name)}`}</h1>
      ${kind ? `<p class="muted">${esc(kind)}</p>` : ''}
      <p>Al recibirla, ${esc(info.name)} queda a tu nombre en Kiltrazo con su cara ya registrada: si algún día se pierde, la podremos reconocer y avisarte a ti.</p>
      <button class="btn primary big" data-accept>Recibir a ${esc(info.name)}</button>
      <p class="small muted">Si tenía veterinaria en Kiltrazo, puedes vincularla con tu propio código desde "Mi veterinaria".</p>
    </div>`;
  el.querySelector('[data-accept]').addEventListener('click', async (e) => {
    e.target.disabled = true;
    try {
      await acceptPetGift(code);
      toast(`¡${info.name} ya está en tu Kiltrazo! 🎉`, 'ok');
      go('#/perfil');
    } catch (err) {
      toast(err.message, 'bad');
      e.target.disabled = false;
    }
  });
}
