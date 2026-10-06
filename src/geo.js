// Avisos de mascotas perdidas cerca: mismas reglas que report_lost en
// supabase/schema.sql (radio de 5 km, zona redondeada a ~1 km).

export const NEARBY_KM = 5;

/** Distancia en km entre dos puntos (haversine). */
export function kmBetween(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2
    + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, h)));
}

/** Zona aproximada: 2 decimales (~1 km). Nunca se guarda la ubicación exacta. */
export const roundArea = ({ lat, lng }) => ({ lat: Math.round(lat * 100) / 100, lng: Math.round(lng * 100) / 100 });

export const distanceText = (km) => (km < 1 ? 'a menos de 1 km de ti' : `a ${Math.round(km)} km de ti`);
