// The Workwood service: a local web server that the window talks to.
// It only listens on this machine and every request must carry the start-up token.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { randomBytes } from 'node:crypto';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import * as src from './sources.mjs';
import { readTranscript, outputFromTranscript, forgetEarly, PICTURE_ROOT, PICTURE_ID, previewKind, fileEntry } from './transcript.mjs';
import { runs, startTurn, answer, setMode, stop, stopStep, backgroundStep, liveOutput, taskOutput, publicRun, listCommands, addToTurn, unqueue, sendNow, contextOf, rewindFilesOf } from './runs.mjs';
import { terms, openTerm, attach, typeInto, resize, closeTerm, closeAll } from './terminals.mjs';
import { changesFor, changeOf } from './changes.mjs';
import * as home from './home.mjs';
import * as voice from './voice.mjs';
import * as speech from './speech.mjs';
import * as usage from './usage.mjs';
import * as prof from './profiles.mjs';
import * as update from './update.mjs';
import * as ho from './handoff.mjs';
import * as rw from './rewind.mjs';
import * as phone from './phone.mjs';
import * as pc from './presence.mjs';
import * as sv from './servers.mjs';
import { createRequire } from 'node:module';

const UI = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'ui');
const TOKEN = process.env.WORKWOOD_TOKEN || randomBytes(24).toString('hex');
const SERVE_TOKEN = randomBytes(24).toString('hex');   // for `workwood serve` in sessions: the servers and nothing else
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
const CACHE_MINUTES = [0, 5, 30, 60, 120];
const READ_PLACES = ['strip', 'answer', 'mini'], READ_SPEEDS = [1, 1.25, 1.5, 2];
const prefs = { defaultProfile: kept.defaultProfile || null, language: kept.language || null, folders: Array.isArray(kept.folders) ? kept.folders : [],
  doneDays: Number.isInteger(kept.doneDays) ? kept.doneDays : 7, bypass: kept.bypass === true, autoContinue: kept.autoContinue === true,
  speech: kept.speech === 'turbo' ? 'turbo' : 'small',
  // reading answers aloud: the voice, where its player shows, how fast, and whether a turn that ends is read by itself
  readVoice: speech.VOICES.includes(kept.readVoice) ? kept.readVoice : speech.VOICES[0],
  readPlace: READ_PLACES.includes(kept.readPlace) ? kept.readPlace : 'strip',
  readSpeed: READ_SPEEDS.includes(kept.readSpeed) ? kept.readSpeed : 1,
  readAuto: kept.readAuto === true,
  // how long a session's prompt cache is taken to last after its last reply (0: no warning); a reply that wrote a shorter one counts that
  cacheMinutes: CACHE_MINUTES.includes(kept.cacheMinutes) ? kept.cacheMinutes : 60,
  // the phone's notifications while you are at this PC (wait a minute, don't send, send at once), and after how many
  // minutes without input you are away
  // a folder that lists servers, with none running: a line above the message box to start them, or only the menus
  serveLine: kept.serveLine !== false,
  pcHold: pc.HOLDS.includes(kept.pcHold) ? kept.pcHold : 'wait', awayMin: pc.AWAY_MINS.includes(kept.awayMin) ? kept.awayMin : 5,
  // handing off: who writes the handoff (Auto picks by how much went on), and from how many tokens of context it is offered
  handoff: { model: ho.MODELS.includes(kept.handoff?.model) ? kept.handoff.model : 'auto', effort: ho.EFFORTS.includes(kept.handoff?.effort) ? kept.handoff.effort : 'medium',
    offer: ho.OFFERS.includes(kept.handoff?.offer) ? kept.handoff.offer : 400000 } };   // your choices in the settings dialog
const folders = () => prefs.folders.length ? prefs.folders : [src.WORKSPACE];   // where the project menu looks
// A mode you may pick: any Workwood offers, but Bypass only once it is turned on in Settings. Null for none.
const modeOf = m => !m ? null : src.MODES.includes(m) && (m !== 'bypassPermissions' || prefs.bypass) ? m : undefined;
// Threads: a session handed off goes on in a new one. Each new session points at the one it continues.
const prevOf = new Map(Object.entries(kept.chains || {}));
const keep = () => src.writeKept({ done: Object.fromEntries(done), own: [...(own || [])], unread: [...unread], chains: Object.fromEntries(prevOf), ...prefs });
/** The sessions of a thread, oldest first, ending with `id`. */
function chainOf(id) { const out = [id], seen = new Set(out); for (let p = prevOf.get(id); p && !seen.has(p); p = prevOf.get(p)) { seen.add(p); out.unshift(p); } return out; }
const handing = new Map();   // session -> { model, effort, at }: its handoff is being written
const titleLater = new Map(); // a new session of a thread takes the thread's name once its history exists
/**
 * What a session that continues others is started with on every turn: the handoff it began from, and the recall tool
 * over the earlier sessions (newest first). Null for a session that continues nothing.
 */
