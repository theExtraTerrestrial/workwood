// Reads what already exists on this machine: Claudius profiles and their usage,
// the shared pool of Claude Code sessions, and which sessions are live right now.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const run = promisify(execFile);
const HOME = os.homedir();
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

/** Profiles from Claudius, global one first. Usage that belongs to a window that has already reset counts as 0. */
export async function loadProfiles() {
  if (PLAIN) {
    let who = null; try { who = JSON.parse(await fs.readFile(path.join(HOME, '.claude.json'), 'utf8')).oauthAccount || null; } catch {}
    const name = String(who?.emailAddress || '').split('@')[0].replace(/[^\w.-]/g, '') || 'claude';
    return [{ name, global: true, account: who?.accountUuid || null, plan: null, lapsed: false, h5: null, d7: null, r5: null, r7: null }];
  }
  const list = await json('claudius', ['list', '--json']);
  if (!list) return null;
  const now = Date.now() / 1000;
  const out = [];
  for (const p of list) {
    let account = null;
    try { account = JSON.parse(await fs.readFile(path.join(PROFILE_ROOT, p.name, '.claude.json'), 'utf8')).oauthAccount?.accountUuid || null; } catch {}
    out.push({
      name: p.name, global: !!p.active, account, plan: p.sub || null, lapsed: !!p.expired,
      h5: p.r5 && p.r5 < now ? 0 : (p.u5 ?? null), d7: p.r7 && p.r7 < now ? 0 : (p.u7 ?? null),
      r5: p.r5 && p.r5 > now ? p.r5 : null, r7: p.r7 && p.r7 > now ? p.r7 : null,
    });
  }
  out.sort((a, b) => (b.global - a.global) || a.name.localeCompare(b.name));
  return out;
}

export async function loadNext() {
  if (PLAIN) return null;
  return (await read('claudius', ['next'], 15000))?.trim().split('\n').pop() || null;
}

// What a transcript says about its session: which account last ran it (the newest "session-owner" record)
// and the name it was given by hand, if any (the newest "custom-title" record, as Claude Code's /rename writes).
const metaCache = new Map(); // file -> {mts, account, title}
const OWNER = /"type":"session-owner","accountUuid":"([0-9a-f-]+)"/g;
const TITLE = /"type":"custom-title","customTitle":("(?:[^"\\]|\\.)*")/g;
async function metaOf(file, mts) {
  const hit = metaCache.get(file);
  if (hit && hit.mts === mts) return hit;
  let account = null, title = null;
  try {
    const fh = await fs.open(file, 'r');
    try {
      const { size } = await fh.stat();
      const find = async (pos, len) => {
        const buf = Buffer.alloc(len);
        const { bytesRead } = await fh.read(buf, 0, len, pos);
        const text = buf.toString('utf8', 0, bytesRead), last = re => { const all = [...text.matchAll(re)]; return all.length ? all[all.length - 1][1] : null; };
        return [last(OWNER), last(TITLE)];
      };
      const tail = Math.min(size, 512 * 1024);
      [account, title] = await find(size - tail, tail);
      if ((!account || !title) && size > tail) { const [a, t] = await find(0, Math.min(size, 256 * 1024)); account ||= a; title ||= t; }
    } finally { await fh.close(); }
  } catch {}
  try { title = title && (JSON.parse(title).trim() || null); } catch { title = null; }
  const meta = { mts, account, title };
  metaCache.set(file, meta);
  return meta;
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

/** The shared session pool as Claudius reports it, newest first. Slow part of loading; needs nothing else. */
export const loadSessionList = () => PLAIN ? scanSessions() : json('claudius', ['sessions', '--json', '--limit', '400'], 30000);

// The same list Claudius gives, read from the history folder: the newest 400 sessions, each with its folder,
// branch and first message. Only the start of each file is read.
const headCache = new Map();
async function headOf(file, mtimeMs) {
  const had = headCache.get(file);
  if (had && had.cwd && had.at === mtimeMs) return had;
  const out = { at: mtimeMs, cwd: null, branch: null, label: null };
  let fh;
  try {
    fh = await fs.open(file, 'r');
    const buf = Buffer.alloc(262144), { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    for (const line of buf.toString('utf8', 0, bytesRead).split('\n')) {
      if (!line.includes('"cwd"')) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      if (m.isSidechain) continue;
      if (!out.cwd && m.cwd) { out.cwd = m.cwd; out.branch = m.gitBranch || null; }
      if (!out.label && m.type === 'user' && !m.isMeta) {
        const c = m.message?.content, t = (typeof c === 'string' ? c : (c || []).find(b => b.type === 'text')?.text || '').trim();
        const cmd = /<command-name>(\/[^<\s]+)<\/command-name>/.exec(t);
        if (cmd && !/<local-command-stdout>/.test(t)) out.label = (cmd[1] + ' ' + (/<command-args>([\s\S]*?)<\/command-args>/.exec(t)?.[1] || '')).trim().split('\n')[0].slice(0, 80);
        else if (t && !/^(<|Caveat:|\[Request interrupted|This session is being continued)/.test(t)) out.label = t.split('\n')[0].slice(0, 80);
      }
      if (out.cwd && out.label) break;
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
    await Promise.all(names.filter(n => /^[0-9a-f-]{36}\.jsonl$/.test(n)).map(async n => {
      try { const st = await fs.stat(path.join(PROJECTS_ROOT, d.name, n)); files.push({ dirkey: d.name, id: n.slice(0, 36), mtimeMs: st.mtimeMs }); } catch {}
    }));
  }));
  files.sort((a, b) => b.mtimeMs - a.mtimeMs);
  const out = [];
  for (const f of files.slice(0, 400)) {
    const h = await headOf(path.join(PROJECTS_ROOT, f.dirkey, f.id + '.jsonl'), f.mtimeMs);
    if (!h.cwd) continue;
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
    const { account, title } = await metaOf(file, s.mts);
    return { id: s.id, title: title || s.label || 'Untitled session', cwd: s.cwd, project: path.basename(s.cwd),
      branch: s.branch && s.branch !== 'HEAD' ? s.branch : null, mts: s.mts, file, profile: byAccount.get(account) || fallback };
  }));
}

