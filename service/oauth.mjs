// Renewing a sign-in, safely alongside Claude Code and Claudius.
//
// A refresh token works once: whoever renews first gets a new pair, and anyone still holding the old refresh
// token is signed out when they try it. So only one program may renew an account at a time, and whoever renews
// second must first look whether the first already did.
//
// Claude Code already guards its own renewals with two lock folders, made the way the `proper-lockfile` package
// makes them: `<config folder>/.oauth_refresh.lock`, and the older `<config folder>.lock` next to it. A folder is
// made with mkdir, which either makes it or fails, so only one program can hold it; the holder touches it every
// 5 seconds, and one untouched for 60 seconds is taken to be abandoned. Workwood and Claudius take the same two
// folders in the same order, so all three exclude each other.
//
// Inside the lock the credentials are read again. If someone renewed them while we waited, that token is used and
// nothing is sent.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFile } from 'node:child_process';

const TOKEN_URL = process.env.WORKWOOD_TOKEN_URL || 'https://platform.claude.com/v1/oauth/token';
const CLIENT_ID = '9d1c250a-e61b-44d9-88ed-5944d1962f5e';   // Claude Code's own, as Claudius uses it
const STALE = 60000, UPDATE = 5000, WAIT = Number(process.env.WORKWOOD_LOCK_WAIT) || 30000;
const sleep = ms => new Promise(r => setTimeout(r, ms));

export const fresh = o => !!o?.accessToken && (o.expiresAt || 0) > Date.now() + 60000;
const readFile = async dir => { try { return JSON.parse(await fs.readFile(path.join(dir, '.credentials.json'), 'utf8')); } catch { return null; } };
const expiry = c => c?.claudeAiOauth?.expiresAt || 0;

// On macOS Claude Code keeps a sign-in in the login Keychain, not in `.credentials.json`: `claude auth login` writes
// only there, renewals go there, and the file is at most a fallback that falls behind (or is removed). The item is
// "Claude Code-credentials" for ~/.claude and "Claude Code-credentials-<first 8 hex of sha256(config folder)>" for
// any CLAUDE_CONFIG_DIR, account the macOS user, as Claude Code (and Claudius) name it. So on macOS a sign-in is
// read from both places, the fresher one winning, and written to both. Only for the user's own home: a test's
// stand-in HOME must never reach the real Keychain.
const KC = 'Claude Code-credentials';
const KEYCHAIN = process.platform === 'darwin' && process.env.WORKWOOD_KEYCHAIN !== '0'
  && (() => { try { return os.homedir() === os.userInfo().homedir; } catch { return false; } })();
const KC_USER = KEYCHAIN ? os.userInfo().username : '';
export const keychainService = dir => path.resolve(dir) === path.join(os.homedir(), '.claude') ? KC
  : `${KC}-${crypto.createHash('sha256').update(dir.normalize('NFC')).digest('hex').slice(0, 8)}`;
// Bounded, so a Keychain that asks for permission cannot hold anything up for long.
const security = (args, input) => new Promise(res => {
  const c = execFile('/usr/bin/security', args, { timeout: 5000, maxBuffer: 1 << 20 }, (err, out) => res(err ? null : out));
  c.stdin.on('error', () => {}); c.stdin.end(input ?? '');
});
/** The sign-in Claude Code keeps in the Keychain for a config folder; null off macOS or when there is none. */
export async function readKeychain(dir) {
  if (!KEYCHAIN) return null;
  const out = await security(['find-generic-password', '-a', KC_USER, '-w', '-s', keychainService(dir)]);
  try { const j = JSON.parse(out); return j && typeof j === 'object' ? j : null; } catch { return null; }
}
// Written as Claude Code writes it: through `security -i`, hex-encoded, so the token never shows on a command line.
async function writeKeychain(dir, data) {
  if (!KEYCHAIN) return;
  const hex = Buffer.from(JSON.stringify(data)).toString('hex');
  await security(['-i'], `add-generic-password -U -a "${KC_USER}" -s "${keychainService(dir)}" -X "${hex}"\n`);
}
export async function dropKeychain(dir) { if (KEYCHAIN) await security(['delete-generic-password', '-a', KC_USER, '-s', keychainService(dir)]); }

