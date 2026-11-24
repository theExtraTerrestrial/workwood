// Profiles, kept by Workwood itself in the same folders Claudius uses (~/.claude-profiles/<name>), so either
// tool can be used and both see the same profiles. What is here is ported from Claudius and follows its rules;
// where Claudius explains why a rule is there, the reason is repeated here.
import fs from 'node:fs/promises';
import fss from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readCreds, writeCreds, withRenewLock, fresh, readKeychain, dropKeychain } from './oauth.mjs';

const HOME = os.homedir(), PROFILE_ROOT = path.join(HOME, '.claude-profiles');   // as in sources.mjs, which imports this file
export const CLAUDE_DIR = path.join(HOME, '.claude');
const CLAUDE_CONFIG = path.join(HOME, '.claude.json');
const readJson = async f => { try { const j = JSON.parse(await fs.readFile(f, 'utf8')); return j && typeof j === 'object' ? j : null; } catch { return null; } };
const writeJson = async (file, data, pretty) => {   // a private file renamed over the old one
  const tmp = `${file}.${process.pid}.tmp`;
  try { await fs.writeFile(tmp, pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data), { mode: 0o600 }); await fs.rename(tmp, file); }
  catch (e) { await fs.rm(tmp, { force: true }).catch(() => {}); throw e; }
};
const identityPath = dir => fss.existsSync(path.join(dir, '.claude.json')) || !fss.existsSync(path.join(dir, 'claude.json')) ? path.join(dir, '.claude.json') : path.join(dir, 'claude.json');
const liveAccount = async () => (await readJson(CLAUDE_CONFIG))?.oauthAccount || null;
export const activeName = async () => { try { return (await fs.readFile(path.join(PROFILE_ROOT, '.active_profile'), 'utf8')).trim() || null; } catch { return null; } };

/** The profile folders: everything in ~/.claude-profiles but dotfiles and Claude Code's `<name>.lock` folders. */
async function names() {
  let all; try { all = await fs.readdir(PROFILE_ROOT, { withFileTypes: true }); } catch { return []; }
  return all.filter(d => d.isDirectory() && !d.name.startsWith('.') && !d.name.endsWith('.lock')).map(d => d.name).sort();
}

/**
 * Every profile, as `claudius list --json` gives it: the account, plan, whether its stored sign-in has lapsed,
 * and the cached usage. For the profile signed in to the live account, ~/.claude counts as part of its storage,
 * since a /login inside Claude Code lands there; the fresher of the two decides.
 */
export async function list() {
  const active = await activeName(), live = await liveAccount(), liveCreds = await readCreds(CLAUDE_DIR);
  const out = [];
  for (const name of await names()) {
    const dir = path.join(PROFILE_ROOT, name), acc = (await readJson(identityPath(dir)))?.oauthAccount || {};
    let expired = true, sub = '';
    const sources = [await readCreds(dir)];
    if (live?.emailAddress && acc.emailAddress === live.emailAddress) sources.push(liveCreds);
    for (const c of sources) {
      const o = c?.claudeAiOauth; if (!o) continue;
      if (!sub || fresh(o)) sub = o.subscriptionType || sub;
      if (fresh(o)) expired = false;
    }
    let u5 = null, u7 = null, uts = null, r5 = null, r7 = null;
    try {
      const p = (await fs.readFile(path.join(dir, '.usage'), 'utf8')).trim().split(/\s+/), n = x => x == null || x === '-' ? null : parseInt(x, 10);
      if (p.length >= 3) [u5, u7, uts, r5, r7] = [n(p[0]), n(p[1]), n(p[2]), n(p[3]), n(p[4])];
    } catch {}
    out.push({ name, account: acc.accountUuid || null, email: acc.emailAddress || '', org: acc.organizationName || '', sub, active: name === active, u5, u7, uts, r5, r7, expired });
  }
  return out;
}

