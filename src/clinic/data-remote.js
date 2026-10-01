// Kiltrazo Clínica en Supabase. Las reglas de quién ve qué están en
// supabase/schema.sql (sección "Kiltrazo Clínica"): cada clínica ve solo lo suyo.

import { sb } from '../data-remote.js';

const BUCKET = 'clinica';

const snake = (k) => k.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const camel = (row) =>
  row && Object.fromEntries(Object.entries(row).map(([k, v]) => [k.replace(/_(\w)/g, (_, c) => c.toUpperCase()), v]));
const toRow = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined).map(([k, v]) => [snake(k), v]));

async function run(query) {
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// ---------- Tablas ----------

export async function list(table, eq = {}, { gte, lt, lte, order, desc = false, limit = 2000 } = {}) {
  let q = sb().from(table).select('*');
  for (const [k, v] of Object.entries(eq)) q = q.eq(snake(k), v);
  for (const [k, v] of Object.entries(gte || {})) q = q.gte(snake(k), v);
  for (const [k, v] of Object.entries(lt || {})) q = q.lt(snake(k), v);
  for (const [k, v] of Object.entries(lte || {})) q = q.lte(snake(k), v);
  if (order) q = q.order(snake(order), { ascending: !desc });
  return (await run(q.limit(limit))).map(camel);
}

export async function get(table, id) {
  return camel(await run(sb().from(table).select('*').eq('id', id).maybeSingle()));
}

export async function insert(table, row) {
  return camel(await run(sb().from(table).insert(toRow(row)).select().single()));
}

export async function update(table, id, patch) {
  const { id: _, ...rest } = patch;
  return camel(await run(sb().from(table).update(toRow(rest)).eq('id', id).select().single()));
}

export async function remove(table, id) {
  return run(sb().from(table).delete().eq('id', id));
}

// ---------- Sesión y equipo ----------

/** Para usar la clínica hay que entrar con correo y clave (mismo equipo en el computador y el celular). */
export async function session() {
  const { data } = await sb().auth.getSession();
  const u = data.session?.user;
  if (!u || u.is_anonymous || !u.email) return { needsLogin: true };
  return { user: { id: u.id, email: u.email } };
}

export async function myClinics(userId) {
  const data = await run(sb().from('clinic_members').select('role, is_admin, name, clinic:clinics(*)').eq('user_id', userId));
  return data.filter((m) => m.clinic).map((m) => ({ ...camel(m.clinic), role: m.role, isAdmin: m.is_admin, memberName: m.name }));
}

export async function members(clinicId) {
  return (await run(sb().from('clinic_members').select('*').eq('clinic_id', clinicId).order('created_at'))).map(camel);
}

export async function removeMember(clinicId, userId) {
  return run(sb().from('clinic_members').delete().eq('clinic_id', clinicId).eq('user_id', userId));
}

export async function saveClinic({ id, name, address, phone, homeVisits, lat = null, lng = null, onMap, emergencies, hours = '' }) {
  return run(sb().from('clinics').update({
    name, address, phone, home_visits: Boolean(homeVisits), lat, lng, on_map: Boolean(onMap), emergencies: Boolean(emergencies), hours,
  }).eq('id', id));
}

export async function createClinic({ name, address, phone, memberName, role }) {
  return run(sb().rpc('create_clinic', { p_name: name, p_address: address, p_phone: phone, p_member_name: memberName, p_role: role }));
}

export async function joinClinic(code, memberName) {
  return run(sb().rpc('join_clinic', { p_code: code, p_member_name: memberName }));
}

export async function createInvite(clinicId, role) {
  return run(sb().rpc('create_clinic_invite', { p_clinic: clinicId, p_role: role }));
}

// ---------- Mascotas de Kiltrazo ----------

export async function linkPet(clinicId, code) {
  return run(sb().rpc('link_pet', { p_clinic: clinicId, p_code: code }));
}

export async function createPetCode(petId) {
  return run(sb().rpc('create_pet_code', { p_pet: petId }));
}

export async function petHealth(petId) {
  const r = await run(sb().rpc('pet_health', { p_pet: petId }));
  return { clinics: r.clinics.map(camel), vaccines: r.vaccines.map(camel), appointments: r.appointments.map(camel) };
}

export async function unlinkPet(petId, clinicId) {
  return run(sb().rpc('unlink_pet', { p_pet: petId, p_clinic: clinicId }));
}

export async function runReminders() {
  return run(sb().rpc('send_vaccine_reminders'));
}

// ---------- Archivos (bucket privado "clinica") ----------

export async function upload(path, blob) {
  const { error } = await sb().storage.from(BUCKET).upload(path, blob, { contentType: blob.type, upsert: false });
  if (error) throw new Error(error.message);
}

/** Enlaces temporales (1 hora) para ver los archivos: { id: url }. */
export async function fileUrls(files) {
  if (!files.length) return {};
  const { data, error } = await sb().storage.from(BUCKET).createSignedUrls(files.map((f) => f.path), 3600);
  if (error) throw new Error(error.message);
  return Object.fromEntries(files.map((f, i) => [f.id, data[i]?.signedUrl || '']));
}

export async function removeObject(path) {
  await sb().storage.from(BUCKET).remove([path]);
}

// ---------- Horas pedidas por el tutor y avisos ----------

export async function requestAppointment({ petId, clinicId, place, service, startsAt, address = '', lat = null, lng = null, notes = '' }) {
  return run(sb().rpc('request_appointment', {
    p_pet: petId, p_clinic: clinicId, p_place: place, p_service: service, p_starts_at: startsAt,
    p_address: address, p_lat: lat, p_lng: lng, p_notes: notes,
  }));
}

export async function cancelMyAppointment(id) {
  return run(sb().rpc('cancel_my_appointment', { p_appt: id }));
}

/** Avisa al tutor: 'confirmada', 'rechazada', 'en_camino' o 'llego'. */
export async function notifyAppointment(id, kind) {
  return run(sb().rpc('appointment_notify', { p_appt: id, p_kind: kind }));
}

// ---------- Traspaso de una mascota de la clínica a la app del tutor ----------

export async function createTransferCode(patientId) {
  return run(sb().rpc('create_transfer_code', { p_patient: patientId }));
}

export async function transferInfo(code) {
  return camel(await run(sb().rpc('transfer_info', { p_code: code })));
}

/** Crea la mascota del tutor con el escaneo que hizo la clínica. */
export async function acceptTransfer(code) {
  return run(sb().rpc('accept_transfer', { p_code: code }));
}

export async function claimTransfer(code, petId) {
  return run(sb().rpc('claim_transfer', { p_code: code, p_pet: petId }));
}

// ---------- Mapa de clínicas (urgencias) ----------

export async function nearbyClinics(lat = null, lng = null, km = 50) {
  return (await run(sb().rpc('nearby_clinics', { p_lat: lat, p_lng: lng, p_km: km }))).map(camel);
}
