// Datos en Supabase: compartidos entre celulares.
// Misma interfaz que data-local.js. La búsqueda por biometría y las reglas de
// privacidad (quien encuentra no ve datos del dueño) corren en la base de
// datos: ver supabase/schema.sql.

import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';
import { pushLocal, subscribePush } from './notify.js';

let client;
function sb() {
  client ??= createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: true } });
  return client;
}

// snake_case de la base → camelCase de la app.
const camel = (row) =>
  row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]));
const rows = (list) => (list || []).map(camel);

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Usuarios ----------
// Cada celular entra con una sesión anónima de Supabase; el perfil guarda
// nombre y teléfono.

let sessionPromise;
function session() {
  sessionPromise ??= (async () => {
    const { data } = await sb().auth.getSession();
    if (data.session) return data.session.user;
    const res = await sb().auth.signInAnonymously();
    if (res.error) {
      sessionPromise = null;
      throw new Error('No se pudo conectar con el servidor: ' + res.error.message);
    }
    return res.data.user;
  })();
  return sessionPromise;
}

export async function currentUser() {
  const auth = await session();
  const profile = await run(sb().from('profiles').select('*').eq('id', auth.id).maybeSingle());
  if (profile) watchNotifications(profile.id);
  return camel(profile);
}

export async function saveUser({ name, phone, firstName = '', lastName = '', email = '', address = '' }) {
  const auth = await session();
  const row = { id: auth.id, name, phone, first_name: firstName, last_name: lastName, email, address };
  return camel(await run(sb().from('profiles').upsert(row).select().single()));
}

export async function switchUser() {}

// ---------- Entrar con correo ----------
// Con el mismo correo se es el mismo usuario en cualquier dispositivo (y el
// administrador, si su correo está en admin_emails). Supabase envía un código.

// 'email_change': el correo queda en el usuario de este dispositivo (conserva
// sus datos y mascotas). 'email': el correo ya tiene cuenta y se entra a ella.
// El correo gratis de Supabase trae un enlace (no un código): al tocarlo se
// vuelve a la app con la sesión iniciada (ver finishEmailLink).
let codeType = 'email';
const back = () => location.origin + location.pathname;

export async function sendLoginCode(email) {
  const auth = await session();
  if (auth.is_anonymous) {
    const { error } = await sb().auth.updateUser({ email }, { emailRedirectTo: back() });
    if (!error) {
      codeType = 'email_change';
      return;
    }
    if (!/already|registered|exists/i.test(error.message)) throw new Error(error.message);
  }
  const { error } = await sb().auth.signInWithOtp({ email, options: { shouldCreateUser: true, emailRedirectTo: back() } });
  if (error) throw new Error(error.message);
  codeType = 'email';
}

/**
 * Al volver desde el enlace del correo, la dirección trae la sesión
 * (#access_token=…). Supabase la toma al iniciar; aquí se espera y se limpia
 * la dirección. Devuelve un mensaje de error si el enlace no sirvió.
 */
export async function finishEmailLink() {
  const params = new URLSearchParams(location.hash.slice(1));
  if (!params.has('access_token') && !params.has('error_description')) return null;
  await sb().auth.getSession();
  sessionPromise = null;
  return params.get('error_description') || '';
}

export async function verifyLoginCode(email, code) {
  const { data, error } = await sb().auth.verifyOtp({ email, token: code, type: codeType });
  if (error) throw new Error(error.message);
  sessionPromise = Promise.resolve(data.user);
  watching = null;
  return data.user;
}

/** Correo con el que se entró en este dispositivo, o '' si es una sesión anónima. */
export async function loginEmail() {
  await session();
  // Si el correo se confirmó desde otro navegador (por ejemplo, el enlace se
  // abrió en Safari), se renueva la sesión para que ya lo incluya.
  const { data } = await sb().auth.getUser();
  const user = data.user;
  if (!user || user.is_anonymous || !user.email) return '';
  const { data: s } = await sb().auth.getSession();
  if (s.session?.user?.is_anonymous) await sb().auth.refreshSession();
  return user.email;
}

export async function listUsers() {
  return rows(await run(sb().from('profiles').select('*').order('created_at')));
}

// ---------- Mascotas ----------

export async function registerPet(_owner, { name, species = '', breed = '', ownerName, diseases, vaccines, photo, biometric }) {
  const id = await run(sb().rpc('register_pet', {
    p_name: name, p_species: species, p_breed: breed, p_owner_name: ownerName, p_diseases: diseases, p_vaccines: vaccines, p_photo: photo, p_bio: biometric,
  }));
  return { id, name };
}

export async function myPets(user) {
  return rows(await run(sb().from('pets').select('*').eq('owner_id', user.id).order('created_at')));
}

export async function getPet(id) {
  return camel(await run(sb().from('pets').select('*').eq('id', id).maybeSingle()));
}

export async function allPets() {
  return rows(await run(sb().from('pets').select('*')));
}

export async function savePet(pet) {
  return run(sb().from('pets').update({
    name: pet.name, species: pet.species || '', breed: pet.breed || '', diseases: pet.diseases || '', vaccines: pet.vaccines || '',
  }).eq('id', pet.id));
}

export async function removeMyPet(_user, petId) {
  await run(sb().from('pets').delete().eq('id', petId));
  return true;
}

export async function reportLost(pet) {
  const r = await run(sb().rpc('report_lost', { p_pet: pet.id }));
  return { match: r.id ? { id: r.id } : null, suggestions: rows(r.suggestions) };
}

