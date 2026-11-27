// Workwood on the phone, end to end against the real service in a throwaway HOME (see sandbox.mjs): the setup page,
// the certificate, pairing, what a phone may do, previews from the app's own address, revoking, and notifications
// (decrypted here with the phone's keys, as a phone's browser would). The Windows window is played by the test: it
// tells the service the PC's address, as the real one does from Windows.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import https from 'node:https';
import tls from 'node:tls';
import crypto from 'node:crypto';
import { makeSandbox, startService, removeSandbox } from './sandbox.mjs';

let sb, svc, pushSrv;
const IP = '192.168.77.5', PORT = 47000 + Math.floor(Math.random() * 900), INNER = PORT + 1000, KEYDIR = () => path.join(sb.root, 'phone');
const NAMED = `testpc.local:${PORT}`;   // the PC by its name on the home network, as Windows answers for it
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await sleep(60); }
  throw new Error('timed out waiting for ' + what + (last instanceof Error ? ': ' + last.message : ''));
}
// A request to the phone port, as a phone on the Wi-Fi makes it: to the PC's address, trusting only Workwood's authority.
function req(p, { secure = true, method = 'GET', headers = {}, body, host = `${IP}:${PORT}` } = {}) {
  return new Promise((resolve, reject) => {
    const opts = { host: '127.0.0.1', port: INNER, path: p, method, headers: { host, ...headers } };
    if (secure) Object.assign(opts, { ca: fs.readFileSync(path.join(KEYDIR(), 'ca.crt')), servername: '', checkServerIdentity: (h, cert) => tls.checkServerIdentity(host.startsWith(NAMED) ? 'testpc.local' : IP, cert), agent: false });
    const r = (secure ? https : http).request(opts, res => { const c = []; res.on('data', d => c.push(d)); res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(c) })); });
    r.on('error', reject); if (body) r.write(typeof body === 'string' ? body : JSON.stringify(body)); r.end();
  });
}
const api = (key, p, body, host) => req('/api/' + p, { method: body ? 'POST' : 'GET', headers: { 'x-workwood-token': key, 'content-type': 'application/json' }, body, host }).then(r => ({ status: r.status, body: JSON.parse(r.body.toString() || '{}') }));
const relay = (ip = IP) => svc.call('phone/relay', { ips: [ip, '172.20.0.9', '8.8.8.8'], name: 'TESTPC', listening: true });
const fingerprint = f => new crypto.X509Certificate(fs.readFileSync(path.join(KEYDIR(), f))).fingerprint256;
async function pair() {
  const st = (await svc.call('phone')).body, code = new URL(st.url).searchParams.get('pair');
  const r = await req('/?pair=' + code, { headers: { 'user-agent': 'Mozilla/5.0 (Linux; Android 15; Pixel 9 Build/AP3A) Chrome/131 Mobile' } });
  assert.equal(r.status, 303);
  return { code, key: /ww=([^;]+)/.exec(r.headers['set-cookie'][0])[1] };
}

// The push service a phone's browser would use: it keeps what it is sent.
const got = [];
before(async () => {
  sb = makeSandbox();
  pushSrv = http.createServer((q, s) => { const c = []; q.on('data', d => c.push(d)); q.on('end', () => { got.push({ path: q.url, headers: q.headers, body: Buffer.concat(c) }); s.writeHead(q.url.includes('gone') ? 410 : 201); s.end(); }); });
  await new Promise(r => pushSrv.listen(0, '127.0.0.1', r));
  svc = await startService(sb, { WORKWOOD_PHONE_DIR: path.join(sb.root, 'phone'), WORKWOOD_PHONE_PORT: String(PORT), WORKWOOD_PHONE_INNER: String(INNER), WORKWOOD_PHONE_HOST: '127.0.0.1',
    WORKWOOD_PHONE_WSL: '1', WORKWOOD_PUSH_HTTP: '1', WORKWOOD_PREVIEW_KEY: 'pvkey', WORKWOOD_PC_HOLD: '4000' });
});
after(() => { svc?.stop(); pushSrv?.close(); if (sb && !process.env.KEEP_SANDBOX) removeSandbox(sb); });

test('the phone is off until turned on, and nothing listens', async () => {
  const st = (await svc.call('phone')).body;
  assert.equal(st.on, false); assert.equal(st.url, null); assert.deepEqual(st.phones, []);
  await assert.rejects(req('/', { secure: false }));
  assert.deepEqual((await svc.call('phone/relay', { ips: [IP] })).body, { on: false, port: PORT, inner: INNER });
});

test('turned on: a pairing code for the address the Windows window reports, and a certificate only for home addresses', async () => {
  assert.equal((await svc.call('phone/on', { on: true })).status, 200);
  await relay();
  const st = await until(async () => { const s = (await svc.call('phone')).body; return s.listening && s.ips.length && s; }, 'the phone port');
  assert.deepEqual(st.ips, [IP, '172.20.0.9']);   // public addresses are left out; home Wi-Fi first
  assert.equal(st.name, 'TESTPC'); assert.equal(st.wsl, true);
  assert.match(st.url, new RegExp(`^http://${IP.replace(/\./g, '\\.')}:${PORT}/\\?pair=[\\w-]{20,}$`));
  assert.ok(st.until > Date.now() + 9 * 60_000);
  const ca = new crypto.X509Certificate(fs.readFileSync(path.join(KEYDIR(), 'ca.crt'))), srv = await until(async () => {
    const c = new crypto.X509Certificate(fs.readFileSync(path.join(KEYDIR(), 'server.crt'))); return c.subjectAltName.includes('testpc') && c; }, 'a certificate with the address and name');
  assert.ok(srv.verify(ca.publicKey)); assert.ok(ca.ca);
  assert.match(srv.subjectAltName, /DNS:testpc\.local/); assert.doesNotMatch(srv.subjectAltName, /8\.8\.8\.8/);
  assert.equal((fs.statSync(path.join(KEYDIR(), 'ca.key')).mode & 0o077), 0, 'the authority key is private');
  // both start an hour back, so a clock a little behind (a phone's, or this PC's set back by WSL) finds them valid
  for (const c of [ca, srv]) assert.ok(Date.parse(c.validFrom) < Date.now() - 50 * 60_000, c.validFrom);
});

