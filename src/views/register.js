import { registerPet } from '../data.js';
import { mountScanner } from '../scanner.js';
import { esc, toast, go } from '../ui.js';
import { SPECIES, breedOptions } from '../breeds.js';

// Pantalla 1: registrar mascota (escaneo facial + datos).
export default async function register(el, _params, { user }) {
  el.innerHTML = `
    <div class="card">
      <div class="steps"><span class="on">1 · Escanear</span><span>2 · Datos</span></div>
      <h1>Registrar mascota</h1>
      <p>Filma su cara con buena luz moviendo el celular despacio, como Face ID: la app toma sola 5 capturas desde distintos ángulos y al final una de su nariz bien de cerca (sus pliegues son únicos, como una huella digital). También puedes usar fotos de tu galería.</p>
      <div id="scanner"></div>
    </div>
    <div class="card" id="details" hidden>
      <h2>Datos de tu mascota</h2>
      <form class="form" id="petform">
        <label>1. Nombre de la mascota<input name="name" required></label>
        <label>2. Tipo de mascota<select name="species" required>
          <option value="">Elige…</option>
          ${Object.entries(SPECIES).map(([v, t]) => `<option value="${v}">${t}</option>`).join('')}
        </select></label>
        <label>3. Raza<input name="breed" list="breeds" placeholder="Ej: Mestizo (quiltro), Labrador o Siamés" autocomplete="off"></label>
        <datalist id="breeds"></datalist>
        <label>4. Nombre del dueño<input name="ownerName" required value="${esc(user.name)}"></label>
        <label>5. Enfermedades<textarea name="diseases" rows="2" placeholder="Ej: alergia al pollo, epilepsia (o 'ninguna')"></textarea></label>
        <label>6. Vacunas<textarea name="vaccines" rows="2" placeholder="Ej: antirrábica 2026, óctuple"></textarea></label>
        <button class="btn primary big">Registrar</button>
      </form>
    </div>`;

  let scan = null;
  mountScanner(el.querySelector('#scanner'), {
    mode: 'enroll',
    label: 'Empezar escaneo',
    onDone(result) {
      scan = result;
      el.querySelector('.steps span:last-child').classList.add('on');
      const details = el.querySelector('#details');
      details.hidden = false;
      details.scrollIntoView({ behavior: 'smooth' });
      details.querySelector('input').focus({ preventScroll: true });
    },
    onReset() {
      scan = null;
      el.querySelector('.steps span:last-child').classList.remove('on');
      el.querySelector('#details').hidden = true;
    },
  });

  const form = el.querySelector('#petform');
  form.species.addEventListener('change', () => {
    el.querySelector('#breeds').innerHTML = breedOptions(form.species.value);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!scan) return toast('Primero escanea la cara de tu mascota');
    const f = new FormData(e.target);
    const pet = await registerPet(user, {
      name: f.get('name').trim(),
      species: f.get('species'),
      breed: f.get('breed').trim(),
      ownerName: f.get('ownerName').trim(),
      diseases: f.get('diseases').trim(),
      vaccines: f.get('vaccines').trim(),
      photo: scan.photo,
      biometric: scan.biometric,
    });
    toast(`¡${pet.name} quedó registrada! 🎉`, 'ok');
    go('#/');
  });
}