/** A config folder's sign-in: its `.credentials.json`, or on macOS the Keychain's copy when that is fresher. */
export const readCreds = async dir => {
  const [file, kc] = await Promise.all([readFile(dir), readKeychain(dir)]);
  return kc?.claudeAiOauth && expiry(kc) >= expiry(file) ? kc : file || kc;
};

/** The two folders that lock renewal for a config folder: the current one and the older one. */
export async function lockPaths(dir) {
  const real = await fs.realpath(dir).catch(() => dir);
  return [path.join(dir, '.oauth_refresh.lock'), real + '.lock'];
}

// One lock folder, taken as proper-lockfile takes it. Resolves with a release function, or throws 'ELOCKED' once
// the folder has been held by someone else for longer than we are willing to wait.
async function take(p, until) {
  for (;;) {
    try { await fs.mkdir(p); break; }
    catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let st; try { st = await fs.stat(p); } catch { continue; }   // released between the two calls: try again
      // Abandoned. A stray file can end up inside one (a `.claude.json` has been seen there); it goes with it,
      // else the folder could never be taken. Should that fail too, the wait below still ends.
      if (Date.now() - st.mtimeMs > STALE && await fs.rm(p, { recursive: true }).then(() => true, () => false)) continue;
      if (Date.now() > until) { const err = new Error('Another program is renewing this sign-in.'); err.code = 'ELOCKED'; throw err; }
      await sleep(250 + Math.random() * 250);
    }
  }
  const beat = setInterval(() => { const t = new Date(); fs.utimes(p, t, t).catch(() => {}); }, UPDATE);
  beat.unref?.();
  return async () => { clearInterval(beat); await fs.rmdir(p).catch(() => {}); };
}

/** Runs `fn` while holding both renewal locks of a config folder. */
export async function withRenewLock(dir, fn) {
  const until = Date.now() + WAIT, [cur, legacy] = await lockPaths(dir);
  const free1 = await take(cur, until);
  let free2;
  try { free2 = await take(legacy, until); return await fn(); }
  finally { await free2?.(); await free1(); }
}

/**
 * A valid access token for the account whose sign-in lives in `dir`, renewing it if it has lapsed.
 * Returns { token } or { error: 'signin' | 'offline' | 'busy' | 'none' }.
 */
export async function validToken(dir) {
  const now = await readCreds(dir);
  if (fresh(now?.claudeAiOauth)) return { token: now.claudeAiOauth.accessToken };
  if (!now?.claudeAiOauth?.refreshToken) return { error: 'none' };
  try {
    return await withRenewLock(dir, async () => {
      const data = await readCreds(dir), o = data?.claudeAiOauth;   // again: it may have been renewed while we waited
      if (fresh(o)) return { token: o.accessToken };
      if (!o?.refreshToken) return { error: 'none' };
      let r;
      try {
        r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'content-type': 'application/json', 'anthropic-beta': 'oauth-2025-04-20' }, signal: AbortSignal.timeout(15000),
          body: JSON.stringify({ grant_type: 'refresh_token', refresh_token: o.refreshToken, client_id: CLIENT_ID, scope: (o.scopes?.length ? o.scopes : ['user:inference', 'user:profile']).join(' ') }) });
      } catch { return { error: 'offline' }; }
      if (r.status === 400 || r.status === 401) return { error: 'signin' };
      if (!r.ok) return { error: 'offline' };
      const b = await r.json().catch(() => ({}));
      if (!b.access_token) return { error: 'offline' };
      o.accessToken = b.access_token;
      if (b.refresh_token) o.refreshToken = b.refresh_token;
      if (b.expires_in) o.expiresAt = Date.now() + b.expires_in * 1000;
      if (b.scope) o.scopes = String(b.scope).split(' ');
      await writeCreds(dir, data);
      return { token: o.accessToken };
    });
  } catch (e) { return { error: e.code === 'ELOCKED' ? 'busy' : 'offline' }; }
}

/** Writes credentials the way both tools do: a private file renamed over the old one (and on macOS the Keychain). */
export async function writeCreds(dir, data) {
  const file = path.join(dir, '.credentials.json'), tmp = `${file}.${process.pid}.tmp`;
  try { await fs.writeFile(tmp, JSON.stringify(data), { mode: 0o600 }); await fs.rename(tmp, file); }
  catch (e) { await fs.rm(tmp, { force: true }).catch(() => {}); throw e; }
  await writeKeychain(dir, data);   // on macOS Claude Code reads the Keychain first: a renewal only there is one it sees
}