// Burn rate of the 5-hour window, in % per hour, from a profile's usage log, as Claudius measures it: only the
// readings of the current window (the same reset time), over the last 45 minutes if that spans at least 10.
async function rate5(name) {
  let text; try { text = await fs.readFile(path.join(PROFILE_ROOT, name, '.usage.log'), 'utf8'); } catch { return null; }
  const rows = [];
  for (const line of text.split('\n')) {
    const f = line.trim().split(/\s+/); if (f.length < 3) continue;
    const ts = parseInt(f[0], 10); if (!(ts > 0)) continue;
    const n = x => x == null || x === '-' ? null : parseInt(x, 10);
    rows.push([ts, n(f[1]), n(f[2]), n(f[3]), n(f[4])]);
  }
  rows.sort((a, b) => a[0] - b[0]);
  const reset = [...rows].reverse().find(r => r[3])?.[3];
  let cur = rows.filter(r => r[1] != null); if (reset) cur = cur.filter(r => r[3] === reset);
  if (cur.length < 2) return null;
  const last = cur[cur.length - 1];
  let win = cur.filter(r => last[0] - r[0] <= 45 * 60);
  if (win.length < 2 || last[0] - win[0][0] < 600) win = cur;
  const dt = last[0] - win[0][0];
  if (win.length < 2 || dt < 600) return null;
  return Math.round((last[1] - win[0][1]) * 3600 / dt * 100) / 100;
}

/**
 * The profile with the most room, as `claudius next` picks it. A window at 100% rules a profile out. Room is the
 * smaller of the two windows' remaining room, compared in steps of 5 points so noise does not outvote the
 * tie-breaks: a reading under an hour old, then the idler account, then the active one, then the name.
 */
