// Kiltrazo: envía cada aviso nuevo como notificación push, para que llegue
// aunque la app esté cerrada.
//
// La base de datos la llama con { id } al guardar un aviso (ver
// push_notification() en supabase/schema.sql). Solo envía avisos que existen
// y una sola vez, así que no hace falta clave para llamarla.
//
// Secretos (Supabase → Edge Functions → Secrets): VAPID_PUBLIC_KEY,
// VAPID_PRIVATE_KEY y VAPID_SUBJECT (mailto:tu-correo). Las claves se generan
// en la app: Administrador → Datos → Notificaciones push.

import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

webpush.setVapidDetails(
  Deno.env.get('VAPID_SUBJECT') || 'mailto:admin@kiltrazo.app',
  Deno.env.get('VAPID_PUBLIC_KEY')!,
  Deno.env.get('VAPID_PRIVATE_KEY')!,
);

Deno.serve(async (req) => {
  const { id } = await req.json().catch(() => ({}));
  if (!id) return new Response('Falta id', { status: 400 });

  // Se marca antes de enviar para no mandarlo dos veces.
  const { data: n } = await db.from('notifications').update({ pushed: true })
    .eq('id', id).eq('pushed', false).select().maybeSingle();
  if (!n) return Response.json({ sent: 0 });

  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', n.user_id);
  const payload = JSON.stringify({ id: n.id, title: n.title, body: n.body, url: n.url });
  let sent = 0;
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 24 * 3600, urgency: 'high' },
      );
      sent++;
    } catch (err) {
      // Suscripción vencida (desinstaló la app o quitó el permiso).
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        await db.from('push_subscriptions').delete().eq('endpoint', s.endpoint);
      } else {
        console.error('push', err?.statusCode, err?.body || err);
      }
    }
  }
  // Nadie lo recibió: la app lo mostrará al abrirse.
  if (!sent) await db.from('notifications').update({ pushed: false }).eq('id', id);
  return Response.json({ sent });
});
