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
