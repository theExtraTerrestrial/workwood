// The Workwood service: a local web server that the window talks to.
// It only listens on this machine and every request must carry the start-up token.
import http from 'node:http';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as src from './sources.mjs';
import { readTranscript, outputFromTranscript } from './transcript.mjs';
import { runs, startTurn, answer, setMode, stop, stopStep, liveOutput, taskOutput, publicRun, listCommands, addToTurn, unqueue, sendNow, contextOf } from './runs.mjs';
import { terms, openTerm, attach, typeInto, resize, closeTerm, closeAll } from './terminals.mjs';
import { changesFor, changeOf } from './changes.mjs';
import * as home from './home.mjs';
import * as voice from './voice.mjs';
import * as usage from './usage.mjs';
import * as prof from './profiles.mjs';
import * as update from './update.mjs';
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
const kept = src.readKept(), nowS = () => Math.floor(Date.now() / 1000);
// The sidebar is an inbox. `done`: sessions you marked done, and when. `own`: sessions that have been worked on in
// this app (others appear only while they run somewhere). `unread`: turns that finished while you were elsewhere.
const done = new Map(Object.entries(kept.done || {})); for (const id of kept.archived || []) if (!done.has(id)) done.set(id, nowS());
let own = Array.isArray(kept.own) ? new Set(kept.own) : null;   // null until the first list is read: then everything recent is yours
const unread = new Set(kept.unread || []);
const prefs = { defaultProfile: kept.defaultProfile || null, language: kept.language || null, folders: Array.isArray(kept.folders) ? kept.folders : [],
  doneDays: Number.isInteger(kept.doneDays) ? kept.doneDays : 7, bypass: kept.bypass === true, autoContinue: kept.autoContinue === true };   // your choices in the settings dialog
const folders = () => prefs.folders.length ? prefs.folders : [src.WORKSPACE];   // where the project menu looks
// A mode you may pick: any Workwood offers, but Bypass only once it is turned on in Settings. Null for none.
const modeOf = m => !m ? null : src.MODES.includes(m) && (m !== 'bypassPermissions' || prefs.bypass) ? m : undefined;
const keep = () => src.writeKept({ done: Object.fromEntries(done), own: [...(own || [])], unread: [...unread], ...prefs });
const touch = id => { (own ||= new Set()).add(id); done.delete(id); };   // new work here brings a session back into the inbox
const renamed = new Map();   // session -> [when, name], for a list that was being read while you renamed
const deleted = new Set();   // gone, but a list read a moment earlier may still name them
const clients = new Set();
const workPaths = new Map(); // session -> every previewable file it is known to have made
const counted = new Map();  // session -> { mt, out }: what fills its context, as of the transcript's last change
function knownWork(id) { let w = workPaths.get(id); if (!w) workPaths.set(id, w = new Set()); return w; }
const emit = (type, data) => {
  const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) c.write(msg);
  if (type === 'item' && data.item.kind === 'work') for (const f of data.item.files) knownWork(data.sessionId).add(f.path);
  if (type === 'run') pushState();                                   // the sidebar follows every change of a live turn
  if (type === 'turn-end') { unread.add(data.sessionId); keep(); }   // until a window says it was seen
  if (type === 'bg-failed') { unread.add(data.sessionId); keep(); pushState(); }   // something left running failed after the turn
  if (type === 'turn-end') setTimeout(() => { refreshAll(); refreshLive(); }, 800); // titles, owners and usage may have changed
  if (type === 'turn-end') { const p = state.profiles.find(x => x.name === runs.get(data.sessionId)?.profile); if (p) setTimeout(() => readings.add([p]), 1500); }   // what the turn cost
  if (type === 'turn-end') { noteStop(runs.get(data.sessionId)); planAuto(runs.get(data.sessionId)); }
  if (type === 'run' && data.run?.status !== 'stopped') dropAuto(data.sessionId);   // a new turn, however it began, answers the wait
};