test('plain HTTP gives only the setup page and the certificate; other hosts are refused', async () => {
  const code = new URL((await svc.call('phone')).body.url).searchParams.get('pair');
  const r = await req('/?pair=' + code, { secure: false });
  assert.equal(r.status, 200);
  const html = r.body.toString();
  assert.ok(html.includes(`https://${IP}:${PORT}/?pair=${code}`)); assert.ok(html.includes('TESTPC'));
  assert.ok(html.includes(`'https://${NAMED}'`), 'the setup page tries the PC by its name');
  const crt = await req('/workwood.crt', { secure: false });
  assert.equal(crt.headers['content-type'], 'application/x-x509-ca-cert');
  assert.ok(new crypto.X509Certificate(crt.body).ca);
  assert.equal((await req('/api/sessions', { secure: false })).status, 302);
  assert.equal((await req('/', { secure: false, host: 'evil.example:' + PORT })).status, 403);
  assert.equal((await req('/', { host: 'evil.example:' + PORT })).status, 403);
  assert.ok((await svc.call('phone')).body.setupSeen > Date.now() - 5000);
  assert.equal((await req('/phone/ping')).headers['access-control-allow-origin'], '*');
});

test('a pairing code pairs one phone; its key opens the app, and a used or wrong code does not', async () => {
  assert.equal((await req('/')).status, 401);
  assert.equal((await req('/?pair=not-a-real-code-at-all')).status, 410);
  const { code, key } = await pair();
  assert.equal((await req('/?pair=' + code)).status, 410, 'one phone per code');
  const st = (await svc.call('phone')).body;
  assert.equal(st.phones.length, 1); assert.equal(st.phones[0].name, 'Pixel 9');
  assert.notEqual(new URL(st.url).searchParams.get('pair'), code, 'a new code shows once one is used');
  const r = await req('/', { headers: { cookie: 'ww=' + key } });
  assert.equal(r.status, 200);
  const html = r.body.toString();
  assert.ok(html.includes(`data-token="${key}" data-phone="1"`)); assert.ok(html.includes('rel="manifest"'));
  assert.equal(r.headers['x-frame-options'], 'DENY');
  assert.ok(!html.includes('test-token'), 'the desktop token never reaches the phone');
  assert.match(fs.readFileSync(path.join(KEYDIR(), 'phones.json'), 'utf8'), /"keys"/);
  assert.ok(!fs.readFileSync(path.join(KEYDIR(), 'phones.json'), 'utf8').includes(key), 'only a hash of the key is kept');
});

test('a phone may look and answer, not change Workwood or open a terminal; its key is no good on the PC side', async () => {
  const { key } = await pair();
  assert.equal((await api(key, 'sessions/' + sb.sessions.alphaLive)).status, 200);
  const me = await api(key, 'phone/me');
  assert.equal(me.status, 200); assert.equal(me.body.pc, 'TESTPC'); assert.match(me.body.vapid, /^[\w-]{80,}$/);
  assert.deepEqual(me.body.kinds, { needs: true, turn: true, stopped: true, cleared: true, near: false, cool: false, context: false });
  for (const [p, b] of [['phone', null], ['phone/on', { on: false }], ['settings', { bypass: true }], ['sessions/' + sb.sessions.alphaLive + '/term', {}], ['open-editor', { sessionId: sb.sessions.alphaLive }], ['profiles/live/login', {}]])
    assert.equal((await api(key, p, b)).status, 403, p);
  assert.equal((await api('test-token', 'sessions/' + sb.sessions.alphaLive)).status, 401, 'the desktop token is not a phone key');
  const local = await fetch(new URL('/api/sessions/' + sb.sessions.alphaLive, svc.address), { headers: { 'x-workwood-token': key } });
  assert.equal(local.status, 403);
});

test('previews come from the app\'s address with a sandbox header', async () => {
  const { key } = await pair();
  fs.writeFileSync(path.join(sb.projects.alpha, 'page.html'), '<h1>Hi</h1>');
  const p = '/preview/pvkey/' + sb.sessions.alphaLive + sb.projects.alpha.split('/').map(encodeURIComponent).join('/') + '/page.html';
  const r = await req(p);
  assert.equal(r.status, 200); assert.equal(r.body.toString(), '<h1>Hi</h1>');
  assert.match(r.headers['content-security-policy'], /^sandbox allow-scripts/); assert.doesNotMatch(r.headers['content-security-policy'], /allow-same-origin/);
  assert.equal((await req(p.replace('pvkey', 'wrong'))).status, 403);
  void key;
});

