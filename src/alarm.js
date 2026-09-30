// Alarma de "¡Encontraron a tu mascota!": con la app abierta suena una sirena,
// vibra (Android) y se muestra en pantalla completa hasta que se toca.
//
// Los navegadores solo dejan sonar audio después de que la persona toca la
// pantalla, por eso unlockAudio() se llama con el primer toque de cada visita.

import { esc } from './ui.js';

let ctx;
const shown = new Set();

export function unlockAudio() {
  try {
    // iPhone: que suene aunque el celular esté en silencio.
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    // Un sonido vacío termina de habilitar el audio en Safari.
    const src = ctx.createBufferSource();
    src.buffer = ctx.createBuffer(1, 1, 22050);
    src.connect(ctx.destination);
    src.start();
  } catch { /* sin audio */ }
}

/** Avisos que suenan como alarma: los que dicen que encontraron tu mascota. */
export const isAlarm = (n) => /#\/encontrada\//.test(n?.url || '');

const VIBRATE = [800, 300, 800, 300, 1500];
export const alarmOptions = { requireInteraction: true, renotify: true, vibrate: VIBRATE, silent: false };

// Sube y baja de tono, como una sirena, cada 1,2 s.
function siren() {
  if (!ctx) return () => {};
  if (ctx.state === 'suspended') ctx.resume();
  const gain = ctx.createGain();
  gain.gain.value = 0.35;
  gain.connect(ctx.destination);
  const cycle = () => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.linearRampToValueAtTime(1300, t + 0.6);
    osc.frequency.linearRampToValueAtTime(650, t + 1.2);
    osc.connect(gain);
    osc.start(t);
    osc.stop(t + 1.2);
  };
  cycle();
  const timer = setInterval(cycle, 1200);
  // Se detiene sola después de un minuto.
  const limit = setTimeout(stop, 60000);
  function stop() {
    clearInterval(timer);
    clearTimeout(limit);
    gain.disconnect();
  }
  return stop;
}

export function startAlarm({ id, title, body, url }) {
  if (id && shown.has(id)) return;
  if (id) shown.add(id);
  const stopSound = siren();
  navigator.vibrate?.([...VIBRATE, 300, ...VIBRATE, 300, ...VIBRATE]);

  const el = document.createElement('div');
  el.className = 'alarm';
  el.setAttribute('role', 'alertdialog');
  el.innerHTML = `
    <div class="alarm-box">
      <div class="alarm-icon">🚨</div>
      <h1>${esc(title)}</h1>
      <p>${esc(body)}</p>
      <button class="btn primary big" data-go>Ver dónde está</button>
      <button class="btn ghost" data-close>Silenciar</button>
    </div>`;
  const close = () => {
    stopSound();
    navigator.vibrate?.(0);
    el.remove();
  };
  el.querySelector('[data-go]').addEventListener('click', () => {
    close();
    if (url) location.hash = url.replace(/^.*#/, '#');
  });
  el.querySelector('[data-close]').addEventListener('click', close);
  document.body.append(el);
}
