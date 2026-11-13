// Reads what already exists on this machine: Claudius profiles and their usage,
// the shared pool of Claude Code sessions, and which sessions are live right now.
import { execFile, spawn } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs/promises';
import fss from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const run = promisify(execFile);
const HOME = os.homedir();
export const PROFILE_ROOT = path.join(HOME, '.claude-profiles');
export const PROJECTS_ROOT = path.join(HOME, '.claude', 'projects');
export const WORKSPACE = path.join(HOME, 'workspace');

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
  const list = await json('claudius', ['list', '--json']);
  if (!list) return null;
  const now = Date.now() / 1000;
  const out = [];
  for (const p of list) {
    let account = null;
    try { account = JSON.parse(await fs.readFile(path.join(PROFILE_ROOT, p.name, '.claude.json'), 'utf8')).oauthAccount?.accountUuid || null; } catch {}
    out.push({
      name: p.name, global: !!p.active, account,
      h5: p.r5 && p.r5 < now ? 0 : (p.u5 ?? null), d7: p.r7 && p.r7 < now ? 0 : (p.u7 ?? null),
      r5: p.r5 && p.r5 > now ? p.r5 : null, r7: p.r7 && p.r7 > now ? p.r7 : null,
    });
  }
  out.sort((a, b) => (b.global - a.global) || a.name.localeCompare(b.name));
  return out;
}

export async function loadNext() {
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
export const loadSessionList = () => json('claudius', ['sessions', '--json', '--limit', '400'], 30000);

/** Tags each session with the profile that last ran it. */
export async function tagSessions(list, profiles) {
  if (!list) return null;
  const byAccount = new Map(profiles.filter(p => p.account).map(p => [p.account, p.name]));
  const fallback = (profiles.find(p => p.global) || profiles[0])?.name || null;
  const keep = list.filter(s => s.exists && !s.cwd.includes('/scratchpad/')); // folders that are gone, and throwaway test runs
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
  if (process.env.WORKWOOD_TERMINAL) { cmd = process.env.WORKWOOD_TERMINAL; args = [cwd, ...argv]; }             // your own launcher
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
  const list = await json('claude', ['agents', '--json'], 15000);
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

export async function claudePath() {
  try { const { stdout } = await run('which', ['claude']); return stdout.trim() || undefined; } catch { return undefined; }
}
