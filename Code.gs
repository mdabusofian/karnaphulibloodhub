/**
 * কর্ণফুলী ব্লাড হাব — integrated Google Apps Script backend
 *
 * অ্যাডমিন লগইন সেটআপ (একবারই):
 *  1) Project Settings > Script properties > Add: ADMIN_TOKEN = একটি লম্বা গোপন "সেটআপ কী"
 *  2) Deploy > Manage deployments > Edit > New version
 *  3) admin.html খুলুন → সেটআপ কী + নিজের ইউজার আইডি ও পাসওয়ার্ড দিন
 *  এরপর থেকে আইডি+পাসওয়ার্ড দিয়ে ঢুকবেন। পাসওয়ার্ড ভুলে গেলে Script property ADMIN_HASH মুছে দিন,
 *  লগইন পেজে আবার সেটআপ ফর্ম আসবে (সেটআপ কী লাগবে)।
 */
const CFG = { DONORS: 'Donors', REQUESTS: 'Requests', TZ: 'Asia/Dhaka' };
const DONOR_HEADERS = ['নাম','গ্রুপ','উপজেলা','এলাকা','ফোন','ডোনার ID','শেষ রক্তদান','লিঙ্গ','মোট রক্তদান','নিবন্ধনের তারিখ'];
const REQUEST_HEADERS = ['গ্রুপ','ব্যাগ','রোগী','হাসপাতাল','জেলা','এলাকা','ফোন','তারিখ','নোট','স্ট্যাটাস'];
const GROUPS = ['A+','A-','B+','B-','AB+','AB-','O+','O-'];
const SESSION_TTL = 21600; // সেশন ৬ ঘণ্টা (CacheService-এর সর্বোচ্চ)
const MAX_FAILS = 5, LOCK_SECONDS = 900; // ৫ বার ভুল হলে ১৫ মিনিট লক

function doGet(e) {
  try {
    const p = (e && e.parameter) || {};
    if (p.action === 'getStats') return json_(getStats_());
    if (p.action === 'getDonors') return json_(readRows_(CFG.DONORS));
    const name = validSheet_(p.sheet) || CFG.DONORS;
    return json_(readRows_(name));
  } catch (err) { return json_({ error: safeError_(err) }); }
}

function doPost(e) {
  let body;
  try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); }
  catch (_) { return json_({ success: false, error: 'invalid_json' }); }

  if (body.admin) {
    try { return json_(adminRoute_(body)); }
    catch (err) { return json_({ error: safeError_(err) }); }
  }

  const p = (e && e.parameter) || {};
  const name = validSheet_(p.sheet || body.sheet) || (body.patient ? CFG.REQUESTS : CFG.DONORS);
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);
    return json_(name === CFG.REQUESTS ? addRequest_(body) : addDonor_(body));
  } catch (err) { return json_({ success: false, error: safeError_(err) }); }
  finally { try { lock.releaseLock(); } catch (_) {} }
}

/* ================= অ্যাডমিন অথ ================= */

function adminRoute_(b) {
  const a = String(b.action || '');
  if (a === 'state') return { configured: !!props_().getProperty('ADMIN_HASH') };
  if (a === 'setup') return setupAdmin_(b);
  if (a === 'login') return loginAdmin_(b);
  requireSession_(b.session);
  if (a === 'change') return changeAdmin_(b);
  return adminAction_(b);
}

function props_() { return PropertiesService.getScriptProperties(); }
function checkLock_() { if (Number(CacheService.getScriptCache().get('kbh_fail') || 0) >= MAX_FAILS) throw new Error('locked'); }
function addFail_() { const c = CacheService.getScriptCache(); c.put('kbh_fail', String(Number(c.get('kbh_fail') || 0) + 1), LOCK_SECONDS); }
function clearFails_() { CacheService.getScriptCache().remove('kbh_fail'); }

function hash_(salt, pass) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ':' + pass, Utilities.Charset.UTF_8)
    .map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join('');
}
function validateCreds_(user, pass) {
  if (!/^[A-Za-z0-9_.@-]{3,30}$/.test(user)) throw new Error('bad_user');
  if (pass.length < 8 || pass.length > 100) throw new Error('weak');
}
function storeCreds_(user, pass) {
  const salt = Utilities.getUuid();
  props_().setProperties({ ADMIN_USER: user, ADMIN_SALT: salt, ADMIN_HASH: hash_(salt, pass) });
}
function passOk_(pass) {
  const p = props_().getProperties();
  return !!p.ADMIN_HASH && constantTimeEqual_(hash_(p.ADMIN_SALT, String(pass || '')), p.ADMIN_HASH);
}

