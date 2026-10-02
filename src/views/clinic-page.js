// Página propia de cada clínica (…/?c=nombre o #/c/nombre): datos de contacto y
// pedir hora. Quien no tiene la app ve qué es Kiltrazo y puede crear su cuenta
// (QR en el computador, botón en el celular) o pedir hora dejando sus datos.

import { esc, toast, go, isComplete, returnHereLater } from '../ui.js';
import { currentUser, myPets } from '../data.js';
import { bookForm, bindBook } from './pet-vet.js';
import { installCard, bindInstall } from '../install.js';
import { specTags } from '../clinic/specialties.js';

const phoneLike = () => matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
const wa = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.length === 9 && d.startsWith('9')) d = '56' + d;
  return d ? `https://wa.me/${d}` : '';
};

export default async function clinicPage(el, { slug, step }) {
  el.innerHTML = '<div class="card"><p class="muted">Cargando…</p></div>';
  const [{ publicClinic, guestRequestAppointment, directions }, user] = await Promise.all([
    import('../clinic/data.js'), currentUser().catch(() => null),
  ]);
  const c = await publicClinic(slug).catch(() => null);
  if (!c) {
    el.innerHTML = `<div class="card"><h1>No encontramos esta página</h1><p>Revisa el enlace o busca la clínica en <a href="#/clinicas">Clínicas cercanas</a>.</p></div>`;
    return;
  }
  const here = `#/c/${c.slug}`;
  // QR del computador: en el celular abre la creación de cuenta y vuelve aquí.
  if (step === 'crear') {
    returnHereLater(here);
    return go('#/perfil');
  }
  const pets = isComplete(user) ? await myPets(user).catch(() => []) : [];
  const go_ = !c.onlyHome && c.lat != null ? directions(c) : null;
  const label = c.onlyHome ? 'Pedir visita a domicilio' : 'Pedir hora';
  document.title = `${c.name} · Pedir hora`;

  el.innerHTML = `
    <div class="web-page">
    <div class="card web-head">
      ${c.logo ? `<img src="${esc(c.logo)}" alt="${esc(c.name)}" class="web-logo">` : ''}
      <h1>${esc(c.name)}</h1>
      <div class="clinic-tags">
        ${c.onlyHome ? '<span class="clinic-tag home">🏠 Veterinario a domicilio</span>' : ''}
        ${c.emergencies ? '<span class="clinic-tag urgent">Urgencias</span>' : ''}
        ${c.homeVisits && !c.onlyHome ? '<span class="clinic-tag">A domicilio</span>' : ''}
      </div>
      ${c.address ? `<p>${c.onlyHome ? 'Atiende en: ' : '📍 '}${esc(c.address)}</p>` : ''}
      ${c.hours ? `<p class="muted">🕒 ${esc(c.hours)}</p>` : ''}
      ${c.specialties?.length ? `<div class="spec-tags">${specTags(c.specialties)}</div>` : ''}
      <div class="clinic-btns">
        ${c.phone ? `<a class="btn call" href="tel:${esc(c.phone)}">📞 Llamar</a>` : ''}
        ${wa(c.phone) ? `<a class="btn whatsapp" href="${wa(c.phone)}" target="_blank" rel="noopener">💬 WhatsApp</a>` : ''}
        ${go_ ? `<a class="btn home" href="${go_.google}" target="_blank" rel="noopener">🚗 Cómo llegar</a>` : ''}
      </div>
      <button class="btn primary big" data-book>📅 ${label}</button>
      <p class="web-by">by <img src="brand/kiltrazo.svg" alt="kiltrazo"> <b>Clínica</b></p>
    </div>
    <div id="web-step"></div>
    </div>`;

  const box = el.querySelector('#web-step');
  const bookBtn = el.querySelector('[data-book]');
  // En el computador la página va en dos columnas y el paso se ve desde el inicio.
  const wide = !phoneLike() && matchMedia('(min-width: 900px)').matches;
  let quiet = wide;
  const show = (html) => {
    box.innerHTML = html;
    if (!quiet) box.scrollIntoView({ behavior: 'smooth', block: 'start' });
    quiet = false;
  };

  // Con la app y mascotas: igual que en Clínicas cercanas.
  const withApp = () => {
    show(`<form class="card form vet-book"><h2>${label}</h2>${bookForm([c], pets)}</form>`);
    const form = box.querySelector('form');
    bindBook(form, null, [c], null, async () => {
      form.outerHTML = `<div class="card"><p class="clinic-done">✓ Solicitud enviada. Te avisaremos en la app cuando ${esc(c.name)} la confirme.</p></div>${await installCard()}`;
      bindInstall(box);
    });
  };

  // Sin la app: qué es Kiltrazo, y crear cuenta o pedir hora igual.
  const pitch = async () => {
    const hasAccount = isComplete(user);
    show(`
      <div class="card web-app">
        <div class="web-app-top">
          <img src="brand/kiltrazo.svg" alt="Kiltrazo" class="web-app-logo">
          <h2>${hasAccount ? 'Registra a tu mascota para pedir hora' : 'Pide hora más rápido con la app Kiltrazo'}</h2>
        </div>
        <div class="web-app-info">
        <ul class="web-list">
          <li>🐶 Registras a tu mascota escaneando su cara, como Face ID.</li>
          <li>🔎 Si se pierde, Kiltrazo avisa a los vecinos y la reconoce cuando alguien la encuentra.</li>
          <li>📅 Pides hora en segundos, ves sus vacunas y te avisamos 1 hora antes.</li>
        </ul>
        <p class="small muted">Es gratis y se abre desde el navegador, sin descargar nada de una tienda.</p>
        </div>
        <div class="web-app-do">
        ${hasAccount ? '<button class="btn primary" data-register>🐶 Registrar a mi mascota</button>'
          : phoneLike() ? '<button class="btn primary" data-create>Crear mi cuenta en Kiltrazo</button>'
          : '<div class="web-qr"><span data-qr></span><p><b>Escanea con la cámara de tu celular</b> para crear tu cuenta. Después vuelves aquí para pedir hora.</p></div>'}
        <button class="link" data-guest>Prefiero pedir hora sin la app</button>
        </div>
      </div>`);
    box.querySelector('[data-create]')?.addEventListener('click', () => { returnHereLater(here); go('#/perfil'); });
    box.querySelector('[data-register]')?.addEventListener('click', () => { returnHereLater(here); go('#/registrar'); });
    box.querySelector('[data-guest]').addEventListener('click', guest);
    const qr = box.querySelector('[data-qr]');
    if (qr) {
      const QR = (await import('qrcode')).default;
      const url = `${location.origin}${location.pathname}#/c/${c.slug}/crear`;
      qr.innerHTML = `<img alt="QR para crear tu cuenta" class="vet-qr" src="${await QR.toDataURL(url, { margin: 1, width: 220, color: { dark: '#4a3428' } })}">`;
    }
  };

  // Pedir hora sin la app: los mismos pasos, con los datos que la app ya tendría.
  const guest = () => {
    const u = user || {};
    show(`
      <form class="card form vet-book web-guest">
        <h2>${label}</h2>
        <h3>Tus datos</h3>
        <label>Nombre y apellido<input name="tName" required autocomplete="name" value="${esc([u.firstName, u.lastName].filter(Boolean).join(' ') || u.name || '')}"></label>
        <label>Teléfono (WhatsApp)<input name="tPhone" type="tel" required autocomplete="tel" placeholder="+56 9 1234 5678" value="${esc(u.phone || '')}"></label>
        <label>Correo (opcional)<input name="tEmail" type="email" autocomplete="email" value="${esc(u.email || '')}"></label>
        <h3>Tu mascota</h3>
        <label>Nombre<input name="mName" required maxlength="80"></label>
        <fieldset class="vet-place">
          <label class="pick"><input type="radio" name="mSpecies" value="perro" checked> 🐶 Perro</label>
          <label class="pick"><input type="radio" name="mSpecies" value="gato"> 🐱 Gato</label>
          <label class="pick"><input type="radio" name="mSpecies" value="otro"> Otro</label>
        </fieldset>
        <label>Raza (opcional)<input name="mBreed" maxlength="80" placeholder="Ej.: Mestizo, Poodle"></label>
        <h3>La hora</h3>
        ${bookForm([c], null, true)}
      </form>`);
    const form = box.querySelector('form');
    bindBook(form, null, [c], null, () => {}, {
      submit: async (req) => {
        await guestRequestAppointment({
          ...req,
          tutor: { name: form.tName.value.trim(), phone: form.tPhone.value.trim(), email: form.tEmail.value.trim() },
          pet: { name: form.mName.value.trim(), species: form.mSpecies.value, breed: form.mBreed.value.trim() },
        });
        form.outerHTML = `
          <div class="card">
            <p class="clinic-done">✓ ¡Listo! ${esc(c.name)} recibió tu solicitud y te confirmará por teléfono o WhatsApp al ${esc(form.tPhone.value.trim())}.</p>
            <p class="small muted">¿Quieres que la próxima vez sea más rápido? <a href="#/perfil" data-later>Crea tu cuenta en Kiltrazo</a>.</p>
          </div>`;
        box.querySelector('[data-later]')?.addEventListener('click', () => returnHereLater(here));
      },
    });
  };

  const open = () => (pets.length ? withApp() : pitch());
  bookBtn.addEventListener('click', open);
  if (wide) open();
}