// Limits, read by Workwood itself (see usage.mjs). A reading newer than the one in the profile list wins; a
// window whose reset time has passed counts as empty. `reading`: names in the queue. `failed`: why the last
// reading of a profile did not work, until one does.
const readout = new Map(), reading = new Set(), failed = new Map();
// The last turn on a profile that stopped because of the profile itself (signed out, or an error), so Settings can say
// so and offer a way out. A turn on that profile that ends well, or "Dismiss", clears it. A limit is not kept here:
// the readings show that already.
const stops = new Map();
function noteStop(run) {
  if (!run?.profile || run.interrupted) return;
  const st = run.stopped;
  if (st && st.reason !== 'limit') stops.set(run.profile, { reason: st.reason, text: st.text || '', at: Math.floor(Date.now() / 1000), sessionId: run.sessionId });
  else if (!st) stops.delete(run.profile);
  pushState();
}
// Continuing by itself: with the setting on, a turn stopped by a limit goes on after a wait you can cancel, on the
// other profile with the most room. The wait is kept here, so it runs whether or not a window shows the session.
const AUTO_WAIT = +process.env.WORKWOOD_AUTO_WAIT || 5 * 60_000;
const CONTINUE = 'Continue where you left off.';
const autos = new Map();   // session -> { to, at, timer }
// Room is the smaller of the two windows' remaining room; a full window, an unknown reading or a lost sign-in rules a profile out.
function roomiest(but) {
  const room = p => Math.min(100 - (p.h5 ?? 0), 100 - (p.d7 ?? 0));
  return state.profiles.filter(p => p.name !== but && !adding.has(p.name) && (p.h5 != null || p.d7 != null) && room(p) > 0 && stops.get(p.name)?.reason !== 'auth')
    .sort((a, b) => room(b) - room(a) || (b.name === state.next) - (a.name === state.next))[0] || null;
}
function dropAuto(id) { const a = autos.get(id); if (!a) return; clearTimeout(a.timer); autos.delete(id); pushState(); }
function planAuto(run) {
  if (!prefs.autoContinue || run?.status !== 'stopped' || run.stopped?.reason !== 'limit' || !run.sessionId || run.interrupted) return;
  const to = roomiest(run.profile)?.name; if (!to) return;
  const id = run.sessionId; dropAuto(id);
  autos.set(id, { to, at: Date.now() + AUTO_WAIT, timer: setTimeout(() => goAuto(id, run), AUTO_WAIT) });
  pushState();
}
async function goAuto(id, run) {
  const planned = autos.get(id)?.to; autos.delete(id);
  const s = state.sessions.find(x => x.id === id);
  if (!s || runs.get(id) !== run || run.status !== 'stopped' || terms.has(id)) return pushState();
  const p = state.profiles.find(x => x.name === planned), best = roomiest(run.profile);   // the limits may have moved during the wait
  const to = p && best && Math.min(100 - (p.h5 ?? 0), 100 - (p.d7 ?? 0)) > 0 ? planned : best?.name;
  if (!to) return pushState();
  try {
    const env = await src.envForProfile(to, state.profiles);
    touch(id); keep();
    await startTurn({ sessionId: id, cwd: s.cwd, profile: to, env, text: CONTINUE, readable: [src.ATTACH_ROOT], model: run.model, effort: run.effort, mode: modeOf(run.mode) || undefined, claude: state.claude, emit, transcript: fileOf(s.cwd) });
  } catch (e) { console.error('[workwood] continuing on another profile:', e.message); }
  pushState();
}
const readings = usage.makeQueue((name, ev) => {
  if (ev.queued || ev.reading) reading.add(name); else reading.delete(name);
  if (ev.error) failed.set(name, ev.error);
  else if (ev.at) { failed.delete(name); readout.set(name, { h5: ev.h5, d7: ev.d7, r5: ev.r5, r7: ev.r7, at: ev.at }); state.profiles = state.profiles.map(withReadout); }
  pushState();
});
// Profiles being added: their folder exists, but they are not listed until the sign-in has landed in it.
const adding = new Set();
let claudeVer;
const version = async () => claudeVer ??= await src.claudeVersion(state.claude);
// Claude Code's own sign-in for a profile, in the terminal the settings dialog shows. When it ends, `finish`
// decides from the folder whether it worked; then the list and the profile's limits are read again.
function signIn(name, b, finish) {
  const t = openTerm({ sessionId: 'login:' + name, cwd: os.homedir(), file: state.claude || 'claude', args: ['auth', 'login'],
    env: src.cleanEnv({ CLAUDE_CONFIG_DIR: prof.dirOf(name) }), cols: b.cols, rows: b.rows });
  t.gone.then(finish).catch(e => console.error('[workwood] sign-in:', e.message)).finally(async () => {
    await refreshAll(); const p = state.profiles.find(x => x.name === name); if (p) readings.add([p]);
    if (p && !p.lapsed && stops.get(name)?.reason === 'auth') { stops.delete(name); pushState(); }   // signed in again: that stop is answered
  });
}
// A profile may not be renamed or removed while something has its folder open: a turn here, the terminal view of
// one of its sessions, or a sign-in.
function inUse(name) {
  if (terms.has('login:' + name)) return true;
  for (const [id, run] of runs) if (run.profile === name && (run.status === 'working' || run.status === 'waiting')) return true;
  for (const id of terms.keys()) if (!id.startsWith('login:') && (runs.get(id)?.profile || state.sessions.find(s => s.id === id)?.profile) === name) return true;
  return false;
}
function withReadout(p) {
  const u = readout.get(p.name), out = u && (!p.at || u.at >= p.at) ? { ...p, ...u } : { ...p }, now = nowS();
  if (out.r5 && out.r5 < now) { out.h5 = out.h5 == null ? null : 0; out.r5 = null; }
  if (out.r7 && out.r7 < now) { out.d7 = out.d7 == null ? null : 0; out.r7 = null; }
  return out;
}

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
    status = 'wait'; line = { auth: 'Paused · sign-in needed', limit: autos.has(s.id) ? `Limit reached · continuing on ${autos.get(s.id).to} soon` : 'Stopped · limit reached' }[run.stopped.reason] || 'Stopped · something went wrong';
  } else if (outside) elsewhere('In a terminal');
  return { id: s.id, title: s.title, project: s.project, cwd: s.cwd, branch: s.branch, mts: s.mts,
    root: s.root || s.cwd, profile: run?.profile || s.profile, status, line, outside, term, locked: (outside || term) && !!live && live.status !== 'idle',
    unread: status === 'idle' && unread.has(s.id), done: isDone(s, status), bg: run?.bg?.size || 0,
    auto: autos.has(s.id) ? { to: autos.get(s.id).to, at: autos.get(s.id).at, wait: AUTO_WAIT } : null };
}
// Out of the inbox: marked done with nothing new since, never worked on here and not running anywhere, or left
// untouched for longer than the setting allows. Anything working, waiting or unread is always in.
function isDone(s, status) {
  if (status !== 'idle' || runs.get(s.id)?.status === 'stopped' || runs.get(s.id)?.bg?.size) return false;
  const at = done.get(s.id);
  if (at != null && s.mts <= at + 2) return true;
  if (unread.has(s.id)) return false;
  if (own && !own.has(s.id)) return true;
  return prefs.doneDays > 0 && nowS() - s.mts > prefs.doneDays * 86400;
}
const waitingLine = p => !p ? 'Waiting for you'
  : p.kind === 'question' ? (p.input.questions.length === 1 ? '1 question for you' : `${p.input.questions.length} questions for you`)
  : p.kind === 'plan' ? 'Plan ready for review'
  : p.kind === 'unknown' ? 'Needs your answer'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.toolName) ? 'Wants to edit a file' : p.toolName === 'Bash' ? 'Wants to run a command' : `Wants to use ${p.toolName}`;