function setupAdmin_(b) {
  checkLock_();
  const key = props_().getProperty('ADMIN_TOKEN');
  if (!key) throw new Error('not_configured');
  if (!constantTimeEqual_(String(b.key || ''), String(key))) { addFail_(); throw new Error('bad_key'); }
  const user = String(b.user || '').trim(), pass = String(b.pass || '');
  validateCreds_(user, pass);
  storeCreds_(user, pass);
  clearFails_();
  return { ok: true };
}

function loginAdmin_(b) {
  checkLock_();
  const p = props_().getProperties();
  if (!p.ADMIN_HASH) throw new Error('not_setup');
  const okUser = constantTimeEqual_(String(b.user || '').trim().toLowerCase(), String(p.ADMIN_USER || '').toLowerCase());
  const okPass = passOk_(b.pass);
  if (!(okUser && okPass)) { addFail_(); throw new Error('bad_login'); }
  clearFails_();
  const session = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
  CacheService.getScriptCache().put('kbh_s_' + session, '1', SESSION_TTL);
  return { session: session };
}

function requireSession_(s) {
  const c = CacheService.getScriptCache(), k = 'kbh_s_' + String(s || '');
  if (!s || !c.get(k)) throw new Error('auth');
  c.put(k, '1', SESSION_TTL);
}

function changeAdmin_(b) {
  checkLock_();
  if (!passOk_(b.cur)) { addFail_(); throw new Error('wrong_current'); }
  const user = String(b.user || '').trim(), pass = String(b.pass || '');
  validateCreds_(user, pass);
  storeCreds_(user, pass);
  clearFails_();
  return { ok: true };
}

/* ================= অ্যাডমিন কাজ ================= */

function adminAction_(b) {
  const name = validSheet_(b.sheet);
  if (!name) throw new Error('bad_sheet');
  const action = String(b.action || 'list');
  if (action === 'list') return { rows: readAdminRows_(name) };
  if (['delete', 'status'].indexOf(action) < 0) throw new Error('bad_action');

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = getSheet_(name), row = Number(b.row);
    if (!Number.isInteger(row) || row < 2 || row > sh.getLastRow()) throw new Error('bad_row');
    const current = sh.getRange(row, 1, 1, 10).getDisplayValues()[0];
    if (String(current[0] || '') !== String(b.check || '')) throw new Error('row_changed');
    if (action === 'delete') { sh.deleteRow(row); return { ok: true }; }
    if (name !== CFG.REQUESTS) throw new Error('bad_action');
    const value = String(b.value || '');
    if (['Live','Closed','Done','Fulfilled','বন্ধ','সম্পন্ন'].indexOf(value) < 0) throw new Error('bad_status');
    sh.getRange(row, 10).setValue(value);
    return { ok: true };
  } finally { lock.releaseLock(); }
}

/* ================= পাবলিক ডাটা ================= */

function addDonor_(b) {
  const sh = getSheet_(CFG.DONORS);
  const name = clean_(b.name, 100), group = normalizeGroup_(b.group), phone = normalizePhone_(b.phone);
  const id = clean_(b.donorID, 40).toUpperCase();
  if (name.length < 2 || !group || !/^01[3-9]\d{8}$/.test(phone)) throw new Error('invalid_donor');
  if (!/^KH-\d{6}$/.test(id)) throw new Error('bad_id');
  if (sh.getLastRow() > 1) {
    const n = sh.getLastRow() - 1;
    const phones = sh.getRange(2, 5, n, 1).getDisplayValues().map(function (r) { return r[0]; });
    const ids = sh.getRange(2, 6, n, 1).getDisplayValues().map(function (r) { return r[0]; });
    if (phones.some(function (x) { return normalizePhone_(x) === phone; })) throw new Error('duplicate_phone');
    if (ids.some(function (x) { return String(x).trim().toUpperCase() === id; })) throw new Error('duplicate_id');
  }
  const area = clean_(b.area, 200), parts = area.split(/[,،]/).map(function (x) { return x.trim(); }).filter(Boolean);
  const upazila = safeCell_(parts[0] || ''), locality = safeCell_(parts.slice(1).join(', '));
  const last = safeCell_(clean_(b.lastDonation, 80) || 'কখনো দেইনি');
  const gender = safeCell_(clean_(b.gender, 30));
  const total = Math.max(0, Math.min(10000, Number(b.totalDonations) || 0));
  sh.appendRow([safeCell_(name), group, upazila, locality, phone, id, last, gender, total, new Date()]);
  return { success: true, ok: true, id: id };
}

