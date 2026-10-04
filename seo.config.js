// Preparación para Google (SEO), Search Console y Meta, en cada build:
// - Pone la dirección pública (VITE_SITE_URL) en las etiquetas de index.html.
// - Agrega las etiquetas de verificación de Google y Meta si están configuradas.
// - Escribe robots.txt y sitemap.xml (con la página de cada clínica aprobada).
// - Crea …/veterinarios/, una dirección "de verdad" para el buscador de
//   veterinarios: Google no indexa lo que va después de "#".
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Clínicas aprobadas y visibles en el mapa, para el sitemap. Si Supabase no
// responde, el sitemap sale igual, sin ellas.
async function clinicSlugs(env) {
  if (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_KEY) return [];
  try {
    const res = await fetch(`${env.VITE_SUPABASE_URL}/rest/v1/rpc/nearby_clinics`, {
      method: 'POST',
      headers: { apikey: env.VITE_SUPABASE_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_lat: null, p_lng: null, p_km: 50 }),
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()).map((c) => c.slug).filter(Boolean);
  } catch (err) {
    console.warn(`sitemap.xml sin clínicas (${err.message})`);
    return [];
  }
}

export function seo(env) {
  const site = (env.VITE_SITE_URL || 'https://kiltrazo.cl').replace(/\/+$/, '');
  let outDir = 'dist';
  let building = false;
  return {
    name: 'kiltrazo-seo',
    configResolved(config) {
      outDir = config.build.outDir;
      building = config.command === 'build';
    },
    transformIndexHtml(html) {
      const verify = [
        env.VITE_GOOGLE_VERIFICATION && `<meta name="google-site-verification" content="${xml(env.VITE_GOOGLE_VERIFICATION)}" />`,
        env.VITE_META_VERIFICATION && `<meta name="facebook-domain-verification" content="${xml(env.VITE_META_VERIFICATION)}" />`,
      ].filter(Boolean).join('\n    ');
      return html.replaceAll('__SITE_URL__', site).replace('</head>', verify ? `  ${verify}\n  </head>` : '</head>');
    },
    async closeBundle() {
      if (!building) return;
      const today = new Date().toISOString().slice(0, 10);
      const urls = [
        { loc: `${site}/`, priority: '1.0' },
        { loc: `${site}/veterinarios/`, priority: '0.9' },
        ...(await clinicSlugs(env)).map((slug) => ({ loc: `${site}/?c=${encodeURIComponent(slug)}`, priority: '0.7' })),
      ];
      await writeFile(`${outDir}/sitemap.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${xml(u.loc)}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`).join('\n')}
</urlset>
`);
      await writeFile(`${outDir}/robots.txt`, `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`);

      // …/veterinarios/: la misma app, con su propio título y descripción.
      const title = 'Encuentra veterinario cerca de ti · Kiltrazo';
      const description = 'Clínicas veterinarias y veterinarios a domicilio en Chile. Busca por comuna o especialidad, mira urgencias y pide hora en línea, con o sin la app.';
      const index = await readFile(`${outDir}/index.html`, 'utf8');
      const page = index
        .replace('<head>', '<head>\n    <base href="../" />')
        .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
        .replace(/(<meta name="description" content=")[^"]*/, `$1${description}`)
        .replace(/(<meta property="og:description" content=")[^"]*/, `$1${description}`)
        .replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${description}`)
        .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
        .replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${title}`)
        .replace(`<link rel="canonical" href="${site}/" />`, `<link rel="canonical" href="${site}/veterinarios/" />`)
        .replace(`<meta property="og:url" content="${site}/" />`, `<meta property="og:url" content="${site}/veterinarios/" />`);
      await mkdir(`${outDir}/veterinarios`, { recursive: true });
      await writeFile(`${outDir}/veterinarios/index.html`, page);
    },
  };
}
