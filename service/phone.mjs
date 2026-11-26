// Workwood on your phone, over your home Wi-Fi. Nothing outside your network is involved, except the push service of
// the phone's browser (Apple's or Google's), which carries notifications encrypted end to end and cannot read them.
//
// - Workwood makes its own certificate authority once. The phone trusts it, so the server's certificate can be made
//   again quietly whenever the PC's address changes. The authority may only vouch for addresses on a home network
//   (name constraints), so even if its key leaked it could not stand in for any website.
// - A pairing code, shown as a QR code on the PC, lasts ten minutes. Using it gives that phone a key of its own, kept
//   by the phone as a cookie; only a hash of it is kept here. Revoking a phone forgets the hash.
// - Notifications are Web Push (RFC 8291, aes128gcm), signed with this PC's own VAPID key (RFC 8292).
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

export const DIR = process.env.WORKWOOD_PHONE_DIR || path.join(os.homedir(), '.config', 'workwood', 'phone');
export const PORT = Number(process.env.WORKWOOD_PHONE_PORT) || 47443;
export const IN_WSL = process.env.WORKWOOD_PHONE_WSL ? process.env.WORKWOOD_PHONE_WSL === '1' : process.platform === 'linux' && (() => { try { return /microsoft|wsl/i.test(fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8')); } catch { return false; } })();
// Inside WSL the phone cannot reach the service directly: the Windows window passes connections through to 127.0.0.1.
export const HOST = process.env.WORKWOOD_PHONE_HOST || (IN_WSL ? '127.0.0.1' : '0.0.0.0');
// The port the service itself listens on: inside WSL one above, so the Windows window can take the port itself on Windows.
export const INNER_PORT = Number(process.env.WORKWOOD_PHONE_INNER) || (IN_WSL ? PORT + 1 : PORT);
export const CODE_LIFE = 10 * 60_000;
export const KINDS = { needs: true, turn: true, stopped: true, cleared: true, near: false, cool: false, context: false };   // on by default or not

const file = name => path.join(DIR, name);
const readJson = name => { try { return JSON.parse(fs.readFileSync(file(name), 'utf8')); } catch { return null; } };
function writeJson(name, data) { fs.mkdirSync(DIR, { recursive: true, mode: 0o700 }); fs.writeFileSync(file(name) + '.tmp', JSON.stringify(data, null, 1), { mode: 0o600 }); fs.renameSync(file(name) + '.tmp', file(name)); }
const b64u = buf => Buffer.from(buf).toString('base64url');
const sha = s => crypto.createHash('sha256').update(String(s)).digest('hex');

// ---- settings and paired phones ----
const kept = readJson('phones.json') || {};
const store = { on: kept.on === true, phones: Array.isArray(kept.phones) ? kept.phones : [] };
const save = () => writeJson('phones.json', store);
export const isOn = () => store.on;
export function setOn(on) { store.on = !!on; if (!on) codes.clear(); save(); }

/** The phones paired with this PC, as Settings shows them. */
export const list = () => store.phones.map(p => ({ id: p.id, name: p.name, added: p.added, seen: p.seen || null, paired: p.paired || p.added, via: p.via || null, push: !!p.push, kinds: kindsOf(p) }));
export const kindsOf = p => Object.fromEntries(Object.entries(KINDS).map(([k, d]) => [k, typeof p.kinds?.[k] === 'boolean' ? p.kinds[k] : d]));

// Codes that give a phone a key: the pairing code on show (for a new phone; one phone per code), and install codes
// (for one phone already paired: an iPhone's Home Screen app keeps its cookies apart from Safari's, so the app it
// installs starts from a code of its own). value -> { until, phone }
const codes = new Map();
const INSTALL_LIFE = 30 * 60_000;
const showing = new Map();   // '' (a new phone) or a phone's id -> the code on show for it
function sweep() { for (const [v, c] of codes) if (c.until < Date.now()) codes.delete(v); }
/**
 * The pairing code to show: a fresh one when there is none, it ran out, or it was used. With a phone's id, a code that
 * pairs that phone again, as itself (same name, notifications and settings): for when it can no longer reach this PC,
 * as when the PC's address changed and the phone knows it only by that.
 */
export function pairCode(id = '') {
  if (!store.on || (id && !store.phones.some(p => p.id === id))) return null;
  sweep();
  let v = showing.get(id);
  if (!v || !codes.has(v)) { v = b64u(crypto.randomBytes(18)); codes.set(v, { until: Date.now() + CODE_LIFE, phone: id || null, once: true }); showing.set(id, v); }
  return { value: v, until: codes.get(v).until };
}
/** A code that gives this phone another key, for its Home Screen app. */
export function installCode(id) {
  sweep();
  for (const [v, c] of codes) if (c.phone === id && c.until - Date.now() > INSTALL_LIFE / 2) return v;
  const v = b64u(crypto.randomBytes(18)); codes.set(v, { until: Date.now() + INSTALL_LIFE, phone: id }); return v;
}
// The phone's own name, from its browser, until you change it.
function nameFrom(ua = '') {
  const m = /\(Linux; Android [\d.]+; ([^;)]+?)(?: Build[^;)]*)?\)/.exec(ua);
  if (m && m[1] !== 'K') return m[1].trim().slice(0, 40);
  if (/iPhone/.test(ua)) return 'iPhone'; if (/iPad/.test(ua)) return 'iPad'; if (/Android/.test(ua)) return 'Android phone';
  return 'Phone';
}
/** Uses a code: the phone gets a key of its own. Null when the code is wrong, used or old. */
export function redeem(value, ua) {
  sweep();
  const c = store.on && typeof value === 'string' && codes.get(value);
  if (!c) return null;
  const key = b64u(crypto.randomBytes(32));
  let p = c.phone && store.phones.find(x => x.id === c.phone);
  if (c.phone && !p) return null;   // revoked meanwhile
  if (p) p.keys.push(sha(key));
  else { p = { id: b64u(crypto.randomBytes(6)), name: nameFrom(ua), added: Date.now(), keys: [sha(key)] }; store.phones.push(p); }
  if (c.once) { codes.delete(value); p.paired = Date.now(); }
  if (p.keys.length > 4) p.keys = p.keys.slice(-4);
  save();
  return { key, phone: p.id };
}
/**
 * The phone a key belongs to, or null. Marks it as seen (at most once a minute on disk), and by which name or address
 * it reached this PC (`via`): one that knows the PC only by an address it no longer has must be paired again.
 */
export function phoneOf(key, via) {
  if (!store.on || !key || typeof key !== 'string') return null;
  const h = sha(key), p = store.phones.find(x => x.keys?.includes(h));
  if (!p) return null;
  const now = Date.now(), moved = typeof via === 'string' && via && via !== '127.0.0.1' && via !== p.via;
  if (moved) p.via = via;
  if (moved || !p.seen || now - p.seen > 60_000) { p.seen = now; save(); } else p.seen = now;
  return p;
}
export function revoke(id) { const n = store.phones.length; store.phones = store.phones.filter(p => p.id !== id); if (store.phones.length !== n) save(); return store.phones.length !== n; }
export function update(id, patch) {
  const p = store.phones.find(x => x.id === id); if (!p) return null;
  if (typeof patch.name === 'string') { const n = patch.name.replace(/\s+/g, ' ').trim().slice(0, 40); if (n) p.name = n; }
  if (patch.kinds && typeof patch.kinds === 'object') { p.kinds = kindsOf(p); for (const k of Object.keys(KINDS)) if (typeof patch.kinds[k] === 'boolean') p.kinds[k] = patch.kinds[k]; }
  if ('push' in patch) p.push = validSub(patch.push);
  save(); return p;
}
const validSub = s => {
  if (!s || typeof s !== 'object' || typeof s.endpoint !== 'string' || !s.keys?.p256dh || !s.keys?.auth) return null;
  let u; try { u = new URL(s.endpoint); } catch { return null; }
  if (u.protocol !== 'https:' && !(process.env.WORKWOOD_PUSH_HTTP === '1' && u.protocol === 'http:')) return null;
  return { endpoint: s.endpoint, keys: { p256dh: String(s.keys.p256dh), auth: String(s.keys.auth) } };
};

// ---- certificates ----
const run = (cmd, args) => new Promise((ok, no) => execFile(cmd, args, { timeout: 20000 }, (e, out, err) => e ? no(new Error(String(err || e.message).trim().split('\n').pop())) : ok(out)));
const PRIVATE = ['10.0.0.0/255.0.0.0', '172.16.0.0/255.240.0.0', '192.168.0.0/255.255.0.0', '100.64.0.0/255.192.0.0', '169.254.0.0/255.255.0.0'];
/** True for an address on a home network (the only kind the authority may vouch for). */
export const privateIp = ip => /^(10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(ip) && /^\d+\.\d+\.\d+\.\d+$/.test(ip);
let making = null;
/**
 * The certificate and key for these addresses: made once for the authority, and again for the server whenever the
 * addresses change or it is a month from running out.
 */
export function certFor(ips, name) {
  return making = (making || Promise.resolve()).catch(() => {}).then(() => makeCert(ips, name));
}
async function makeCert(ips, name) {
  fs.mkdirSync(DIR, { recursive: true, mode: 0o700 });
  const host = String(name || os.hostname()).replace(/[^A-Za-z0-9-]/g, '').slice(0, 60) || 'workwood';
  if (!fs.existsSync(file('ca.crt')) || !fs.existsSync(file('ca.key'))) {
    const cnf = file('ca.cnf');
    fs.writeFileSync(cnf, ['[req]', 'distinguished_name=dn', 'prompt=no', '[dn]', `CN=Workwood on ${host}`, 'O=Workwood', '[v3]',
      'basicConstraints=critical,CA:TRUE,pathlen:0', 'keyUsage=critical,keyCertSign,cRLSign', 'subjectKeyIdentifier=hash',
      'nameConstraints=critical,' + [...PRIVATE.map(r => 'permitted;IP:' + r), 'permitted;DNS:local'].join(',')].join('\n'));
    await run('openssl', ['req', '-x509', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', file('ca.key'), '-out', file('ca.crt'),
      '-days', '3650', '-config', cnf, '-extensions', 'v3']);
    fs.chmodSync(file('ca.key'), 0o600); fs.rmSync(file('server.crt'), { force: true });
  }
  const want = [...new Set(ips.filter(privateIp))].sort();
  const meta = readJson('server.json');
  const fresh = meta && fs.existsSync(file('server.crt')) && meta.ips.join() === want.join() && meta.host === host && meta.until - Date.now() > 30 * 86400_000;
  if (!fresh) {
    const ext = file('server.ext');
    fs.writeFileSync(ext, ['basicConstraints=critical,CA:FALSE', 'authorityKeyIdentifier=keyid', 'subjectKeyIdentifier=hash', 'keyUsage=critical,digitalSignature', 'extendedKeyUsage=serverAuth',
      'subjectAltName=' + [...want.map(ip => 'IP:' + ip), `DNS:${host.toLowerCase()}.local`].join(',')].join('\n'));
    await run('openssl', ['req', '-new', '-newkey', 'ec', '-pkeyopt', 'ec_paramgen_curve:prime256v1', '-nodes', '-keyout', file('server.key'), '-out', file('server.csr'), '-subj', `/CN=${host}`]);
    await run('openssl', ['x509', '-req', '-in', file('server.csr'), '-CA', file('ca.crt'), '-CAkey', file('ca.key'), '-CAcreateserial', '-days', '390', '-sha256', '-extfile', ext, '-out', file('server.crt')]);
    fs.chmodSync(file('server.key'), 0o600);
    writeJson('server.json', { ips: want, host, until: Date.now() + 390 * 86400_000 });
  }
  return { cert: fs.readFileSync(file('server.crt')), key: fs.readFileSync(file('server.key')), ca: fs.readFileSync(file('ca.crt')), ips: want, host };
}
export const caPem = () => { try { return fs.readFileSync(file('ca.crt')); } catch { return null; } };
export const caDer = () => { const p = caPem(); return p && Buffer.from(p.toString().replace(/-----[^-]+-----|\s/g, ''), 'base64'); };

/** The addresses of this computer on its home network (not inside WSL, where only the Windows side knows them). */
export function localIps() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const a of list || []) if (a.family === 'IPv4' && !a.internal && privateIp(a.address)) out.push(a.address);
  return out;
}

// ---- Web Push ----
function vapid() {
  let v = readJson('vapid.json');
  if (!v) {
    const k = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    v = { pub: b64u(rawPub(k.publicKey)), jwk: k.privateKey.export({ format: 'jwk' }) };
    writeJson('vapid.json', v);
  }
  return v;
}
const rawPub = key => { const j = key.export({ format: 'jwk' }); return Buffer.concat([Buffer.from([4]), Buffer.from(j.x, 'base64url'), Buffer.from(j.y, 'base64url')]); };
export const vapidPublic = () => vapid().pub;
function jwt(aud) {
  const v = vapid(), head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: 'mailto:workwood@example.com' }));
  const sig = crypto.sign('sha256', Buffer.from(head + '.' + claims), { key: crypto.createPrivateKey({ key: v.jwk, format: 'jwk' }), dsaEncoding: 'ieee-p1363' });
  return `${head}.${claims}.${b64u(sig)}`;
}
const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
/** Encrypts a push message for one subscription (RFC 8291): the body to send. */
export function encrypt(sub, text) {
  const ua = Buffer.from(sub.keys.p256dh, 'base64url'), auth = Buffer.from(sub.keys.auth, 'base64url');
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const as = ecdh.getPublicKey(), shared = ecdh.computeSecret(ua), salt = crypto.randomBytes(16);
  const ikm = hmac(hmac(auth, shared), Buffer.concat([Buffer.from('WebPush: info\0'), ua, as, Buffer.from([1])]));
  const prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16);
  const nonce = hmac(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([c.update(Buffer.concat([Buffer.from(text), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const head = Buffer.alloc(21); salt.copy(head, 0); head.writeUInt32BE(4096, 16); head[20] = as.length;
  return Buffer.concat([head, as, body]);
}
/**
 * Sends a notification to every phone that wants this kind. `skip`: a phone id not to send to (it is looking at the
 * session already). A subscription the push service says is gone is forgotten.
 */
export async function notify(kind, msg, skip = () => false) {
  if (!store.on) return 0;
  let sent = 0;
  await Promise.all(store.phones.filter(p => p.push && kindsOf(p)[kind] && !skip(p.id)).map(async p => {
    try {
      const u = new URL(p.push.endpoint);
      const r = await fetch(p.push.endpoint, { method: 'POST', body: encrypt(p.push, JSON.stringify({ kind, ...msg })), signal: AbortSignal.timeout(15000),
        headers: { 'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream', ttl: '86400', urgency: kind === 'needs' || kind === 'stopped' ? 'high' : 'normal',
          ...(msg.tag ? { topic: String(msg.tag).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 32) } : {}), authorization: `vapid t=${jwt(u.origin)}, k=${vapidPublic()}` } });
      if (r.status === 404 || r.status === 410) { p.push = null; save(); }
      else if (r.ok) sent++;
      else console.error('[workwood] push:', r.status, (await r.text()).slice(0, 200));
    } catch (e) { console.error('[workwood] push:', String(e.message).split('\n')[0]); }
  }));
  return sent;
}
