// Guía "Cómo sujetar a tu mascota para la foto": se abre con el botón ⓘ del
// escáner. La app necesita ver ojos, nariz y orejas sin manos encima.

const FUR = '#d9a066';
const MUZZLE = '#f6dcbc';
const DARK = '#3b2a20';
const SKIN = '#f2c6a0';
const SKIN_LINE = '#c98f6a';
const SHIRT = '#6fae7b';
const OK = '#548f60';
const BAD = '#d95f45';

// Cara de perro de frente, centrada en (x, y).
const face = (x, y, s = 1, { ears = 'down' } = {}) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    ${ears === 'up'
      ? `<path d="M-44 -30 L-38 -78 L-12 -44 Z M44 -30 L38 -78 L12 -44 Z" fill="${FUR}" stroke="${DARK}" stroke-width="3" stroke-linejoin="round"/>`
      : `<ellipse cx="-46" cy="-10" rx="16" ry="32" fill="#b97d45" stroke="${DARK}" stroke-width="3" transform="rotate(18 -46 -10)"/>
         <ellipse cx="46" cy="-10" rx="16" ry="32" fill="#b97d45" stroke="${DARK}" stroke-width="3" transform="rotate(-18 46 -10)"/>`}
    <ellipse cx="0" cy="0" rx="46" ry="44" fill="${FUR}" stroke="${DARK}" stroke-width="3"/>
    <ellipse cx="0" cy="22" rx="24" ry="17" fill="${MUZZLE}"/>
    <circle cx="-17" cy="-8" r="5" fill="${DARK}"/><circle cx="17" cy="-8" r="5" fill="${DARK}"/>
    <circle cx="-15.5" cy="-9.5" r="1.6" fill="#fff"/><circle cx="18.5" cy="-9.5" r="1.6" fill="#fff"/>
    <ellipse cx="0" cy="14" rx="9" ry="6.5" fill="${DARK}"/>
    <path d="M0 20 V27 M-8 30 Q0 35 8 30" stroke="${DARK}" stroke-width="2.5" fill="none" stroke-linecap="round"/>
  </g>`;

// Perro de lado mirando a la derecha; (x, y) = centro del cuerpo.
const side = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" stroke="${DARK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
    <path d="M-38 -6 Q-56 -20 -52 -34" fill="none"/>
    <rect x="-30" y="8" width="10" height="30" rx="5" fill="${FUR}"/><rect x="18" y="8" width="10" height="30" rx="5" fill="${FUR}"/>
    <ellipse cx="0" cy="0" rx="42" ry="22" fill="${FUR}"/>
    <circle cx="42" cy="-26" r="20" fill="${FUR}"/>
    <ellipse cx="58" cy="-20" rx="12" ry="9" fill="${MUZZLE}"/>
    <ellipse cx="34" cy="-30" rx="7" ry="15" fill="#b97d45" transform="rotate(20 34 -30)"/>
    <circle cx="48" cy="-31" r="3" fill="${DARK}" stroke="none"/><circle cx="68" cy="-22" r="4" fill="${DARK}" stroke="none"/>
  </g>`;

