// Lo que ven Google y las vistas previas al compartir un enlace: título,
// descripción, dirección "oficial" (canonical) y datos estructurados
// (schema.org) de cada página pública.
import { SITE_URL } from './config.js';

export const DEFAULT_TITLE = 'Kiltrazo · Si tu mascota se pierde, su cara la trae de vuelta';
export const DEFAULT_DESCRIPTION = 'App gratis que reconoce a tu perro o gato por su cara. Si se pierde, quien lo encuentra lo escanea y te avisamos al instante. Además, busca veterinario y pide hora en línea.';

function meta(attr, key, value) {
  let tag = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', value);
}

// path: la dirección sin el dominio, por ejemplo "/veterinarios/" o "/?c=vet-nunoa".
export function setPage({ title = DEFAULT_TITLE, description = DEFAULT_DESCRIPTION, path = '/', jsonLd = null } = {}) {
  const url = SITE_URL + path;
  document.title = title;
  meta('name', 'description', description);
  meta('property', 'og:title', title);
  meta('property', 'og:description', description);
  meta('property', 'og:url', url);
  meta('name', 'twitter:title', title);
  meta('name', 'twitter:description', description);
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'canonical';
    document.head.appendChild(link);
  }
  link.href = url;
  document.getElementById('ld-page')?.remove();
  if (jsonLd) {
    const s = document.createElement('script');
    s.type = 'application/ld+json';
    s.id = 'ld-page';
    s.textContent = JSON.stringify({ '@context': 'https://schema.org', ...jsonLd });
    document.head.appendChild(s);
  }
}