// Where Claude Code keeps a session's transcript: the folder path with every other character turned into a dash.
const transcriptFile = (cwd, id) => path.join(src.PROJECTS_ROOT, cwd.replace(/[^A-Za-z0-9]/g, '-'), id + '.jsonl');
// A running session's transcript, for the notes Claude Code saves there: where the list found it, or where it will be.
const fileOf = cwd => id => state.sessions.find(x => x.id === id)?.file || transcriptFile(cwd, id);

const snapshot = () => ({
  profiles: state.profiles.filter(p => !adding.has(p.name)).map(({ account, ...p }) => ({ ...p, reading: reading.has(p.name), failed: failed.get(p.name) || null, stop: stops.get(p.name) || null })), next: state.next, projects: state.projects,
  sessions: state.sessions.map(decorate), ready: state.ready, fresh: state.fresh, prefs, plain: src.PLAIN, folders: folders(), home: src.HOME, preview: previewBase, update: update.status(),
});
let lastSent = '';
function pushState() { const s = JSON.stringify(snapshot()); if (s !== lastSent) { lastSent = s; emit('state', JSON.parse(s)); } }

let refreshing = null;
function refreshAll() { return refreshing ||= doRefresh().finally(() => { refreshing = null; }); }
async function doRefresh() {
  const began = Date.now();
  // Profiles first: the sessions are tagged with the account that ran them.
  const profiles = await src.loadProfiles();
  const nextP = src.loadNext();
  const list = await src.loadSessionList();
  if (profiles) state.profiles = profiles.map(withReadout);
  const sessions = await src.tagSessions(list, state.profiles);
  if (sessions) {
    for (let i = sessions.length - 1; i >= 0; i--) if (deleted.has(sessions[i].id)) sessions.splice(i, 1);
    for (const s of sessions) { const r = renamed.get(s.id); if (r && r[0] >= began) s.title = r[1]; else if (r) renamed.delete(s.id); }
    // A session started here appears in the pool a moment later; keep it listed meanwhile.
    for (const [id, run] of runs) if (!deleted.has(id) && !sessions.some(s => s.id === id)) {
      const old = state.sessions.find(s => s.id === id);
      sessions.unshift(old || { id, title: run.title || 'New session', cwd: run.cwd, project: path.basename(run.cwd), root: run.cwd, branch: null, mts: Math.floor(run.startedAt / 1000), profile: run.profile, file: transcriptFile(run.cwd, id) });
    }
    state.sessions = sessions;
    if (!own) { own = new Set(sessions.filter(s => !done.has(s.id)).map(s => s.id)); keep(); }   // first run with an inbox: nothing vanishes unasked
    for (const [id, at] of done) { const s = sessions.find(x => x.id === id); if (s && s.mts > at + 2) { done.delete(id); own.add(id); } }   // worked on since, here or in a terminal
  }
  state.projects = await src.loadProjects(state.sessions, folders());
  state.ready = true; state.fresh = !!(profiles && sessions);
  pushState();
  state.next = await nextP;
  pushState();
  if (state.fresh) src.writeCache({ profiles: state.profiles, sessions: state.sessions, projects: state.projects, next: state.next });
}
async function refreshLive() { state.live = await src.loadLive(); pushState(); }

