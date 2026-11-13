// The Workwood service: a local web server that the window talks to.
// It only listens on this machine and every request must carry the start-up token.
import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as src from './sources.mjs';
import { readTranscript } from './transcript.mjs';
import { runs, startTurn, answer, stop, publicRun } from './runs.mjs';
import { terms, openTerm, attach, typeInto, resize, closeTerm, closeAll } from './terminals.mjs';
import { changesFor, changeOf } from './changes.mjs';
import { createRequire } from 'node:module';

const UI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui');
const TOKEN = process.env.WORKWOOD_TOKEN || randomBytes(24).toString('hex');
const PREVIEW_KEY = process.env.WORKWOOD_PREVIEW_KEY || randomBytes(24).toString('hex');
const TYPES = { '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.map': 'application/json', '.txt': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.avif': 'image/avif', '.ico': 'image/x-icon',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.mp4': 'video/mp4', '.m4v': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.pdf': 'application/pdf' };
let previewBase = null;
// The terminal view's drawing library, served from where npm put it.
const lib = createRequire(import.meta.url);
const VENDOR = { 'xterm.js': '@xterm/xterm/lib/xterm.js', 'xterm.css': '@xterm/xterm/css/xterm.css', 'addon-fit.js': '@xterm/addon-fit/lib/addon-fit.js' };

// `ready` means there is a list to draw; `fresh` means it has been re-read since this launch.
const state = { profiles: [], sessions: [], projects: [], live: new Map(), next: null, claude: undefined, ready: false, fresh: false };
const cached = src.readCache();
if (cached?.profiles?.length) Object.assign(state, { profiles: cached.profiles, sessions: cached.sessions || [], projects: cached.projects || [], next: cached.next || null, ready: true });
const archived = new Set(src.readKept().archived || []);
const renamed = new Map();   // session -> [when, name], for a list that was being read while you renamed
const deleted = new Set();   // gone, but a list read a moment earlier may still name them
const clients = new Set();
const workPaths = new Map(); // session -> every previewable file it is known to have made
function knownWork(id) { let w = workPaths.get(id); if (!w) workPaths.set(id, w = new Set()); return w; }
const emit = (type, data) => {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
  if (type === 'item' && data.item.kind === 'work') for (const f of data.item.files) knownWork(data.sessionId).add(f.path);
  if (type === 'run') pushState();                                   // the sidebar follows every change of a live turn
  if (type === 'turn-end') setTimeout(() => { refreshAll(); refreshLive(); }, 800); // titles, owners and usage may have changed
};

// What the sidebar shows for one session: who owns it right now and what it is doing.
function decorate(s) {
  const run = runs.get(s.id), live = state.live.get(s.id);
  const mine = run && (run.status === 'working' || run.status === 'waiting');
  const term = !mine && terms.has(s.id);                 // open in this app's terminal view
  const outside = !mine && !term && !!live;
  const elsewhere = where => { status = live?.status === 'busy' ? 'work' : live?.status === 'waiting' ? 'wait' : 'idle';
    line = where + ' · ' + (live?.status === 'busy' ? 'working' : live?.status === 'waiting' ? 'waiting for you' : 'idle'); };
  let status = 'idle', line = '';
  if (mine) {
    status = run.status === 'waiting' ? 'wait' : 'work';
    line = run.status === 'waiting' ? waitingLine(run.pending) : (run.activity || 'Working');
  } else if (term) {
    elsewhere('In the terminal view');
  } else if (run?.status === 'stopped') {
    status = 'wait'; line = { auth: 'Paused · sign-in needed', limit: 'Stopped · limit reached' }[run.stopped.reason] || 'Stopped · something went wrong';
  } else if (outside) elsewhere('In a terminal');
  return { id: s.id, title: s.title, project: s.project, cwd: s.cwd, branch: s.branch, mts: s.mts,
    profile: run?.profile || s.profile, status, line, outside, term, locked: (outside || term) && !!live && live.status !== 'idle', archived: archived.has(s.id) };
}
const waitingLine = p => !p ? 'Waiting for you'
  : p.kind === 'question' ? (p.input.questions.length === 1 ? '1 question for you' : `${p.input.questions.length} questions for you`)
  : p.kind === 'plan' ? 'Plan ready for review'
  : p.kind === 'unknown' ? 'Needs your answer'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.toolName) ? 'Wants to edit a file' : p.toolName === 'Bash' ? 'Wants to run a command' : `Wants to use ${p.toolName}`;