test('the Home Screen app pairs itself from an install code, as the same phone', async () => {
  const { key } = await pair(), me = (await api(key, 'phone/me')).body, n = (await svc.call('phone')).body.phones.length;
  const r = await req('/?pair=' + me.install);
  assert.equal(r.status, 303);
  const key2 = /ww=([^;]+)/.exec(r.headers['set-cookie'][0])[1];
  assert.notEqual(key2, key);
  assert.equal((await api(key2, 'phone/me')).body.id, me.id);
  assert.equal((await svc.call('phone')).body.phones.length, n);
  const man = JSON.parse((await req('/manifest.webmanifest?i=' + me.install)).body);
  assert.equal(man.start_url, '/?pair=' + me.install); assert.equal(man.display, 'standalone');
});

test('a phone paired again is the same phone, with its settings; by the PC\'s name it outlasts an address change', async () => {
  const { key } = await pair(), me = (await api(key, 'phone/me', { kinds: { near: true } })).body, n = (await svc.call('phone')).body.phones.length;
  assert.equal((await svc.call('phone')).body.phones.find(x => x.id === me.id).via, IP);
  assert.equal((await svc.call('phone/repair', { id: 'nope' })).status, 404);
  const rep = (await svc.call('phone/repair', { id: me.id })).body, code = new URL(rep.url).searchParams.get('pair');
  assert.match(rep.url, new RegExp(`^http://${IP.replace(/\./g, '\\.')}:${PORT}/\\?pair=`)); assert.ok(rep.until > Date.now() + 9 * 60_000);
  assert.equal((await svc.call('phone/repair', { id: me.id })).body.url, rep.url, 'the same code while it shows');
  // the phone opens it at the PC's name: the certificate is good for it, and the phone is itself again
  const r = await req('/?pair=' + code, { host: NAMED });
  assert.equal(r.status, 303);
  const key2 = /ww=([^;]+)/.exec(r.headers['set-cookie'][0])[1], again = (await api(key2, 'phone/me', null, NAMED)).body;
  assert.equal(again.id, me.id); assert.equal(again.name, me.name); assert.equal(again.kinds.near, true);
  assert.equal((await req('/?pair=' + code, { host: NAMED })).status, 410, 'once only');
  let st = (await svc.call('phone')).body;
  assert.equal(st.phones.length, n); assert.equal(st.local, 'testpc.local');
  assert.equal(st.phones.find(x => x.id === me.id).via, 'testpc.local');
  // the router gives the PC another address: the phone that knows the PC by its old address is shown as lost
  const other = await pair(), otherId = (await api(other.key, 'phone/me')).body.id;
  await relay('192.168.77.40');
  st = await until(async () => { const s = (await svc.call('phone')).body; return s.ips[0] === '192.168.77.40' && s; }, 'the new address');
  assert.equal(st.phones.find(x => x.id === otherId).lost, true);
  assert.equal(st.phones.find(x => x.id === me.id).lost, false);
  const certHas = ip => new crypto.X509Certificate(fs.readFileSync(path.join(KEYDIR(), 'server.crt'))).subjectAltName.includes(ip);
  await until(() => certHas('192.168.77.40'), 'a certificate for the new address');
  assert.equal((await api(key2, 'phone/me', null, NAMED)).status, 200, 'the phone by name, after the change');
  await assert.rejects(req('/', { headers: { cookie: 'ww=' + other.key } }), /altnames/, 'the old address is no longer this PC');
  await relay();
  await until(() => certHas(IP + ',') || certHas(IP), 'the first address back');
});

// The phone's side of Web Push: its keys, and decrypting what arrives (RFC 8291).
function phoneKeys() { const e = crypto.createECDH('prime256v1'); e.generateKeys(); return { e, auth: crypto.randomBytes(16) }; }
function decrypt({ e, auth }, body) {
  const salt = body.subarray(0, 16), idlen = body[20], as = body.subarray(21, 21 + idlen), data = body.subarray(21 + idlen);
  const h = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
  const ikm = h(h(auth, e.computeSecret(as)), Buffer.concat([Buffer.from('WebPush: info\0'), e.getPublicKey(), as, Buffer.from([1])])), prk = h(salt, ikm);
  const d = crypto.createDecipheriv('aes-128-gcm', h(prk, Buffer.from('Content-Encoding: aes128gcm\0\x01')).subarray(0, 16), h(prk, Buffer.from('Content-Encoding: nonce\0\x01')).subarray(0, 12));
  d.setAuthTag(data.subarray(-16));
  const out = Buffer.concat([d.update(data.subarray(0, -16)), d.final()]);
  assert.equal(out.at(-1), 2);
  return JSON.parse(out.subarray(0, -1).toString());
}

