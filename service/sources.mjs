// Reads what already exists on this machine: the profiles and their usage (kept as Claudius keeps them),
// the shared pool of Claude Code sessions, and which sessions are live right now.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import * as prof from './profiles.mjs';
import { readCreds } from './oauth.mjs';

const run = promisify(execFile);
export const HOME = os.homedir();
export const PROFILE_ROOT = path.join(HOME, '.claude-profiles');
export const PROJECTS_ROOT = path.join(HOME, '.claude', 'projects');
export const WORKSPACE = process.env.WORKWOOD_WORKSPACE || path.join(HOME, 'workspace');
// Without Claudius (always so on Windows) there is one account, the one Claude Code itself is signed in to,
// and the session list is read straight from Claude Code's history.
export const PLAIN = process.platform === 'win32' || process.env.WORKWOOD_PLAIN === '1';
const WIN = process.platform === 'win32';
let CLAUDE = 'claude';   // set by claudePath(); on Windows Claude Code is often not on the PATH

// Variables that describe the Claude Code session this service may have been
// started from. A session we start must not inherit them.
const SESSION_VARS = ['CLAUDECODE', 'CLAUDE_PID', 'CLAUDE_EFFORT', 'CLAUDE_CODE_CHILD_SESSION', 'CLAUDE_CODE_SESSION_ID',
  'CLAUDE_CODE_MESSAGING_SOCKET', 'CLAUDE_CODE_MESSAGING_TOKEN', 'CLAUDE_CODE_SESSION_ATTENDED', 'CLAUDE_CODE_SSE_PORT',
  'CLAUDE_CODE_ENTRYPOINT', 'CLAUDE_CODE_EXECPATH', 'CLAUDE_CONFIG_DIR'];
export function cleanEnv(extra = {}) {
  const env = { ...process.env };
  for (const k of SESSION_VARS) delete env[k];
  return { ...env, ...extra };
}

// Runs a command and returns what it printed, or null. Two Claudius commands running at the same moment can
// collide while tidying a profile's files (both use the same temporary file name), and the loser exits with
// an error although nothing is wrong. So a failed read is tried once more before it counts as failed.
async function read(cmd, args, timeout = 20000) {
  for (let attempt = 1; ; attempt++) {
    try { return (await run(cmd, args, { timeout, maxBuffer: 64 * 1024 * 1024, env: cleanEnv() })).stdout; }
    catch (e) {
      const why = String(e.stderr || e.message).trim().split('\n')[0];
      if (attempt === 2 || e.killed) { console.error(`[workwood] ${cmd} ${args.join(' ')} failed: ${why}`); return null; }
      await new Promise(r => setTimeout(r, 150));
    }
  }
}
async function json(cmd, args, timeout) {
  const out = await read(cmd, args, timeout);
  try { return out == null ? null : JSON.parse(out); } catch { console.error(`[workwood] ${cmd} ${args.join(' ')} printed something unreadable`); return null; }
}

/** The profiles, global one first. Usage that belongs to a window that has already reset counts as 0. */
export async function loadProfiles() {
  if (PLAIN) {
    let who = null; try { who = JSON.parse(await fs.readFile(path.join(HOME, '.claude.json'), 'utf8')).oauthAccount || null; } catch {}
    const name = String(who?.emailAddress || '').split('@')[0].replace(/[^\w.-]/g, '') || 'claude';
    return [{ name, global: true, account: who?.accountUuid || null, email: who?.emailAddress || '', org: who?.organizationName || '', plan: null, lapsed: false, h5: null, d7: null, r5: null, r7: null, at: null }];
  }
  const list = await prof.list();
  const now = Date.now() / 1000;
  const out = [];
  for (const p of list) {
    out.push({
      name: p.name, global: !!p.active, account: p.account, email: p.email || '', org: p.org || '', plan: p.sub || null, lapsed: !!p.expired,
      h5: p.r5 && p.r5 < now ? 0 : (p.u5 ?? null), d7: p.r7 && p.r7 < now ? 0 : (p.u7 ?? null),
      r5: p.r5 && p.r5 > now ? p.r5 : null, r7: p.r7 && p.r7 > now ? p.r7 : null, at: p.uts || null,
    });
  }
  out.sort((a, b) => (b.global - a.global) || a.name.localeCompare(b.name));
  return out;
}