// Where Claude Code keeps a session's transcript: the folder path with every other character turned into a dash.
const transcriptFile = (cwd, id) => path.join(src.PROJECTS_ROOT, cwd.replace(/[^A-Za-z0-9]/g, '-'), id + '.jsonl');

const snapshot = () => ({
  profiles: state.profiles.map(({ account, ...p }) => p), next: state.next, projects: state.projects,
  sessions: state.sessions.map(decorate), ready: state.ready, fresh: state.fresh, workspace: src.WORKSPACE, preview: previewBase,
});
let lastSent = '';
function pushState() { const s = JSON.stringify(snapshot()); if (s !== lastSent) { lastSent = s; emit('state', JSON.parse(s)); } }

let refreshing = null;
function refreshAll() { return refreshing ||= doRefresh().finally(() => { refreshing = null; }); }
async function doRefresh() {
  const began = Date.now();
  // Profiles first and alone: any Claudius command may tidy a profile's files when it lists them, and two
  // doing that at once collide. After one has run there is nothing left to tidy, so the rest can run side by side.
  const profiles = await src.loadProfiles();
  const nextP = src.loadNext();
  const list = await src.loadSessionList();
  if (profiles) state.profiles = profiles;
  const sessions = await src.tagSessions(list, state.profiles);
  if (sessions) {
    for (let i = sessions.length - 1; i >= 0; i--) if (deleted.has(sessions[i].id)) sessions.splice(i, 1);
    for (const s of sessions) { const r = renamed.get(s.id); if (r && r[0] >= began) s.title = r[1]; else if (r) renamed.delete(s.id); }
    // A session started here appears in the pool a moment later; keep it listed meanwhile.
    for (const [id, run] of runs) if (!deleted.has(id) && !sessions.some(s => s.id === id)) {
      const old = state.sessions.find(s => s.id === id);
      sessions.unshift(old || { id, title: run.title || 'New session', cwd: run.cwd, project: path.basename(run.cwd), branch: null, mts: Math.floor(run.startedAt / 1000), profile: run.profile, file: transcriptFile(run.cwd, id) });
    }
    state.sessions = sessions;
  }
  state.projects = await src.loadProjects(state.sessions);
  state.ready = true; state.fresh = !!(profiles && sessions);
  pushState();
  state.next = await nextP;
  pushState();
  if (state.fresh) src.writeCache({ profiles: state.profiles, sessions: state.sessions, projects: state.projects, next: state.next });
}
async function refreshLive() { state.live = await src.loadLive(); pushState(); }