test('a turn that ends is told to the phone, encrypted and signed; not while the phone looks at that session', async () => {
  const { key } = await pair(), k = phoneKeys(), me = (await api(key, 'phone/me')).body;
  const sub = { endpoint: `http://127.0.0.1:${pushSrv.address().port}/push/${me.id}`, keys: { p256dh: k.e.getPublicKey().toString('base64url'), auth: k.auth.toString('base64url') } };
  assert.equal((await api(key, 'phone/me', { push: sub })).body.push, true);
  const mine = () => got.filter(g => g.path === '/push/' + me.id);
  const r = await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Say hello' });
  assert.equal(r.status, 200);
  const id = r.body.sessionId;
  const g = await until(() => mine()[0], 'a push', 15000);
  const m = decrypt(k, g.body);
  assert.equal(m.kind, 'turn'); assert.equal(m.session, id); assert.ok(m.title);
  assert.equal(g.headers['content-encoding'], 'aes128gcm');
  const [, jwt, vk] = /^vapid t=([^,]+), k=(\S+)$/.exec(g.headers.authorization);
  assert.equal(vk, me.vapid);
  const [h64, c64, s64] = jwt.split('.'), claims = JSON.parse(Buffer.from(c64, 'base64url'));
  assert.equal(claims.aud, `http://127.0.0.1:${pushSrv.address().port}`);
  const pub = crypto.createPublicKey({ key: { kty: 'EC', crv: 'P-256', x: Buffer.from(vk, 'base64url').subarray(1, 33).toString('base64url'), y: Buffer.from(vk, 'base64url').subarray(33).toString('base64url') }, format: 'jwk' });
  assert.ok(crypto.verify('sha256', Buffer.from(h64 + '.' + c64), { key: pub, dsaEncoding: 'ieee-p1363' }, Buffer.from(s64, 'base64url')));
  // looking at it: not told
  await until(async () => (await svc.call('sessions/' + id)).body.run?.status === 'idle', 'the turn to end');
  await api(key, 'phone/viewing', { sessionId: id });
  const before = mine().length;
  assert.equal((await svc.call('sessions/' + id + '/send', { text: 'Again' })).status, 200);
  await until(async () => { const s = (await svc.call('sessions/' + id)).body; return s.run?.status === 'idle' && s.items.filter(i => i.kind === 'user').length >= 2; }, 'the second turn');
  await sleep(600);
  assert.equal(mine().length, before);
  // switched off: not told either
  await api(key, 'phone/viewing', {});
  await api(key, 'phone/me', { kinds: { turn: false } });
  assert.equal((await api(key, 'phone/me')).body.kinds.turn, false);
});