function threadFor(id, h = ho.readHandoff(id), upTo = prevOf.get(id)) {
  if (!upTo) return null;
  const earlier = chainOf(upTo);
  const sessionsOf = async () => earlier.map((sid, i) => ({ file: state.sessions.find(x => x.id === sid)?.file || null, label: 'Session ' + (i + 1) })).reverse();
  return { note: h ? ho.noteFor(h, earlier.length + 1) : null, mcp: ho.recallServer(sessionsOf), tool: ho.RECALL };
}
const touch = id => { (own ||= new Set()).add(id); done.delete(id); };   // new work here brings a session back into the inbox
const renamed = new Map();   // session -> [order, name], for a list that was being read while you renamed
// Which came first is told by a count, not the clock: this computer's clock can step back (WSL sets it back up to a second).
let order = 0;
const deleted = new Set();   // gone, but a list read a moment earlier may still name them
const clients = new Set();
const workPaths = new Map(); // session -> every previewable file it is known to have made
const counted = new Map();  // session -> { mt, out }: what fills its context, as of its last reply
function knownWork(id) { let w = workPaths.get(id); if (!w) workPaths.set(id, w = new Set()); return w; }
// Every event is numbered, and a session read says the number it was taken at, so a window can tell which is newer.
let evSeq = 0;
const emit = (type, data) => {
  const msg = `event: ${type}\ndata: ${JSON.stringify({ ...data, seq: ++evSeq })}\n\n`;
  for (const c of clients) c.write(msg);
  if (type === 'item' && data.item.kind === 'work') for (const f of data.item.files) knownWork(data.sessionId).add(f.path);
  if (type === 'run') pushState();                                   // the sidebar follows every change of a live turn
  if (type === 'turn-end') { unread.add(data.sessionId); keep(); }   // until a window says it was seen
  if (type === 'bg-failed') { unread.add(data.sessionId); keep(); pushState(); }   // something left running failed after the turn
  if (type === 'turn-end') setTimeout(() => { refreshAll(); refreshLive(); }, 800); // titles, owners and usage may have changed
  if (type === 'turn-end') { const p = state.profiles.find(x => x.name === runs.get(data.sessionId)?.profile); if (p) setTimeout(() => readings.add([p]), 1500); }   // what the turn cost
  if (type === 'turn-end') { noteStop(runs.get(data.sessionId)); planAuto(runs.get(data.sessionId)); nameLater(data.sessionId); }
  if (type === 'run' && data.run?.status !== 'stopped') dropAuto(data.sessionId);   // a new turn, however it began, answers the wait
  if (type === 'run' || type === 'turn-end') phoneNews(type, data);
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
    await startTurn({ sessionId: id, cwd: s.cwd, profile: to, env, text: run.stopped?.redo || CONTINUE, readable: [src.ATTACH_ROOT], model: run.model, effort: run.effort, mode: modeOf(run.mode) || undefined, claude: state.claude, emit, transcript: fileOf(s.cwd), thread: threadFor(id), note: await serveNote(s.cwd) });
  } catch (e) { console.error('[workwood] continuing on another profile:', e.message); }
  pushState();
}
// A new session of a thread is named as the thread once Claude Code has saved its history.
async function nameLater(id) {
  const title = titleLater.get(id), s = state.sessions.find(x => x.id === id);
  if (!title || !s?.file) return;
  try { await src.renameSession(s.file, id, title); titleLater.delete(id); s.title = title; renamed.set(id, [++order, title]); pushState(); } catch {}   // not saved yet: the next list refresh tries again
}
const readings = usage.makeQueue((name, ev) => {
  if (ev.queued || ev.reading) reading.add(name); else reading.delete(name);
  if (ev.error) failed.set(name, ev.error);
  else if (ev.at) { failed.delete(name); readout.set(name, { h5: ev.h5, d7: ev.d7, r5: ev.r5, r7: ev.r7, at: ev.at }); state.profiles = state.profiles.map(withReadout); }
  pushState(); watchLimits();
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
  if (handing.has(s.id)) { status = 'work'; line = 'Writing the handoff'; }
  return { id: s.id, title: s.title, project: s.project, cwd: s.cwd, branch: s.branch, mts: s.mts, reply: s.reply || null,
    root: s.root || s.cwd, profile: run?.profile || s.profile, status, line, outside, term, locked: (outside || term) && !!live && live.status !== 'idle',
    unread: status === 'idle' && unread.has(s.id), done: isDone(s, status), bg: run?.bg?.size || 0, ...serversOf(s.id),
    auto: autos.has(s.id) ? { to: autos.get(s.id).to, at: autos.get(s.id).at, wait: AUTO_WAIT } : null, ...(prevOf.has(s.id) ? { thread: chainOf(s.id).length } : {}),
    ...(mine && run.status === 'waiting' && run.pending ? { ask: askOf(run.pending) } : {}) };
}
// The servers that are this session's: started by its agent, or started from it in Workwood. `srv`: how many are not
// already counted among its background tasks; `nets`: what they are, for the sidebar's tooltip.
function serversOf(id) {
  let srv = 0; const nets = [];
  for (const h of Object.values(srvState)) for (const x of h.list) {
    if (x.state === 'exited') continue;
    const linked = x.task?.sessionId === id;
    if (!linked && x.by !== id) continue;
    if (!linked) srv++;
    nets.push(x.name + (x.ports.length ? ' :' + x.ports.join(' :') : ''));
  }
  return nets.length ? { srv, nets } : {};
}
// Out of the inbox: marked done with nothing new since, never worked on here and not running anywhere, or left
// untouched for longer than the setting allows. Anything working, waiting or unread is always in.
function isDone(s, status) {
  if (status !== 'idle' || runs.get(s.id)?.status === 'stopped' || runs.get(s.id)?.bg?.size || serversOf(s.id).nets) return false;
  const at = done.get(s.id);
  if (at != null && s.mts <= at + 2) return true;
  if (unread.has(s.id)) return false;
  if (own && !own.has(s.id)) return true;
  return prefs.doneDays > 0 && nowS() - s.mts > prefs.doneDays * 86400;
}
// What Home needs to answer a waiting card without opening the session: a permission's command or file, or one
// question with a few single-pick options. Anything larger is answered in the session.
const askOf = p => {
  const clip = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  const q = p.kind === 'question' && p.input.questions.length === 1 ? p.input.questions[0] : null;
  return { id: p.id, kind: p.kind,
    what: p.kind === 'permission' ? clip(p.input?.command || p.input?.file_path || p.input?.notebook_path || p.input?.url || '', 120) : '',
    ...(q ? { q: q.question, ...(!q.multiSelect && q.options.length <= 4 ? { opts: q.options.map(o => o.label) } : {}) } : {}) };   // whole: the answer is keyed by them
};
const waitingLine = p => !p ? 'Waiting for you'
  : p.kind === 'question' ? (p.input.questions.length === 1 ? '1 question for you' : `${p.input.questions.length} questions for you`)
  : p.kind === 'plan' ? 'Plan ready for review'
  : p.kind === 'unknown' ? 'Needs your answer'
  : /^(Edit|Write|MultiEdit|NotebookEdit)$/.test(p.toolName) ? 'Wants to edit a file' : p.toolName === 'Bash' ? 'Wants to run a command' : `Wants to use ${p.toolName}`;

// Where Claude Code keeps a session's transcript: the folder path with every other character turned into a dash.
const transcriptFile = (cwd, id) => path.join(src.PROJECTS_ROOT, cwd.replace(/[^A-Za-z0-9]/g, '-'), id + '.jsonl');
// A running session's transcript, for the notes Claude Code saves there: where the list found it, or where it will be.
const fileOf = cwd => id => state.sessions.find(x => x.id === id)?.file || transcriptFile(cwd, id);

// Servers running in the folders the window shows (servers.mjs), as of the last look.
let srvState = {};
async function srvChanged() { srvState = await sv.serversNow(); pushState(); }
sv.linkTasks(() => [...runs].flatMap(([sid, r]) => [...(r.bg?.values() || [])].filter(t => t.kind === 'shell' && t.cmd).map(t => ({ id: t.id, cmd: t.cmd, name: t.name, sessionId: sid }))));
// Told to a session whose project lists its servers, with Claude Code's own instructions.
async function serveNote(cwd) {
  const pl = await src.placeOf(cwd), c = (await sv.confOf(pl.top)) || (await sv.confOf(pl.root));
  if (!c?.lines.length) return null;
  return `This project lists its servers for Workwood (${c.lines.map(l => l.name).join(', ')}, in ${c.file}). When you need them running, to check your `
    + 'changes in a browser or with curl or because the user asks, start them with `workwood serve` from the worktree or folder you are working in, '
    + 'instead of starting them yourself: Workwood gives each worktree its own ports, runs the project\'s setup once per worktree (its own database, for one), '
    + 'shows the servers to the user and keeps them running after this session. It waits until they are up and prints their addresses. '
    + '`workwood serve <name>` starts one; `workwood serve --status`, `--logs <name> [lines]`, `--restart [name]` and `--stop [name]` do the rest.';
}

const snapshot = () => ({
  profiles: state.profiles.filter(p => !adding.has(p.name)).map(({ account, ...p }) => ({ ...p, reading: reading.has(p.name), failed: failed.get(p.name) || null, stop: stops.get(p.name) || null })), next: state.next, projects: state.projects,
  sessions: state.sessions.map(decorate), ready: state.ready, fresh: state.fresh, prefs, tts: speech.available(), plain: src.PLAIN, folders: folders(), home: src.HOME, preview: previewBase, servers: srvState, update: update.status(), pc: pcState(),
});
let lastSent = '';
function pushState() { const s = JSON.stringify(snapshot()); if (s !== lastSent) { lastSent = s; emit('state', JSON.parse(s)); } }

// A refresh asked for while one is under way waits for it and then reads again, once for all who asked meanwhile: the one
// under way may have read the folders before the change its caller just made (a profile renamed, added or removed).
let refreshing = null, following = null;
function refreshAll() {
  if (!refreshing) return refreshing = doRefresh().finally(() => { refreshing = null; });
  return following ||= refreshing.catch(() => {}).then(() => { following = null; return refreshAll(); });
}
async function doRefresh() {
  const began = ++order;
  // Profiles first: the sessions are tagged with the account that ran them.
  const profiles = await src.loadProfiles();
  const nextP = src.loadNext();
  const list = await src.loadSessionList();
  if (profiles) state.profiles = profiles.map(withReadout);
  const sessions = await src.tagSessions(list, state.profiles);
  if (sessions) {
    for (let i = sessions.length - 1; i >= 0; i--) if (deleted.has(sessions[i].id)) sessions.splice(i, 1);
    for (const s of sessions) { const r = renamed.get(s.id); if (r && r[0] > began) s.title = r[1]; else if (r) renamed.delete(s.id); }
    // A session started here appears in the pool a moment later; keep it listed meanwhile.
    for (const [id, run] of runs) if (!deleted.has(id) && !sessions.some(s => s.id === id)) {
      const old = state.sessions.find(s => s.id === id);
      sessions.unshift(old || { id, title: run.title || 'New session', cwd: run.cwd, project: path.basename(run.cwd), root: run.cwd, branch: null, mts: Math.floor(run.startedAt / 1000), profile: run.profile, file: transcriptFile(run.cwd, id) });
    }
    state.sessions = sessions;
    if (!own) { own = new Set(sessions.filter(s => !done.has(s.id)).map(s => s.id)); keep(); }   // first run with an inbox: nothing vanishes unasked
    for (const [id, at] of done) { const s = sessions.find(x => x.id === id); if (s && s.mts > at + 2) { done.delete(id); own.add(id); } }   // worked on since, here or in a terminal
  }
  for (const id of titleLater.keys()) if (runs.get(id)?.status === 'idle') nameLater(id);   // a thread's new session that was not listed, or had no history, when its turn ended
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
  // What the newest sessions opened with and the last words of them, and of the newest session in each project worked on this month.
  const want = new Map(all.slice(0, 12).map(s => [s.id, s]));
  const roots = new Set();
  for (const s of all) { const r = s.root || s.cwd; if (now - s.mts > 30 * 86400 || roots.size >= 16) break; if (!roots.has(r)) { roots.add(r); want.set(s.id, s); } }
  const words = {};
  await Promise.all([...want.values()].map(async s => {
    const w = await home.lastWords(s.file);
    const q = runs.get(s.id)?.pending, ask = q?.kind === 'question' ? q.input?.questions?.[0]?.question : null;
    const first = home.brief(src.openingPrompt(s.file));
    if (w || ask || first) words[s.id] = { ...(w || {}), ...(ask ? { ask: String(ask) } : {}), ...(first ? { first } : {}) };
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

// A session started here, listed straight away: the pool shows it only a moment later.
async function listNew(id, cwd, title, profile) {
  runs.get(id).title = title;
  touch(id); keep();
  const pl = await src.placeOf(cwd);
  state.sessions.unshift({ id, title, cwd, project: path.basename(pl.root), root: pl.root, branch: null, mts: Math.floor(Date.now() / 1000), profile, file: transcriptFile(cwd, id) });
  pushState();
}

/**
 * Hands a session off: its handoff is written (by the model picked, or by Auto), and a new session starts from it, in
 * the same folder and on the same profile, continuing the thread. Answers at once; events tell how it goes.
 */
// After a rewind or its undo the history file is shorter or longer than anything read of it: read it afresh.
function rewound(s) {
  forgetEarly(s.file); counted.delete(s.id);
  const run = runs.get(s.id);
  if (run) { run.context = null; run.endedAt = null; }   // the last turn in memory may be one that was taken out
  setTimeout(() => { refreshAll(); }, 100); pushState();
}
const rewoundOf = id => { const k = rw.kept(id); return k ? { turns: k.turns, undone: k.undone, text: k.text, filesError: k.filesError || null } : null; };
// Waits until a file has stopped growing for a moment (up to three seconds).
async function settled(file) {
  let last = -1;
  for (let i = 0; i < 20; i++) { const n = fss.statSync(file).size; if (n === last) return; last = n; await new Promise(r => setTimeout(r, 150)); }
}
async function handOff(s, b) {
  const pref = ho.MODELS.includes(b.model) ? b.model : prefs.handoff.model, effort = ho.EFFORTS.includes(b.effort) ? b.effort : prefs.handoff.effort;
  const run = runs.get(s.id), profile = run?.profile || s.profile, use = b.use || {};
  handing.set(s.id, { model: pref, effort, at: Date.now() });
  emit('handoff', { sessionId: s.id, state: 'writing', model: pref, effort }); pushState();
  try {
    const env = await src.envForProfile(profile, state.profiles);
    const c = await ho.collect(s.file, s.cwd, typeof b.at === 'string' ? b.at : null), model = ho.pickModel(pref, c.stats);
    if (handing.get(s.id)) handing.get(s.id).model = model;
    emit('handoff', { sessionId: s.id, state: 'writing', model, effort, auto: pref === 'auto' });
    const sections = await ho.writeSections({ digest: c.digest, previous: ho.readHandoff(s.id)?.sections || null, model, effort, cwd: s.cwd, env, claude: state.claude });
    const first = String(b.text || '').trim() || ho.FIRST;
    const h = { from: s.id, model, effort, auto: pref === 'auto', at: Date.now(), sections, facts: ho.factsText(c.facts), first, own: !!String(b.text || '').trim() };
    const id = await startTurn({ cwd: s.cwd, profile, env, text: first, readable: [src.ATTACH_ROOT], model: use.model || run?.model || undefined, effort: use.effort || run?.effort || undefined,
      mode: modeOf(use.mode) || undefined, claude: state.claude, emit, transcript: fileOf(s.cwd), thread: threadFor(null, h, s.id), note: await serveNote(s.cwd) });
    prevOf.set(id, s.id); await ho.saveHandoff(id, h);
    titleLater.set(id, s.title);
    await listNew(id, s.cwd, s.title, profile);
    if (runs.get(id)?.status === 'idle') nameLater(id);   // its first turn ended before it was listed
    done.set(s.id, Math.max(nowS(), s.mts)); unread.delete(s.id); await keep();   // the thread goes on in the new session: the old one leaves the inbox
    handing.delete(s.id);
    emit('handoff', { sessionId: s.id, state: 'done', to: id }); pushState();
  } catch (e) {
    handing.delete(s.id);
    emit('handoff', { sessionId: s.id, state: 'failed', error: String(e.message).split('\n')[0] }); pushState();
  }
}
// What the window needs to show a session as part of its thread: the sessions before it, each with its date, how many
// messages it holds and what it was about, and the handoff this one started from.
async function threadInfo(id) {
  const ids = chainOf(id); if (ids.length < 2) return null;
  const hs = ids.map(x => ho.readHandoff(x));
  const sessions = await Promise.all(ids.slice(0, -1).map(async (sid, i) => {
    const s = state.sessions.find(x => x.id === sid);
    const n = s?.file ? await ho.countMessages(s.file) : 0;   // the message a session started with when you said nothing is not one of yours
    return { id: sid, n: i + 1, title: s?.title || null, mts: s?.mts || null, turns: Math.max(0, n - (hs[i] && !hs[i].own ? 1 : 0)), topic: ho.topicOf(hs[i + 1]), here: !!s };
  }));
  const h = hs.at(-1);
  return { sessions, n: ids.length, handoff: h && { model: h.model, effort: h.effort, auto: !!h.auto, at: h.at, sections: h.sections, facts: h.facts, first: h.own ? null : h.first } };
}

const body = req => new Promise((res, rej) => { let s = ''; req.on('data', d => { s += d; if (s.length > 3e8) req.destroy(); }); req.on('end', () => { try { res(s ? JSON.parse(s) : {}); } catch (e) { rej(e); } }); });
const send = (res, code, data) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(data)); };

const skills = new Map();   // folder|profile -> { at, list }, kept for two minutes
async function api(req, res, url, who = null) {
  const parts = url.pathname.split('/').filter(Boolean).slice(1); // after "api"
  if (who && phoneMayNot(req.method, parts)) return send(res, 403, { error: 'Not from the phone. Use Workwood on the PC for this.' });
  if (parts[0] === 'phone') return phoneApi(req, res, parts, who);
  if (parts[0] === 'presence' && req.method === 'POST') {   // a page on this PC: how long since the last input, or Away now / I'm here
    const b = await body(req);
    if ('away' in b) pc.setAway(b.away === true); else pc.report(b.page || 'page', b);
    pcTick(); return send(res, 200, pcState());
  }
  if (req.method === 'GET' && parts[0] === 'events') {
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
    res.write(`event: state\ndata: ${JSON.stringify(snapshot())}\n\n`);
    clients.add(res); req.on('close', () => { clients.delete(res); phoneClients.delete(res); });
    if (who) phoneClients.set(res, who.id);
    return;
  }
  if (req.method === 'GET' && parts[0] === 'status') {    // for the Windows window: is anything here working or waiting, while you look at the other side?
    const all = state.sessions.map(decorate).filter(s => !s.outside && !s.term);
    return send(res, 200, { wait: all.filter(s => s.status === 'wait').length, work: all.filter(s => s.status === 'work').length, bg: all.reduce((n, s) => n + (s.bg || 0), 0) });
  }
  if (req.method === 'GET' && parts[0] === 'picture') {   // a picture from a message you wrote; its name is its content, so it never changes
    if (!PICTURE_ID.test(parts[1] || '')) return send(res, 404, { error: 'No such picture.' });
    let data; try { data = await fs.readFile(path.join(PICTURE_ROOT, parts[1])); } catch { return send(res, 404, { error: 'No such picture.' }); }
    res.writeHead(200, { 'content-type': TYPES[path.extname(parts[1])] || 'application/octet-stream', 'cache-control': 'private, max-age=31536000, immutable' });
    return res.end(data);
  }
  if (req.method === 'GET' && parts[0] === 'defaults') return send(res, 200, await src.defaultsFor(url.searchParams.get('cwd'), url.searchParams.get('profile'), state.profiles));
  if (req.method === 'GET' && parts[0] === 'about') {
    return send(res, 200, { version: lib('../package.json').version, claude: await src.claudeVersion(state.claude), node: process.version, speech: voice.status });
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
  if (req.method === 'GET' && parts[0] === 'sessions' && parts[2] === 'file') {
    // A path an answer names, that you point at or click: found, checked, and that one file made showable. A click
    // (open) lets it load its neighbours too, as a page the agent wrote may.
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const f = await namedFile(s, url.searchParams.get('path') || '');
    if (!f) return send(res, 404, { error: 'Not found.' });
    const r = await real(f.path); if (r) pointedAt(s.id).add(r);
    if (url.searchParams.has('open')) { previewDirs(s.id).add(path.dirname(f.path)); knownWork(s.id).add(f.path); }
    return send(res, 200, f);
  }
  if (req.method === 'POST' && parts[0] === 'sessions' && parts[2] === 'paths') {
    // Which of the paths a message names are there, so only those become links to VS Code.
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const b = await body(req), list = Array.isArray(b.paths) ? b.paths.slice(0, 300).map(String) : [];
    const out = {};
    await Promise.all(list.map(async p => { const f = await namedPath(s, p); out[p] = f && { path: f.path, dir: f.dir }; }));
    return send(res, 200, out);
  }
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
    // A session at rest is opened to be asked, which takes a moment: the answer holds until its next reply. Not until
    // the file changes: Claude Code adds lines to it when it closes, the asking included, so that would never hold.
    const mt = run?.q ? null : s.reply?.at || null, kept = counted.get(s.id);
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
  if (req.method === 'GET' && parts[0] === 'servers' && parts[1] === 'output') {   // what a server Workwood started has printed
    const text = sv.output(url.searchParams.get('top') || '', url.searchParams.get('id') || '');
    return text == null ? send(res, 404, { error: 'Workwood does not hold that one\'s output.' }) : send(res, 200, { text });
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
    const place = { cwd, top: pl.top, project: path.basename(home.root), worktree: pl.worktree || (pl.root !== home.root ? path.basename(pl.root) : null), branch: pl.branch };
    sv.watch(pl.top);
    const t = s.file ? await readTranscript(s.file, 400, s.cwd) : { items: [], context: null, total: 0, work: [], model: null, effort: null };
    const run = runs.get(s.id), seq = evSeq;   // what has been sent so far; the items and state below are as of then
    if (run && (run.status !== 'idle' || run.q || (run.endedAt != null && performance.now() - run.endedAt < 5000))) {
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
    // The turn's state goes with the items taken above, as it was then: a turn ending while the defaults are read must not
    // come back as idle beside items from before it ended (the next read, or the event stream, brings the rest).
    const now = { context: run?.context || t.context, model: run?.builder.model || t.model, effort: run?.effort || t.effort, mode: run?.mode || t.mode || null, run: publicRun(run) };
    const next = [...prevOf].find(([, p]) => p === s.id)?.[0], cont = next && state.sessions.find(x => x.id === next);   // handed off: where the thread goes on
    return send(res, 200, { ...t, seq, place, ...now, thread: await threadInfo(s.id), handing: handing.get(s.id) || null, rewound: rewoundOf(s.id), continued: cont ? { id: cont.id, n: chainOf(cont.id).length } : null, defaults: await src.defaultsFor(s.cwd, run?.profile || s.profile, state.profiles) });
  }
  if (req.method === 'GET' && parts[0] === 'speak') {   // one sentence, read aloud: a WAV clip
    if (!speech.available()) return send(res, 404, { error: 'Read aloud is not set up yet: get Kokoro in Settings, Speech.' });
    try {
      const wav = await speech.speak(url.searchParams.get('text'), url.searchParams.get('voice') || prefs.readVoice);
      res.writeHead(200, { 'content-type': 'audio/wav', 'content-length': wav.length, 'cache-control': 'no-store' });
      return res.end(wav);
    } catch (e) { return send(res, 500, { error: 'Could not read that aloud: ' + String(e.message).split('\n')[0] }); }
  }
  if (parts[0] === 'voice') {
    if (req.method === 'GET') { if (url.searchParams.has('warm')) voice.warm(); return send(res, 200, { ...voice.status, read: speech.status }); }
    if (parts[1] === 'read') {   // get Kokoro, for read aloud: it takes a while, so this answers at once and the status tells how far it is
      speech.get().then(ok => { if (ok) pushState(); });
      await new Promise(ok => setTimeout(ok, 50)); return send(res, 200, { ...voice.status, read: speech.status });
    }
    if (parts[1] === 'better') {   // get the GPU model, then use it: it takes minutes, so this answers at once and the status tells how far it is
      voice.getBetter().then(async ok => { if (ok) { prefs.speech = 'turbo'; voice.choose('turbo'); await keep(); pushState(); } }, e => console.error(e.message));
      await new Promise(ok => setTimeout(ok, 50)); return send(res, 200, { ...voice.status, read: speech.status });
    }
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

  if (parts[0] === 'servers') {   // start a folder's servers (all, or the ones named), or stop or restart one
    const top = String(b.top || '');
    if (!srvState[top]) return send(res, 404, { error: 'Workwood is not looking at that folder.' });
    try {
      const by = state.sessions.some(x => x.id === b.sessionId) ? b.sessionId : null;   // started from this session's window
      if (parts[1] === 'start') await sv.start(top, Array.isArray(b.names) ? b.names.map(String) : null, by);
      else if (parts[1] === 'stop') await sv.stop(top, String(b.id || ''));
      else if (parts[1] === 'restart') await sv.restart(top, String(b.id || ''), by);
      else return send(res, 404, { error: 'Not found.' });
    } catch (e) { await srvChanged(); return send(res, 409, { error: e.message }); }
    await srvChanged(); return send(res, 200, { ok: true });
  }
  if (parts[0] === 'settings') {
    if ('serveLine' in b) prefs.serveLine = b.serveLine !== false;
    if ('defaultProfile' in b) prefs.defaultProfile = state.profiles.some(p => p.name === b.defaultProfile) ? b.defaultProfile : null;
    if ('doneDays' in b) prefs.doneDays = [0, 1, 3, 7, 14, 30].includes(+b.doneDays) ? +b.doneDays : 7;
    if ('bypass' in b) prefs.bypass = b.bypass === true;
    if ('autoContinue' in b) { prefs.autoContinue = b.autoContinue === true; if (!prefs.autoContinue) for (const id of [...autos.keys()]) dropAuto(id); }
    if (b.handoff && typeof b.handoff === 'object') {
      const h = b.handoff;
      if ('model' in h) prefs.handoff.model = ho.MODELS.includes(h.model) ? h.model : 'auto';
      if ('effort' in h) prefs.handoff.effort = ho.EFFORTS.includes(h.effort) ? h.effort : 'medium';
      if ('offer' in h) prefs.handoff.offer = ho.OFFERS.includes(+h.offer) ? +h.offer : 400000;
    }
    if ('pcHold' in b) prefs.pcHold = pc.HOLDS.includes(b.pcHold) ? b.pcHold : 'wait';
    if ('awayMin' in b) prefs.awayMin = pc.AWAY_MINS.includes(+b.awayMin) ? +b.awayMin : 5;
    if ('pcHold' in b || 'awayMin' in b) setTimeout(pcTick, 0);
    if ('cacheMinutes' in b) prefs.cacheMinutes = CACHE_MINUTES.includes(+b.cacheMinutes) ? +b.cacheMinutes : 60;
    if ('speech' in b) { prefs.speech = b.speech === 'turbo' ? 'turbo' : 'small'; voice.choose(prefs.speech); }
    if ('readVoice' in b) prefs.readVoice = speech.VOICES.includes(b.readVoice) ? b.readVoice : speech.VOICES[0];
    if ('readPlace' in b) prefs.readPlace = READ_PLACES.includes(b.readPlace) ? b.readPlace : 'strip';
    if ('readSpeed' in b) prefs.readSpeed = READ_SPEEDS.includes(+b.readSpeed) ? +b.readSpeed : 1;
    if ('readAuto' in b) prefs.readAuto = b.readAuto === true;
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
    // The account ~/.claude is signed in to can never be removed, busy or not: say that first, not "try again later".
    if (parts[2] === 'remove' && p.global) return send(res, 409, { error: `${p.name} is the account ~/.claude is signed in to. Switch to another one with Claudius first.` });
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
    const id = await startTurn({ cwd: proj.cwd, profile, env, text: b.text || '', content, readable: [src.ATTACH_ROOT], model: b.model, effort: b.effort, mode: modeOf(b.mode), claude: state.claude, emit, transcript: fileOf(proj.cwd), note: await serveNote(proj.cwd) });
    await listNew(id, proj.cwd, (b.text || '').trim().split('\n')[0].slice(0, 80) || 'Attached files', profile);
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
    touch(s.id); unread.delete(s.id); keep(); rw.forget(s.id);   // the session goes on: a rewind before stays
    await startTurn({ sessionId: s.id, cwd: s.cwd, profile, env, text: b.text || '', content, readable: [src.ATTACH_ROOT], model: b.model, effort: b.effort, mode: modeOf(b.mode), claude: state.claude, emit, transcript: fileOf(s.cwd), thread: threadFor(s.id), note: await serveNote(s.cwd) });
    pushState();
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && parts[2] === 'handoff') {   // go on in a new session, from a handoff
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const run = runs.get(s.id);
    if (handing.has(s.id)) return send(res, 409, { error: 'The handoff is already being written.' });
    if (run && (run.status === 'working' || run.status === 'waiting')) return send(res, 409, { error: 'This session is still working. Hand off once the turn is over.' });
    if (terms.has(s.id) || (state.live.get(s.id) && state.live.get(s.id).status !== 'idle')) return send(res, 409, { error: 'This session is open in a terminal.' });
    if (!s.file || !fss.existsSync(s.file)) return send(res, 409, { error: 'This session has no saved history yet.' });
    if ('use' in b && b.use?.mode && modeOf(b.use.mode) === undefined) return send(res, 400, { error: 'No such mode.' });
    rw.forget(s.id); handOff(s, b);
    return send(res, 200, { ok: true });
  }
  if (parts[0] === 'sessions' && (parts[2] === 'rewind' || parts[2] === 'unrewind')) {   // take back a prompt and all after it, or put them back
    const s = state.sessions.find(x => x.id === parts[1]);
    if (!s) return send(res, 404, { error: 'No such session.' });
    const run = runs.get(s.id);
    if (handing.has(s.id)) return send(res, 409, { error: 'The handoff is being written.' });
    if (run && (run.status === 'working' || run.status === 'waiting' || run.lingering)) return send(res, 409, { error: 'This session is still working. Rewind once it is over.' });
    await refreshLive();   // a Claude Code open on it would go on from the turns in its memory, and write them back
    if (terms.has(s.id) || state.live.get(s.id)) return send(res, 409, { error: 'This session is open in a terminal. Close it there first.' });
    if (!s.file || !fss.existsSync(s.file)) return send(res, 409, { error: 'This session has no saved history yet.' });
    if (parts[2] === 'unrewind') {
      try { await rw.undo(s.id); } catch (e) { return send(res, 409, { error: e.message }); }
      rewound(s); return send(res, 200, { ok: true });
    }
    const uid = String(b.at || '');
    if (!/^[\w-]{8,}$/.test(uid)) return send(res, 400, { error: 'Pick a message to rewind to.' });
    const c = await rw.findCut(s.file, uid);
    if (!c) return send(res, 409, { error: 'That message is no longer in this session.' });
    let files = [], undone = 0, filesError = null;
    if (b.files !== false && c.edits.length) {
      try {
        const env = await src.envForProfile(run?.profile || s.profile, state.profiles);
        const r = await rewindFilesOf({ sessionId: s.id, cwd: s.cwd, env, claude: state.claude, uid, before: async paths => { files = await rw.snapshot(paths); } });
        if (r.canRewind === false) { files = []; filesError = r.error || 'Claude Code kept no copies of them.'; } else undone = r.filesChanged.length;
      } catch (e) { files = []; filesError = String(e.message).split('\n')[0]; }
      await settled(s.file);   // Claude Code writes a few lines as it closes
    }
    const info = { turns: c.turns, undone, text: c.text, filesError };
    await rw.cut(s.id, s.file, c, { ...info, files });
    rewound(s);
    return send(res, 200, info);
  }
  if (parts[0] === 'sessions' && parts[2] === 'answer') { answer(parts[1], b); pushState(); return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'unqueue') return send(res, 200, { items: unqueue(parts[1], b.ids) });
  if (parts[0] === 'sessions' && parts[2] === 'now') { try { await sendNow(parts[1], b.id); } catch (e) { return send(res, 409, { error: e.message }); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'bg-step') { try { await backgroundStep(parts[1], b.id); } catch (e) { return send(res, 409, { error: e.message }); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'stop-step') { try { await stopStep(parts[1], b.id); } catch (e) { return send(res, 409, { error: e.message }); } return send(res, 200, { ok: true }); }
  if (parts[0] === 'sessions' && parts[2] === 'stay') { dropAuto(parts[1]); return send(res, 200, { ok: true }); }   // cancel continuing by itself
  if (parts[0] === 'sessions' && parts[2] === 'go-now') {   // continue on the other profile now, without the rest of the wait
    const a = autos.get(parts[1]), run = runs.get(parts[1]);
    if (!a || !run) return send(res, 409, { error: 'Nothing is waiting to continue.' });
    clearTimeout(a.timer); goAuto(parts[1], run); return send(res, 200, { ok: true });
  }
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
      s.title = title; if (run) run.title = title; renamed.set(s.id, [++order, title]);
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
      for (const [c, p] of prevOf) if (p === s.id) { if (prevOf.has(s.id)) prevOf.set(c, prevOf.get(s.id)); else prevOf.delete(c); }   // the thread closes over the gap
      prevOf.delete(s.id); rw.forget(s.id);
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
    const now = s.file ? await src.lastCwd(s.file, s.cwd) : s.cwd, pl = await src.placeOf(now), top = pl.worktree ? pl.top : s.cwd;
    // A path a message named: a folder opens as itself; a file opens at its line, in the project's window when it is in it.
    let args = [top];
    if (b.path != null) {
      const f = await namedPath(s, String(b.path));
      if (!f) return send(res, 404, { error: 'Not found.' });
      const at = f.path + (f.line ? ':' + f.line + (f.col ? ':' + f.col : '') : '');
      args = f.dir ? [f.path] : inside(f.path, top) ? [top, '-g', at] : ['-g', at];
    }
    const err = await openEditor(args);
    return err ? send(res, 500, { error: err }) : send(res, 200, { ok: true });
  }
  send(res, 404, { error: 'Not found.' });
}

// VS Code's `code` command hands the folder (and file) to VS Code and ends. On Windows it is code.cmd, which only cmd
// runs: each path is quoted for cmd, as a space in it (C:\Users\Jane Doe) would split it in two. A `code` that is
// missing or fails says so, instead of the button doing nothing.
function openEditor(args) {
  const win = process.platform === 'win32';
  return new Promise(resolve => {
    const child = win
      ? spawn(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', `"code ${args.map(a => a.startsWith('-') ? a : `"${a.replace(/"/g, '')}"`).join(' ')}"`], { windowsVerbatimArguments: true, detached: true, stdio: 'ignore', env: src.cleanEnv(), windowsHide: true })
      : spawn('code', args, { detached: true, stdio: 'ignore', env: src.cleanEnv() });
    const missing = 'VS Code was not found. In VS Code, run "Shell Command: Install \'code\' command in PATH" (on Windows, reinstall it with "Add to PATH" ticked), then try again.';
    const timer = setTimeout(() => { child.unref(); resolve(null); }, 8000);   // still going: it is opening
    child.on('error', e => { clearTimeout(timer); resolve(e.code === 'ENOENT' ? missing : `VS Code could not be opened (${e.message}).`); });
    child.on('exit', code => { clearTimeout(timer); resolve(!code ? null : (win && code === 1) || code === 127 ? missing : `VS Code could not be opened (code exited with ${code}).`); });
  });
}

// ---- previews ----
// Files an agent made are shown from a second address, so a previewed page is a different
// site from the app and cannot reach it. A page may load its neighbours (styles, images):
// anything inside the session's project folder or next to a file the session wrote.
const dirsBySession = new Map();
function previewDirs(id) { let d = dirsBySession.get(id); if (!d) dirsBySession.set(id, d = new Set()); return d; }
const pointed = new Map();   // session -> files you pointed at or clicked in what it wrote (real paths)
function pointedAt(id) { let p = pointed.get(id); if (!p) pointed.set(id, p = new Set()); return p; }
// A path as an answer wrote it: a full one, ~/…, or one from the folder the session works in or its project.
async function namedFile(s, raw) {
  raw = raw.trim().replace(/^file:\/\//, '');
  if (!raw || raw.length > 1000 || /[\0\n]/.test(raw) || !previewKind(raw)) return null;
  const p = raw.replace(/^~(?=$|[\\/])/, os.homedir());
  const bases = path.isAbsolute(p) ? [''] : [...new Set([s.file ? await src.lastCwd(s.file, s.cwd).catch(() => null) : null, s.cwd].filter(Boolean))];
  for (const b of bases) {
    const f = b ? path.resolve(b, p) : path.resolve(p);
    try { const st = await fs.stat(f); if (st.isFile()) return fileEntry(f, st, new Date().toISOString()); } catch {}
  }
  return null;
}
// Any file or folder a message names, for VS Code: as namedFile finds it, with a line (and column) after it kept.
async function namedPath(s, raw) {
  raw = raw.trim().replace(/^file:\/\//, '');
  if (!raw || raw.length > 1000 || /[\0\n]/.test(raw)) return null;
  const m = raw.match(/^(.*?)(?::(\d+)(?::(\d+))?)?$/), p = m[1].replace(/^~(?=$|[\\/])/, os.homedir());
  if (!p) return null;
  const bases = path.isAbsolute(p) ? [''] : [...new Set([s.file ? await src.lastCwd(s.file, s.cwd).catch(() => null) : null, s.cwd].filter(Boolean))];
  for (const b of bases) {
    const f = b ? path.resolve(b, p) : path.resolve(p);
    try { const st = await fs.stat(f); if (st.isFile() || st.isDirectory()) return { path: f, dir: st.isDirectory(), line: m[2] ? +m[2] : null, col: m[3] ? +m[3] : null }; } catch {}
  }
  return null;
}
const inside = (file, dir) => file === dir || file.startsWith(dir.endsWith(path.sep) ? dir : dir + path.sep);
const real = async p => { try { return await fs.realpath(p); } catch { return null; } };

let helper = null;
const readHelper = async () => helper ??= (await fs.readFile(path.join(UI, 'preview-read.js'), 'utf8')).replace(/<\/(script)/gi, '<\\/$1');
const previews = http.createServer((req, res) => {
  const host = (req.headers.host || '').split(':')[0];
  if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403, { 'content-type': 'text/plain' }); return res.end('Not available.'); }
  servePreview(req, res, new URL(req.url, 'http://localhost').pathname, false);
});
// Shown to the phone from the app's own address, a page is sent with a sandbox header instead: the browser then treats
// it as a site of its own, which cannot read the app's storage or call it with the phone's key.
const SANDBOX_CSP = 'sandbox allow-scripts allow-forms allow-popups allow-modals allow-downloads allow-pointer-lock allow-presentation';
async function servePreview(req, res, pathname, sandboxed) {
  const deny = (code = 403) => { res.writeHead(code, { 'content-type': 'text/plain' }); res.end(code === 404 ? 'Not found.' : 'Not available.'); };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return deny(405);
    const [, key, id, ...rest] = pathname.split('/');
    const s = key === PREVIEW_KEY && state.sessions.find(x => x.id === id);
    if (!s || !rest.length) return deny();
    for (const [sid, run] of runs) if (sid === id) for (const f of run.builder.work()) previewDirs(id).add(path.dirname(f.path)); // written a moment ago
    const file = await real((process.platform === 'win32' ? '' : path.sep) + rest.map(decodeURIComponent).join(path.sep));   // on Windows the first part is the drive
    if (!file) return deny(404);
    const roots = (await Promise.all([s.cwd, ...previewDirs(id)].map(real))).filter(Boolean);
    const parts = file.split(path.sep);
    if (!(roots.some(r => inside(file, r)) || pointed.get(id)?.has(file)) || parts.includes('.git') || /^\.env/.test(parts[parts.length - 1])) return deny();
    const st = await fs.stat(file);
    if (!st.isFile()) return deny(404);
    const head = { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff', 'accept-ranges': 'bytes' };
    if (sandboxed) head['content-security-policy'] = SANDBOX_CSP;
    // A page shown in the window's preview gets the read-aloud helper added at its end, as it is sent; the file is untouched.
    if (/\.html?$/i.test(file) && new URL(req.url, 'http://localhost').searchParams.has('ra')) {
      const body = Buffer.concat([await fs.readFile(file), Buffer.from(`\n<script>${await readHelper()}</script>\n`)]);
      delete head['accept-ranges']; head['content-length'] = body.length; res.writeHead(200, head);
      return res.end(req.method === 'HEAD' ? undefined : body);
    }
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
}

// ---- the phone (see phone.mjs) ----
// One port on the home network, for both: plain HTTP serves only the setup page and the certificate to trust; HTTPS is
// the app, for paired phones. Inside WSL the port is opened on Windows by the Workwood window, which passes
// connections through to 127.0.0.1 here and tells us the PC's addresses (`relay`).
const relay = { ips: [], name: null, listening: false, error: null, at: 0 };
const viewing = new Map();        // phone id -> { sessionId, at }: what it shows, so it is not told what it sees
const phoneClients = new Map();   // event stream -> phone id
const phoneState = { error: null, setupSeen: 0, cert: null };
let phoneNet = null, phoneTls = null, phoneSetup = null;
const phoneSockets = new Set();
const phoneIps = () => {
  const rank = ip => /^192\.168\./.test(ip) ? 0 : /^10\./.test(ip) ? 1 : /^172\./.test(ip) ? 2 : 3;
  return [...new Set(phone.IN_WSL ? relay.ips : phone.localIps())].filter(phone.privateIp).sort((a, b) => rank(a) - rank(b));
};
const phoneName = () => relay.name || os.hostname();
const phoneUrl = () => { const ip = phoneIps()[0], c = phone.pairCode(); return ip && c ? `http://${ip}:${phone.PORT}/?pair=${c.value}` : null; };
async function phoneUp() {
  if (!phone.isOn()) return phoneDown();
  // Inside WSL, wait for the Windows window to say the PC's name and addresses: a certificate made before would be for
  // the wrong ones, and made again a moment later.
  if (phone.IN_WSL && !relay.at) return;
  try {
    const c = phoneState.cert = await phone.certFor(phoneIps(), phoneName());
    if (phoneTls) return phoneTls.setSecureContext({ cert: c.cert, key: c.key });
    phoneTls = https.createServer({ cert: c.cert, key: c.key }, phoneHandler);
    phoneSetup = http.createServer(setupHandler);
    const net0 = net.createServer(sock => {
      sock.on('error', () => {}); phoneSockets.add(sock); sock.on('close', () => phoneSockets.delete(sock));
      sock.once('data', buf => { sock.pause(); sock.unshift(buf); (buf[0] === 22 ? phoneTls : phoneSetup)?.emit('connection', sock); process.nextTick(() => sock.resume()); });
    });
    await new Promise((ok, no) => { net0.once('error', no); net0.listen(phone.INNER_PORT, phone.HOST, ok); });
    net0.on('error', e => console.error('[workwood] phone:', e.message));
    phoneNet = net0; phoneState.error = null;
  } catch (e) {
    phoneState.error = e.code === 'EADDRINUSE' ? `Port ${phone.INNER_PORT} is taken by another program.` : String(e.message).split('\n')[0];
    phoneTls = phoneSetup = null;
    console.error('[workwood] phone:', phoneState.error);
  }
}
function phoneDown() {
  try { phoneNet?.close(); } catch {}
  for (const sock of phoneSockets) sock.destroy();   // open connections too, kept alive by the phone's browser
  for (const res of phoneClients.keys()) try { res.end(); } catch {}
  phoneNet = phoneTls = phoneSetup = null;
}
// Phones may look and answer, not change Workwood itself or open a terminal on this PC.
function phoneMayNot(method, parts) {
  if (parts[0] === 'phone') return !['me', 'viewing', 'unpair'].includes(parts[1]);
  if (parts[0] === 'sessions' && ['term', 'terminal', 'delete', 'rewind', 'unrewind'].includes(parts[2])) return true;
  if (parts[0] === 'profiles') return parts[2] === 'login' || (method !== 'GET' && parts[2] !== 'dismiss');
  if (parts[0] === 'voice' && parts[1] === 'better') return true;
  return ['settings', 'open-editor', 'update', 'default-mode', 'projects', 'presence'].includes(parts[0]) && method !== 'GET';
}
function endPhone(id) { for (const [res, pid] of phoneClients) if (pid === id) try { res.end(); } catch {} viewing.delete(id); }
async function phoneApi(req, res, parts, who) {
  const b = req.method === 'POST' ? await body(req) : {};
  if (who) {   // the phone itself
    if (parts[1] === 'me' && req.method === 'POST') { phone.update(who.id, b); }
    if (parts[1] === 'viewing') { if (b.sessionId) viewing.set(who.id, { sessionId: String(b.sessionId), at: Date.now() }); else viewing.delete(who.id); return send(res, 200, { ok: true }); }
    if (parts[1] === 'unpair') { phone.revoke(who.id); setTimeout(() => endPhone(who.id), 50); return send(res, 200, { ok: true }); }
    const me = phone.list().find(p => p.id === who.id);
    return send(res, 200, { ...me, pc: phoneName(), vapid: phone.vapidPublic(), install: phone.installCode(who.id) });
  }
  if (parts[1] === 'relay') {   // the Windows window: whether to open the port, and what it found
    if (req.method === 'POST') {
      const ips = Array.isArray(b.ips) ? b.ips.filter(x => typeof x === 'string' && phone.privateIp(x)).slice(0, 8) : [];
      const changed = ips.join() !== relay.ips.join() || (b.name && b.name !== relay.name);
      Object.assign(relay, { ips, name: typeof b.name === 'string' ? b.name.slice(0, 63) : relay.name, listening: b.listening === true, error: b.error ? String(b.error).slice(0, 200) : null, at: Date.now() });
      if (changed && phone.isOn()) phoneUp();
    }
    return send(res, 200, { on: phone.isOn(), port: phone.PORT, inner: phone.INNER_PORT });
  }
  if (parts[1] === 'on' && req.method === 'POST') { phone.setOn(b.on === true); await phoneUp(); }
  if (parts[1] === 'revoke' && req.method === 'POST') { if (!phone.revoke(String(b.id || ''))) return send(res, 404, { error: 'No such phone.' }); endPhone(String(b.id)); }
  if (parts[1] === 'repair' && req.method === 'POST') {   // a code that pairs this phone again, as itself
    const ip = phoneIps()[0], c = phone.pairCode(String(b.id || ''));
    if (!c) return send(res, 404, { error: 'No such phone.' });
    return send(res, 200, { id: String(b.id), url: ip ? `http://${ip}:${phone.PORT}/?pair=${c.value}` : null, until: c.until });
  }
  if (parts[1] === 'rename' && req.method === 'POST') { if (!phone.update(String(b.id || ''), { name: b.name })) return send(res, 404, { error: 'No such phone.' }); }
  const on = phone.isOn();
  return send(res, 200, { on, port: phone.PORT, wsl: phone.IN_WSL, name: phoneName(), ips: phoneIps(),
    listening: !!phoneNet, error: phoneState.error, relay: { listening: relay.listening, error: relay.error, fresh: Date.now() - relay.at < 15000 },
    url: on ? phoneUrl() : null, until: on ? phone.pairCode()?.until : null, setupSeen: phoneState.setupSeen,
    local: phoneLocal(), phones: phone.list().map(x => ({ ...x, lost: !!x.via && /^\d+\.\d+\.\d+\.\d+$/.test(x.via) && !phoneIps().includes(x.via) })) });
}
const hostOf = req => (req.headers.host || '').replace(/:\d+$/, '').replace(/^\[|\]$/g, '').toLowerCase();
// The PC's name on the home network (DESKTOP-AX.local), answered by Windows itself (or the Mac, or Avahi on Linux). A phone
// that reaches the PC by it keeps working when the router gives the PC another address; the setup page uses it when
// the phone can (see phone-setup.html).
const phoneLocal = () => phoneState.cert ? phoneState.cert.host.toLowerCase() + '.local' : null;
const okPhoneHost = h => h === '127.0.0.1' || h === 'localhost' || phoneIps().includes(h) || (!!phoneLocal() && h === phoneLocal());
const cookieOf = (req, name) => { const m = new RegExp('(?:^|;\\s*)' + name + '=([^;]+)').exec(req.headers.cookie || ''); return m ? m[1] : null; };
const page = (res, code, title, text) => {
  res.writeHead(code, { 'content-type': TYPES['.html'], 'cache-control': 'no-store', 'x-frame-options': 'DENY' });
  res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workwood</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#18191c;color:#e8e6e3;margin:0;padding:48px 24px}h1{font-size:21px;margin:0 0 8px}p{color:#9a9894;margin:0}</style><h1>${title}</h1><p>${text}</p>`);
};
async function setupHandler(req, res) {
  try {
    if (!okPhoneHost(hostOf(req))) { res.writeHead(403); return res.end(); }
    const url = new URL(req.url, 'http://x');
    phoneState.setupSeen = Date.now();
    if (url.pathname === '/workwood.crt') {
      const der = phone.caDer(); if (!der) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'content-type': 'application/x-x509-ca-cert', 'content-disposition': `attachment; filename="Workwood ${phoneName()}.crt"`, 'cache-control': 'no-store' });
      return res.end(der);
    }
    if (url.pathname !== '/') { res.writeHead(302, { location: '/' }); return res.end(); }
    const code = /^[\w-]{10,40}$/.test(url.searchParams.get('pair') || '') ? url.searchParams.get('pair') : '';
    const html = (await fs.readFile(path.join(UI, 'phone-setup.html'), 'utf8'))
      .replaceAll('__HTTPS__', `https://${req.headers.host}`).replaceAll('__NAMED__', phoneLocal() ? `https://${phoneLocal()}:${phone.PORT}` : '').replaceAll('__CODE__', code).replaceAll('__NAME__', phoneName().replace(/[<>&"]/g, ''));
    res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store', 'x-frame-options': 'DENY' }); res.end(html);
  } catch (e) { console.error('[workwood] phone setup:', e.message); if (!res.headersSent) { res.writeHead(500); res.end(); } }
}
const ICONS = { '/icon-192.png': 'icon-192.png', '/icon-512.png': 'icon-512.png', '/apple-touch-icon.png': 'icon-192.png' };
async function phoneHandler(req, res) {
  try {
    if (!okPhoneHost(hostOf(req))) { res.writeHead(403); return res.end(); }
    const url = new URL(req.url, 'https://x'), p = url.pathname;
    if (p === '/phone/ping') { res.writeHead(200, { 'content-type': 'text/plain', 'cache-control': 'no-store', 'access-control-allow-origin': '*' }); return res.end('ok'); }
    if (ICONS[p]) { res.writeHead(200, { 'content-type': 'image/png', 'cache-control': 'max-age=86400' }); return res.end(await fs.readFile(path.join(UI, ICONS[p]))); }
    if (p === '/sw.js') { res.writeHead(200, { 'content-type': TYPES['.js'], 'cache-control': 'no-store', 'service-worker-allowed': '/' }); return res.end(await fs.readFile(path.join(UI, 'sw.js'))); }
    if (p === '/manifest.webmanifest') {
      const i = url.searchParams.get('i'), start = /^[\w-]{10,40}$/.test(i || '') ? '/?pair=' + i : '/';
      res.writeHead(200, { 'content-type': 'application/manifest+json', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ name: 'Workwood', short_name: 'Workwood', id: '/', start_url: start, scope: '/', display: 'standalone', background_color: '#18191c', theme_color: '#18191c',
        icons: [{ src: '/icon-192.png', sizes: '192x192', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png' }, { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] }));
    }
    if (p.startsWith('/api/')) {
      const who = phone.phoneOf(req.headers['x-workwood-token'] || url.searchParams.get('token'), hostOf(req));
      if (!who) return send(res, 401, { error: 'This phone is not paired.', unpaired: true });
      return await api(req, res, url, who);
    }
    if (p.startsWith('/preview/')) return servePreview(req, res, p.slice('/preview'.length), true);
    if (p === '/') {
      let key = cookieOf(req, 'ww'), who = phone.phoneOf(key, hostOf(req));
      const pair = url.searchParams.get('pair');
      if (!who && pair) {
        const r = phone.redeem(pair, req.headers['user-agent']);
        if (!r) return page(res, 410, 'This code has run out', 'Open Settings › Phone in Workwood on your PC and scan the new code.');
        phone.phoneOf(r.key, hostOf(req));   // seen, and by which name or address
        res.writeHead(303, { location: '/', 'set-cookie': `ww=${r.key}; Path=/; Max-Age=315360000; Secure; HttpOnly; SameSite=Lax`, 'cache-control': 'no-store' });
        return res.end();
      }
      if (pair) { res.writeHead(303, { location: '/' }); return res.end(); }
      if (!who) return page(res, 401, 'This phone is not paired', 'Open Settings › Phone in Workwood on your PC and scan the code with this phone.');
      const html = (await fs.readFile(path.join(UI, 'index.html'), 'utf8'))
        .replace('<meta name="viewport" content="width=device-width,initial-scale=1">', `<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover,interactive-widget=resizes-content">
<link rel="manifest" href="/manifest.webmanifest?i=${phone.installCode(who.id)}"><meta name="theme-color" content="#18191c"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="apple-mobile-web-app-title" content="Workwood"><link rel="apple-touch-icon" href="/apple-touch-icon.png">`)
        .replace('<body data-token="__TOKEN__">', `<body data-token="${key}" data-phone="1">`);
      res.writeHead(200, { 'content-type': TYPES['.html'], 'cache-control': 'no-store', 'x-frame-options': 'DENY', 'referrer-policy': 'no-referrer' }); return res.end(html);
    }
    if (!await serveStatic(res, url)) { res.writeHead(404); res.end(); }
  } catch (e) {
    console.error('[workwood] phone:', e);
    if (!res.headersSent) send(res, 500, { error: String(e.message || e).split('\n')[0] }); else res.end();
  }
}
// What a phone is told, encrypted end to end (see phone.mjs). Not about the session it is looking at.
const pushed = new Map();   // session -> the question it was told about
const limitSeen = new Map();   // profile -> { full, near }
const titleOf = id => state.sessions.find(s => s.id === id)?.title || runs.get(id)?.title || 'A session';
const lastAnswer = run => { const a = [...(run?.builder?.items || [])].reverse().find(i => i.kind === 'assistant'); return a ? a.text.replace(/\s+/g, ' ').trim().slice(0, 160) : ''; };
function phoneNews(type, data) {
  if (!phone.isOn()) return;
  const id = data.sessionId, tag = x => x + String(id).slice(0, 12);
  const looking = pid => { const v = viewing.get(pid); return !!v && v.sessionId === id && Date.now() - v.at < 90_000; };
  if (type === 'run' && data.run?.status === 'waiting' && data.run.pending && pushed.get(id) !== data.run.pending.id) {
    pushed.set(id, data.run.pending.id);
    pcNotify('needs', { title: titleOf(id), body: waitingLine(data.run.pending), session: id, tag: tag('n') }, looking);
  }
  if (type !== 'turn-end') return;
  setTimeout(() => {   // after planAuto, so a move to another profile is known
    const run = runs.get(id); if (!run || run.interrupted) return;
    if (run.stopped) {
      const a = autos.get(id), why = { limit: `Limit reached on ${run.profile}.`, auth: `Signed out of ${run.profile}.` }[run.stopped.reason] || 'Stopped: something went wrong.';
      pcNotify('stopped', { title: titleOf(id), body: a ? `${why} Moves to ${a.to} in ${Math.round(AUTO_WAIT / 60000)} min.` : why, session: id, tag: tag('s'), auto: a ? a.to : null }, looking);
    } else pcNotify('turn', { title: titleOf(id), body: lastAnswer(run) || 'Turn ended.', session: id, tag: tag('t') }, looking);
    const c = run.context, used = c?.used ?? c?.tokens;
    if (used && used >= prefs.handoff.offer && pushed.get('ctx:' + id) !== true) {
      pushed.set('ctx:' + id, true);
      pcNotify('context', { title: titleOf(id), body: `Context is at ${Math.round(used / 1000)}k. Continue in a new session to keep it quick.`, session: id, tag: tag('c') }, looking);
    }
  }, 50);
}
// At this PC a notification waits (prefs.pcHold), and is dropped if you handle it here meanwhile: you answer what it
// asks, or open its session; one about a limit, if you used the PC while it waited. Going away sends what waits.
const holds = new Map();   // tag -> { kind, msg, looking, session, pending, at, until }
let pcWas = null, pcSince = Date.now();
function pcNotify(kind, msg, looking = () => false) {
  if (!phone.wants(kind)) return;
  if (pc.now(prefs.awayMin).away || prefs.pcHold === 'now') return phone.notify(kind, msg, looking);
  if (prefs.pcHold === 'never') return;
  const old = holds.get(msg.tag); if (old) clearTimeout(old.timer);
  const r = msg.session && runs.get(msg.session);
  const h = { kind, msg, looking, session: msg.session || null, pending: kind === 'needs' ? r?.pending?.id ?? null : null, at: performance.now(), until: Date.now() + pc.HOLD_MS };
  h.timer = setTimeout(() => release(msg.tag), pc.HOLD_MS); h.timer.unref?.();
  holds.set(msg.tag, h); pushState();
}
function handled(h) {
  if (h.seen) return true;
  if (h.kind === 'needs') { const r = runs.get(h.session); return !(r?.status === 'waiting' && r.pending?.id === h.pending); }
  if (!h.session) { const p = pc.now(prefs.awayMin); return p.idle != null && p.idle * 1000 < performance.now() - h.at; }
  return false;
}
function release(tag) {
  const h = holds.get(tag); if (!h) return;
  holds.delete(tag); clearTimeout(h.timer);
  if (!handled(h)) phone.notify(h.kind, h.msg, h.looking);
  pushState();
}
// What a page shows marks what waits for that session as seen; away (or a hold no longer asked for) sends what waits.
function pcTick() {
  const p = pc.now(prefs.awayMin), seen = pc.viewing();
  for (const h of holds.values()) if (h.session && seen.has(h.session)) h.seen = true;
  if (p.away || prefs.pcHold !== 'wait') for (const tag of [...holds.keys()]) { if (prefs.pcHold === 'never' && !p.away) { clearTimeout(holds.get(tag).timer); holds.delete(tag); } else release(tag); }
  const k = p.away + p.why; if (k !== pcWas) { pcWas = k; pcSince = Date.now(); }
  pushState();
}
const pcState = () => { const p = pc.now(prefs.awayMin); return { away: p.away, why: p.why, since: pcSince, push: phone.wants(), hold: prefs.pcHold, awayMin: prefs.awayMin, holdMs: pc.HOLD_MS,
  held: [...holds.values()].map(h => ({ kind: h.kind, session: h.session, title: h.msg.title, until: h.until })) }; };
setInterval(pcTick, 3000).unref();

// A session's prompt cache about to go cold (its last ten minutes), once per reply: only sessions in the inbox, at rest.
function watchCaches() {
  if (!phone.isOn() || !prefs.cacheMinutes) return;
  for (const s of state.sessions) {
    const d = decorate(s), r = s.reply;
    if (d.done || d.status !== 'idle' || !r?.at) continue;
    const left = r.at + Math.min(prefs.cacheMinutes * 60, r.ttl || Infinity) * 1000 - Date.now();
    if (left > 0 && left <= 10 * 60_000 && pushed.get('cool:' + s.id) !== r.at) {
      pushed.set('cool:' + s.id, r.at);
      pcNotify('cool', { title: s.title, body: `Its cache cools in ${Math.max(1, Math.round(left / 60000))} min. A reply before then is cheaper.`, session: s.id, tag: 'c' + s.id.slice(0, 12) });
    }
  }
}
// A limit that cleared, or one getting near: told once per crossing.
function watchLimits() {
  if (!phone.isOn()) return;
  watchCaches();
  for (const p0 of state.profiles) {
    const p = withReadout(p0), h5 = p.h5 ?? null, d7 = p.d7 ?? null;
    if (h5 == null && d7 == null) continue;
    const full = (h5 ?? 0) >= 100 || (d7 ?? 0) >= 100, near = !full && Math.max(h5 ?? 0, d7 ?? 0) >= 80, was = limitSeen.get(p.name);
    limitSeen.set(p.name, { full, near });
    if (!was) continue;
    if (was.full && !full) pcNotify('cleared', { title: `${p.name} has room again`, body: `5h at ${Math.round(h5 ?? 0)}%. Sessions stopped by its limit can go on.`, tag: 'l' + p.name });
    else if (near && !was.near && !was.full) pcNotify('near', { title: `${p.name} is near its limit`, body: (h5 ?? 0) >= 80 ? `5h at ${Math.round(h5)}%.` : `7d at ${Math.round(d7)}%.`, tag: 'l' + p.name });
  }
}

// The app's own script, styles and the terminal's library. False for anything else.
async function serveStatic(res, url) {
  const name = path.basename(url.pathname);
  if (url.pathname === '/vendor/' + name && VENDOR[name]) {
    res.writeHead(200, { 'content-type': TYPES[path.extname(name)], 'cache-control': 'max-age=86400' });
    res.end(await fs.readFile(lib.resolve(VENDOR[name]))); return true;
  }
  if (url.pathname !== '/' + name || !['app.js', 'app.css'].includes(name)) return false;
  res.writeHead(200, { 'content-type': TYPES[path.extname(name)], 'cache-control': 'no-store' });
  res.end(await fs.readFile(path.join(UI, name))); return true;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    const host = (req.headers.host || '').split(':')[0];
    if (host !== '127.0.0.1' && host !== 'localhost') { res.writeHead(403); return res.end(); }
    if (url.pathname === '/serve' && req.method === 'POST') {   // `workwood serve`, from a session
      if (req.headers['x-workwood-serve'] !== SERVE_TOKEN) return send(res, 403, { error: 'Missing or wrong token.' });
      return send(res, 200, await serveCli(await body(req)));
    }
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
    if (!await serveStatic(res, url)) { res.writeHead(404); return res.end(); }
  } catch (e) {
    console.error('[workwood]', e);
    if (!res.headersSent) send(res, 500, { error: String(e.message || e).split('\n')[0] }); else res.end();
  }
});

// `workwood serve`: what it does in the folder it was run from, as text for the agent.
async function serveCli(b) {
  const cwd = typeof b.cwd === 'string' && path.isAbsolute(b.cwd) ? b.cwd : null;
  if (!cwd) return { ok: false, text: 'No folder given.' };
  const top = (await src.placeOf(cwd)).top, names = Array.isArray(b.names) ? b.names.map(String) : [];
  sv.watch(top); await srvChanged();
  // the agent that ran it: a turn working now in that folder
  let by = null;
  for (const [sid, r] of runs) if (r.status === 'working' && !by) { const s = state.sessions.find(x => x.id === sid), at = r.builder?.shellDir || s?.cwd; if (at && (await src.placeOf(at)).top === top) by = sid; }
  const where = s => s.ports.length ? s.ports.map(p => `http://localhost:${p}`).join(' ') : 'no port';
  const who = { workwood: 'started by Workwood', agent: 'started by an agent', you: 'started outside Workwood' };
  const list = () => (srvState[top]?.list || []).map(s => `${s.name}: ${s.state === 'exited' ? `exited (code ${s.code})` : where(s)} (${who[s.who]}${s.cmd ? ', ' + s.cmd : ''})`
    + s.kids.map(k => `\n  ${k.name}: ${k.ports.length ? k.ports.map(p => `http://localhost:${p}`).join(' ') : 'no port'}`).join(''));
  try {
    if (b.op === 'status') { const l = list(); return { text: l.length ? l.join('\n') : 'Nothing runs in ' + top + '.' }; }
    if (b.op === 'logs') {
      const s = srvState[top]?.list.find(x => x.name === names[0] && x.who === 'workwood');
      if (!s) return { ok: false, text: `Workwood did not start a server named ${names[0]} here, so it does not have its output.` };
      return { text: (sv.output(top, s.id) || '').split('\n').slice(-Math.max(1, Math.min(+b.lines || 100, 5000))).join('\n') || '(nothing printed yet)' };
    }
    if (b.op === 'stop') { const n = await sv.stopNamed(top, names.length ? names : null); await srvChanged(); return { text: n.length ? 'Stopped ' + n.join(', ') + '.' : 'Nothing to stop.' }; }
    if (b.op === 'restart') {
      const l = (srvState[top]?.list || []).filter(s => !names.length || names.includes(s.name) || s.lines?.some(n => names.includes(n)));
      for (const s of l) await sv.restart(top, s.id, by);
      if (!l.length) await sv.start(top, names.length ? names : null, by);
    } else if (b.op === 'start') await sv.start(top, names.length ? names : null, by);
    else return { ok: false, text: 'Unknown operation.' };
    const conf = await sv.confOf(top), want = names.length ? names : conf.lines.map(l => l.name);
    const up = await sv.ready(top, want);
    await srvChanged();
    const bad = up.filter(u => !u.ok);
    return { ok: !bad.length, text: up.map(u => `${u.name}: ${u.ok === true ? `up at http://localhost:${u.port}` : u.ok ? 'running' : u.code != null ? `exited with code ${u.code}` : `not listening on ${u.port} yet`}`).join('\n')
      + (bad.length ? `\n\nSee its output: workwood serve --logs ${bad[0].name}` : '') };
  } catch (e) { await srvChanged(); return { ok: false, text: e.message }; }
}

/** Starts the service and resolves with the address to open. */
export async function start(port = Number(process.env.WORKWOOD_PORT) || 0) {
  src.clearOldAttachments(); src.clearOldAttachments(30, PICTURE_ROOT); voice.prefer(prefs.speech);
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
  if (phone.isOn()) phoneUp();
  setInterval(watchLimits, 60000).unref();
  process.on('exit', closeAll); process.on('exit', speech.stop); process.on('exit', sv.stopAll);
  // Stopped by a signal (not the window, which quits through 'exit'): the servers Workwood started stop with it.
  if (!process.versions.electron) for (const sig of ['SIGTERM', 'SIGINT', 'SIGHUP']) process.once(sig, () => process.exit(0));
  sv.watchServers(srvChanged);
  src.addTurnEnv({ WORKWOOD_SERVE: `http://127.0.0.1:${server.address().port}/serve`, WORKWOOD_SERVE_TOKEN: SERVE_TOKEN,
    WORKWOOD_NODE: process.execPath, PATH: path.join(path.dirname(fileURLToPath(import.meta.url)), 'bin') + path.delimiter + (process.env.PATH || '') });
  return { address };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { address } = await start();
  console.log(`Workwood service running. Open: ${address}`);
  // Started by the Windows window: live exactly as long as it does.
  if (process.env.WORKWOOD_PARENT) { process.stdin.resume(); process.stdin.on('end', () => process.exit(0)); process.stdin.on('error', () => process.exit(0)); }
}