const body = req => new Promise((res, rej) => { let s = ''; req.on('data', d => { s += d; if (s.length > 5e6) req.destroy(); }); req.on('end', () => { try { res(s ? JSON.parse(s) : {}); } catch (e) { rej(e); } }); });
const send = (res, code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  if (req.method === 'GET' && parts[0] === 'events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res); req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'GET' && parts[0] === 'defaults') return send(res, 200, await src.defaultsFor(url.searchParams.get('cwd'), url.searchParams.get('profile'), state.profiles));
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'work') {
    // When each previewable file last changed, so the window can reload one that was edited, by anyone.
    const all = knownWork(parts[1]);
    const out = {};
    await Promise.all([...all].map(async f => { try { out[f] = Math.round((await fs.stat(f)).mtimeMs); } catch { out[f] = null; } }));
    return send(res, 200, out);
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'changes') {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    if (parts[3] !== 'file') return send(res, 200, await changesFor(s.cwd));
    const d = await changeOf(s.cwd, url.searchParams.get('path'));
    return d ? send(res, 200, d) : send(res, 404, { error: 'No such file.' });
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'term') {
    if (!terms.has(parts[1])) return send(res, 404, { error: 'No terminal is open for this session.' });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    attach(parts[1], res);
    return;
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[1]) {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const t = s.file ? await readTranscript(s.file) : { items: [], context: null, total: 0, work: [], model: null, effort: null };
    const run = runs.get(s.id);
    if (run && run.status !== 'idle') {
      // The current turn is still in memory: show it from there, not from what has reached the file so far.
      const live = run.builder.items.map(({ open, ...it }) => it), firstUser = live.find(i => i.kind === 'user');
      if (firstUser) for (let i = t.items.length - 1; i >= 0; i--) if (t.items[i].kind === 'user' && t.items[i].text === firstUser.text) { t.items = t.items.slice(0, i); break; }
      t.items = t.items.concat(live);
    }
    if (run) { const mine = run.builder.work(), has = new Set(mine.map(f => f.path)); t.work = mine.concat(t.work.filter(f => !has.has(f.path))); }
    for (const f of t.work) previewDirs(s.id).add(path.dirname(f.path));
    for (const f of t.work) knownWork(s.id).add(f.path);
    return send(res, 200, { ...t, context: run?.context || t.context, model: run?.builder.model || t.model, effort: run?.effort || t.effort,
      defaults: await src.defaultsFor(s.cwd, run?.profile || s.profile, state.profiles), run: publicRun(run) });
  }
  if (req.method !== 'POST') return send(res, 404, { error: 'Not found.' });
  const b = await body(req);

  if (parts[0] === 'sessions' && !parts[1]) {            // start a new session
    if (!b.text?.trim()) return send(res, 400, { error: 'Type a message first.' });
    const proj = state.projects.find(p => p.cwd === b.cwd);
    if (!proj) return send(res, 400, { error: 'Pick a project first.' });
    const profile = state.profiles.find(p => p.name === b.profile)?.name || state.profiles.find(p => p.global)?.name;
    const env = await src.envForProfile(profile, state.profiles);
    const id = await startTurn({ cwd: proj.cwd, profile, env, text: b.text, model: b.model, effort: b.effort, claude: state.claude, emit });
    runs.get(id).title = b.text.trim().split('\n')[0].slice(0, 80);
    state.sessions.unshift({ id, title: runs.get(id).title, cwd: proj.cwd, project: proj.name, branch: null, mts: Math.floor(Date.now() / 1000), profile, file: transcriptFile(proj.cwd, id) });
    pushState();
    return send(res, 200, { sessionId: id });
  }
  if (parts[0] === 'sessions' && parts[2] === 'send') {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    if (!b.text?.trim()) return send(res, 400, { error: 'Type a message first.' });
    if (terms.has(s.id)) {                               // one owner at a time: writing here ends the terminal view's hold
      await refreshLive();
      if (state.live.get(s.id) && state.live.get(s.id).status !== 'idle') return send(res, 409, { error: 'This session is working in the terminal view.' });
      await closeTerm(s.id);
    }
    const live = terms.has(s.id) ? null : state.live.get(s.id), run = runs.get(s.id);
    if (live && live.status !== 'idle' && !(run && run.q)) return send(res, 409, { error: 'This session is in use in a terminal.' });
    const profile = state.profiles.find(p => p.name === b.profile)?.name || run?.profile || s.profile;
    const env = await src.envForProfile(profile, state.profiles);
    await startTurn({ sessionId: s.id, cwd: s.cwd, profile, env, text: b.text, model: b.model, effort: b.effort, claude: state.claude, emit });
    pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && parts[2] === 'answer') { answer(parts[1], b); pushState(); return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'stop') { await stop(parts[1]); return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'term') {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    if (parts[3] === 'input') return send(res, typeInto(s.id, b.data ?? '') ? 200 : 404, {});
    if (parts[3] === 'resize') return send(res, resize(s.id, b.cols, b.rows) ? 200 : 404, {});
    if (parts[3] === 'close') { await closeTerm(s.id); return send(res, 200, { ok: true }); }
    if (!terms.has(s.id)) {
      const run = runs.get(s.id);
      if (run && (run.status === 'working' || run.status === 'waiting')) return send(res, 409, { error: 'The agent is working in the chat.', busy: true });
      if (state.live.get(s.id)) return send(res, 409, { error: 'This session is open in another terminal.' });
      const profile = run?.profile || s.profile;
      const env = await src.envForProfile(profile, state.profiles);
      runs.delete(s.id);                                 // the chat's last turn is over; from here the history file is the record
      const again = () => { pushState(); setTimeout(() => { refreshAll(); refreshLive(); }, 800); };
      openTerm({ sessionId: s.id, cwd: s.cwd, file: state.claude || 'claude', args: ['--resume', s.id], env, cols: b.cols, rows: b.rows, onChange: again });
    } else resize(s.id, b.cols, b.rows);
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && ['rename', 'archive', 'delete', 'terminal'].includes(parts[2])) {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const run = runs.get(s.id), busy = run && (run.status === 'working' || run.status === 'waiting'), live = state.live.get(s.id);
    if (parts[2] === 'archive') {                         // only hidden here; the history is untouched
      b.on === false ? archived.delete(s.id) : archived.add(s.id);
      await src.writeKept({ archived: [...archived] });
    } else if (parts[2] === 'rename') {
      const title = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!title) return send(res, 400, { error: 'Type a name first.' });
      try { await src.renameSession(s.file, s.id, title); } catch { return send(res, 409, { error: 'This session has no saved history yet. Try again in a moment.' }); }
      s.title = title; if (run) run.title = title; renamed.set(s.id, [Date.now(), title]);
    } else if (parts[2] === 'terminal') {
      if (busy) return send(res, 409, { error: 'This session is working here. Stop it or let it finish, then open it in a terminal.' });
      if (terms.has(s.id)) return send(res, 409, { error: 'This session is already open in the terminal view.' });
      if (live) return send(res, 409, { error: 'This session is already open in a terminal.' });
      const profile = run?.profile || s.profile, p = state.profiles.find(x => x.name === profile);
      await src.openTerminal(s.cwd, !p || p.global ? ['claude', '--resume', s.id] : ['claudius', 'run', profile, '--resume', s.id]);
      setTimeout(refreshLive, 2500);
    } else {
      if (busy) return send(res, 409, { error: 'This session is working. Stop it before deleting it.' });
      if (terms.has(s.id)) {
        if (live && live.status !== 'idle') return send(res, 409, { error: 'This session is working in the terminal view. Stop it before deleting it.' });
        await closeTerm(s.id);
      } else if (live) return send(res, 409, { error: 'This session is open in a terminal. Close it there before deleting it.' });
      await src.deleteSession(s.file, s.id);
      deleted.add(s.id); runs.delete(s.id); workPaths.delete(s.id); dirsBySession.delete(s.id);
      if (archived.delete(s.id)) await src.writeKept({ archived: [...archived] });
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      state.projects = await src.loadProjects(state.sessions);
      src.writeCache({ profiles: state.profiles, sessions: state.sessions, projects: state.projects, next: state.next });
    }
    pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'projects') {
    const p = await src.createProject(String(b.name || '').trim());
    state.projects.push(p); pushState();
    return send(res, 200, p);
  }
  if (parts[0] === 'open-editor') {
    const s = state.sessions.find(x => x.id === b.sessionId);
    if (!s) return send(res, 404, { error: 'No such session.' });
    spawn('code', [s.cwd], { detached: true, stdio: 'ignore', env: src.cleanEnv() }).on('error', () => {}).unref();
    return send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'Not found.' });
}