test('at this PC a notification waits while you use it, and one seen here is not sent; away, it goes at once', async () => {
  const { key } = await pair(), k = phoneKeys(), me = (await api(key, 'phone/me')).body;
  await api(key, 'phone/me', { push: { endpoint: `http://127.0.0.1:${pushSrv.address().port}/push/pc-${me.id}`, keys: { p256dh: k.e.getPublicKey().toString('base64url'), auth: k.auth.toString('base64url') } } });
  const mine = () => got.filter(g => g.path === '/push/pc-' + me.id).map(g => decrypt(k, g.body));
  const here = (b = {}) => svc.call('presence', { page: 'pc', idle: 0, ...b });
  const turn = async (id, text) => { const n = (await svc.call('sessions/' + id)).body.items.filter(i => i.kind === 'user').length;
    assert.equal((await svc.call('sessions/' + id + '/send', { text })).status, 200);
    await until(async () => { const s = (await svc.call('sessions/' + id)).body; return s.run?.status === 'idle' && s.items.filter(i => i.kind === 'user').length > n; }, 'the turn to end'); };
  try {
    assert.equal((await api(key, 'presence', { away: true })).status, 403);   // the phone cannot say where you are
    let st = (await here()).body;
    assert.equal(st.away, false); assert.equal(st.why, 'here'); assert.equal(st.push, true); assert.equal(st.hold, 'wait');
    // at the PC: the turn's end waits, then goes
    const t0 = performance.now(), id = (await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Say hello' })).body.sessionId;
    await until(async () => (await here()).body.held.some(h => h.session === id && h.kind === 'turn'), 'the push to wait');
    assert.equal(mine().length, 0);
    await until(() => mine()[0], 'the push after the wait', 15000);
    assert.ok(performance.now() - t0 > 3500, 'it waited');
    assert.equal(mine()[0].session, id); assert.equal((await here()).body.held.length, 0);
    // input at the PC while it waits puts it off: it goes only after the wait passes with no input
    await turn(id, 'Busy here');
    const t2 = performance.now(); let held;
    while (performance.now() - t2 < 7000) { held = (await here()).body.held; assert.equal(mine().length, 1, 'not sent while in use'); await sleep(500); }
    assert.equal(held.length, 1); assert.ok(held[0].until - Date.now() > 3000, 'the ring starts again from the last input');
    await until(() => mine().length === 2, 'the push once the PC is left alone', 15000);
    // seen here while it waits: never sent
    await turn(id, 'Again'); await here({ viewing: id });
    await sleep(5000); assert.equal(mine().length, 2);
    // Don't send: nothing while here
    await svc.call('settings', { pcHold: 'never' }); await here();
    await turn(id, 'Once more'); assert.equal((await here()).body.held.length, 0);
    await sleep(5000); assert.equal(mine().length, 2);
    await svc.call('settings', { pcHold: 'wait' });
    // Away now, by hand: at once
    st = (await svc.call('presence', { away: true })).body; assert.equal(st.away, true); assert.equal(st.why, 'manual');
    const t1 = performance.now(); await turn(id, 'And again');
    await until(() => mine().length === 3, 'the push at once', 15000); assert.ok(performance.now() - t1 < 3500, 'not held');
    // I'm here: back at once
    assert.equal((await svc.call('presence', { away: false })).body.away, false);
    // no input for longer than Away after, or the screen locked: away
    assert.equal((await here({ idle: 301 })).body.why, 'idle');
    assert.equal((await here({ locked: true })).body.why, 'locked');
    assert.equal((await svc.call('settings', { awayMin: 15 })).body.awayMin, 15);
    assert.equal((await here({ idle: 301 })).body.away, false);
  } finally {
    await svc.call('settings', { pcHold: 'wait', awayMin: 5 });
    await svc.call('presence', { page: 'pc', idle: 99999 });   // away again, for the tests after: they expect pushes at once
  }
});

test('a push service that says the subscription is gone makes Workwood forget it', async () => {
  const { key } = await pair(), k = phoneKeys();
  await api(key, 'phone/me', { push: { endpoint: `http://127.0.0.1:${pushSrv.address().port}/gone`, keys: { p256dh: k.e.getPublicKey().toString('base64url'), auth: k.auth.toString('base64url') } } });
  assert.equal((await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Hello once more' })).status, 200);
  await until(async () => (await api(key, 'phone/me')).body.push === false, 'the subscription to be dropped', 15000);
});

test('revoking a phone ends its key at once; unpairing from the phone does the same', async () => {
  const { key } = await pair(), id = (await api(key, 'phone/me')).body.id;
  const es = await new Promise((ok, no) => {
    const r = https.request({ host: '127.0.0.1', port: INNER, path: '/api/events?token=' + key, headers: { host: `${IP}:${PORT}` }, ca: fs.readFileSync(path.join(KEYDIR(), 'ca.crt')), checkServerIdentity: (h, c) => tls.checkServerIdentity(IP, c) }, ok);
    r.on('error', no); r.end();
  });
  const ended = new Promise(r => es.on('end', r).on('close', r)); es.resume();
  assert.equal((await svc.call('phone/revoke', { id })).status, 200);
  await ended;
  assert.equal((await api(key, 'sessions/' + sb.sessions.alphaLive)).status, 401);
  const other = await pair();
  assert.equal((await api(other.key, 'phone/unpair', {})).status, 200);
  assert.equal((await api(other.key, 'phone/me')).status, 401);
  assert.equal((await svc.call('phone/revoke', { id: 'nope' })).status, 404);
});

test('turned off: the port closes and keys stop working', async () => {
  const { key } = await pair();
  await svc.call('phone/on', { on: false });
  await assert.rejects(req('/'));
  assert.equal((await svc.call('phone')).body.url, null);
  await svc.call('phone/on', { on: true });
  await until(async () => (await svc.call('phone')).body.listening, 'listening again');
  assert.equal((await api(key, 'phone/me')).status, 200, 'paired phones stay paired across off and on');
});

// The phone's layout, in a phone-sized browser on the phone port. Skipped without a Chromium (see app.test.mjs).
function findChrome() {
  if (process.env.WORKWOOD_CHROME) return process.env.WORKWOOD_CHROME;
  const root = path.join(process.env.HOME, ...(process.platform === 'darwin' ? ['Library', 'Caches'] : ['.cache']), 'ms-playwright');
  const rels = ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome', 'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell'];
  try { for (const d of fs.readdirSync(root).sort().reverse()) for (const rel of rels) { const p = path.join(root, d, rel); if (fs.existsSync(p)) return p; } } catch {}
  return null;
}
const chrome = findChrome();
test('on the phone: tabs, a session full screen with the pill and its drawer, a new session, and this phone\'s settings', { skip: chrome ? false : 'no Chromium found' }, async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  try {
    const code = new URL((await svc.call('phone')).body.url).searchParams.get('pair');
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
    const page = await ctx.newPage(); page.setDefaultTimeout(8000);
    // a finger: Playwright has taps but no swipes
    const cdp = await ctx.newCDPSession(page);
    const swipe = async (x, y1, y2, steps = 8, x2 = x) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y: y1 }] });
      for (let i = 1; i <= steps; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + (x2 - x) * i / steps, y: y1 + (y2 - y1) * i / steps }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    await page.goto(`https://127.0.0.1:${INNER}/?pair=${code}`);
    await page.waitForSelector('html.ph[data-pt=home]');
    await page.click('#phAdd [data-padd-no]');   // Add to Home Screen: its own test below
    // a visit again: at the bare address, since one that names a session reopens it when Workwood's state comes in,
    // which can be after a tap on a tab (and hide the tabs under it)
    const fresh = async () => { await page.goto(page.url().split('#')[0]); await page.waitForSelector('html.ph[data-pt=home]'); };
    assert.deepEqual(await page.locator('#ptabs button span').allTextContents(), ['Home', 'Sessions', 'New', 'Settings']);
    assert.equal(await page.locator('.composer').isVisible(), false, 'Home has no message box');
    await page.waitForSelector('#dash .hs-lim');
    // a session, full screen: back, the cache under the title, the pill
    await page.click('[data-pt=sessions]');
    await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
    await page.waitForSelector('html[data-pt=session]');
    assert.equal(await page.locator('#ptabs').isVisible(), false);
    assert.ok(await page.locator('#phBack').isVisible());
    assert.match(await page.locator('#phCache').textContent(), /Warm|Cools in|Cache cold/);
    await page.waitForFunction(() => /7d/.test(document.querySelector('#phPill').textContent));
    assert.match(await page.locator('#phPill').textContent(), /7d.*41%/, '7d shows because it is closer to its limit (41% vs 34%)');
    // the composer: a one-line hint, the context ring beside the pill, which opens what fills the context
    assert.equal(await page.locator('#input').getAttribute('placeholder'), 'Message the agent…');
    await page.waitForSelector('#phCtx:not([hidden]) .ring');
    await page.click('#phCtx');
    await page.waitForSelector('.phdr .pdh:has-text("What fills the context")');
    await page.mouse.click(195, 30);
    await page.waitForSelector('#phDim[hidden]', { state: 'attached' });
    // dictating: +, the pill and the ring step aside; the round buttons keep their size
    await page.evaluate(() => { document.querySelector('#box').classList.add('rec'); document.querySelector('#voice').hidden = false; document.querySelector('#mic').classList.add('live'); });
    if (process.env.SHOT) { await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOT + '-rec.png' }); }
    for (const id of ['#bAttach', '#phPill', '#phCtx']) assert.equal(await page.locator(id).isVisible(), false, id + ' hides while dictating');
    for (const id of ['#send', '#mic', '#vCancel']) { const b = await page.locator(id).boundingBox(); assert.ok(b.width === b.height && b.width >= 36, id + ' stays round: ' + JSON.stringify(b)); }
    await page.evaluate(() => { document.querySelector('#box').classList.remove('rec'); document.querySelector('#voice').hidden = true; document.querySelector('#mic').classList.remove('live'); });
    if (process.env.SHOT) { await page.waitForTimeout(400); await page.screenshot({ path: process.env.SHOT + '-idle.png' }); }
    // a queued message: one short line over it, no keyboard hint, and buttons a finger can hit
    await page.evaluate(() => { V.run = { ...(V.run || {}), status: 'working', queued: [{ id: 'q1', text: 'while testing this i also noticed a bug with the preview panel' }] }; renderQueue(); });
    assert.equal(await page.locator('#queue .qh>span:first-child').textContent(), 'Queued for the end of this step');
    assert.equal(await page.locator('#queue .hint').isVisible(), false);
    assert.equal((await page.locator('#queue .qh').boundingBox()).height < 24, true, 'the line over the queue is one line');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-queue.png' });
    await page.evaluate(() => { V.run.queued = []; V.run.status = 'idle'; renderQueue(); renderComposer(); });
    // a preview: Fit lays the page out at a desktop width and scales it to the screen, inside the app
    const wide = path.join(sb.projects.alpha, 'wide.html');
    fs.writeFileSync(wide, '<body style="margin:0"><div id="w" style="width:900px;height:40px;background:#c33"></div></body>');
    await page.evaluate(p => { addWork([{ path: p, name: 'wide.html', kind: 'page', v: 1 }]); showWork(p); }, wide);
    await page.waitForSelector('#pvw:not([hidden]) iframe.pvf');
    assert.equal(await page.locator('#bExt').getAttribute('data-tip'), 'Fit the whole page');
    await page.click('#bExt');
    const fit = await page.evaluate(() => { const f = document.querySelector('#stage .pvf').getBoundingClientRect(), st = document.querySelector('#stage').getBoundingClientRect(); return { fw: f.width, sw: st.width, fb: f.bottom, sb: st.bottom }; });
    assert.ok(Math.abs(fit.fw - fit.sw) < 1 && Math.abs(fit.fb - fit.sb) < 2, 'the scaled page fills the stage: ' + JSON.stringify(fit));
    assert.equal(await page.frameLocator('#stage iframe').locator('body').evaluate(b => innerWidth), 980);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-fit.png' });
    // zoomed out, a swipe in from an edge goes to the next or previous preview; a short one does not
    const other = path.join(sb.projects.alpha, 'other.html'); fs.writeFileSync(other, '<h1>Other</h1>');
    await page.evaluate(p => { addWork([{ path: p, name: 'other.html', kind: 'page', v: 1 }]); renderPanel(); }, other);
    const st = await page.locator('#stage').boundingBox(), mid = st.y + st.height / 2, first = await page.locator('#pName').textContent();
    await swipe(st.x + st.width - 6, mid, mid, 6, st.x + st.width - 30);
    assert.equal(await page.locator('#pName').textContent(), first, 'a short pull stays');
    await swipe(st.x + st.width - 6, mid, mid, 8, st.x + st.width - 120);
    await page.waitForFunction(f => document.querySelector('#pName').textContent !== f, first);
    const second = await page.locator('#pName').textContent();
    await swipe(st.x + 6, mid, mid, 8, st.x + 120);
    await page.waitForFunction(f => document.querySelector('#pName').textContent !== f, second);
    assert.equal(await page.locator('#pName').textContent(), first, 'and back from the left edge');
    // Fit is remembered: the next visit opens the preview fitted
    await fresh(); await page.click('[data-pt=sessions]'); await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`); await page.waitForSelector('html[data-pt=session]'); await page.waitForFunction(() => !V.loading && V.items.length);
    await page.evaluate(p => { addWork([{ path: p, name: 'wide.html', kind: 'page', v: 1 }]); showWork(p); }, wide);
    await page.waitForSelector('#pvw.fit iframe.pvf');
    assert.equal(await page.frameLocator('#stage iframe').locator('body').evaluate(b => innerWidth), 980);
    await page.click('#bExt');
    assert.equal(await page.frameLocator('#stage iframe').locator('body').evaluate(b => innerWidth) < 500, true, 'and back to the phone\'s width');
    await fresh(); await page.click('[data-pt=sessions]'); await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`); await page.waitForSelector('html[data-pt=session]'); await page.waitForFunction(() => !V.loading && V.items.length);
    await page.evaluate(p => { addWork([{ path: p, name: 'wide.html', kind: 'page', v: 1 }]); showWork(p); }, wide);
    await page.waitForSelector('#pvw:not(.fit) iframe.pvf');
    // the phone's Back closes the preview and stays in the session; closed by its ×, Back is not spent on it
    await page.goBack();
    await page.waitForSelector('#panel[hidden]', { state: 'attached' });
    assert.equal(await page.evaluate(() => document.documentElement.dataset.pt), 'session', 'Back closed the preview, not the session');
    await page.evaluate(p => showWork(p), wide);
    await page.waitForSelector('#pvw:not([hidden]) iframe.pvf');
    await page.click('#bClose');
    await page.waitForFunction(() => !history.state?.pane);
    assert.equal(await page.evaluate(() => document.documentElement.dataset.pt), 'session');
    // the drawer: a model picked shows in the pill; the context page
    await page.click('#phPill');
    await page.click('[data-dm="claude-opus-5-5"]');
    assert.match(await page.locator('#phPill').textContent(), /Opus/);
    assert.ok(await page.locator('[data-dho]').isVisible(), 'Continue in a new session is one tap from the open drawer');
    await page.click('[data-dctx]');
    await page.waitForSelector('.phdr .pdh:has-text("What fills the context")');
    await page.click('[data-dback]');
    await page.mouse.click(195, 30);
    // swipe up on the box opens the drawer; pulled down by its handle it closes; a short pull springs back
    const box = await page.locator('#box').boundingBox();
    await swipe(195, box.y + 20, box.y - 80);
    await page.waitForSelector('#phDim:not([hidden])');
    let top = (await page.locator('#phDr').boundingBox()).y;
    await swipe(195, top + 8, top + 40, 4);
    await page.waitForTimeout(300);
    assert.equal(await page.locator('#phDim').isHidden(), false, 'a short pull springs back');
    await swipe(195, top + 8, top + 500, 10);
    await page.waitForSelector('#phDim[hidden]', { state: 'attached' });
    await page.click('#phBack');
    await page.waitForSelector('html[data-pt=sessions]');
    // done: swiped left in Sessions, a row is marked done and leaves the list; a reload agrees
    const row = `.sess[data-id="${sb.sessions.betaOther}"]`, rb = await page.locator(row).boundingBox();
    await swipe(rb.x + rb.width - 20, rb.y + rb.height / 2, rb.y + rb.height / 2, 10, rb.x + 20);
    await page.waitForSelector(row, { state: 'detached' });
    assert.ok(await page.locator('html[data-pt=sessions]').count(), 'the swipe is not a tap that opens it');
    await fresh(); await page.click('[data-pt=sessions]');
    await page.waitForSelector(`.sess[data-id="${sb.sessions.alphaLive}"]`);
    assert.equal(await page.locator(row).count(), 0);
    // and from inside a session, in its drawer; it goes back to the list
    await page.click(`.sess[data-id="${sb.sessions.betaFable}"]`);
    await page.waitForSelector('html[data-pt=session]');
    await page.click('#phPill');
    await page.click('[data-ddone]');
    await page.waitForSelector('html[data-pt=sessions]');
    assert.equal(await page.locator(`.sess[data-id="${sb.sessions.betaFable}"]`).count(), 0);
    // a new session: the sentence under the box
    await page.click('[data-pt=new]');
    await page.waitForSelector('html[data-pt=new]');
    assert.equal(await page.locator('#hello').textContent(), 'What are we working on?');
    assert.match(await page.locator('#phSum').textContent(), /alpha on live/);
    // here too: swipe up on the box (its text in focus) opens the drawer, and it pulls down to close
    await page.focus('#input');
    const nbox = await page.locator('#box').boundingBox();
    await swipe(195, nbox.y + 20, nbox.y - 80);
    await page.waitForSelector('#phDim:not([hidden])');
    top = (await page.locator('#phDr').boundingBox()).y;
    await swipe(195, top + 8, top + 500, 10);
    await page.waitForSelector('#phDim[hidden]', { state: 'attached' });
    // this phone's settings: a notification kind switched on reaches the PC
    await page.click('[data-pt=settings]');
    await page.click('[data-pkind=near]');
    await until(async () => (await svc.call('phone')).body.phones.some(p => p.kinds.near), 'the kind to be saved');
    // the desktop is untouched
    const desk = await browser.newPage(); await desk.goto(svc.address);
    await desk.waitForSelector('#list .sess');
    assert.equal(await desk.evaluate(() => document.documentElement.classList.contains('ph')), false);
    assert.equal(await desk.locator('#ptabs').count(), 0);
  } finally { await browser.close(); }
});