/** El dueño reconoce a su mascota en un aviso sugerido. */
export async function claimFound(pet, reportId) {
  return run(sb().rpc('claim_found', { p_found: reportId, p_pet: pet.id }));
}

export async function markRecovered(pet, story = '') {
  return run(sb().rpc('mark_recovered', { p_pet: pet.id, p_story: story }));
}

// ---------- Mascotas encontradas ----------

export async function reportFound(_finder, { photo, biometric, lat, lng, species = '', finderName, finderPhone }) {
  const r = await run(sb().rpc('report_found', {
    p_species: species, p_photo: photo, p_bio: biometric, p_lat: lat, p_lng: lng, p_name: finderName, p_phone: finderPhone,
  }));
  return {
    report: { id: r.id, bestScore: r.best_score },
    compared: r.compared,
    ownMatch: r.own_match,
    care: r.matched ? { diseases: r.diseases, vaccines: r.vaccines } : null,
    suggestions: rows(r.suggestions),
  };
}

/** Quien encontró la mascota elige una sugerida: se avisa al dueño. Devuelve sus cuidados. */
export async function confirmFound(_finder, reportId, petId) {
  return run(sb().rpc('confirm_found', { p_found: reportId, p_pet: petId }));
}

export async function getFound(id) {
  return camel(await run(sb().from('found_reports').select('*').eq('id', id).maybeSingle()));
}

export async function allFound() {
  return rows(await run(sb().from('found_reports').select('*')));
}

export async function saveFound(f) {
  return run(sb().from('found_reports').update({ status: f.status }).eq('id', f.id));
}

export async function deleteFound(id) {
  return run(sb().from('found_reports').delete().eq('id', id));
}

// ---------- Notificaciones ----------

export async function notify(userId, { title, body }) {
  return run(sb().rpc('admin_notify', { p_user: userId, p_title: title, p_body: body }));
}

export async function notifyAll({ title, body }) {
  return run(sb().rpc('admin_notify', { p_user: null, p_title: title, p_body: body }));
}

export async function myNotifications(user) {
  return rows(await run(sb().from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }).limit(100)));
}

/** Muestra como notificación del sistema los avisos aún no mostrados. */
export async function deliverPending(user) {
  for (const n of await myNotifications(user)) {
    if (n.pushed) continue;
    await pushLocal(n);
    await run(sb().from('notifications').update({ pushed: true }).eq('id', n.id));
  }
}

export async function markRead(n) {
  n.read = true;
  return run(sb().from('notifications').update({ read: true }).eq('id', n.id));
}

// ---------- Notificaciones push (con la app cerrada) ----------

async function pushKey() {
  const row = await run(sb().from('app_settings').select('value').eq('key', 'vapid_public_key').maybeSingle());
  return row?.value || '';
}

/** Guarda la suscripción push de este celular. Devuelve true si quedó activa. */
export async function enablePush() {
  const sub = await subscribePush(await pushKey());
  if (!sub) return false;
  const auth = await session();
  await run(sb().from('push_subscriptions').upsert({ ...sub, user_id: auth.id }));
  return true;
}

export async function pushConfigured() {
  return Boolean(await pushKey());
}

/** El administrador publica la clave pública (la privada va solo en Supabase). */
export async function savePushKey(publicKey) {
  return run(sb().from('app_settings').upsert({ key: 'vapid_public_key', value: publicKey }));
}

// Mientras la app está abierta, los avisos nuevos llegan al instante.
let watching = null;
function watchNotifications(userId) {
  if (watching === userId) return;
  watching = userId;
  sb()
    .channel('avisos-' + userId)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () =>
      window.dispatchEvent(new Event('petsafe:changed')),
    )
    .subscribe();
}

// ---------- Casos exitosos y comentarios ----------

export async function latestSuccesses(limit = 6) {
  return rows(await run(sb().from('successes').select('*').order('created_at', { ascending: false }).limit(limit)));
}

export async function getSuccess(id) {
  return camel(await run(sb().from('successes').select('*').eq('id', id).maybeSingle()));
}

export async function deleteSuccess(id) {
  return run(sb().from('successes').delete().eq('id', id));
}

export async function commentsFor(successId) {
  return rows(await run(sb().from('comments').select('*').eq('success_id', successId).order('created_at')));
}

export async function addComment(user, successId, text) {
  return run(sb().from('comments').insert({ success_id: successId, author: user.name, text }));
}

export async function deleteComment(id) {
  return run(sb().from('comments').delete().eq('id', id));
}

export async function countComments() {
  const counts = {};
  for (const c of await run(sb().from('comments').select('success_id'))) counts[c.success_id] = (counts[c.success_id] || 0) + 1;
  return counts;
}

export async function addSuccess({ petName, photo, story }) {
  return run(sb().from('successes').insert({ pet_name: petName, photo, story }));
}

// ---------- Administración ----------

export async function isAdmin() {
  return Boolean(await run(sb().rpc('is_admin')));
}

/** El primer usuario que entra al panel queda como administrador. */
export async function claimAdmin() {
  return Boolean(await run(sb().rpc('claim_admin')));
}

// ---------- Mensajes de usuarios al administrador ----------
// Al guardarse, la base avisa a los administradores (ver schema.sql).

export async function contactAdmin(user, body) {
  return run(sb().from('contacts').insert({ name: user.name, phone: user.phone, body }));
}

export async function listContacts() {
  return rows(await run(sb().from('contacts').select('*').order('created_at', { ascending: false }).limit(200)));
}

export async function markContactRead(id) {
  return run(sb().from('contacts').update({ read: true }).eq('id', id));
}

export async function deleteContact(id) {
  return run(sb().from('contacts').delete().eq('id', id));
}