// Persona muy simple (cabeza + torso) con los brazos que se dibujan aparte.
const person = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})" stroke="${DARK}" stroke-width="3">
    <path d="M-30 70 Q-30 20 0 20 Q30 20 30 70 Z" fill="${SHIRT}"/>
    <circle cx="0" cy="0" r="17" fill="${SKIN}"/>
    <path d="M-17 -4 Q-14 -22 0 -20 Q14 -22 17 -4 Q8 -12 0 -10 Q-8 -12 -17 -4 Z" fill="${DARK}"/>
  </g>`;

const arm = (d) => `
  <path d="${d}" fill="none" stroke="${SKIN_LINE}" stroke-width="15" stroke-linecap="round"/>
  <path d="${d}" fill="none" stroke="${SKIN}" stroke-width="10" stroke-linecap="round"/>`;

const phone = (x, y, s = 1) => `
  <g transform="translate(${x} ${y}) scale(${s})">
    <rect x="-13" y="-22" width="26" height="44" rx="5" fill="${DARK}"/>
    <rect x="-10" y="-17" width="20" height="32" rx="2" fill="#8fd0ff"/>
    <circle cx="0" cy="-19.5" r="1.5" fill="#fff"/>
  </g>`;

const mark = (x, y, good) => `
  <g transform="translate(${x} ${y})">
    <circle r="15" fill="${good ? OK : BAD}"/>
    <path d="${good ? 'M-7 0 L-2 5 L8 -6' : 'M-6 -6 L6 6 M6 -6 L-6 6'}" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
  </g>`;

const svg = (body, h = 170) => `<svg viewBox="0 0 300 ${h}" role="img" aria-hidden="true">${body}</svg>`;

const DRAW = {
  // Mano en copa bajo la mandíbula; ojos, nariz y orejas a la vista.
  cup: svg(`
    ${face(172, 72, 1.25)}
    ${arm('M118 150 Q128 124 150 128 Q172 136 194 128 Q214 120 222 104')}
    <path d="M150 128 Q172 136 194 128" stroke="${SKIN_LINE}" stroke-width="2" fill="none"/>
    <circle cx="222" cy="104" r="7" fill="${SKIN}" stroke="${SKIN_LINE}" stroke-width="2"/>
    ${mark(40, 40, true)}
    <text x="40" y="74" text-anchor="middle" font-size="13" font-weight="800" fill="${OK}">Cara</text>
    <text x="40" y="90" text-anchor="middle" font-size="13" font-weight="800" fill="${OK}">libre</text>
    <text x="246" y="156" text-anchor="middle" font-size="13" font-weight="800" fill="${DARK}">mano en C</text>
    <path d="M250 142 Q242 130 232 114" stroke="${DARK}" stroke-width="2" fill="none" marker-end="url(#tip)"/>
    <defs><marker id="tip" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${DARK}"/></marker></defs>`),

  // Perro chico en la mesa, abrazado suave por detrás.
  small: svg(`
    <rect x="30" y="128" width="240" height="12" rx="4" fill="#b97d45" stroke="${DARK}" stroke-width="3"/>
    <rect x="46" y="140" width="10" height="26" fill="#b97d45" stroke="${DARK}" stroke-width="3"/>
    <rect x="244" y="140" width="10" height="26" fill="#b97d45" stroke="${DARK}" stroke-width="3"/>
    <rect x="70" y="122" width="170" height="7" rx="3" fill="${OK}"/>
    ${person(110, 16, 1.1)}
    ${side(140, 88, 0.9)}
    ${arm('M90 60 Q88 104 130 110 Q160 112 170 104')}
    ${arm('M132 60 Q170 52 176 72')}
    ${phone(272, 64)}
  `),

  // Perro grande en el suelo; la persona arrodillada detrás.
  big: svg(`
    <line x1="10" y1="152" x2="290" y2="152" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>
    ${person(90, 42, 1.25)}
    ${side(150, 104, 1.25)}
    ${arm('M60 100 Q58 136 110 136')}
    ${arm('M118 94 Q170 70 196 82')}
    ${phone(272, 72)}
  `),

  // Contra la pared: no puede retroceder.
  wall: svg(`
    <rect x="16" y="10" width="34" height="142" fill="#f1dfcc" stroke="${DARK}" stroke-width="3"/>
    <path d="M16 36 H50 M16 62 H50 M16 88 H50 M16 114 H50 M33 10 V36 M33 62 V88 M33 114 V152 M24 36 V62 M42 88 V114" stroke="#d9bfa3" stroke-width="2"/>
    <line x1="10" y1="152" x2="290" y2="152" stroke="${DARK}" stroke-width="3" stroke-linecap="round"/>
    ${side(106, 124, 0.95)}
    ${phone(250, 92)}
    <path d="M110 76 Q84 70 66 84" stroke="${BAD}" stroke-width="3" fill="none" stroke-dasharray="5 5"/>
    ${mark(120, 48, false)}
    <text x="120" y="26" text-anchor="middle" font-size="13" font-weight="800" fill="${BAD}">no retrocede</text>
  `),

  // Premio sobre la cámara: mira de frente y para las orejas.
  treat: svg(`
    ${face(96, 96, 0.95, { ears: 'up' })}
    ${phone(226, 110)}
    ${arm('M290 30 Q250 40 232 60')}
    <circle cx="226" cy="64" r="10" fill="${MUZZLE}" stroke="${DARK}" stroke-width="2.5"/>
    <circle cx="223" cy="61" r="2" fill="#e8b25a"/><circle cx="229" cy="67" r="2" fill="#e8b25a"/>
    <path d="M150 82 Q180 70 206 68" stroke="${DARK}" stroke-width="2" fill="none" stroke-dasharray="4 5"/>
    <text x="226" y="160" text-anchor="middle" font-size="13" font-weight="800" fill="${DARK}">premio arriba</text>
  `),

  // Lo que no se hace: cerrar el hocico y tirar de las orejas.
  avoid: svg(`
    ${face(80, 84, 0.95)}
    ${arm('M18 108 Q40 96 80 104 Q120 112 140 98')}
    ${mark(80, 18, false)}
    ${face(222, 84, 0.95)}
    ${arm('M290 50 Q270 64 262 76')}
    <path d="M178 82 L160 70" stroke="${BAD}" stroke-width="4" marker-end="url(#pull)"/>
    <path d="M266 82 L284 70" stroke="${BAD}" stroke-width="4" marker-end="url(#pull)"/>
    ${mark(222, 18, false)}
    <text x="80" y="160" text-anchor="middle" font-size="13" font-weight="800" fill="${BAD}">hocico apretado</text>
    <text x="222" y="160" text-anchor="middle" font-size="13" font-weight="800" fill="${BAD}">orejas tiradas</text>
    <defs><marker id="pull" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0 L10 5 L0 10 Z" fill="${BAD}"/></marker></defs>`),
};