export async function loadNext() {
  if (PLAIN) return null;
  return prof.next(await prof.list());
}

// What a transcript says about its session: which account last ran it (the newest "session-owner" record)
// and the name it was given by hand, if any (the newest "custom-title" record, as Claude Code's /rename writes),
// and when its last reply was and for how long that reply's prompt cache is kept. The file's own time is no guide to
// that: Claude Code adds bookkeeping lines to it (cost-state and the like) when a session is only opened.
const metaCache = new Map(); // file -> {mts, account, title, reply}
const OWNER = /"type":"session-owner","accountUuid":"([0-9a-f-]+)"/g;
const TITLE = /"type":"custom-title","customTitle":("(?:[^"\\]|\\.)*")/g;
async function metaOf(file, mts) {
  const hit = metaCache.get(file);
  if (hit && hit.mts === mts) return hit;
  let account = null, title = null, reply = null;
  try {
    const fh = await fs.open(file, 'r');
    try {
      const { size } = await fh.stat();
      const find = async (pos, len) => {
        const buf = Buffer.alloc(len);
        const { bytesRead } = await fh.read(buf, 0, len, pos);
        const text = buf.toString('utf8', 0, bytesRead), last = re => { const all = [...text.matchAll(re)]; return all.length ? all[all.length - 1][1] : null; };
        return [last(OWNER), last(TITLE), text];
      };
      const tail = Math.min(size, 512 * 1024);
      let text;
      [account, title, text] = await find(size - tail, tail);
      reply = lastReply(text);
      if ((!account || !title) && size > tail) { const [a, t] = await find(0, Math.min(size, 256 * 1024)); account ||= a; title ||= t; }
    } finally { await fh.close(); }
  } catch {}
  try { title = title && (JSON.parse(title).trim() || null); } catch { title = null; }
  const meta = { mts, account, title, reply };
  metaCache.set(file, meta);
  return meta;
}

// The newest reply that used the prompt cache: when it came, and the kind of cache last written (1 h or 5 min), which
// a reply that only read the cache keeps for the same time again.
export function lastReply(text) {
  const lines = text.split('\n');
  let at = null;
  for (let i = lines.length - 1; i >= 0; i--) {
    const l = lines[i];
    if (!l.includes('"type":"assistant"') || !l.includes('"usage"')) continue;
    let o; try { o = JSON.parse(l); } catch { continue; }
    const u = o.message?.usage, t = Date.parse(o.timestamp);
    if (!u || !t || o.isSidechain) continue;
    at ??= t;
    const c = u.cache_creation || {};
    if (c.ephemeral_1h_input_tokens > 0) return { at, ttl: 3600 };
    if (c.ephemeral_5m_input_tokens > 0) return { at, ttl: 300 };
  }
  return at ? { at } : null;
}

/** Names a session the way Claude Code's own /rename does, so the name shows everywhere the session does. */
export async function renameSession(file, id, title) {
  const st = await fs.stat(file);
  await fs.appendFile(file, JSON.stringify({ type: 'custom-title', customTitle: title, sessionId: id }) + '\n');
  await fs.utimes(file, st.atime, st.mtime).catch(() => {}); // a new name is not new activity: keep its place in the list
  metaCache.delete(file);
}

/** Removes a session's history from this machine: its transcript and the folder of its subagents' transcripts. */
export async function deleteSession(file, id) {
  if (!/^[0-9a-f-]{36}$/.test(id) || path.basename(file) !== id + '.jsonl') throw new Error('That is not a session file.');
  const root = await fs.realpath(PROJECTS_ROOT), dir = await fs.realpath(path.dirname(file));
  if (path.dirname(dir) !== root) throw new Error('That session is not in the shared history.');
  await fs.rm(path.join(dir, id + '.jsonl'));
  await fs.rm(path.join(dir, id), { recursive: true, force: true });
  metaCache.delete(file);
}

