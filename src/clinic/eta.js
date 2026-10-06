// Cuánto falta para llegar a una visita a domicilio, para el WhatsApp al tutor
// que no tiene la app. Waze y Google Maps no dan este dato gratis, así que se
// usa la ruta en auto de OpenStreetMap (OSRM), sin tráfico. Si no responde, se
// estima por la distancia en línea recta.

import { getLocation } from '../ui.js';

const KM = (a, b) => {
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lng - a.lng) / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
};

async function routeMinutes(from, to) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
    const j = await (await fetch(url, { signal: ctl.signal })).json();
    const s = j?.routes?.[0]?.duration;
    // En ciudad el tráfico alarga el viaje: un 30% más que la ruta libre.
    return s ? (s / 60) * 1.3 : null;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Minutos aproximados desde donde está el veterinario, o null si no se puede saber. */
export async function etaMinutes(dest) {
  if (dest?.lat == null || dest?.lng == null) return null;
  const here = await getLocation();
  if (!here) return null;
  const to = { lat: Number(dest.lat), lng: Number(dest.lng) };
  // Sin ruta: 1,4 veces la línea recta a 25 km/h.
  return (await routeMinutes(here, to)) ?? (KM(here, to) * 1.4 * 60) / 25;
}

/** “unos 20 minutos”, redondeado a 5. */
export function etaText(min) {
  if (min == null) return '';
  if (min < 7) return 'unos 5 minutos';
  const m = Math.ceil(min / 5) * 5;
  return m >= 60 ? `cerca de ${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ''}` : `unos ${m} minutos`;
}