// The last list we showed, kept on disk so the next launch has something to draw at once.
const CACHE = path.join(HOME, '.cache', 'workwood', 'state.json');
const readJson = file => { try { return JSON.parse(fss.readFileSync(file, 'utf8')); } catch { return null; } };
async function writeJson(file, data) {
  try { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file + '.tmp', JSON.stringify(data)); await fs.rename(file + '.tmp', file); } catch {}
}
export const readCache = () => readJson(CACHE);
export const writeCache = data => writeJson(CACHE, data);

// What only Workwood knows and must not lose: which sessions you archived.
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

/** Folders offered in the project menu: ones with past sessions first, then the rest of ~/workspace. */
export async function loadProjects(sessions) {
  const seen = new Map();
  for (const s of sessions || []) if (!seen.has(s.cwd)) seen.set(s.cwd, { cwd: s.cwd, name: s.project, recent: true });
  try {
    for (const d of await fs.readdir(WORKSPACE, { withFileTypes: true })) {
      const cwd = path.join(WORKSPACE, d.name);
      if (d.isDirectory() && !d.name.startsWith('.') && !seen.has(cwd)) seen.set(cwd, { cwd, name: d.name, recent: false });
    }
  } catch {}
  return [...seen.values()];
}

export async function createProject(name) {
  if (!/^[\w][\w.-]{0,63}$/.test(name)) throw new Error('Use letters, digits, dots, dashes or underscores for the folder name.');
  const cwd = path.join(WORKSPACE, name);
  await fs.mkdir(cwd, { recursive: false });
  return { cwd, name, recent: false };
}

/** Environment for a session on a given profile. The global profile is simply ~/.claude. */
export async function envForProfile(profile, profiles) {
  const p = profiles.find(x => x.name === profile);
  if (!p || p.global) return cleanEnv();
  const dir = path.join(PROFILE_ROOT, profile);
  if (!fss.existsSync(path.join(dir, '.credentials.json'))) throw new Error(`Profile ${profile} has no saved sign-in.`);
  // Let Claudius renew the token and wire the shared history, exactly as `claudius run` would.
  try { await run('claudius', ['refresh', profile], { timeout: 30000, env: cleanEnv() }); } catch (e) { console.error('[workwood] claudius refresh:', String(e.message).split('\n')[0]); }
  try { await run('claudius', ['link', profile], { timeout: 30000, env: cleanEnv() }); } catch (e) { console.error('[workwood] claudius link:', String(e.message).split('\n')[0]); }
  return cleanEnv({ CLAUDE_CONFIG_DIR: dir });
}

// What a session gets when you choose nothing: the model and effort from Claude Code's own settings,
// the project's over the profile's, as Claude Code reads them. Null where no setting says.
const ALIAS = { fable: 'claude-fable-5-2', opus: 'claude-opus-5-5', sonnet: 'claude-sonnet-5-5', haiku: 'claude-haiku-5-5' };
export async function defaultsFor(cwd, profile, profiles) {
  const p = profiles.find(x => x.name === profile), home = !p || p.global ? path.join(HOME, '.claude') : path.join(PROFILE_ROOT, profile);
  const files = [path.join(home, 'settings.json'), ...(cwd ? [path.join(cwd, '.claude', 'settings.json'), path.join(cwd, '.claude', 'settings.local.json')] : [])];
  let model = null, effort = null;
  for (const f of files) {
    let s; try { s = JSON.parse(await fs.readFile(f, 'utf8')); } catch { continue; }
    if (typeof s.model === 'string' && s.model) model = s.model;
    if (typeof s.effortLevel === 'string' && s.effortLevel) effort = s.effortLevel;
  }
  const m = model && /^([a-z]+)(\[1m\])?$/i.exec(model);
  if (m && ALIAS[m[1].toLowerCase()]) model = ALIAS[m[1].toLowerCase()] + (m[2] || '');
  return { model, effort };
}

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
export async function clearOldAttachments(days = 30) {
  await fs.mkdir(ATTACH_ROOT, { recursive: true }).catch(() => {});
  let names; try { names = await fs.readdir(ATTACH_ROOT); } catch { return; }
  for (const n of names) { const d = path.join(ATTACH_ROOT, n); try { if (Date.now() - (await fs.stat(d)).mtimeMs > days * 864e5) await fs.rm(d, { recursive: true, force: true }); } catch {} }
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