/** The shared session pool, newest first. Slow part of loading; needs nothing else. */
export const loadSessionList = () => scanSessions();

// The list `claudius sessions` gives, read from the history folder the same way: the newest 400 sessions, each with
// the folder to resume it in, its branch and a name. Only the start of each file and its last 64 KB are read.
const headCache = new Map();
async function headObjs(fh, want = 120) {   // the first complete lines, until the opening user turn has been answered
  const out = []; let pos = 0, rest = '';
  while (pos < 8 * 1048576) {
    const buf = Buffer.alloc(262144), { bytesRead } = await fh.read(buf, 0, buf.length, pos);
    if (!bytesRead) break;
    pos += bytesRead;
    const lines = (rest + buf.toString('utf8', 0, bytesRead)).split('\n'); rest = lines.pop();
    for (const line of lines) {
      if (line.length > 1e6) continue;   // file-history snapshots: megabytes, and never what we are looking for
      let o; try { o = JSON.parse(line); } catch { continue; }
      out.push(o);
      if (out.length >= want || (o.type === 'assistant' && out.some(h => h.type === 'user'))) return out;
    }
  }
  if (rest) try { out.push(JSON.parse(rest)); } catch {}
  return out;
}
async function tailObjs(fh, size) {
  const len = Math.min(size, 65536), buf = Buffer.alloc(len);
  await fh.read(buf, 0, len, size - len);
  const lines = buf.toString('utf8').split('\n').filter(Boolean);
  if (size > 65536 && lines.length > 1) lines.shift();   // half a line
  return lines.reverse().map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean);
}
const pick = (objs, key) => { for (const o of objs) if (typeof o[key] === 'string' && o[key]) return o[key]; return null; };
const msgText = o => { const c = o.message?.content; return typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b?.type === 'text').map(b => b.text).filter(Boolean).join(' ') : null; };
const WRAPPER = /^\s*<\/?(?:local-command-caveat|local-command-stdout|local-command-stderr|system-reminder|user-prompt-submit-hook|ide[_-][a-z]+)[\s>/]/;
function firstPrompt(objs) {   // [what the conversation opened with, or a slash command if that is all there is]
  let prose = null, cmd = null;
  for (const o of objs) {
    if (o.type !== 'user' || o.isMeta === true || o.message?.role !== 'user') continue;
    const t = msgText(o); if (!t || !t.trim()) continue;
    const m = /<command-name>\s*([^<]{1,60}?)\s*<\/command-name>/.exec(t);
    if (m) { if (!cmd) { const a = (/<command-args>\s*([^<]{0,80}?)\s*<\/command-args>/.exec(t)?.[1] || '').trim(); cmd = a ? `${m[1].trim()} ${a}` : m[1].trim(); } continue; }
    if (WRAPPER.test(t)) continue;
    prose = t; break;
  }
  return [prose, cmd];
}
function labelOf(head, tail) {   // Claude Code's title for it, else its slug, the opening prompt, the last prompt, a command
  const [prose, cmd] = firstPrompt(head);
  const c = [[pick(tail, 'aiTitle') || pick(head, 'aiTitle'), 'title'], [pick(tail, 'slug') || pick(head, 'slug'), 'slug'], [prose, 'prompt'],
    [pick(tail, 'lastPrompt') || pick(head, 'lastPrompt'), 'last'], [cmd, 'command']].find(([v]) => typeof v === 'string' && v.trim());
  if (!c) return null;
  let t = c[0].replace(/[\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
  if (c[1] === 'slug' && /^[a-z0-9-]+$/.test(t)) t = t.replace(/-/g, ' ');
  return !t ? null : t.length > 72 ? t.slice(0, 71) + '…' : t;
}
/** What a session opened with, as you wrote it: null for one not read yet, or one that opened with a command. */
export const openingPrompt = file => headCache.get(file)?.prompt || null;
async function headOf(file, mtimeMs, dirkey) {
  const had = headCache.get(file);
  if (had && had.at === mtimeMs) return had;
  const out = { at: mtimeMs, cwd: null, branch: null, label: null, side: false };
  let fh;
  try {
    fh = await fs.open(file, 'r');
    const head = await headObjs(fh);
    if (head.length) {
      out.side = head.some(o => o.isSidechain === true);   // a subagent's transcript is not a session to resume
      const tail = await tailObjs(fh, (await fh.stat()).size);
      // The folder to resume in is the one Claude Code filed the session under: every character of its path
      // that is not a letter or digit became '-'. A session moves while it runs (into a worktree, a subfolder),
      // so neither its first nor its last folder is reliably that one.
      const cands = [...new Set([...head, ...tail].map(o => o.cwd).filter(Boolean))];
      out.cwd = cands.find(c => c.replace(/[^a-zA-Z0-9]/g, '-') === dirkey) || cands[0] || null;
      out.branch = pick([...tail, ...head], 'gitBranch');
      out.label = labelOf(head, tail);
      out.prompt = firstPrompt(head)[0];
    }
  } catch {} finally { await fh?.close().catch(() => {}); }
  headCache.set(file, out);
  return out;
}
async function scanSessions() {
  let dirs; try { dirs = await fs.readdir(PROJECTS_ROOT, { withFileTypes: true }); } catch { return []; }
  const files = [];
  await Promise.all(dirs.filter(d => d.isDirectory()).map(async d => {
    let names; try { names = await fs.readdir(path.join(PROJECTS_ROOT, d.name)); } catch { return; }
    await Promise.all(names.filter(n => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.jsonl$/.test(n)).map(async n => {
      try { const st = await fs.stat(path.join(PROJECTS_ROOT, d.name, n)); files.push({ dirkey: d.name, id: n.slice(0, 36), mtimeMs: st.mtimeMs }); } catch {}
    }));
  }));
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const out = [];
  for (const f of files.slice(0, 400)) {
    const h = await headOf(path.join(PROJECTS_ROOT, f.dirkey, f.id + '.jsonl'), f.mtimeMs, f.dirkey);
    if (!h.cwd || h.side) continue;
    out.push({ id: f.id, dirkey: f.dirkey, cwd: h.cwd, branch: h.branch, label: h.label, mts: Math.floor(f.mtimeMs / 1000), exists: fss.existsSync(h.cwd) });
  }
  return out;
}

/** Tags each session with the profile that last ran it. */
export async function tagSessions(list, profiles) {
  if (!list) return null;
  const byAccount = new Map(profiles.filter(p => p.account).map(p => [p.account, p.name]));
  const fallback = (profiles.find(p => p.global) || profiles[0])?.name || null;
  const keep = list.filter(s => s.exists && !/[\\/]scratchpad[\\/]/.test(s.cwd)); // folders that are gone, and throwaway test runs
  return Promise.all(keep.map(async s => {
    const file = path.join(PROJECTS_ROOT, s.dirkey, s.id + '.jsonl');
    const { account, title, reply } = await metaOf(file, s.mts);
    const place = await placeOf(s.cwd);   // a session in a worktree belongs to the project the worktree was made from
    return { id: s.id, title: title || s.label || 'Untitled session', cwd: s.cwd, project: path.basename(place.root), root: place.root,
      branch: s.branch && s.branch !== 'HEAD' ? s.branch : null, mts: s.mts, ...(reply ? { reply } : {}), file, profile: byAccount.get(account) || fallback };
  }));
}

// Where a folder sits in git: the main checkout it belongs to, the worktree's name when it is one, and the branch
// checked out right now, and the top of this checkout (the worktree's own folder in a worktree). Read from the files
// git keeps; no git command is run.
const placeCache = new Map();
export async function placeOf(cwd) {
  const had = placeCache.get(cwd);
  if (had && Date.now() - had.at < 4000) return had.v;
  const v = { root: cwd, worktree: null, branch: null, top: cwd };
  try {
    let dir = cwd, dot = null;
    for (let i = 0; i < 8 && !dot; i++) {
      try { await fs.stat(path.join(dir, '.git')); dot = path.join(dir, '.git'); } catch { const up = path.dirname(dir); if (up === dir) break; dir = up; }
    }
    if (dot) {
      v.top = dir;
      let gitdir = dot;
      if ((await fs.stat(dot)).isFile()) {
        const m = /^gitdir:\s*(.+)$/m.exec(await fs.readFile(dot, 'utf8'));
        if (m) {
          gitdir = path.resolve(dir, m[1].trim());
          const w = /^(.*)[\\/]\.git[\\/]worktrees[\\/]([^\\/]+)$/.exec(gitdir);
          if (w) { v.root = w[1]; v.worktree = path.basename(dir); }
        }
      }
      const head = (await fs.readFile(path.join(gitdir, 'HEAD'), 'utf8')).trim(), b = /^ref:\s*refs\/heads\/(.+)$/.exec(head);
      v.branch = b ? b[1] : head.slice(0, 7);
    }
  } catch {}
  placeCache.set(cwd, { at: Date.now(), v });
  return v;
}
// The folder a session is working in now. An agent may have moved into a worktree after it started, so this is
// read from the end of its history, not the beginning.
export async function lastCwd(file, fallback) {
  let fh;
  try {
    fh = await fs.open(file, 'r');
    const { size } = await fh.stat(), len = Math.min(size, 131072), buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, size - len);
    const lines = buf.toString('utf8').split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (!lines[i].includes('"cwd"')) continue;
      try { const m = JSON.parse(lines[i]); if (m.cwd && !m.isSidechain) return m.cwd; } catch {}
    }
  } catch {} finally { await fh?.close().catch(() => {}); }
  return fallback;
}

