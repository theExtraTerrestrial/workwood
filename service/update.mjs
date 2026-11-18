// Updates: Workwood runs from a git checkout, so an update is whatever its upstream branch has that this folder
// does not. Checked at start and every few hours; applied by a fast-forward pull (and `npm install` when the
// dependencies changed), after which the window restarts itself.
import { execFile } from 'node:child_process';
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
export const status = () => ({ ...st });

/** Local edits that would be lost or block the pull; files git does not track are left alone and do not count. */
async function dirty() {
  const out = await git('status', '--porcelain', '--untracked-files=no');
  return out ? out.split('\n').map(l => l.slice(3).replace(/^.* -> /, '')) : [];
}

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
  setTimeout(() => check().catch(() => {}), Number(process.env.WORKWOOD_UPDATE_DELAY ?? 8000)).unref();
  setInterval(() => check().catch(() => {}), EVERY).unref();
}