// In a browser tab the phone is asked to add Workwood to its Home Screen where it lands, each visit, until it is added.
test('on the phone in a browser: add to Home Screen where it lands, a strip on Home, and where it went once added', { skip: chrome ? false : 'no Chromium found' }, async () => {
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
  try {
    const open = async (opts = {}, init) => {
      const code = new URL((await svc.call('phone')).body.url).searchParams.get('pair');
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true, ...opts });
      if (init) await ctx.addInitScript(init);
      const page = await ctx.newPage(); page.setDefaultTimeout(8000);
      await page.goto(`https://127.0.0.1:${INNER}/?pair=${code}`); await page.waitForSelector('html.ph[data-pt=home]');
      return page;
    };
    // Android before Chrome offers to install: the sheet says where Chrome's menu has it
    const page = await open();
    await page.waitForSelector('#phAdd.phdim:not([hidden]) .pahow');
    assert.match(await page.locator('#phAdd .pahow').textContent(), /⋮.*Add to Home screen/);
    assert.equal(await page.locator('#phAdd [data-padd-go]').count(), 0);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-add-menu.png' });
    // Chrome offers: Add appears, and opens Chrome's own box
    await page.evaluate(() => { const e = new Event('beforeinstallprompt', { cancelable: true }); e.prompt = () => { window.prompted = true; }; e.userChoice = Promise.resolve({ outcome: 'dismissed' }); dispatchEvent(e); });
    await page.click('#phAdd [data-padd-go]');
    await page.waitForFunction(() => window.prompted);
    // turned down: no sheet, a strip on Home instead, which stays across a reload in this tab
    await page.waitForSelector('#phAdd[hidden]', { state: 'attached' });
    await page.waitForSelector('#phStrip:not([hidden])');
    await page.reload(); await page.waitForSelector('html.ph[data-pt=home]'); await page.waitForSelector('#phStrip:not([hidden])');
    assert.equal(await page.locator('#phAdd').isHidden(), true, 'asked once per visit, not on every reload');
    await page.click('[data-pt=sessions]'); assert.equal(await page.locator('#phStrip').isVisible(), false, 'the strip is on Home only');
    await page.click('[data-pt=home]');
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-add-strip.png' });
    // its Add, with no offer from Chrome, brings back how
    await page.click('#phStrip [data-padd-strip]');
    await page.waitForSelector('#phAdd.phdim:not([hidden]) .pahow');
    await page.click('#phAdd [data-padd-no]');
    // × puts it off for a week
    await page.click('#phStrip [data-padd-later]');
    await page.waitForSelector('#phStrip[hidden]', { state: 'attached' });
    await page.reload(); await page.waitForSelector('html.ph[data-pt=home]'); await page.waitForTimeout(200);
    assert.equal(await page.locator('#phStrip').isHidden(), true);
    assert.ok(Number(await page.evaluate(() => localStorage.getItem('ww.addLater'))) > Date.now() + 6 * 864e5);
    // added: the tab says where Workwood went, and can be kept
    await page.evaluate(() => dispatchEvent(new Event('appinstalled')));
    await page.waitForSelector('#phAdd.phok:not([hidden])');
    assert.match(await page.locator('#phAdd h2').textContent(), /on your Home Screen/);
    if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT + '-added.png' });
    await page.click('#phAdd [data-padd-keep]');
    await page.waitForSelector('#phAdd[hidden]', { state: 'attached' });
    await page.click('[data-pt=settings]');
    assert.match(await page.locator('#phSet').textContent(), /Added\. Open it from your Home Screen/);
    // iPhone: Share › Add to Home Screen
    const ios = await open({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
    await ios.waitForSelector('#phAdd.phdim:not([hidden]) .pahow');
    assert.match(await ios.locator('#phAdd .pahow').textContent(), /Share.*Add to Home Screen/);
    if (process.env.SHOT) await ios.screenshot({ path: process.env.SHOT + '-add.png' });
    // opened from the Home Screen: neither
    const app = await open({}, () => { Object.defineProperty(navigator, 'standalone', { value: true }); });
    await app.waitForSelector('#dash .hs-lim'); await app.waitForTimeout(200);
    assert.equal(await app.locator('#phAdd').isHidden(), true); assert.equal(await app.locator('#phStrip').isHidden(), true);
  } finally { await browser.close(); }
});