// The last list we showed, kept on disk so the next launch has something to draw at once.
const CACHE = path.join(HOME, '.cache', 'workwood', 'state.json');
const readJson = file => { try { return JSON.parse(fss.readFileSync(file, 'utf8')); } catch { return null; } };
async function writeJson(file, data) {
  try { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file + '.tmp', JSON.stringify(data)); await fs.rename(file + '.tmp', file); } catch {}
}
export const readCache = () => readJson(CACHE);
export const writeCache = data => writeJson(CACHE, data);

// What only Workwood knows and must not lose: which sessions are yours here, which are done, and your settings.
const KEPT = path.join(HOME, '.config', 'workwood', 'state.json');
export const readKept = () => readJson(KEPT) || {};
export const writeKept = data => writeJson(KEPT, data);

/** Opens a terminal window in `cwd` running `argv`. Resolves once the terminal has been started. */
export function openTerminal(cwd, argv) {
  const line = argv.map(a => /^[\w@%+=:,./-]+$/.test(a) ? a : `'${a.replace(/'/g, `'\\''`)}'`).join(' ');
  let cmd, args;
  if (WIN && argv[0] === 'claude') argv = [CLAUDE, ...argv.slice(1)];
  if (process.env.WORKWOOD_TERMINAL) { cmd = process.env.WORKWOOD_TERMINAL; args = [cwd, ...argv]; }             // your own launcher
  else if (WIN) { cmd = 'wt.exe'; args = ['-w', '0', 'nt', '-d', cwd, ...argv]; }                                 // a new Windows Terminal tab
  else if (process.env.WSL_DISTRO_NAME) { cmd = 'wt.exe'; args = ['-w', '0', 'nt', 'wsl.exe', '-d', process.env.WSL_DISTRO_NAME, '--cd', cwd, '--', 'bash', '-lic', line]; } // a new Windows Terminal tab
  else if (process.platform === 'darwin') { cmd = 'osascript'; args = ['-e', `tell application "Terminal" to do script ${JSON.stringify(`cd ${JSON.stringify(cwd)} && ${line}`)}`, '-e', 'tell application "Terminal" to activate']; }
  else { cmd = 'x-terminal-emulator'; args = ['-e', 'bash', '-lic', `cd ${JSON.stringify(cwd)} && ${line}`]; }
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { detached: true, stdio: 'ignore', env: cleanEnv(), cwd: HOME });
    child.on('error', () => reject(new Error(`Could not open a terminal (${cmd} did not start).`)));
    child.on('spawn', () => { child.unref(); resolve(); });
  });
}

/** Sessions that are running somewhere right now, in this app or in any terminal. */
export async function loadLive() {
  const list = await json(CLAUDE, ['agents', '--json'], 15000);
  const map = new Map();
  for (const a of list || []) if (a.sessionId) map.set(a.sessionId, { kind: a.kind, status: a.status, waitingFor: a.waitingFor || null });
  return map;
}

/** Folders offered in the project menu: ones with past sessions first, then what is inside your project folders. */
export async function loadProjects(sessions, folders = [WORKSPACE]) {
  const seen = new Map();
  for (const s of sessions || []) if (!seen.has(s.cwd)) seen.set(s.cwd, { cwd: s.cwd, name: path.basename(s.cwd), recent: true });
  for (const folder of folders) {
    try {
      for (const d of await fs.readdir(folder, { withFileTypes: true })) {
        const cwd = path.join(folder, d.name);
        if (d.isDirectory() && !d.name.startsWith('.') && !d.name.startsWith('$') && !seen.has(cwd)) seen.set(cwd, { cwd, name: d.name, recent: false });
      }
    } catch {}
  }
  return [...seen.values()];
}

/** Checks the project folders typed into the settings dialog; returns them tidied, or throws naming the one that is wrong. */
export async function checkFolders(list) {
  const out = [];
  for (const raw of Array.isArray(list) ? list.slice(0, 12) : []) {
    let f = String(raw || '').trim().replace(/^~(?=$|[\\/])/, HOME);
    if (!f) continue;
    if (!WIN) f = fromWindows(f);   // a folder picked in the Windows window while it shows the WSL side
    if (!path.isAbsolute(f)) throw new Error(`"${raw}" is not a full path.`);
    f = path.resolve(f);
    let st; try { st = await fs.stat(f); } catch {}
    if (!st?.isDirectory()) throw new Error(`There is no folder at ${f}.`);
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

export async function createProject(name, folder = WORKSPACE) {
  if (!/^[\w][\w.-]{0,63}$/.test(name)) throw new Error('Use letters, digits, dots, dashes or underscores for the folder name.');
  const cwd = path.join(folder, name);
  await fs.mkdir(cwd, { recursive: false });
  return { cwd, name, recent: false };
}

let version;   // Claude Code's, read once
/** Environment for a session on a given profile. The global profile is simply ~/.claude. */
export async function envForProfile(profile, profiles) {
  const p = profiles.find(x => x.name === profile);
  if (!p || p.global) return cleanEnv();
  const dir = path.join(PROFILE_ROOT, profile);
  if (!(await readCreds(dir))?.claudeAiOauth) throw new Error(`Profile ${profile} has no saved sign-in.`);
  // Wire the shared history, as `claudius run` would, and bring a copy of the live sign-in up to date. A lapsed
  // token is left for Claude Code to renew when it starts: it takes the same renewal lock as Workwood and Claudius.
  try { await prof.link(profile, version ??= await claudeVersion(CLAUDE)); } catch (e) { console.error('[workwood] link:', String(e.message).split('\n')[0]); }
  await prof.adoptLive(p);
  return cleanEnv({ CLAUDE_CONFIG_DIR: dir });
}

// What a session gets when you choose nothing: the model, effort and permission mode from Claude Code's own settings,
// the project's over the profile's, as Claude Code reads them. Null where no setting says.
const ALIAS = { fable: 'claude-fable-5-2', opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' };
const homeOf = (profile, profiles) => { const p = profiles.find(x => x.name === profile); return !p || p.global ? path.join(HOME, '.claude') : path.join(PROFILE_ROOT, profile); };
export async function defaultsFor(cwd, profile, profiles) {
  const own = path.join(homeOf(profile, profiles), 'settings.json');
  const files = [own, ...(cwd ? [path.join(cwd, '.claude', 'settings.json'), path.join(cwd, '.claude', 'settings.local.json')] : [])];
  let model = null, effort = null, mode = null, bad = null;
  for (const f of files) {
    let s; try { s = JSON.parse(await fs.readFile(f, 'utf8')); } catch (e) { if (f === own && e.code !== 'ENOENT') bad = own; continue; }
    if (typeof s.model === 'string' && s.model) model = s.model;
    if (typeof s.effortLevel === 'string' && s.effortLevel) effort = s.effortLevel;
    if (typeof s.permissions?.defaultMode === 'string' && MODES.includes(s.permissions.defaultMode)) mode = s.permissions.defaultMode;
  }
  const m = model && /^([a-z]+)(\[1m\])?$/i.exec(model);
  if (m && ALIAS[m[1].toLowerCase()]) model = ALIAS[m[1].toLowerCase()] + (m[2] || '');
  return { model, effort, mode, ...(bad ? { bad } : {}) };
}

export const MODES = ['default', 'acceptEdits', 'plan', 'auto', 'bypassPermissions'];

export const MODELS = Object.values(ALIAS), EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];
/**
 * A profile's own Claude Code defaults, in its settings.json: `model`, `effortLevel` and `permissions.defaultMode`.
 * A key given as null or '' is taken out, so Claude Code picks again. Keys not given are left alone.
 */
export async function setProfileDefaults(profile, profiles, { model, effort, mode } = {}) {
  if (mode !== undefined && mode && !MODES.includes(mode)) throw new Error('No such mode.');
  if (model !== undefined && model && !MODELS.includes(String(model).replace(/\[1m\]$/, ''))) throw new Error('No such model.');
  if (effort !== undefined && effort && !EFFORTS.includes(effort)) throw new Error('No such effort.');
  const home = homeOf(profile, profiles), file = path.join(home, 'settings.json');
  let s = {};
  try { s = JSON.parse(await fs.readFile(file, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') throw new Error('That profile\'s settings.json could not be read.'); }
  if (model !== undefined) { if (model) s.model = model; else delete s.model; }
  if (effort !== undefined) { if (effort) s.effortLevel = effort; else delete s.effortLevel; }
  if (mode !== undefined) {
    if (mode) s.permissions = { ...(s.permissions || {}), defaultMode: mode };
    else if (s.permissions) { delete s.permissions.defaultMode; if (!Object.keys(s.permissions).length) delete s.permissions; }
  }
  await fs.mkdir(home, { recursive: true });
  // a linked settings file is written where it really lives, with the permissions it had
  let real = file, perm = 0o600;
  try { real = await fs.realpath(file); perm = (await fs.stat(real)).mode & 0o777; } catch {}
  const tmp = real + '.workwood-' + process.pid;
  await fs.writeFile(tmp, JSON.stringify(s, null, 2) + '\n', { mode: perm });
  await fs.rename(tmp, real);
}
export const setDefaultMode = (profile, profiles, mode) => setProfileDefaults(profile, profiles, { mode });

// Attachments. A file that is already on disk is named by its own path, never copied; one that is not (a paste,
// or a window that cannot tell where a file lives) is saved outside the project. Either way the message lists the
// paths, so the agent reads a file when it needs to. Pictures are also sent as pictures. Old copies are cleared
// at start-up.
// The Windows window names files the Windows way; here they are reached through /mnt/<drive> or directly.
export function fromWindows(p) {
  let m = /^([A-Za-z]):[\\/](.*)$/.exec(p);
  if (m) return `/mnt/${m[1].toLowerCase()}/${m[2].replace(/\\/g, '/')}`;
  m = /^\\\\wsl(?:\.localhost|\$)\\[^\\]+\\(.*)$/i.exec(p);
  return m ? '/' + m[1].replace(/\\/g, '/') : p;
}
export const ATTACH_ROOT = path.join(HOME, '.cache', 'workwood', 'attachments');
const PICTURES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);
export async function takeAttachments(text, list) {
  text = String(text || '').trim();
  if (!Array.isArray(list) || !list.length) return text;
  if (list.length > 10) throw new Error('Attach at most 10 files at a time.');
  const images = [], files = [], dir = path.join(ATTACH_ROOT, randomUUID());
  for (const a of list) {
    if (a?.path) {                                          // already on disk: point at it
      const p = WIN ? String(a.path) : fromWindows(String(a.path));
      let st; try { st = await fs.stat(p); } catch {}
      if (!path.isAbsolute(p) || !st?.isFile()) throw new Error(`${a.name || p} could not be found.`);
      files.push(p);
      if (PICTURES.has(a.type) && st.size <= 3.7e6) images.push({ type: 'image', source: { type: 'base64', media_type: a.type, data: (await fs.readFile(p)).toString('base64') } });
      continue;
    }
    const buf = Buffer.from(String(a?.data || ''), 'base64');
    if (!buf.length) continue;
    if (buf.length > 20e6) throw new Error(`${a.name} is larger than 20 MB.`);
    if (PICTURES.has(a.type) && buf.length <= 3.7e6) { images.push({ type: 'image', source: { type: 'base64', media_type: a.type, data: buf.toString('base64') } }); continue; }
    let name = path.basename(String(a.name || 'file')).replace(/[^\w.\- ()]/g, '_').slice(0, 120) || 'file';
    while (files.some(f => path.basename(f) === name)) name = '_' + name;
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buf);
    files.push(path.join(dir, name));
  }
  if (files.length) text += (text ? '\n\n' : '') + 'Attached files:\n' + files.map(f => '- ' + f).join('\n');
  return images.length ? [...(text ? [{ type: 'text', text }] : []), ...images] : text;
}
// Also used for the pictures kept from messages: one gone is written again the next time its transcript is read.
export async function clearOldAttachments(days = 30, root = ATTACH_ROOT) {
  await fs.mkdir(root, { recursive: true }).catch(() => {});
  let names; try { names = await fs.readdir(root); } catch { return; }
  for (const n of names) { const d = path.join(root, n); try { if (Date.now() - (await fs.stat(d)).mtimeMs > days * 864e5) await fs.rm(d, { recursive: true, force: true }); } catch {} }
}

// Where each command comes from, for the skills list. Claude Code marks its own; a "plugin:name" is a plugin's;
// the rest are found on disk in the project or, failing that, are the user's own (including ones synced from claude.ai).
const HIDE = new Set(['color', 'focus', 'heapdump', 'workflow-launch-exec']);   // only mean something in a terminal
export function configDir(profile, profiles) {
  const p = profiles.find(x => x.name === profile);
  return !p || p.global ? path.join(HOME, '.claude') : path.join(PROFILE_ROOT, profile);
}
export function labelSkills(list, cwd) {
  const inProject = n => fss.existsSync(path.join(cwd, '.claude', 'skills', n, 'SKILL.md')) || fss.existsSync(path.join(cwd, '.claude', 'commands', n + '.md'));
  const seen = new Set(), out = [];
  for (const c of list || []) {
    const name = String(c?.name || ''), about = String(c?.description || '').replace(/\s+/g, ' ').trim();
    if (!name || seen.has(name) || name.startsWith('_') || HIDE.has(name) || /^(\(removed\)|Renamed to )/.test(about)) continue;
    seen.add(name);
    out.push({ name, about: about.replace(/^\([\w-]+\) /, '').replace(/ \((user|project|claude\.ai sync)\)$/, ''), hint: String(c.argumentHint || ''),
      from: c.builtin ? 'Built in' : name.includes(':') ? 'Plugin' : inProject(name) ? 'Project' : 'Yours' });
  }
  const order = ['Project', 'Yours', 'Plugin', 'Built in'];
  return out.sort((a, b) => order.indexOf(a.from) - order.indexOf(b.from) || (a.name < b.name ? -1 : 1));
}

export async function claudeVersion(file) {
  try { const { stdout } = await run(file || 'claude', ['--version'], { timeout: 10000, env: cleanEnv() }); return stdout.trim().split(' ')[0] || null; } catch { return null; }
}
export async function claudePath() {
  if (WIN) {
    let found = null; try { found = (await run('where', ['claude'])).stdout.split(/\r?\n/).find(l => /\.(exe|cmd)$/i.test(l.trim()))?.trim() || null; } catch {}
    if (!found) { const usual = path.join(HOME, '.local', 'bin', 'claude.exe'); if (fss.existsSync(usual)) found = usual; }
    if (found) CLAUDE = found;
    return found || undefined;
  }
  try { const { stdout } = await run('which', ['claude']); const found = stdout.trim(); if (found) CLAUDE = found; return found || undefined; } catch { return undefined; }
}