function addRequest_(b) {
  const group = normalizeGroup_(b.group), patient = clean_(b.patient, 100), hospital = clean_(b.hospital, 200);
  const phone = normalizePhone_(b.contact || b.phone), date = parseDate_(b.date), units = Number(b.units);
  if (!group || patient.length < 2 || hospital.length < 2 || !/^01[3-9]\d{8}$/.test(phone) || !date) throw new Error('invalid_request');
  if (!Number.isInteger(units) || units < 1 || units > 10) throw new Error('bad_units');
  const notes = clean_(b.notes, 160);
  getSheet_(CFG.REQUESTS).appendRow([group, units, safeCell_(patient), safeCell_(hospital), safeCell_(clean_(b.district, 100)), safeCell_(clean_(b.area, 200)), phone, date, safeCell_(notes || 'জরুরি প্রয়োজন'), 'Live']);
  return { success: true, ok: true };
}

function fmt_(row) { return row.map(function (v) { return v instanceof Date ? Utilities.formatDate(v, CFG.TZ, 'yyyy-MM-dd') : v; }); }
function blank_(row) { return !row.some(function (v) { return String(v == null ? '' : v).trim() !== ''; }); }

function readRows_(name) {
  const sh = getSheet_(name), lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  return sh.getRange(2, 1, lastRow - 1, 10).getValues().filter(function (r) { return !blank_(r); }).map(fmt_);
}

// অ্যাডমিন UI-র জন্য শিটের আসল সারি নম্বরসহ
function readAdminRows_(name) {
  const sh = getSheet_(name), lastRow = sh.getLastRow(), out = [];
  if (lastRow < 2) return out;
  sh.getRange(2, 1, lastRow - 1, 10).getValues().forEach(function (row, i) {
    if (!blank_(row)) out.push({ row: i + 2, v: fmt_(row) });
  });
  return out;
}

function getStats_() {
  const rows = readRows_(CFG.DONORS), groups = {};
  GROUPS.forEach(function (g) { groups[g] = 0; });
  rows.forEach(function (r) { const g = normalizeGroup_(r[1]); if (g) groups[g]++; });
  return { total: rows.length, groups: groups };
}

function getSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.appendRow(name === CFG.DONORS ? DONOR_HEADERS : REQUEST_HEADERS); sh.setFrozenRows(1); }
  else if (sh.getLastRow() === 0) { sh.appendRow(name === CFG.DONORS ? DONOR_HEADERS : REQUEST_HEADERS); sh.setFrozenRows(1); }
  return sh;
}
function validSheet_(v) { return v === CFG.DONORS || v === CFG.REQUESTS ? v : null; }
function normalizeGroup_(v) { const g = String(v || '').trim().toUpperCase().replace(/[−–]/g, '-'); return GROUPS.indexOf(g) > -1 ? g : ''; }
function normalizePhone_(v) {
  let p = String(v == null ? '' : v).replace(/\D/g, '');
  if (p.indexOf('880') === 0) p = '0' + p.slice(3); else if (p.indexOf('88') === 0) p = p.slice(2);
  if (/^1[3-9]\d{8}$/.test(p)) p = '0' + p;
  return p;
}
function clean_(v, max) { return String(v == null ? '' : v).replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, max || 500); }
// ফর্মুলা ইনজেকশন ঠেকাতে
function safeCell_(v) { const s = clean_(v, 500); return /^[=+\-@]/.test(s) ? "'" + s : s; }
function parseDate_(v) {
  if (!v) return null;
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  const s = String(v).trim(), m = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (m) { const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]), 12, 0, 0); return isNaN(d.getTime()) ? null : d; }
  const d = new Date(s); return isNaN(d.getTime()) ? null : d;
}
function constantTimeEqual_(a, b) { if (a.length !== b.length) return false; let x = 0; for (let i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i); return x === 0; }
function json_(obj) { return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }
function safeError_(err) {
  const m = String(err && err.message || err || 'server_error');
  const known = ['bad_sheet','bad_row','row_changed','not_configured','not_setup','auth','bad_login','bad_key','locked','weak','bad_user','wrong_current',
    'bad_action','bad_status','invalid_donor','invalid_request','bad_id','duplicate_phone','duplicate_id','bad_units','invalid_json'];
  return known.indexOf(m) > -1 ? m : 'server_error';
}
function setupSheets() { getSheet_(CFG.DONORS); getSheet_(CFG.REQUESTS); }