// ---- previews ----
// Files an agent made are shown from a second address, so a previewed page is a different
// site from the app and cannot reach it. A page may load its neighbours (styles, images):
// anything inside the session's project folder or next to a file the session wrote.
const dirsBySession = new Map();
function previewDirs(id) { let d = dirsBySession.get(id); if (!d) dirsBySession.set(id, d = new Set()); return d; }
const inside = (file, dir) => file === dir || file.startsWith(dir.endsWith(path.sep) ? dir : dir + path.sep);
const real = async p => { try { return await fs.realpath(p); } catch { return null; } };

const previews = http.createServer(async (req, res) => {
  const deny = (code = 403) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(code === 404 ? 'Not found.' : 'Not available.'); };
  try {
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') return deny();
    if (req.method !== 'GET' && req.method !== 'HEAD') return deny(405);
    const [, key, id, ...rest] = new URL(req.url, 'http://localhost').pathname.split('/');
    const s = key === PREVIEW_KEY && state.sessions.find(x => x.id === id);
    if (!s || !rest.length) return deny();
    for (const [sid, run] of runs) if (sid === id) for (const f of run.builder.work()) previewDirs(id).add(path.dirname(f.path)); // written a moment ago
    const file = await real(path.sep + rest.map(decodeURIComponent).join(path.sep));
    if (!file) return deny(404);
    const roots = (await Promise.all([s.cwd, ...previewDirs(id)].map(real))).filter(Boolean);
    const parts = file.split(path.sep);
    if (!roots.some(r => inside(file, r)) || parts.includes('.git') || /^\.env/.test(parts[parts.length - 1])) return deny();
    const st = await fs.stat(file);
    if (!st.isFile()) return deny(404);
    const head = { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' };
    const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');   // videos are fetched in pieces
    let start = 0, end = st.size - 1, code = 200;
    if (m && (m[1] || m[2]) && st.size) {
      if (m[1]) { start = +m[1]; if (m[2]) end = Math.min(end, +m[2]); } else start = Math.max(0, st.size - +m[2]);
      if (start > end) { res.writeHead(416, { 'content-range': `bytes */${st.size}` }); return res.end(); }
      code = 206; head['content-range'] = `bytes ${start}-${end}/${st.size}`;
    }
    head['content-length'] = st.size ? end - start + 1 : 0;
    res.writeHead(code, head);
    if (req.method === 'HEAD' || !st.size) return res.end();
    fss.createReadStream(file, { start, end }).on('error', () => res.destroy()).pipe(res);
  } catch (e) { console.error('[workwood] preview:', String(e.message).split('\n')[0]); if (!res.headersSent) deny(404); else res.end(); }
});

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); return res.end(); }
    if (url.pathname.startsWith('/api/')) {
      const given = req.headers['x-workwood-token'] || url.searchParams.get('token');
      if (given !== TOKEN) return send(res, 403, { error: 'Missing or wrong token.' });
      return await api(req, res, url);
    }
    if (url.pathname === '/') {
      if (url.searchParams.get('token') !== TOKEN) { res.writeHead(403, { 'content-type': 'text/plain' }); return res.end('Open Workwood from its own window or from the link it printed at start-up.'); }
      const html = (await fs.readFile(path.join(UI, 'index.html'), 'utf8')).replace('__TOKEN__', TOKEN);
      res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' }); return res.end(html);
    }
    const name = path.basename(url.pathname);
    if (url.pathname === '/vendor/' + name && VENDOR[name]) {
      res.writeHead(200, { 'content-type': TYPES[path.extname(name)], 'cache-control': 'max-age=86400' });
      return res.end(await fs.readFile(lib.resolve(VENDOR[name])));
    }
    if (!['app.js', 'app.css'].includes(name)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(name)], 'cache-control': 'no-store' });
    res.end(await fs.readFile(path.join(UI, name)));
  } catch (e) {
    console.error('[workwood]', e);
    if (!res.headersSent) send(res, 500, { error: String(e.message || e).split('\n')[0] }); else res.end();
  }
});

/** Starts the service and resolves with the address to open. */
export async function start(port = Number(process.env.WORKWOOD_PORT) || 0) {
  state.claude = await src.claudePath();
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  await new Promise(r => previews.listen(0, '127.0.0.1', r));
  previewBase = `http://127.0.0.1:${previews.address().port}/${PREVIEW_KEY}`;
  const address = `http://127.0.0.1:${server.address().port}/?token=${TOKEN}`;
  refreshAll(); refreshLive();
  setInterval(refreshLive, 5000).unref();
  setInterval(refreshAll, 30000).unref();
  process.on('exit', closeAll);
  return { address };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { address } = await start();
  console.log(`Workwood service running. Open: ${address}`);
}