// Set up once: the PC restarts and Workwood opens again; the phone carries on with no new setup, and is told things.
test('after a restart the phone reconnects with its key, the same certificates, and its notifications', async () => {
  const { key } = await pair(), k = phoneKeys(), me = (await api(key, 'phone/me')).body;
  const sub = { endpoint: `http://127.0.0.1:${pushSrv.address().port}/push/r-${me.id}`, keys: { p256dh: k.e.getPublicKey().toString('base64url'), auth: k.auth.toString('base64url') } };
  await api(key, 'phone/me', { push: sub, kinds: { cool: true } });
  const ca = fingerprint('ca.crt'), srv = fingerprint('server.crt');
  svc.stop();
  await until(async () => { try { await req('/phone/ping'); return false; } catch { return true; } }, 'the old service to go');
  svc = await startService(sb, { WORKWOOD_PHONE_DIR: path.join(sb.root, 'phone'), WORKWOOD_PHONE_PORT: String(PORT), WORKWOOD_PHONE_INNER: String(INNER), WORKWOOD_PHONE_HOST: '127.0.0.1',
    WORKWOOD_PHONE_WSL: '1', WORKWOOD_PUSH_HTTP: '1', WORKWOOD_PREVIEW_KEY: 'pvkey', WORKWOOD_PC_HOLD: '4000' });
  assert.equal((await svc.call('phone')).body.on, true, 'Phone stays on');
  await relay();   // the Windows window, opened again
  await until(async () => (await svc.call('phone')).body.listening, 'the phone port');
  assert.equal(fingerprint('ca.crt'), ca, 'the phone still trusts the same authority');
  assert.equal(fingerprint('server.crt'), srv, 'no new certificate when nothing changed');
  const again = await api(key, 'phone/me');
  assert.equal(again.status, 200); assert.equal(again.body.id, me.id); assert.equal(again.body.push, true); assert.equal(again.body.kinds.cool, true);
  assert.equal(again.body.vapid, me.vapid, 'the same push key, so the phone\'s subscription still holds');
  const mine = () => got.filter(g => g.path === '/push/r-' + me.id);
  assert.equal((await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'After the restart' })).status, 200);
  const g = await until(() => mine()[0], 'a push after the restart', 15000);
  assert.equal(decrypt(k, g.body).kind, 'turn');
});
