// Updates: Workwood runs from a git checkout, so an update is whatever its upstream branch has that this folder
// does not. Checked at start and every few hours; applied by a fast-forward pull (and `npm install` when the
// dependencies changed), after which the window restarts itself.
import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = process.env.WORKWOOD_UPDATE_DIR || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const EVERY = 3 * 3600e3;
// Never wait on a password or passphrase prompt: a check nobody asked for must not hang or pop anything up.
const ENV = { ...process.env, GIT_TERMINAL_PROMPT: '0', GIT_SSH_COMMAND: process.env.GIT_SSH_COMMAND || 'ssh -o BatchMode=yes -o ConnectTimeout=15' };
const run = (file, args, ms = 60000) => new Promise((resolve, reject) =>
  execFile(file, args, { cwd: DIR, env: ENV, timeout: ms, maxBuffer: 16e6, windowsHide: true }, (e, out, err) =>
    e ? reject(Object.assign(new Error(String(err || e.message).trim().split('\n').pop() || e.message), { code: e.code })) : resolve(String(out).trimEnd())));
const git = (...args) => run('git', args);

// What the window shows. state: none (not a checkout, or nothing upstream), current, ready, blocked, updated.
const st = { state: 'none', behind: 0, titles: [], files: [], why: '', error: '', at: 0, checking: false, updating: false, head: '' };
let changed = () => {};
const set = patch => { Object.assign(st, patch); changed(); };
export const status = () => {
  const s = { ...st };
  // The Windows window runs from a copy of these files, made by `npm run shortcut`. When this folder changed some other
  // way (a pull by hand, a merge), the copy is behind: shown as an update to restart for, as Restart makes it again.
  if (stale && !s.updating && !['ready', 'blocked', 'updated'].includes(s.state)) Object.assign(s, { state: 'updated', head: 'copy:' + stale, why: '' });
  return s;
};

/**
 * A fingerprint of what the Windows window's copy is made from (see shell/windows-parts.mjs): the window's own files,
 * the service, the page and the dependencies. The same for the same files, wherever the folder is.
 */
export function copyStamp(dir = DIR) {
  const h = createHash('sha256'), files = [];
  const walk = rel => {
    const abs = path.join(dir, rel);
    let st; try { st = fs.statSync(abs); } catch { return; }
    if (st.isDirectory()) { for (const n of fs.readdirSync(abs).sort()) if (!n.startsWith('.') && n !== '__pycache__') walk(rel + '/' + n); }
    else files.push(rel);
  };
  for (const r of ['shell/windows/main.cjs', 'shell/preload.cjs', 'shell/window-state.cjs', 'shell/page-store.cjs', 'shell/icon.ico', 'package.json', 'package-lock.json', 'service', 'ui']) walk(r);
  for (const f of files) h.update(f + '\0').update(fs.readFileSync(path.join(dir, f))).update('\0');
  return h.digest('hex').slice(0, 32);
}
// The window's copy, when the Windows window started this service. A window from before the fingerprint (it says only
// WORKWOOD_PARENT) counts as behind, so it too is offered the Restart that makes it again: no `npm run shortcut` by hand.
const COPY = process.env.WORKWOOD_COPY_STAMP || (process.env.WORKWOOD_PARENT ? 'none' : '');
let stale = '';
function checkCopy() {
  if (!COPY) return;
  let now = ''; try { now = copyStamp(); } catch { return; }
  const s = now === COPY ? '' : now;
  if (s !== stale) { stale = s; changed(); }
}

const LOCK = 'package-lock.json';
/** Local edits that would be lost or block the pull; files git does not track are left alone and do not count.
 *  Neither does package-lock.json on its own: an npm other than the one that wrote it rewrites it on every install
 *  (npm 10 drops the "libc" fields npm 11 writes), so with package.json untouched it is npm's change, not yours. */
async function changes() {
  const out = await git('status', '--porcelain', '--untracked-files=no');
  return out ? out.split('\n').map(l => l.slice(3).replace(/^.* -> /, '')) : [];
}
const npmsOwn = files => files.includes(LOCK) && !files.includes('package.json');
const dirty = async () => { const files = await changes(); return npmsOwn(files) ? files.filter(f => f !== LOCK) : files; };

let checking = null;
export function check() { return checking ||= doCheck().finally(() => { checking = null; }); }
async function doCheck() {
  if (st.state === 'updated' || st.updating) return status();
  if (!fs.existsSync(path.join(DIR, '.git'))) { set({ state: 'none', why: 'Not a git checkout', at: Date.now() }); return status(); }
  set({ checking: true });
  try {
    let up;
    try { up = await git('rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'); }
    catch { set({ state: 'none', why: 'This branch follows no branch on GitHub', error: '', at: Date.now() }); return status(); }
    const remote = up.split('/')[0];
    try { await run('git', ['fetch', '--quiet', remote], 45000); }
    catch (e) { set({ error: 'Could not reach ' + remote + ': ' + e.message, at: Date.now() }); return status(); }
    const [behind, ahead, titles, head, files] = await Promise.all([git('rev-list', '--count', 'HEAD..@{u}'), git('rev-list', '--count', '@{u}..HEAD'),
      git('log', '--format=%s', '-n', '3', 'HEAD..@{u}'), git('rev-parse', '@{u}'), dirty()]);
    const n = Number(behind) || 0, base = { behind: n, titles: titles ? titles.split('\n') : [], head, files: [], why: '', error: '', at: Date.now() };
    if (!n) set({ ...base, state: 'current' });
    else if (files.length) set({ ...base, state: 'blocked', files, why: files.length === 1 ? 'Uncommitted changes in ' + path.basename(files[0]) : `Uncommitted changes in ${files.length} files` });
    else if (Number(ahead)) set({ ...base, state: 'blocked', why: `${ahead} local commit${ahead > 1 ? 's are' : ' is'} not on ${up}` });
    else set({ ...base, state: 'ready' });
  } catch (e) { set({ error: e.message, at: Date.now() }); }
  finally { set({ checking: false }); }
  return status();
}

/** Pulls, and installs the dependencies again when they changed. Leaves the folder as it was when anything is in the way. */
export async function apply() {
  if (st.state === 'updated') return status();
  if (st.updating) throw new Error('An update is already under way.');
  await check();
  if (st.state !== 'ready') throw new Error(st.state === 'blocked' ? st.why : st.error || 'There is nothing to update.');
  set({ updating: true });
  try {
    const before = await git('rev-parse', 'HEAD');
    if (npmsOwn(await changes())) await git('checkout', '--', LOCK);   // npm's rewrite would stop the pull
    await run('git', ['pull', '--ff-only', '--quiet'], 120000);
    const touched = (await git('diff', '--name-only', before, 'HEAD')).split('\n');
    if (touched.includes('package.json') || touched.includes('package-lock.json'))
      await run(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['install', '--no-audit', '--no-fund', '--loglevel=error'], 600000);
    set({ state: 'updated', behind: 0, error: '', updating: false });
  } catch (e) { set({ updating: false, error: e.message }); throw e; }
  return status();
}

/** Checks soon after start (not to slow it down), then every few hours. */
export function watch(onChange) {
  changed = onChange;
  checkCopy(); setInterval(checkCopy, Number(process.env.WORKWOOD_COPY_EVERY) || 60_000).unref();
  setTimeout(() => check().catch(() => {}), Number(process.env.WORKWOOD_UPDATE_DELAY ?? 8000)).unref();
  setInterval(() => check().catch(() => {}), EVERY).unref();
}