// Home (see home.mjs): where each piece of work was left, what is not committed, what was made lately, and how each
// profile's limits are moving. Git is asked at most every 15 seconds; the rest is remembered per transcript.
let uncommitted = { at: 0, list: null, busy: null };
async function readUncommitted() {
  const now = nowS(), cands = new Map();
  for (const s of [...state.sessions].sort((a, b) => b.mts - a.mts)) {
    if (cands.size >= 12) break;
    if ((now - s.mts < 7 * 86400 || !isDone(s, decorate(s).status)) && !cands.has(s.cwd)) cands.set(s.cwd, s);
  }
  const byTop = new Map();
  await Promise.all([...cands.values()].map(async s => {
    const c = await changesFor(s.cwd).catch(() => null);
    if (!c?.repo || !c.count) return;
    const had = byTop.get(c.root);
    if (had && had.mts >= s.mts) return;
    const pl = await src.placeOf(s.cwd);
    byTop.set(c.root, { cwd: c.root, project: s.project, root: s.root || s.cwd, worktree: pl.worktree || null, branch: pl.branch || null,
      count: c.count, add: c.add, del: c.del, sessionId: s.id, mts: s.mts });
  }));
  return [...byTop.values()].sort((a, b) => b.mts - a.mts);
}
async function homeNow() {
  if (Date.now() - uncommitted.at > 15000) uncommitted.busy ||= readUncommitted().then(l => { uncommitted = { at: Date.now(), list: l, busy: null }; }, () => { uncommitted.busy = null; });
  if (!uncommitted.list) await uncommitted.busy;   // the first time, wait for it; afterwards a reading a few seconds old will do
  const now = nowS(), all = [...state.sessions].sort((a, b) => b.mts - a.mts);
  // The last words of the newest sessions, and of the newest session in each project worked on this month.
  const want = new Map(all.slice(0, 12).map(s => [s.id, s]));
  const roots = new Set();
  for (const s of all) { const r = s.root || s.cwd; if (now - s.mts > 30 * 86400 || roots.size >= 16) break; if (!roots.has(r)) { roots.add(r); want.set(s.id, s); } }
  const words = {};
  await Promise.all([...want.values()].map(async s => {
    const w = await home.lastWords(s.file);
    const q = runs.get(s.id)?.pending, ask = q?.kind === 'question' ? q.input?.questions?.[0]?.question : null;
    if (w || ask) words[s.id] = { ...(w || {}), ...(ask ? { ask: String(ask) } : {}) };
  }));
  // What the agents made lately: the newest files of the newest sessions, ones that are still there.
  const made = [];
  for (const s of all.filter(x => now - x.mts < 14 * 86400).slice(0, 8)) {
    for (const f of (await home.madeBy(s.file, s.cwd)).slice(0, 6)) { made.push({ ...f, sessionId: s.id }); previewDirs(s.id).add(path.dirname(f.path)); }
  }
  made.sort((a, b) => b.v - a.v);
  const seenPath = new Set();
  return { words, uncommitted: uncommitted.list || [], made: made.filter(f => !seenPath.has(f.path) && seenPath.add(f.path)).slice(0, 10),
    trends: await home.trends(state.profiles.map(p => p.name)) };
}

