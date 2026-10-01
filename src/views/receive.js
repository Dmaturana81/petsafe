// "#/recibir/CODIGO": la veterinaria le pasa al tutor la ficha de su mascota.
// El tutor la registra (escaneando su cara) o elige una que ya tenía.

import { myPets } from '../data.js';
import { esc, toast, go } from '../ui.js';
import { SPECIES } from '../breeds.js';

export const TRANSFER_KEY = 'kiltrazo-transfer';

export default async function receive(el, { code }, { user }) {
  forget();
  const { transferInfo, claimTransfer, acceptTransfer } = await import('../clinic/data.js');
  const [info, pets] = await Promise.all([transferInfo(code).catch(() => null), myPets(user)]);
  if (!info) {
    forget();
    el.innerHTML = `<div class="card"><h1>Este enlace ya no sirve</h1>
      <p>Ya se usó o venció. Pide uno nuevo a tu veterinaria.</p><a class="btn primary" href="#/">Ir al inicio</a></div>`;
    return;
  }

  el.innerHTML = `
    <div class="card receive">
      ${info.photo ? `<img class="receive-photo" src="${esc(info.photo)}" alt="">` : '<span class="receive-photo">🐾</span>'}
      <h1>${esc(info.clinic)} te envía a ${esc(info.name)}</h1>
      <p class="muted">${esc([SPECIES[info.species], info.breed].filter(Boolean).join(' · '))}</p>
      <p>Al agregarla a tu Kiltrazo verás sus vacunas, te avisaremos antes de cada dosis y podrás pedir hora con ${esc(info.clinic)}.</p>
      <button class="btn primary big" data-new>Agregar a ${esc(info.name)}</button>
      <p class="small muted">${info.hasScan ? `${esc(info.clinic)} ya filmó su cara: si algún día se pierde, Kiltrazo podrá reconocerla.` : 'Te pediremos filmar su cara, para encontrarla si algún día se pierde.'}</p>
    </div>
    ${pets.length ? `
      <div class="card">
        <h2>¿Ya la tienes en Kiltrazo?</h2>
        <p class="small">Toca cuál es y la unimos con su ficha de ${esc(info.clinic)}.</p>
        <div class="pick-list">${pets.map((p) => `
          <button class="pick" data-pet="${esc(p.id)}"><img src="${esc(p.photo)}" alt=""><span><strong>${esc(p.name)}</strong><small>${esc(SPECIES[p.species] || '')}</small></span></button>`).join('')}
        </div>
      </div>` : ''}`;

  el.querySelector('[data-new]').addEventListener('click', async (e) => {
    if (info.hasScan) {
      e.target.disabled = true;
      try {
        await acceptTransfer(code);
        toast(`¡${info.name} ya está en tu Kiltrazo! 🎉`, 'ok');
        return go('#/perfil');
      } catch (err) {
        toast(err.message, 'bad');
        e.target.disabled = false;
        return;
      }
    }
    try { localStorage.setItem(TRANSFER_KEY, JSON.stringify({ code, ...info })); } catch { /* sin almacenamiento */ }
    go('#/registrar');
  });

  el.querySelectorAll('[data-pet]').forEach((b) => b.addEventListener('click', async () => {
    const pet = pets.find((p) => p.id === b.dataset.pet);
    if (!confirm(`¿Unir a ${pet.name} con la ficha que envió ${info.clinic}?`)) return;
    try {
      await claimTransfer(code, pet.id);
      forget();
      toast(`¡Listo! ${pet.name} ya está unida a ${info.clinic} 🎉`, 'ok');
      go('#/perfil');
    } catch (err) {
      toast(err.message, 'bad');
    }
  }));
}

/** Ficha que la veterinaria envió y el tutor está por registrar. */
export function pendingTransfer() {
  try { return JSON.parse(localStorage.getItem(TRANSFER_KEY) || 'null'); } catch { return null; }
}

export function forget() {
  try { localStorage.removeItem(TRANSFER_KEY); } catch { /* sin almacenamiento */ }
}