const TIPS = `
  <h2>Cómo sujetarlo para la foto</h2>
  <p class="muted">La app necesita ver bien sus <strong>ojos, nariz y orejas</strong>. Con estos trucos sale una foto que lo reconoce.</p>

  <section class="tip">
    <h3><span>1</span> Mano en copa, bajo el mentón</h3>
    ${DRAW.cup}
    <p>Pon tu mano en forma de <strong>C</strong> justo debajo de la mandíbula, sin apretar el cuello. Así guías su cabeza hacia la cámara y no la agacha. <strong>Nunca le tapes la cara.</strong></p>
  </section>

  <section class="tip">
    <h3><span>2</span> Según su tamaño</h3>
    ${DRAW.small}
    <p><strong>Chico o mediano:</strong> súbelo a una mesa con una toalla que no resbale. Otra persona lo abraza suave por detrás: un brazo bajo la guata y el otro rodeando el pecho.</p>
    ${DRAW.big}
    <p><strong>Grande:</strong> en el suelo. Otra persona se arrodilla detrás, lo rodea con las piernas y le afirma el pecho con una mano para que no avance.</p>
  </section>

  <section class="tip">
    <h3><span>3</span> Si estás solo o no se deja tocar</h3>
    ${DRAW.wall}
    <p><strong>Contra una pared o esquina:</strong> así no puede retroceder ni irse de lado, y mira al frente.</p>
    ${DRAW.treat}
    <p><strong>Un premio sobre el celular:</strong> un trocito de queso o algo que le encante, justo encima de la cámara. Se queda quieto y para las orejas.</p>
  </section>

  <section class="tip avoid">
    <h3><span>!</span> Evita</h3>
    ${DRAW.avoid}
    <p><strong>Cerrarle el hocico con la mano</strong> ni <strong>tirarle las orejas o el collar hacia atrás</strong>: cambian la forma de su cara y la app podría no reconocerlo.</p>
  </section>

  <p class="muted small">🐱 Con gatos sirve lo mismo: mano en copa o un premio, siempre con calma y sin forzarlos.</p>`;

export function openPhotoTips() {
  const back = document.createElement('div');
  back.className = 'tips-sheet';
  back.setAttribute('role', 'dialog');
  back.setAttribute('aria-modal', 'true');
  back.innerHTML = `
    <div class="tips-body">
      <button type="button" class="tips-close" aria-label="Cerrar">✕</button>
      ${TIPS}
      <button type="button" class="btn primary big" data-ok>Entendido</button>
    </div>`;
  const close = () => back.remove();
  back.addEventListener('click', (e) => {
    if (e.target === back || e.target.closest('.tips-close, [data-ok]')) close();
  });
  document.body.append(back);
  back.querySelector('.tips-close').focus();
}
