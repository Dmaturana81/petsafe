// Conexión a Supabase. La URL y la clave "publishable/anon" son públicas por
// diseño (van dentro de la app); la seguridad la ponen las reglas RLS de
// supabase/schema.sql. Si están vacías, la app guarda todo en este navegador.
export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY || '';

export const CLOUD = Boolean(SUPABASE_URL && SUPABASE_KEY);

// Servidor de reconocimiento (server/, un Space gratis de Hugging Face). Si
// está, el celular no descarga los modelos; si falla, se usan en el celular.
export const BIO_SERVER = (import.meta.env.VITE_BIO_SERVER || '').replace(/\/+$/, '');

// Enlace para aportes voluntarios (Mercado Pago, Flow u otro). Si está vacío,
// no se muestra el botón "Apoya a Kiltrazo".
export const SUPPORT_URL = import.meta.env.VITE_SUPPORT_URL || '';

// Versión del texto de la casilla de promociones. Si el texto cambia, sube la
// versión: así queda registrado qué aceptó cada persona.
export const PROMOS_VERSION = 'promos-2026-09-30';

// Versión de los términos de uso de Kiltrazo Clínica (src/views/terms.js). Si
// el texto cambia en algo importante, sube la versión: queda registrado qué
// versión aceptó cada clínica.
export const TERMS_VERSION = 'clinica-2026-10-02';

// Dirección pública de Kiltrazo, sin "/" al final. Con ella se arman los
// enlaces que ve Google (canonical, sitemap.xml) y las vistas previas al
// compartir en WhatsApp o Facebook. Al tener dominio propio, cambiarla en
// .env.production (por ejemplo https://kiltrazo.cl).
export const SITE_URL = (import.meta.env.VITE_SITE_URL || 'https://andresmaturana-ui.github.io/petsafe').replace(/\/+$/, '');

// Estadísticas y publicidad (opcionales). Si están vacías no se carga nada ni
// aparece el aviso de cookies. Con alguna, se carga solo si la persona acepta.
// Google Analytics 4: "G-XXXXXXX". Píxel de Meta: un número largo.
export const GA_ID = import.meta.env.VITE_GA_ID || '';
export const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || '';
