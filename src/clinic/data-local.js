// Kiltrazo Clínica sin servidor: todo en este navegador (para probar).
// Misma interfaz que data-remote.js. Usa su propia base IndexedDB para no
// tocar la de la app.

import * as app from '../data-local.js';

const TABLES = ['clinics', 'clinic_members', 'clinic_invites', 'clinic_patients', 'clinic_visits', 'clinic_vaccines',
  'clinic_files', 'clinic_appointments', 'pet_codes', 'clinic_blobs'];

let dbPromise;
function open() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open('kiltrazo-clinica', 1);
    req.onupgradeneeded = () => {
      for (const t of TABLES) if (!req.result.objectStoreNames.contains(t)) req.result.createObjectStore(t, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(table, mode, fn) {
  return open().then((db) => new Promise((resolve, reject) => {
    const t = db.transaction(table, mode);
    const r = fn(t.objectStore(table));
    t.oncomplete = () => resolve(r && 'result' in r ? r.result : r);
    t.onerror = () => reject(t.error);
  }));
}

const all = (t) => tx(t, 'readonly', (s) => s.getAll());
const put = (t, v) => tx(t, 'readwrite', (s) => s.put(v)).then(() => v);
const del = (t, id) => tx(t, 'readwrite', (s) => s.delete(id));
const uuid = () => crypto.randomUUID();
const now = () => new Date().toISOString();
const today = () => new Date().toISOString().slice(0, 10);

const CODE = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const shortCode = () => Array.from({ length: 6 }, () => CODE[Math.floor(Math.random() * CODE.length)]).join('');

// ---------- Tablas ----------

export async function list(table, eq = {}, { gte, lt, lte, order, desc = false, limit = 2000 } = {}) {
  let rows = (await all(table)).filter((r) => Object.entries(eq).every(([k, v]) => r[k] === v));
  for (const [k, v] of Object.entries(gte || {})) rows = rows.filter((r) => r[k] != null && r[k] >= v);
  for (const [k, v] of Object.entries(lt || {})) rows = rows.filter((r) => r[k] != null && r[k] < v);
  for (const [k, v] of Object.entries(lte || {})) rows = rows.filter((r) => r[k] != null && r[k] <= v);
  if (order) rows.sort((a, b) => String(a[order] ?? '').localeCompare(String(b[order] ?? '')) * (desc ? -1 : 1));
  return rows.slice(0, limit);
}

export const get = (table, id) => tx(table, 'readonly', (s) => s.get(id));

const DEFAULTS = {
  clinic_visits: () => ({ visitedAt: now() }),
  clinic_appointments: () => ({ status: 'agendada', minutes: 30 }),
  clinic_vaccines: () => ({ kind: 'vacuna', appliedOn: today() }),
};

export async function insert(table, row) {
  const me = (await app.currentUser())?.id;
  const extra = { clinic_visits: { vetId: me }, clinic_files: { uploadedBy: me } }[table] || {};
  return put(table, { ...DEFAULTS[table]?.(), ...extra, ...row, id: uuid(), createdAt: now() });
}

export async function update(table, id, patch) {
  return put(table, { ...(await get(table, id)), ...patch, id });
}

export const remove = (table, id) => del(table, id);

// ---------- Sesión y equipo ----------

export async function session() {
  const user = await app.currentUser();
  if (!user) return { needsProfile: true };
  return { user: { id: user.id, email: user.email || '', name: user.name } };
}

export async function myClinics(userId) {
  const mine = (await all('clinic_members')).filter((m) => m.userId === userId);
  const clinics = await all('clinics');
  return mine.map((m) => ({ ...clinics.find((c) => c.id === m.clinicId), role: m.role, isAdmin: m.isAdmin, memberName: m.name }))
    .filter((c) => c.id);
}

export const members = (clinicId) => list('clinic_members', { clinicId }, { order: 'createdAt' });

export async function removeMember(clinicId, userId) {
  return del('clinic_members', `${clinicId}:${userId}`);
}

export async function saveClinic(c) {
  return update('clinics', c.id, { name: c.name, address: c.address, phone: c.phone });
}

async function addMember(clinicId, userId, name, role, isAdmin = false) {
  return put('clinic_members', { id: `${clinicId}:${userId}`, clinicId, userId, name, role, isAdmin, createdAt: now() });
}

export async function createClinic({ name, address, phone, memberName, role }) {
  const me = await app.currentUser();
  const c = await put('clinics', { id: uuid(), name, address, phone, createdBy: me.id, createdAt: now() });
  await addMember(c.id, me.id, memberName, role || 'vet', true);
  return c.id;
}

export async function joinClinic(code, memberName) {
  const inv = await get('clinic_invites', code.trim().toUpperCase());
  if (!inv) throw new Error('El código no existe o ya venció. Pide uno nuevo.');
  await del('clinic_invites', inv.id);
  await addMember(inv.clinicId, (await app.currentUser()).id, memberName, inv.role);
  return inv.clinicId;
}

export async function createInvite(clinicId, role) {
  const code = shortCode();
  await put('clinic_invites', { id: code, clinicId, role, createdAt: now() });
  return code;
}

// ---------- Mascotas de Kiltrazo ----------

export async function createPetCode(petId) {
  for (const c of await all('pet_codes')) if (c.petId === petId) await del('pet_codes', c.id);
  const code = shortCode();
  await put('pet_codes', { id: code, petId, createdAt: now() });
  return code;
}

export async function linkPet(clinicId, code) {
  const pc = await get('pet_codes', code.trim().toUpperCase());
  if (!pc) throw new Error('El código no existe o ya venció. Pide al tutor que genere otro.');
  await del('pet_codes', pc.id);
  const pet = await app.getPet(pc.petId);
  const owner = (await app.listUsers()).find((u) => u.id === pet.ownerId) || {};
  const tutor = {
    tutorName: `${owner.firstName || owner.name || pet.ownerName} ${owner.lastName || ''}`.trim(),
    tutorPhone: owner.phone || '', tutorEmail: owner.email || '', tutorUser: pet.ownerId,
  };
  const existing = (await list('clinic_patients', { clinicId, petId: pet.id }))[0];
  if (existing) return (await update('clinic_patients', existing.id, tutor)).id;
  const notes = [pet.diseases && `Enfermedades (según el tutor): ${pet.diseases}`, pet.vaccines && `Vacunas (según el tutor): ${pet.vaccines}`]
    .filter(Boolean).join('\n');
  return (await insert('clinic_patients', {
    clinicId, petId: pet.id, name: pet.name, species: pet.species || '', breed: pet.breed || '', sex: '', neutered: false,
    chip: '', color: '', allergies: '', notes, photo: pet.photo, ...tutor,
  })).id;
}

export async function unlinkPet(petId, clinicId) {
  for (const p of await list('clinic_patients', { petId, clinicId })) await update('clinic_patients', p.id, { petId: null, tutorUser: null });
  return true;
}

export async function petHealth(petId) {
  const patients = await list('clinic_patients', { petId });
  const ids = new Set(patients.map((p) => p.id));
  const clinics = await all('clinics');
  const name = (id) => clinics.find((c) => c.id === id)?.name || '';
  return {
    clinics: clinics.filter((c) => patients.some((p) => p.clinicId === c.id)),
    vaccines: (await all('clinic_vaccines')).filter((v) => ids.has(v.patientId))
      .sort((a, b) => b.appliedOn.localeCompare(a.appliedOn))
      .map((v) => ({ kind: v.kind, name: v.name, appliedOn: v.appliedOn, nextDue: v.nextDue, clinic: name(v.clinicId) })),
    appointments: (await all('clinic_appointments')).filter((a) => ids.has(a.patientId) && a.status === 'agendada' && a.startsAt >= now())
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
      .map((a) => ({ startsAt: a.startsAt, service: a.service, clinic: name(a.clinicId) })),
  };
}

export async function runReminders() {
  const limit = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const vaccines = await all('clinic_vaccines');
  let n = 0;
  for (const v of vaccines) {
    if (v.remindedAt || !v.nextDue || v.nextDue < today() || v.nextDue > limit) continue;
    if (vaccines.some((w) => w.patientId === v.patientId && w.name.toLowerCase() === v.name.toLowerCase() && w.appliedOn > v.appliedOn)) continue;
    const p = await get('clinic_patients', v.patientId);
    if (!p?.tutorUser) continue;
    const clinic = await get('clinics', v.clinicId);
    await update('clinic_vaccines', v.id, { remindedAt: now() });
    await app.notify(p.tutorUser, {
      title: `Se acerca la ${v.kind === 'vacuna' ? 'vacuna' : 'desparasitación'} de ${p.name} 💉`,
      body: `${v.name} el ${v.nextDue.split('-').reverse().join('-')} en ${clinic?.name}.`,
      url: '#/perfil',
    });
    n++;
  }
  return n;
}

// ---------- Archivos ----------

export async function upload(path, blob) {
  const data = await new Promise((resolve) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.readAsDataURL(blob);
  });
  await put('clinic_blobs', { id: path, data });
}

export async function fileUrls(files) {
  const out = {};
  for (const f of files) out[f.id] = (await get('clinic_blobs', f.path))?.data || '';
  return out;
}

export const removeObject = (path) => del('clinic_blobs', path);
