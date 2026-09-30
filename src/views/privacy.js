import { SUPPORT_URL } from '../config.js';
import { esc } from '../ui.js';

// Casilla de ofertas: aparte, opcional y siempre desmarcada al comienzo
// (Ley 21.719: consentimiento expreso, informado y específico). Si cambia el
// texto, subir PROMOS_VERSION en src/config.js.
export const promosBox = (checked = false) => `
  <label class="consent">
    <input type="checkbox" name="promos" ${checked ? 'checked' : ''}>
    <span>Quiero recibir ofertas y novedades útiles para mi mascota (veterinarias, tiendas y servicios de mi comuna), por correo o WhatsApp. Kiltrazo las envía y <strong>nunca entrega mis datos</strong> a esas empresas. Es opcional y puedo darme de baja cuando quiera desde mi perfil.</span>
  </label>`;

// Aporte voluntario: no cambia nada en la app y no se pide nunca como condición.
export const supportCard = () => `
  <div class="card support">
    <h2>Apoya a Kiltrazo 💛</h2>
    <p>Kiltrazo es gratis y lo mantiene una persona. Si te sirvió, puedes ayudar con un aporte voluntario para pagar el servidor y seguir mejorándolo.</p>
    <a class="btn secondary" href="${esc(SUPPORT_URL)}" target="_blank" rel="noopener">Hacer un aporte</a>
    <p class="muted small">Es voluntario: la app sigue igual de completa aunque no aportes.</p>
  </div>`;

// Política de privacidad: qué datos se piden, para qué, quién los ve y cómo
// ejercer los derechos de la Ley 19.628 y la Ley 21.719.
export default async function privacy(el) {
  el.innerHTML = `
    <div class="card legal">
      <h1>Política de privacidad</h1>
      <p class="muted small">Vigente desde el 30 de septiembre de 2026.</p>

      <h2>Quién es responsable</h2>
      <p>El administrador de Kiltrazo es responsable de tus datos. Puedes escribirle desde la app en Perfil → "¿Necesitas ayuda?".</p>

      <h2>Qué datos pedimos</h2>
      <ul>
        <li>Tuyos: nombres, apellidos, teléfono, correo y dirección.</li>
        <li>De tu mascota: nombre, tipo, raza, vacunas, enfermedades, fotos y la huella biométrica de su cara y nariz.</li>
        <li>De los avisos: la ubicación que entregas al reportar una mascota perdida o encontrada.</li>
      </ul>

      <h2>Para qué los usamos</h2>
      <ul>
        <li>Para reconocer a tu mascota y avisarte si alguien la encuentra.</li>
        <li>Para que el dueño de una mascota que encontraste pueda contactarte.</li>
        <li>Solo si marcaste la casilla: para enviarte ofertas y novedades útiles para tu mascota. Puedes darte de baja cuando quieras desde tu perfil, y eso no cambia nada más en la app.</li>
      </ul>

      <h2>Quién los ve</h2>
      <ul>
        <li>Si encuentras una mascota, su dueño ve tu nombre y teléfono para coordinar la entrega. Quien encuentra a tu mascota no ve tus datos.</li>
        <li>El correo y la dirección solo los ve el administrador de Kiltrazo.</li>
        <li>No vendemos ni entregamos tus datos a empresas. Si recibes una oferta, la envía Kiltrazo.</li>
        <li>Los datos se guardan en Supabase, un servicio de base de datos en la nube que Kiltrazo usa para funcionar.</li>
      </ul>

      <h2>Tus derechos</h2>
      <p>Puedes pedir acceso a tus datos, corregirlos, borrarlos, oponerte a su uso para ofertas y pedir una copia. Tus datos y mascotas los puedes editar o eliminar en tu perfil. Para lo demás, escríbele al administrador desde la app.</p>

      <h2>Cuánto tiempo los guardamos</h2>
      <p>Mientras tengas tu cuenta. Si eliminas una mascota, se borran sus datos y su biometría.</p>

      <h2>Cambios</h2>
      <p>Si esta política cambia, lo avisaremos en la app. Para usar tus datos en algo nuevo te pediremos permiso otra vez.</p>
    </div>
    ${SUPPORT_URL ? supportCard() : ''}`;
}
