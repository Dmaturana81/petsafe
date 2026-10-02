// Página de presentación de la app (…/#/kiltrazo): explica qué es Kiltrazo a
// quien llega por primera vez, en el computador o en el celular. En el
// computador muestra un QR para abrir la app en el celular, donde se escanea
// la cara de la mascota.

const isPhone = () => matchMedia('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const phoneShot = (src, alt, cls = '') => `<figure class="ld-phone ${cls}"><img src="landing/${src}.jpg" alt="${alt}" loading="lazy"></figure>`;

export default async function landing(el) {
  document.title = 'Kiltrazo · Si tu mascota se pierde, su cara la trae de vuelta';
  const phone = isPhone();
  const appUrl = `${location.origin}${location.pathname}#/perfil`;

  const start = phone
    ? `<a class="btn primary big" href="#/perfil">Empezar gratis</a>`
    : `<div class="ld-qr-box"><div class="ld-qr" data-qr></div><div><b>Escanea con la cámara de tu celular</b><p class="small muted">Kiltrazo se usa en el celular: ahí filmas la cara de tu mascota. No se descarga de ninguna tienda.</p><a class="small" href="#/perfil">O empieza en este computador</a></div></div>`;

  el.innerHTML = `
    <div class="ld">
      <header class="fd-top">
        <a href="#/kiltrazo" class="fd-brand"><img src="brand/kiltrazo.svg" alt="Kiltrazo"></a>
        <nav>
          <button type="button" class="ld-link" data-go="como">Cómo funciona</button>
          <button type="button" class="ld-link" data-go="funciones">Funciones</button>
          <a href="#/veterinarios">Buscar veterinario</a>
          <a href="#/clinica">Para veterinarias</a>
          <a class="btn small secondary" href="#/perfil">${phone ? 'Entrar' : 'Abrir la app'}</a>
        </nav>
      </header>

      <section class="ld-hero">
        <div class="ld-hero-text">
          <span class="ld-pill">Gratis para siempre · Perros y gatos</span>
          <h1>Si tu mascota se pierde, su cara la trae de vuelta</h1>
          <p>Registras a tu perro o gato filmando su cara, como Face ID. Si alguien lo encuentra, lo escanea con Kiltrazo y te avisamos al instante, sin collar ni chip.</p>
          ${start}
          <p class="ld-alt"><a href="#/veterinarios">🔎 ¿Buscas veterinario? Encuéntralo sin crear cuenta</a></p>
        </div>
        <div class="ld-hero-phones">
          ${phoneShot('escaneo', 'Escaneo de la cara de un perro en Kiltrazo', 'back')}
          ${phoneShot('inicio', 'Pantalla de inicio de Kiltrazo', 'front')}
        </div>
      </section>

      <section class="ld-stats" aria-label="Qué tan bien reconoce">
        <div><b>96%</b><span>de los perros llega a su dueño en nuestra prueba</span></div>
        <div><b>98%</b><span>de las fotos: encuentra la cabeza sola</span></div>
        <div><b>5 km</b><span>a la redonda avisamos a los vecinos si se pierde</span></div>
        <p class="ld-cite">Prueba con 1.393 perros y 8.363 fotos del set público DogFaceNet (Mougeot, Li y Jia, 2019).</p>
      </section>

      <section class="ld-sec ld-what">
        <h2>Qué es Kiltrazo</h2>
        <p>Kiltrazo es una app gratis que reconoce a cada perro y gato por su cara, como tu celular te reconoce a ti. Si tu mascota se pierde, cualquier persona que la encuentre puede saber de quién es con solo escanearla. Además junta su salud en un solo lugar: vacunas, horas al veterinario y urgencias cerca.</p>
      </section>

      <section class="ld-sec" id="ld-como">
        <h2>Cómo funciona</h2>
        <div class="ld-steps">
          <article class="card"><span class="ld-num">1</span><h3>Regístrala en un minuto</h3><p>Filma su cara moviendo el celular despacio y luego su nariz de cerca. Sus pliegues son únicos, como una huella digital.</p></article>
          <article class="card"><span class="ld-num">2</span><h3>Si se pierde, toca "Perdí mi mascota"</h3><p>Avisamos a quienes viven a 5 km o menos con su foto y la zona aproximada, nunca tu dirección.</p></article>
          <article class="card"><span class="ld-num">3</span><h3>Quien la encuentra, la escanea</h3><p>Kiltrazo la reconoce y te avisa con la ubicación y el contacto de quien la tiene. Tus datos no se muestran.</p></article>
        </div>
      </section>

      <section class="ld-sec ld-split">
        <div>
          <h2>Tus vecinos también la buscan</h2>
          <p>Cuando alguien pierde una mascota cerca de ti, te llega el aviso con su foto. Si la ves, la escaneas y ayudas a que vuelva a casa.</p>
          <ul class="web-list">
            <li>📍 Solo guardamos tu zona aproximada, unos 1 km a la redonda.</li>
            <li>🔕 Lo activas o desactivas cuando quieras en tu perfil.</li>
            <li>🐾 Mientras más mascotas registradas, más rápido vuelven.</li>
          </ul>
        </div>
        ${phoneShot('aviso', 'Aviso de mascota perdida cerca')}
      </section>

      <section class="ld-sec" id="ld-funciones">
        <h2>Todo lo que hace Kiltrazo</h2>
        <h3 class="ld-group">Para que vuelva a casa</h3>
        <div class="ld-feats">
          <article class="card"><span>📸</span><h3>Registro con su cara</h3><p>Filmas su cara y su nariz. Sin chip, sin collar, sin papeles.</p></article>
          <article class="card"><span>😢</span><h3>Perdí mi mascota</h3><p>Con un toque activas el aviso y empezamos a buscar coincidencias.</p></article>
          <article class="card"><span>🔍</span><h3>Encontré una mascota</h3><p>La escaneas y, si está registrada, avisamos a su dueño al instante.</p></article>
          <article class="card"><span>📣</span><h3>Aviso a vecinos</h3><p>Quienes viven a 5 km o menos reciben su foto y la zona donde se perdió.</p></article>
          <article class="card"><span>🔔</span><h3>Alarma al encontrarla</h3><p>Si alguien la reconoce, suena una alarma en tu celular con su ubicación y contacto.</p></article>
          <article class="card"><span>💛</span><h3>Reencuentros felices</h3><p>Cuando vuelve a casa quitas el aviso y su historia anima a otros.</p></article>
        </div>
        <h3 class="ld-group">Para su salud</h3>
        <div class="ld-feats">
          <article class="card"><span>🩺</span><h3>Mi veterinaria</h3><p>Si tu veterinaria usa Kiltrazo, ves sus vacunas y próximas horas en la app.</p></article>
          <article class="card"><span>📅</span><h3>Pide hora</h3><p>En la clínica o a domicilio, eligiendo entre las horas libres.</p></article>
          <article class="card"><span>⏰</span><h3>Recordatorios</h3><p>Te avisamos 1 hora antes de cada hora y cuando se acerca una vacuna.</p></article>
          <article class="card"><span>🚗</span><h3>Veterinario en camino</h3><p>Si te atienden a domicilio, te avisa cuando sale y cuando llega.</p></article>
          <article class="card"><span>🚨</span><h3>Urgencias cerca</h3><p>Un mapa con las clínicas cercanas para llamar o ir al tiro.</p></article>
          <article class="card"><span>🔎</span><h3>Busca por especialidad</h3><p>Gatos, dermatología, cirugía y más, con su página para pedir hora.</p></article>
        </div>
      </section>

      <section class="ld-sec ld-install card">
        <h2>Instálala en tu celular</h2>
        <p>Kiltrazo es una app web: no ocupa espacio ni se baja de una tienda. Para recibir avisos, agrégala a la pantalla de inicio.</p>
        <div class="ld-os">
          <div><h3>iPhone</h3><ol><li>Ábrela en <b>Safari</b>.</li><li>Toca Compartir <b>⬆️</b>.</li><li>Elige <b>Agregar a inicio</b>.</li></ol></div>
          <div><h3>Android</h3><ol><li>Ábrela en <b>Chrome</b>.</li><li>Toca el menú <b>⋮</b>.</li><li>Elige <b>Instalar app</b>.</li></ol></div>
        </div>
        ${phone ? '<a class="btn primary" href="#/perfil">Empezar gratis</a>' : ''}
      </section>

      <section class="ld-sec">
        <h2>Preguntas frecuentes</h2>
        <details class="card"><summary>¿Cuánto cuesta?</summary><p>Nada. Kiltrazo es gratis para los dueños de mascotas, hoy y siempre.</p></details>
        <details class="card"><summary>¿Quién ve mis datos?</summary><p>Tus datos de contacto solo los ven el administrador de Kiltrazo y la veterinaria que tú elijas. Cuando alguien encuentra a tu mascota, te avisamos a ti; no le mostramos tu dirección. Nunca vendemos ni compartimos la base de datos. <a href="#/privacidad">Política de privacidad</a></p></details>
        <details class="card"><summary>¿Funciona con gatos?</summary><p>Sí. Puedes registrar perros, gatos y otras mascotas. El reconocimiento se midió con perros y seguimos mejorándolo.</p></details>
        <details class="card"><summary>¿Reemplaza al chip?</summary><p>No, lo complementa. El chip necesita un lector; Kiltrazo funciona con cualquier celular, de inmediato.</p></details>
        <details class="card"><summary>¿Dónde está el manual?</summary><p><a href="manuales/Manual-app-Kiltrazo.pdf" target="_blank" rel="noopener">Descarga el manual en PDF</a>. También está en la app, en Perfil → Ayuda.</p></details>
      </section>

      <section class="ld-vets card">
        <div>
          <h2>¿Tienes una veterinaria o atiendes a domicilio?</h2>
          <p>Kiltrazo Clínica es gratis: agenda, fichas, vacunas y tu propia página para que te pidan hora.</p>
        </div>
        <a class="btn secondary" href="#/clinica">Crear mi clínica</a>
      </section>

      <footer class="fd-foot">
        <p><a href="#/veterinarios">Buscar veterinario</a> · <a href="#/clinica">Para veterinarias</a> · <a href="#/privacidad">Privacidad</a></p>
        <p class="small">Kiltrazo · Hecho en Chile 🇨🇱</p>
      </footer>
    </div>`;

  el.querySelectorAll('[data-go]').forEach((b) => b.addEventListener('click', () => el.querySelector(`#ld-${b.dataset.go}`)?.scrollIntoView({ behavior: 'smooth' })));
  const qr = el.querySelector('[data-qr]');
  if (qr) {
    const QR = (await import('qrcode')).default;
    qr.innerHTML = `<img alt="QR para abrir Kiltrazo en el celular" src="${await QR.toDataURL(appUrl, { margin: 1, width: 200, color: { dark: '#4a3428' } })}">`;
  }
}