const body = req => new Promise((res, rej) => { let s = ''; req.on('data', d => { s += d; if (s.length > 3e8) req.destroy(); }); req.on('end', () => { try { res(s ? JSON.parse(s) : {}); } catch (e) { rej(e); } }); });
const send = (res, code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

const skills = new Map();   // folder|profile -> { at, list }, kept for two minutes
async function api(req, res, url) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  if (req.method === 'GET' && parts[0] === 'events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res); req.on('close', () => clients.delete(res));
    return;
  }
  if (req.method === 'GET' && parts[0] === 'status') {    // for the Windows window: is anything here working or waiting, while you look at the other side?
    const all = state.sessions.map(decorate).filter(s => !s.outside && !s.term);
    return send(res, 200, { wait: all.filter(s => s.status === 'wait').length, work: all.filter(s => s.status === 'work').length, bg: all.reduce((n, s) => n + (s.bg || 0), 0) });
  }
  if (req.method === 'GET' && parts[0] === 'defaults') return send(res, 200, await src.defaultsFor(url.searchParams.get('cwd'), url.searchParams.get('profile'), state.profiles));
  if (req.method === 'GET' && parts[0] === 'about') {
    return send(res, 200, { version: lib('../package.json').version, claude: await src.claudeVersion(state.claude), node: process.version, speech: { model: voice.MODEL, ...voice.status } });
  }
  if (req.method === 'GET' && parts[0] === 'profiles' && parts[2] === 'login') {
    if (!terms.has('login:' + parts[1])) return send(res, 404, { error: 'No sign-in is under way for this profile.' });
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    attach('login:' + parts[1], res);
    return;
  }
  if (req.method === 'GET' && parts[0] === 'skills') {
    const cwd = url.searchParams.get('cwd'), prof = state.profiles.find(p => p.name === url.searchParams.get('profile')) || state.profiles.find(p => p.global);
    if (!state.projects.some(p => p.cwd === cwd) && !state.sessions.some(s => s.cwd === cwd)) return send(res, 400, { error: 'Pick a project first.' });
    const key = cwd + '|' + (prof?.name || ''), had = skills.get(key);
    if (had && Date.now() - had.at < 120000) return send(res, 200, { skills: await had.list });
    // Looking is not running: the profile's folder is used as it is, without renewing its sign-in.
    const env = src.cleanEnv(prof && !prof.global ? { CLAUDE_CONFIG_DIR: src.configDir(prof.name, state.profiles) } : {});
    const list = listCommands({ cwd, env, claude: state.claude }).then(l => src.labelSkills(l, cwd));
    skills.set(key, { at: Date.now(), list });
    try { return send(res, 200, { skills: await list }); }
    catch (e) { skills.delete(key); return send(res, 502, { error: 'The list of skills could not be read: ' + String(e.message).split('\n')[0] }); }
  }
  if (req.method === 'GET' && parts[0] === 'home' && parts[1] === 'activity') return send(res, 200, await home.activity(state.sessions));
  if (req.method === 'GET' && parts[0] === 'home') return send(res, 200, await homeNow());
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'work') {
    // When each previewable file last changed, so the window can reload one that was edited, by anyone.
    const all = knownWork(parts[1]);
    const out = {};
    await Promise.all([...all].map(async f => { try { out[f] = Math.round((await fs.stat(f)).mtimeMs); } catch { out[f] = null; } }));
    return send(res, 200, out);
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'context') {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const run = runs.get(s.id);
    // A session at rest is opened to be asked, which takes a moment: the answer holds until its transcript changes.
    const mt = run?.q ? null : await fs.stat(s.file || '').then(st => st.mtimeMs, () => null), kept = counted.get(s.id);
    if (mt && kept?.mt === mt) return send(res, 200, kept.out);
    try {
      const env = run?.q ? null : await src.envForProfile(run?.profile || s.profile, state.profiles);
      const u = await contextOf({ sessionId: s.id, cwd: s.cwd, env, claude: state.claude });
      const out = { used: u.totalTokens, window: u.rawMaxTokens, percent: u.percentage,
        rows: (u.categories || []).filter(c => c.kind === 'used' && c.tokens > 0).map(c => ({ name: c.name, tokens: c.tokens })).sort((a, b) => b.tokens - a.tokens),
        reserve: (u.categories || []).filter(c => c.kind === 'buffer').reduce((n, c) => n + c.tokens, 0) };
      if (mt) counted.set(s.id, { mt, out });
      return send(res, 200, out);
    } catch (e) { return send(res, 502, { error: String(e.message).split('\n')[0] }); }
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
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'task-output') {
    // what a background command or monitor has printed so far, for the side panel
    const out = await taskOutput(parts[1], url.searchParams.get('task') || '');
    return out ? send(res, 200, out) : send(res, 404, { error: 'That task is no longer running.' });
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'output') {
    // the whole of what one command printed, for "Show all output"
    const s = state.sessions.find(x => x.id === parts[1]), id = url.searchParams.get('tool') || '';
    if (!s) return send(res, 404, { error: 'No such session.' });
    const text = liveOutput(s.id, id) ?? await outputFromTranscript(s.file, id);
    return text == null ? send(res, 404, { error: 'That output is not available.' }) : send(res, 200, { text });
  }
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[1]) {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    // Where it is working, read first: nothing may wait between taking the turn's items and reporting its state.
    const cwd = s.file ? await src.lastCwd(s.file, s.cwd) : s.cwd, pl = await src.placeOf(cwd), home = await src.placeOf(s.cwd);
    const place = { cwd, project: path.basename(home.root), worktree: pl.worktree || (pl.root !== home.root ? path.basename(pl.root) : null), branch: pl.branch };
    const t = s.file ? await readTranscript(s.file, 400, s.cwd) : { items: [], context: null, total: 0, work: [], model: null, effort: null };
    const run = runs.get(s.id);
    if (run && (run.status !== 'idle' || run.q || Date.now() - (run.endedAt || 0) < 5000)) {
      // The current turn (or one that ended a moment ago, before the window had opened it) is still in memory:
      // show it from there, not from what has reached the file so far.
      const live = run.builder.items.map(({ open, ...it }) => it), firstUser = live.find(i => i.kind === 'user');
      if (firstUser) for (let i = t.items.length - 1; i >= 0; i--) if (t.items[i].kind === 'user' && t.items[i].text === firstUser.text) { t.items = t.items.slice(0, i); break; }
      t.items = t.items.concat(live);
    }
    for (const it of t.items) if (it.stop && !it.profile) it.profile = s.profile;   // a stop read back from the file: on the profile the session ran on
    if (run) { const mine = run.builder.work(), has = new Set(mine.map(f => f.path)); t.work = mine.concat(t.work.filter(f => !has.has(f.path))); }
    for (const f of t.work) previewDirs(s.id).add(path.dirname(f.path));
    for (const f of t.work) knownWork(s.id).add(f.path);
    if (pl.worktree) previewDirs(s.id).add(pl.top);   // a page in the worktree may load its neighbours, as in the project folder
    return send(res, 200, { ...t, place, context: run?.context || t.context, model: run?.builder.model || t.model, effort: run?.effort || t.effort, mode: run?.mode || t.mode || null,
      defaults: await src.defaultsFor(s.cwd, run?.profile || s.profile, state.profiles), run: publicRun(run) });
  }
  if (parts[0] === 'voice') {
    if (req.method === 'GET') { if (url.searchParams.has('warm')) voice.warm(); return send(res, 200, voice.status); }
    // The body is the recording itself: 16 kHz mono, 32-bit floats. A preview is skipped while another is being worked on.
    if (url.searchParams.has('preview') && voice.isBusy()) { req.resume(); return send(res, 200, { skipped: true }); }
    const chunks = []; let n = 0;
    for await (const c of req) { n += c.length; if (n > 16000 * 4 * 60 * 20) return send(res, 413, { error: 'That recording is too long.' }); chunks.push(c); }
    const buf = Buffer.concat(chunks), audio = new Float32Array(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length - buf.length % 4));
    try { return send(res, 200, { text: audio.length < 1600 ? '' : await voice.transcribe(audio, prefs.language || undefined) }); }
    catch (e) { return send(res, 500, { error: 'Dictation did not work: ' + String(e.message).split('\n')[0] }); }
  }
  if (req.method !== 'POST') return send(res, 404, { error: 'Not found.' });
  const b = await body(req);
  if (parts[0] === 'update' && parts[1] === 'check') return send(res, 200, await update.check());
  if (parts[0] === 'update' && parts[1] === 'apply') {
    try { return send(res, 200, await update.apply()); } catch (e) { return send(res, 409, { error: e.message }); }
  }

  if (parts[0] === 'settings') {
    if ('defaultProfile' in b) prefs.defaultProfile = state.profiles.some(p => p.name === b.defaultProfile) ? b.defaultProfile : null;
    if ('doneDays' in b) prefs.doneDays = [0, 1, 3, 7, 14, 30].includes(+b.doneDays) ? +b.doneDays : 7;
    if ('bypass' in b) prefs.bypass = b.bypass === true;
    if ('autoContinue' in b) { prefs.autoContinue = b.autoContinue === true; if (!prefs.autoContinue) for (const id of [...autos.keys()]) dropAuto(id); }
    if ('language' in b) prefs.language = /^[a-z]{3,20}$/.test(b.language || '') ? b.language : null;
    if ('folders' in b) {
      try { prefs.folders = await src.checkFolders(b.folders); } catch (e) { return send(res, 400, { error: e.message }); }
      state.projects = await src.loadProjects(state.sessions, folders());
    }
    await keep(); pushState();
    return send(res, 200, prefs);
  }
  if (parts[0] === 'limits' && parts[1] === 'refresh') {   // read limits again now: one profile, or all of them, one after another
    const list = b.profile ? state.profiles.filter(p => p.name === b.profile) : state.profiles;
    if (!list.length) return send(res, 404, { error: 'No such profile.' });
    readings.add(list); pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'profiles' && !parts[1]) {               // add a profile: a new folder, and Claude Code's own sign-in into it
    if (src.PLAIN) return send(res, 400, { error: 'Profiles need the WSL side.' });
    const name = prof.cleanName(b.name);
    if (!name) return send(res, 400, { error: 'Give the profile a name: letters, digits, dots, dashes or underscores.' });
    try { await prof.create(name); } catch (e) { return send(res, 409, { error: e.message }); }
    adding.add(name);
    signIn(name, b, async () => { const ok = await prof.finishAdd(name, await version()); adding.delete(name); return ok; });
    return send(res, 200, { name });
  }
  if (parts[0] === 'profiles' && parts[2] === 'login') {   // sign in again, in a terminal shown in the settings dialog
    const p = state.profiles.find(x => x.name === parts[1]), key = 'login:' + parts[1];
    if (parts[3] === 'input') return send(res, typeInto(key, b.data ?? '') ? 200 : 404, {});
    if (parts[3] === 'resize') return send(res, resize(key, b.cols, b.rows) ? 200 : 404, {});
    if (parts[3] === 'close') { await closeTerm(key); return send(res, 200, { ok: true }); }
    if (!p) return send(res, 404, { error: 'No such profile.' });
    if (terms.has(key)) return send(res, 200, { ok: true });
    if (src.PLAIN) { openTerm({ sessionId: key, cwd: os.homedir(), file: state.claude || 'claude', args: ['/login'], env: src.cleanEnv(), cols: b.cols, rows: b.rows, onChange: () => setTimeout(refreshAll, 500) }); return send(res, 200, { ok: true }); }
    try { await prof.beginRelogin(p.name); } catch (e) { return send(res, 500, { error: 'The old sign-in could not be set aside: ' + e.message }); }
    signIn(p.name, b, async () => prof.finishRelogin(p.name, await version()));
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'profiles' && parts[2] === 'defaults') {   // the profile's own model, effort and permission mode
    const p = state.profiles.find(x => x.name === parts[1]);
    if (!p) return send(res, 404, { error: 'No such profile.' });
    if ('mode' in b && b.mode && modeOf(b.mode) === undefined) return send(res, 400, { error: b.mode === 'bypassPermissions' ? 'Turn on Bypass in Settings first.' : 'No such mode.' });
    const patch = {}; for (const k of ['model', 'effort', 'mode']) if (k in b) patch[k] = b[k] || null;
    try { await src.setProfileDefaults(p.name, state.profiles, patch); } catch (e) { return send(res, /^No such/.test(e.message) ? 400 : 500, { error: e.message }); }
    return send(res, 200, await src.defaultsFor(null, p.name, state.profiles));
  }
  if (parts[0] === 'profiles' && parts[2] === 'dismiss') {    // forget the last stopped turn on a profile
    if (!state.profiles.some(x => x.name === parts[1])) return send(res, 404, { error: 'No such profile.' });
    stops.delete(parts[1]); pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'profiles' && (parts[2] === 'rename' || parts[2] === 'remove')) {
    const p = state.profiles.find(x => x.name === parts[1]);
    if (!p) return send(res, 404, { error: 'No such profile.' });
    if (inUse(p.name)) return send(res, 409, { error: `${p.name} is in use: a session is working on it, or it is open in a terminal or a sign-in. Try again when it is idle.` });
    try {
      if (parts[2] === 'remove') {
        await prof.remove(p.name); stops.delete(p.name);
        if (prefs.defaultProfile === p.name) prefs.defaultProfile = null;
      } else {
        const to = prof.cleanName(b.to);
        if (!to) return send(res, 400, { error: 'Give the profile a name: letters, digits, dots, dashes or underscores.' });
        if (to !== p.name) {
          await prof.rename(p.name, to);
          if (prefs.defaultProfile === p.name) prefs.defaultProfile = to;
          for (const run of runs.values()) if (run.profile === p.name) run.profile = to;
          for (const m of [readout, failed, stops]) if (m.has(p.name)) { m.set(to, m.get(p.name)); m.delete(p.name); }
        }
      }
    } catch (e) { return send(res, 409, { error: e.message }); }
    await keep(); await refreshAll();
    return send(res, 200, { ok: true });
  }

  if (parts[0] === 'default-mode') {                      // "make this my default": the profile's own Claude Code setting
    const profile = state.profiles.find(p => p.name === b.profile)?.name;
    if (!profile || !modeOf(b.mode)) return send(res, 400, { error: 'Pick a profile and a mode.' });
    try { await src.setDefaultMode(profile, state.profiles, b.mode); } catch (e) { return send(res, 500, { error: e.message }); }
    return send(res, 200, { ok: true });
  }
  if ((parts[0] === 'sessions' && (!parts[1] || parts[2] === 'send' || parts[2] === 'mode')) && 'mode' in b && modeOf(b.mode) === undefined)
    return send(res, 400, { error: b.mode === 'bypassPermissions' ? 'Turn on Bypass in Settings first.' : 'No such mode.' });
  if (parts[0] === 'sessions' && parts[2] === 'mode') {   // switch mode, even mid-turn
    if (!state.sessions.some(x => x.id === parts[1])) return send(res, 404, { error: 'No such session.' });
    if (!b.mode) return send(res, 400, { error: 'Pick a mode.' });
    try { return send(res, 200, { live: await setMode(parts[1], b.mode) }); } catch (e) { return send(res, 409, { error: 'The mode could not be changed: ' + String(e.message).split('\n')[0] }); }
  }
  if (parts[0] === 'sessions' && !parts[1]) {            // start a new session
    if (!b.text?.trim() && !b.attachments?.length) return send(res, 400, { error: 'Type a message first.' });
    const proj = state.projects.find(p => p.cwd === b.cwd);
    if (!proj) return send(res, 400, { error: 'Pick a project first.' });
    const profile = state.profiles.find(p => p.name === b.profile)?.name || state.profiles.find(p => p.global)?.name;
    const env = await src.envForProfile(profile, state.profiles);
    let content; try { content = await src.takeAttachments(b.text, b.attachments); } catch (e) { return send(res, 400, { error: e.message }); }
    const id = await startTurn({ cwd: proj.cwd, profile, env, text: b.text || '', content, readable: [src.ATTACH_ROOT], model: b.model, effort: b.effort, mode: modeOf(b.mode), claude: state.claude, emit, transcript: fileOf(proj.cwd) });
    runs.get(id).title = (b.text || '').trim().split('\n')[0].slice(0, 80) || 'Attached files';
    touch(id); keep();
    const pl = await src.placeOf(proj.cwd);
    state.sessions.unshift({ id, title: runs.get(id).title, cwd: proj.cwd, project: path.basename(pl.root), root: pl.root, branch: null, mts: Math.floor(Date.now() / 1000), profile, file: transcriptFile(proj.cwd, id) });
    pushState();
    return send(res, 200, { sessionId: id });
  }
  if (parts[0] === 'sessions' && parts[2] === 'send') {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    if (!b.text?.trim() && !b.attachments?.length) return send(res, 400, { error: 'Type a message first.' });
    if (terms.has(s.id)) {                               // one owner at a time: writing here ends the terminal view's hold
      await refreshLive();
      if (state.live.get(s.id) && state.live.get(s.id).status !== 'idle') return send(res, 409, { error: 'This session is working in the terminal view.' });
      await closeTerm(s.id);
    }
    const going = runs.get(s.id);
    if (going?.q && going.status === 'working') {          // the agent is mid-turn: the message waits for the end of its step
      let more; try { more = await src.takeAttachments(b.text, b.attachments); } catch (e) { return send(res, 400, { error: e.message }); }
      const id = addToTurn(s.id, { text: b.text || '', content: more, attachments: b.attachments || [] }); touch(s.id);
      return send(res, 200, { ok: true, queued: id });
    }
    if (going?.q && going.status === 'waiting') return send(res, 409, { error: 'The agent is waiting for your answer first.' });
    const live = terms.has(s.id) ? null : state.live.get(s.id), run = runs.get(s.id);
    if (live && live.status !== 'idle' && !(run && run.q)) return send(res, 409, { error: 'This session is in use in a terminal.' });
    const profile = state.profiles.find(p => p.name === b.profile)?.name || run?.profile || s.profile;
    const env = await src.envForProfile(profile, state.profiles);
    let content; try { content = await src.takeAttachments(b.text, b.attachments); } catch (e) { return send(res, 400, { error: e.message }); }
    touch(s.id); unread.delete(s.id); keep();
    await startTurn({ sessionId: s.id, cwd: s.cwd, profile, env, text: b.text || '', content, readable: [src.ATTACH_ROOT], model: b.model, effort: b.effort, mode: modeOf(b.mode), claude: state.claude, emit, transcript: fileOf(s.cwd) });
    pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && parts[2] === 'answer') { answer(parts[1], b); pushState(); return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'unqueue') return send(res, 200, { items: unqueue(parts[1], b.ids) });
  if (parts[0] === 'sessions' && parts[2] === 'now') { try { await sendNow(parts[1], b.id); } catch (e) { return send(res, 409, { error: e.message }); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'stop-step') { try { await stopStep(parts[1], b.id); } catch (e) { return send(res, 409, { error: e.message }); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'stay') { dropAuto(parts[1]); return send(res, 200, { ok: true }); }   // cancel continuing by itself
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
      touch(s.id); keep();
      runs.delete(s.id); dropAuto(s.id);                 // the chat's last turn is over; from here the history file is the record
      const again = () => { pushState(); setTimeout(() => { refreshAll(); refreshLive(); }, 800); };
      openTerm({ sessionId: s.id, cwd: s.cwd, file: state.claude || 'claude', args: ['--resume', s.id], env, cols: b.cols, rows: b.rows, onChange: again });
    } else resize(s.id, b.cols, b.rows);
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && parts[2] === 'seen') { if (unread.delete(parts[1])) { await keep(); pushState(); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && ['rename', 'done', 'delete', 'terminal'].includes(parts[2])) {
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const run = runs.get(s.id), busy = run && (run.status === 'working' || run.status === 'waiting'), live = state.live.get(s.id);
    if (parts[2] === 'done') {                            // only out of the sidebar here; the history is untouched
      if (b.on === false) touch(s.id);
      else { if (busy) return send(res, 409, { error: 'This session is still working.' }); done.set(s.id, Math.max(nowS(), s.mts)); unread.delete(s.id);
        if (run?.status === 'stopped') { run.status = 'idle'; run.stopped = null; run.notify?.(); } }   // marking it done answers the stop too
      await keep();
    } else if (parts[2] === 'rename') {
      const title = String(b.title || '').replace(/\s+/g, ' ').trim().slice(0, 120);
      if (!title) return send(res, 400, { error: 'Type a name first.' });
      try { await src.renameSession(s.file, s.id, title); } catch { return send(res, 409, { error: 'This session has no saved history yet. Try again in a moment.' }); }
      s.title = title; if (run) run.title = title; renamed.set(s.id, [Date.now(), title]);
      if (done.has(s.id)) { done.set(s.id, nowS() + 5); await keep(); }   // a new name is not new work
    } else if (parts[2] === 'terminal') {
      if (busy) return send(res, 409, { error: 'This session is working here. Stop it or let it finish, then open it in a terminal.' });
      if (terms.has(s.id)) return send(res, 409, { error: 'This session is already open in the terminal view.' });
      if (live) return send(res, 409, { error: 'This session is already open in a terminal.' });
      const profile = run?.profile || s.profile, p = state.profiles.find(x => x.name === profile);
      if (p && !p.global) await src.envForProfile(profile, state.profiles);   // wired and signed in, as for a turn here
      await src.openTerminal(s.cwd, !p || p.global ? ['claude', '--resume', s.id] : ['env', 'CLAUDE_CONFIG_DIR=' + src.configDir(profile, state.profiles), 'claude', '--resume', s.id]);
      setTimeout(refreshLive, 2500);
    } else {
      if (busy) return send(res, 409, { error: 'This session is working. Stop it before deleting it.' });
      if (terms.has(s.id)) {
        if (live && live.status !== 'idle') return send(res, 409, { error: 'This session is working in the terminal view. Stop it before deleting it.' });
        await closeTerm(s.id);
      } else if (live) return send(res, 409, { error: 'This session is open in a terminal. Close it there before deleting it.' });
      await src.deleteSession(s.file, s.id);
      deleted.add(s.id); runs.delete(s.id); dropAuto(s.id); workPaths.delete(s.id); dirsBySession.delete(s.id);
      done.delete(s.id); own?.delete(s.id); unread.delete(s.id); await keep();
      state.sessions = state.sessions.filter(x => x.id !== s.id);
      state.projects = await src.loadProjects(state.sessions, folders());
      src.writeCache({ profiles: state.profiles, sessions: state.sessions, projects: state.projects, next: state.next });
    }
    pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'projects') {
    if (b.path) {                                          // a folder typed or chosen by hand: any folder that exists
      let cwd; try { [cwd] = await src.checkFolders([b.path]); } catch (e) { return send(res, 400, { error: e.message }); }
      if (!cwd) return send(res, 400, { error: 'Type a folder first.' });
      let known = state.projects.find(x => x.cwd === cwd);
      if (!known) { known = { cwd, name: path.basename(cwd) || cwd, recent: false }; state.projects.push(known); pushState(); }
      return send(res, 200, known);
    }
    const p = await src.createProject(String(b.name || '').trim(), folders()[0]);
    state.projects.push(p); pushState();
    return send(res, 200, p);
  }
  if (parts[0] === 'open-editor') {
    const s = state.sessions.find(x => x.id === b.sessionId);
    if (!s) return send(res, 404, { error: 'No such session.' });
    // Where it is working now: an agent that moved into a worktree is opened there, at the worktree's top.
    const now = s.file ? await src.lastCwd(s.file, s.cwd) : s.cwd, pl = await src.placeOf(now);
    spawn('code', [pl.worktree ? pl.top : s.cwd], { detached: true, stdio: 'ignore', env: src.cleanEnv(), shell: process.platform === 'win32', windowsHide: true }).on('error', () => {}).unref();
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
    const file = await real((process.platform === 'win32' ? '' : path.sep) + rest.map(decodeURIComponent).join(path.sep));   // on Windows the first part is the drive
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
  src.clearOldAttachments(); voice.warmIfPresent();
  state.claude = await src.claudePath();
  await new Promise(r => server.listen(port, '127.0.0.1', r));
  await new Promise(r => previews.listen(0, '127.0.0.1', r));
  previewBase = `http://127.0.0.1:${previews.address().port}/${PREVIEW_KEY}`;
  const address = `http://127.0.0.1:${server.address().port}/?token=${TOKEN}`;
  refreshAll().then(() => readings.add(state.profiles)); refreshLive();
  setInterval(refreshLive, 5000).unref();
  setInterval(refreshAll, 30000).unref();
  setInterval(() => readings.add(state.profiles), 5 * 60000).unref();   // limits, every five minutes
  update.watch(pushState);
  process.on('exit', closeAll);
  return { address };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { address } = await start();
  console.log(`Workwood service running. Open: ${address}`);
  // Started by the Windows window: live exactly as long as it does.
  if (process.env.WORKWOOD_PARENT) { process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); process.stdin.on('error', () => process.exit(0)); }
}
