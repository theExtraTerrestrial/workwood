// How much of each profile's limits is used, read by Workwood itself.
//
// Claude's usage endpoint (the one behind Claude Code's /usage) answers for free: no message is sent and no
// tokens are spent. It needs a valid sign-in. When a profile's has lapsed it is renewed first, under the renewal
// lock that Claude Code and Claudius take too (see oauth.mjs), in the one place that account is renewed.
//
// Profiles are read one at a time, in a queue, so a burst of refreshes never fires a burst of requests and two
// readings of the same profile never race to write its cache.
import fs from 'node:fs/promises';
import path from 'node:path';
import { HOME, PROFILE_ROOT, PLAIN } from './sources.mjs';
import { validToken } from './oauth.mjs';
import { homeOf } from './profiles.mjs';

const URL_ = process.env.WORKWOOD_USAGE_URL || 'https://api.anthropic.com/api/oauth/usage';
const GAP = 400;            // ms between two readings
const LOG_EVERY = 120;      // s: the history log takes at most one line per two minutes, as Claudius writes it

/** A valid access token for a profile, renewed if it had lapsed: { token } or { error }. */
export async function tokenFor(p) {
  const r = await validToken(PLAIN ? path.join(HOME, '.claude') : await homeOf(p));
  return r.token ? r : { error: r.error === 'none' ? 'expired' : r.error };
}

const epoch = iso => { const t = Date.parse(iso || ''); return Number.isFinite(t) ? Math.floor(t / 1000) : null; };
const pct = v => typeof v === 'number' && Number.isFinite(v) ? Math.round(v) : null;

/** One reading: { h5, d7, r5, r7, at } or { error } where error is 'expired', 'signin', 'offline' or 'busy'. */
export async function readUsage(p) {
  const { token, error } = await tokenFor(p);
  if (!token) return { error };
  let r;
  try {
    r = await fetch(URL_, { headers: { authorization: 'Bearer ' + token, 'anthropic-beta': 'oauth-2025-04-20', 'user-agent': 'workwood' }, signal: AbortSignal.timeout(15000) });
  } catch { return { error: 'offline' }; }
  if (r.status === 401 || r.status === 403) return { error: 'signin' };
  if (r.status === 429) return { error: 'busy' };
  if (!r.ok) return { error: 'offline' };
  let j; try { j = await r.json(); } catch { return { error: 'offline' }; }
  const u = { h5: pct(j.five_hour?.utilization), d7: pct(j.seven_day?.utilization), r5: epoch(j.five_hour?.resets_at), r7: epoch(j.seven_day?.resets_at), at: Math.floor(Date.now() / 1000) };
  if (u.h5 == null && u.d7 == null) return { error: 'offline' };
  return u;
}

/** Writes a reading where Claudius keeps it (`.usage`, and a line in `.usage.log`), so both tools show the same. */
export async function writeCache(name, u) {
  if (PLAIN) return;
  const dir = path.join(PROFILE_ROOT, name);
  try { if (!(await fs.stat(dir)).isDirectory()) return; } catch { return; }
  const d = v => v ?? '-';
  const file = path.join(dir, '.usage'), tmp = `${file}.${process.pid}.tmp`;
  try {
    await fs.writeFile(tmp, `${d(u.h5)} ${d(u.d7)} ${u.at} ${d(u.r5)} ${d(u.r7)}\n`, { mode: 0o600 });
    await fs.rename(tmp, file);
  } catch { await fs.rm(tmp, { force: true }).catch(() => {}); return; }
  const log = file + '.log';
  let last = 0;
  try {
    const fh = await fs.open(log, 'r');
    try { const { size } = await fh.stat(), n = Math.min(size, 256), buf = Buffer.alloc(n); await fh.read(buf, 0, n, size - n); last = +buf.toString().trim().split('\n').pop().split(' ')[0] || 0; }
    finally { await fh.close(); }
  } catch {}
  if (u.at - last >= LOG_EVERY) await fs.appendFile(log, `${u.at} ${d(u.h5)} ${d(u.d7)} ${d(u.r5)} ${d(u.r7)}\n`, { mode: 0o600 }).catch(() => {});
}

/**
 * The queue. `add(profiles)` puts each one in line unless it is already waiting or being read; `onChange` hears
 * when one starts and when its reading is in. Readings run one after another with a short pause between them.
 */
export function makeQueue(onChange) {
  const waiting = [], busy = new Set();   // names
  let running = false;
  async function work() {
    running = true;
    while (waiting.length) {
      const p = waiting.shift();
      onChange(p.name, { reading: true });
      const u = await readUsage(p).catch(() => ({ error: 'offline' }));
      if (!u.error) await writeCache(p.name, u);
      busy.delete(p.name);
      onChange(p.name, { reading: false, ...u });
      if (waiting.length) await new Promise(r => setTimeout(r, GAP));
    }
    running = false;
  }
  return {
    add(list) {
      for (const p of list) if (p && !busy.has(p.name)) { busy.add(p.name); waiting.push(p); onChange(p.name, { queued: true }); }
      if (!running && waiting.length) work();
    },
    pending: name => busy.has(name),
  };
}