export async function next(profiles) {
  const now = Math.floor(Date.now() / 1000);
  const rows = await Promise.all(profiles.map(async p => {
    const h5 = p.u5 == null ? null : 100 - p.u5, h7 = p.u7 == null ? null : 100 - p.u7, room = [h5, h7].filter(x => x != null);
    const head = room.length ? Math.min(...room) : null, wall = (p.u5 ?? 0) >= 100 || (p.u7 ?? 0) >= 100;
    return { name: p.name, active: p.active, head, ok: !wall && head != null, stale: p.uts == null || now - p.uts > 3600, rate: await rate5(p.name) || 0 };
  }));
  rows.sort((a, b) => (a.ok ? 0 : 1) - (b.ok ? 0 : 1) || (a.head == null) - (b.head == null) || Math.floor((b.head ?? 0) / 5) - Math.floor((a.head ?? 0) / 5)
    || a.stale - b.stale || a.rate - b.rate || (a.active ? 0 : 1) - (b.active ? 0 : 1) || (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  return rows.find(r => r.ok)?.name || null;
}

/* ---------- sharing: one history, many accounts ---------- */

// Files Claude Code keeps per config folder and rewrites itself. Never linked, and a link an older tool made is
// taken away again. The first group is per account (the organisation's policy and managed settings); the second
// is caches written by renaming a new file over the old one, which a link never survives; the last is Claude
// Code's record of who holds its renewal lock, which belongs to that folder alone.
const perConfigDir = e => /^(policy-limits\.json|remote-settings\.json)(\..*)?$/.test(e) || /-cache\.json$/.test(e) || e === '.last-update-result.json' || e.startsWith('.oauth_refresh.lock');
// Never linked: what makes a profile its own account, settings (filled in key by key instead), Claudius's own
// files, and runtime state such as locks and the background daemon.
const isolated = e => perConfigDir(e) || ['.credentials.json', '.claude.json', 'claude.json', 'settings.json', 'settings.json.bak', 'settings.local.json', '.usage', 'backups', 'daemon', 'ide', '', '.', '..'].includes(e)
  || /^daemon[.-]/.test(e) || /\.(lock|pid|tmp)$/.test(e) || /\.pre-share(\.\d+)?\.bak$/.test(e);
const exists = async p => { try { await fs.lstat(p); return true; } catch { return false; } };
async function setAside(p) {   // <name>.pre-share.bak, or .pre-share.2.bak and up when that is taken
  let bak = p + '.pre-share.bak';
  for (let i = 2; await exists(bak); i++) bak = `${p}.pre-share.${i}.bak`;
  await fs.rename(p, bak);
}
async function wasSetAside(p) {
  if (await exists(p + '.pre-share.bak')) return true;
  const dir = path.dirname(p), base = path.basename(p) + '.pre-share.';
  try { return (await fs.readdir(dir)).some(n => n.startsWith(base) && n.endsWith('.bak')); } catch { return false; }
}
async function mergeDir(own, pool) {   // the pool gains what it lacks; nothing in it is overwritten
  await fs.mkdir(pool, { recursive: true });
  for (const n of await fs.readdir(own)) if (!(await exists(path.join(pool, n)))) await fs.cp(path.join(own, n), path.join(pool, n), { recursive: true }).catch(() => {});
}
async function mergeJsonl(own, pool) {   // lines the pool lacks are appended, in order
  let seen = new Set(); try { seen = new Set((await fs.readFile(pool, 'utf8')).split('\n')); } catch {}
  const add = [];
  for (const l of (await fs.readFile(own, 'utf8').catch(() => '')).split('\n')) if (l && !seen.has(l)) { seen.add(l); add.push(l); }
  if (add.length) await fs.appendFile(pool, add.join('\n') + '\n');
}

/**
 * Wires a profile to the shared pool in ~/.claude, as `claudius link` does: everything but what makes it its own
 * account becomes a link into the pool, so its sessions, history, plans and plugins are the same as everywhere.
 * Real data in the way is merged into the pool and set aside as `<name>.pre-share.bak`, never deleted.
 * Then settings the profile lacks are filled in from the global ones, the per-project state (trust, allowed
 * tools, MCP servers) it lacks is copied, and Claude Code's first-run questions are marked as done.
 */
export async function link(name, claudeVersion) {
  const dir = path.join(PROFILE_ROOT, name);
  if (!fss.existsSync(dir)) throw new Error(`There is no profile called ${name}.`);
  await normalizeIdentity(dir, claudeVersion);
  if (fss.existsSync(CLAUDE_DIR)) {
    const entries = await fs.readdir(CLAUDE_DIR);
    for (const e of entries) {   // undo links to files that must be per config folder
      const own = path.join(dir, e);
      if (perConfigDir(e)) try { if ((await fs.readlink(own)) === path.join(CLAUDE_DIR, e)) await fs.rm(own); } catch {}
    }
    for (const e of entries) {
      if (isolated(e)) continue;
      const src = path.join(CLAUDE_DIR, e), dst = path.join(dir, e);
      let st = null; try { st = await fs.lstat(dst); } catch {}
      if (st?.isSymbolicLink()) { if ((await fs.readlink(dst)) !== src) { await fs.rm(dst); await fs.symlink(src, dst).catch(() => {}); } continue; }
      if (st?.isFile() && await wasSetAside(dst)) continue;   // linked once and back as a file: Claude Code writes this one itself
      if (st) {
        if (st.isDirectory()) await mergeDir(dst, src);
        else if (e.endsWith('.jsonl') && fss.existsSync(src)) await mergeJsonl(dst, src);
        else if (!fss.existsSync(src)) await fs.cp(dst, src, { recursive: true }).catch(() => {});
        await setAside(dst);
      }
      await fs.symlink(src, dst).catch(() => {});
    }
  }
  await fillSettings(dir);
  await copyProjects(dir);
}

async function normalizeIdentity(dir, ver) {
  const dotted = path.join(dir, '.claude.json'), legacy = path.join(dir, 'claude.json');
  if (!fss.existsSync(dotted) && fss.existsSync(legacy)) await fs.copyFile(legacy, dotted).then(() => fs.chmod(dotted, 0o600)).catch(() => {});
  const d = (await readJson(dotted)) || {};
  let changed = false;
  if (d.hasCompletedOnboarding !== true) { d.hasCompletedOnboarding = true; changed = true; }
  if (ver && d.lastOnboardingVersion !== ver) { d.lastOnboardingVersion = ver; changed = true; }
  if (changed) await writeJson(dotted, d).catch(() => {});
}
async function fillSettings(dir) {
  const g = await readJson(path.join(CLAUDE_DIR, 'settings.json')); if (!g) return;
  const file = path.join(dir, 'settings.json'), p = (await readJson(file)) || {};
  let changed = false;
  for (const [k, v] of Object.entries(g)) if (!(k in p)) { p[k] = v; changed = true; }
  if (!changed) return;
  const bak = file + '.claudius-bak';   // the profile's copy is backed up once, before the first rewrite
  if (fss.existsSync(file) && !fss.existsSync(bak)) await fs.copyFile(file, bak).catch(() => {});
  await writeJson(file, p, true).catch(() => {});
}
async function copyProjects(dir) {
  const g = await readJson(CLAUDE_CONFIG), file = identityPath(dir), d = await readJson(file);
  if (!g?.projects || typeof g.projects !== 'object' || !d) return;
  const dp = d.projects && typeof d.projects === 'object' ? d.projects : {};
  let changed = false;
  for (const [k, v] of Object.entries(g.projects)) if (!(k in dp)) { dp[k] = v; changed = true; }
  if (changed) { d.projects = dp; await writeJson(file, d).catch(() => {}); }
}

/**
 * Where an account's sign-in is renewed. One account has one chain of refresh tokens, so it must be renewed in
 * one place only: ~/.claude for the account signed in there (Claude Code keeps that one renewed itself), the
 * profile's own folder for any other.
 */
export async function homeOf(p) {
  if (p.global) return CLAUDE_DIR;
  const live = await liveAccount();
  return p.account && live?.accountUuid === p.account ? CLAUDE_DIR : path.join(PROFILE_ROOT, p.name);
}

/**
 * A profile signed in to the live account carries a copy of its sign-in, which falls behind as ~/.claude is
 * renewed; a session started with the old copy would be refused. Before one starts, a newer live sign-in is
 * copied into the profile, under the profile's renewal lock. Nothing is ever copied the other way.
 */
export async function adoptLive(p) {
  if (p.global || (await homeOf(p)) !== CLAUDE_DIR) return false;
  const dir = path.join(PROFILE_ROOT, p.name);
  try {
    return await withRenewLock(dir, async () => {
      const live = await readCreds(CLAUDE_DIR), own = await readCreds(dir);
      if (!live?.claudeAiOauth?.expiresAt || (live.claudeAiOauth.expiresAt <= (own?.claudeAiOauth?.expiresAt || 0))) return false;
      await writeCreds(dir, live);
      return true;
    });
  } catch { return false; }
}

/* ---------- adding, signing in again, renaming, removing ---------- */
// What `claudius add` and `relogin` do, done here: Claude Code's own sign-in (`claude auth login`) runs with the
// profile's folder as its config folder, so the new sign-in lands in that folder and nowhere else. Whether it
// worked is decided from the folder (a sign-in with an access token appeared), never from what the sign-in printed.
// On macOS Claude Code puts the sign-in in the Keychain instead (see oauth.mjs): there it worked when the folder's
// Keychain item holds a token it did not hold before the sign-in began, and that sign-in is then copied into the
// folder's `.credentials.json`, where Claudius and the rest of Workwood look for it.

export const dirOf = name => path.join(PROFILE_ROOT, name);
/** A name as Claudius would make it: lower case, letters, digits, dots, dashes and underscores. Null if none is left. */
export function cleanName(raw) {
  const s = String(raw || '').toLowerCase().replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-').replace(/^[-.]+|[-.]+$/g, '').slice(0, 40);
  return s && !s.endsWith('.lock') ? s : null;
}
export async function credsReady(dir) { try { return /"accessToken"/.test(await fs.readFile(path.join(dir, '.credentials.json'), 'utf8')); } catch { return false; } }
// The Keychain's token for a profile when its sign-in began, by name; a sign-in that only leaves this behind failed.
const kcBefore = new Map();
const kcToken = async name => (await readKeychain(dirOf(name)))?.claudeAiOauth?.accessToken || null;
async function markSignIn(name) { kcBefore.set(name, await kcToken(name)); }
/** Whether the sign-in that just ended landed: in the folder, or (macOS) as a new token in its Keychain item. */
async function landed(name) {
  const before = kcBefore.get(name) ?? null; kcBefore.delete(name);
  if (await credsReady(dirOf(name))) return true;
  const now = await kcToken(name);
  if (!now || now === before) return false;
  await writeCreds(dirOf(name), await readKeychain(dirOf(name)));   // into the folder, for Claudius and the rest of Workwood
  return true;
}

/** A new, empty profile folder for a sign-in to land in. */
export async function create(name) {
  await fs.mkdir(PROFILE_ROOT, { recursive: true });
  try { await fs.mkdir(dirOf(name), { mode: 0o700 }); }
  catch (e) { if (e.code === 'EEXIST') throw new Error(`There is already a profile called ${name}.`); throw e; }
  await dropKeychain(dirOf(name));   // left by an earlier profile of this name: not this one's sign-in
  await markSignIn(name);
}
/** After an added profile's sign-in: kept and wired if it signed in, gone without a trace if not. */
export async function finishAdd(name, claudeVersion) {
  if (!(await landed(name))) { await fs.rm(dirOf(name), { recursive: true, force: true }); await dropKeychain(dirOf(name)); return false; }
  await tidy(name, claudeVersion);
  return true;
}

// Signing in again: the old sign-in is moved aside first, so Claude Code meets the same empty folder a new profile
// has, and is put back on every way the sign-in can fail. A copy left by an attempt that was killed half-way is
// put back before anything else.
const bakOf = name => path.join(dirOf(name), '.credentials.json.bak');
async function restore(name) {
  const creds = path.join(dirOf(name), '.credentials.json');
  if (!fss.existsSync(bakOf(name))) return;
  if (await credsReady(dirOf(name))) await fs.rm(bakOf(name), { force: true });
  else await fs.rename(bakOf(name), creds).catch(() => {});
}
export async function beginRelogin(name) {
  await restore(name);
  await markSignIn(name);
  const creds = path.join(dirOf(name), '.credentials.json');
  if (fss.existsSync(creds)) await fs.rename(creds, bakOf(name));
}
/** Ends a sign-in again: the new sign-in kept if there is one, the old one back if not. True when it worked. */
export async function finishRelogin(name, claudeVersion) {
  const ok = await landed(name);
  await restore(name);
  if (ok) await tidy(name, claudeVersion);
  return ok;
}
// A fresh sign-in: private files, wired for shared sessions. For the active profile, ~/.claude holds the same
// account, so the new sign-in goes there too (under ~/.claude's renewal lock); otherwise ~/.claude would go on
// using the sign-in that had just lapsed. Only when ~/.claude is still that account: a sign-in as someone else
// must not change who ~/.claude is.
async function tidy(name, claudeVersion) {
  const dir = dirOf(name);
  await fs.chmod(path.join(dir, '.credentials.json'), 0o600).catch(() => {});
  await fs.chmod(path.join(dir, '.claude.json'), 0o600).catch(() => {});
  await link(name, claudeVersion).catch(() => {});
  if ((await activeName()) !== name) return;
  const mine = (await readJson(identityPath(dir)))?.oauthAccount?.accountUuid, live = (await liveAccount())?.accountUuid;
  if (!mine || mine !== live) return;
  const creds = await readCreds(dir);
  await withRenewLock(CLAUDE_DIR, () => writeCreds(CLAUDE_DIR, creds)).catch(() => {});
}

/** Renames a profile's folder, and the active-profile mark with it. */
export async function rename(from, to) {
  if (fss.existsSync(dirOf(to))) throw new Error(`There is already a profile called ${to}.`);
  const kc = await readKeychain(dirOf(from)), best = kc && await readCreds(dirOf(from));
  await fs.rename(dirOf(from), dirOf(to));
  if (kc) { await writeCreds(dirOf(to), best).catch(() => {}); await dropKeychain(dirOf(from)); }   // the Keychain item is named by the folder
  if ((await activeName()) === from) await writeText(path.join(PROFILE_ROOT, '.active_profile'), to + '\n');
}
/**
 * Removes a profile: its folder (sign-in, identity, usage history, settings). The links inside it are removed,
 * never what they point to, so the shared history stays. The active profile is refused: ~/.claude is signed in
 * to that account, and forgetting the profile would leave ~/.claude an account no profile names.
 */
export async function remove(name) {
  if (!cleanName(name) || cleanName(name) !== name) throw new Error('That is not a profile name.');
  if ((await activeName()) === name) throw new Error(`${name} is the account ~/.claude is signed in to. Switch to another one with Claudius first.`);
  await fs.rm(dirOf(name), { recursive: true, force: true });
  await dropKeychain(dirOf(name));
}
const writeText = async (file, text) => { const tmp = `${file}.${process.pid}.tmp`; await fs.writeFile(tmp, text, { mode: 0o600 }); await fs.rename(tmp, file); };
