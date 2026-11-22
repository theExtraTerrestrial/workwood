// Home: what the window shows before you open a session. Where each piece of work was left, what is not committed,
// what the agents made lately, how each profile's limits are moving, and when you worked. Everything here is read
// from files already on this machine (transcripts, git, the usage logs Claudius and Workwood keep); nothing is sent.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import { PROFILE_ROOT, PLAIN } from './sources.mjs';
import { readTranscript } from './transcript.mjs';

const WORDS = 360;   // characters of a prompt or reply a card may show

// Markdown as plain words: a card shows a few lines of prose, not code or tables.
function plain(t) {
  return String(t || '')
    .replace(/```[\s\S]*?(```|$)/g, ' ')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1').replace(/`([^`]+)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\s+/g, ' ').trim();
}

/** A prompt as a card shows it: plain words, cut to a few lines. */
export function brief(t) { const p = plain(t); return p.length > WORDS ? p.slice(0, WORDS - 1) + '…' : p; }

/**
 * The last thing the agent said in a session: { text, ts } from the end of its transcript, or null. Read from the
 * last 256 KB only, and remembered until the file changes.
 */
const wordsCache = new Map();   // file -> { mt, out }
export async function lastWords(file) {
  if (!file) return null;
  let st; try { st = await fsp.stat(file); } catch { return null; }
  const had = wordsCache.get(file);
  if (had && had.mt === st.mtimeMs) return had.out;
  let out = null, fh;
  try {
    fh = await fsp.open(file, 'r');
    const len = Math.min(st.size, 262144), buf = Buffer.alloc(len);
    await fh.read(buf, 0, len, st.size - len);
    const lines = buf.toString('utf8').split('\n');
    if (st.size > len) lines.shift();   // half a line
    for (let i = lines.length - 1; i >= 0 && !out; i--) {
      const l = lines[i];
      if (!l.includes('"type":"assistant"') || l.includes('"isSidechain":true') || l.includes('"isApiErrorMessage":true')) continue;
      let o; try { o = JSON.parse(l); } catch { continue; }
      const c = o.message?.content;
      const t = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b?.type === 'text').map(b => b.text).join('\n') : '';
      const p = plain(t);
      if (p) out = { text: p.length > WORDS ? p.slice(0, WORDS - 1) + '…' : p, ts: Date.parse(o.timestamp) / 1000 || null };
    }
  } catch {} finally { await fh?.close().catch(() => {}); }
  wordsCache.set(file, { mt: st.mtimeMs, out });
  return out;
}

/** Previewable files a session made, newest first: [{ path, name, kind, v, ts }]. Remembered until the transcript changes. */
const madeCache = new Map();   // file -> { mt, work }
export async function madeBy(file, cwd) {
  if (!file) return [];
  let st; try { st = await fsp.stat(file); } catch { return []; }
  const had = madeCache.get(file);
  if (had && had.mt === st.mtimeMs) return had.work;
  const work = (await readTranscript(file, 1, cwd).catch(() => ({ work: [] }))).work || [];
  madeCache.set(file, { mt: st.mtimeMs, work });
  return work;
}

/**
 * When a session was worked on: the times you wrote to it (turns) and every minute something happened in it,
 * from the last 30 days. A transcript is read once; later reads continue where the last one stopped.
 */
export const DAYS = 31;   // a day more than Time's 30, so its first day is whole
const seen = new Map();   // file -> { pos, turns: [ts], marks: Set(minute) }
// What you wrote, not what Claude Code put in your name: tool results, notes, commands, a resumed summary, an interruption.
const NOT_A_TURN = /"tool_result"|"isMeta":true|"isCompactSummary":true|<command-name>|<local-command|<task-notification>|This session is being continued|\[Request interrupted/;
const tsOf = l => { const i = l.indexOf('"timestamp":"'); if (i < 0) return null; const t = Date.parse(l.slice(i + 13, i + 13 + 30).split('"')[0]); return Number.isFinite(t) ? Math.floor(t / 1000) : null; };
async function scan(file) {
  let st; try { st = await fsp.stat(file); } catch { return null; }
  let s = seen.get(file);
  if (!s || st.size < s.pos) { s = { pos: 0, turns: [], marks: new Set() }; seen.set(file, s); }
  if (st.size > s.pos) {
    const from = s.pos, input = fs.createReadStream(file, { start: from, end: st.size - 1 }), rl = readline.createInterface({ input, crlfDelay: Infinity });
    let at = from, cut = '';
    for await (const line of rl) {
      at += Buffer.byteLength(line) + 1;
      if (at > st.size) { cut = line; break; }   // a line still being written: read it next time
      const user = line.includes('"type":"user"'), asst = !user && line.includes('"type":"assistant"');
      if ((!user && !asst) || line.includes('"isSidechain":true')) continue;
      const t = tsOf(line); if (!t) continue;
      s.marks.add(Math.floor(t / 60));
      if (user && !NOT_A_TURN.test(line)) s.turns.push(t);
    }
    rl.close(); input.destroy();
    s.pos = cut ? at - Buffer.byteLength(cut) - 1 : Math.min(at, st.size);
  }
  const now = Date.now() / 1000;
  s.turns = s.turns.filter(t => now - t < DAYS * 86400);
  for (const m of s.marks) if (now - m * 60 > DAYS * 86400) s.marks.delete(m);
  return s;
}

const GAP = 20 * 60;   // s: quieter than this between two moments, and they are two stretches of work
// One row of Time: its turns, and its stretches of work [start, end, turns] from its minutes.
function rowOf(turns, minutes) {
  const ms = [...new Set(minutes)].sort((a, b) => a - b), blocks = [];
  for (const t of ms) { const b = blocks[blocks.length - 1]; if (b && t - b[1] <= GAP) b[1] = t + 60; else blocks.push([t, t + 60, 0]); }
  turns = turns.sort((a, b) => a - b);
  for (const t of turns) { const b = blocks.find(x => t >= x[0] - 60 && t <= x[1]); if (b) b[2]++; }
  return { turns, blocks };
}
/**
 * The last 30 days, two ways: per project { root, name, turns: [ts], blocks: [[start, end, turns]] } and per profile
 * { name, turns, blocks } (the profile that last ran each session), plus how many sessions were worked on in the
 * last 7 days.
 */
export async function activity(sessions) {
  const now = Date.now() / 1000, recent = sessions.filter(s => s.file && now - s.mts < DAYS * 86400);
  const byRoot = new Map(), byProf = new Map();
  const add = (map, key, extra, a) => { if (!map.has(key)) map.set(key, { ...extra, turns: [], minutes: [] }); const g = map.get(key); g.turns.push(...a.turns); for (const m of a.marks) g.minutes.push(m * 60); };
  let sessions7 = 0;
  for (const s of recent) {   // one at a time: a first read of a large history should not take the disk for itself
    const a = await scan(s.file).catch(() => null);
    if (!a) continue;
    const root = s.root || s.cwd;
    add(byRoot, root, { root, name: s.project }, a);
    if (s.profile) add(byProf, s.profile, { name: s.profile }, a);
    for (const m of a.marks) if (now - m * 60 < 7 * 86400) { sessions7++; break; }
  }
  const rows = map => [...map.values()].map(({ turns, minutes, ...g }) => ({ ...g, ...rowOf(turns, minutes) })).filter(g => g.turns.length || g.blocks.length);
  return { projects: rows(byRoot), profiles: rows(byProf), sessions7, at: Math.floor(now) };
}

// ---- how each profile's limits are moving: the usage log Claudius keeps beside `.usage`, which Workwood appends to too ----
export function parseLog(text) {
  const rows = [];
  for (const line of text.split('\n')) {
    const f = line.trim().split(/\s+/);
    if (f.length < 3) continue;
    const ts = +f[0]; if (!(ts > 0)) continue;
    const n = x => x == null || x === '-' || x === '' ? null : Number.isFinite(+x) ? +x : null;
    rows.push([ts, n(f[1]), n(f[2]), n(f[3]), n(f[4])]);
  }
  return rows.sort((a, b) => a[0] - b[0]);
}
// % per hour over the current window, measured over its most recent `pref` seconds when that is long enough to mean
// anything; null when there is too little to say. The same rule Claudius uses, so both show the same rate.
function rateOf(rows, ui, ri, reset, pref, minSpan) {
  let cur = rows.filter(r => r[ui] != null);
  if (reset) cur = cur.filter(r => r[ri] != null && Math.abs(r[ri] - reset) <= 60);
  if (cur.length < 2) return null;
  const last = cur[cur.length - 1];
  let win = cur.filter(r => last[0] - r[0] <= pref);
  if (win.length < 2 || last[0] - win[0][0] < minSpan) win = cur;
  const dt = last[0] - win[0][0];
  if (win.length < 2 || dt < minSpan) return null;
  return Math.round((last[ui] - win[0][ui]) * 3600 / dt * 100) / 100;
}
// When that rate reaches 100%: null for a trickle, or when the window clears first.
function etaOf(rows, ui, rate, reset) {
  if (!(rate > 0.5)) return null;
  const last = rows.filter(r => r[ui] != null).pop();
  if (!last) return null;
  const secs = Math.round((100 - last[ui]) / rate * 3600);
  if (secs <= 0) return null;
  const t = last[0] + secs;
  return reset && t >= reset ? null : t;
}
const pickEven = (rows, n) => rows.length <= n ? rows : [...new Set(Array.from({ length: n }, (_, i) => rows[Math.round(i * (rows.length - 1) / (n - 1))]))];

/** How one profile's limits are moving, from its log rows [ts, u5, u7, r5, r7]: { rate5, eta5, rate7, eta7, s5: [[ts, %]] in the current 5-hour window, s7: the same for the 7-day one }. */
export function trendOf(rows, now = Date.now() / 1000) {
  rows = rows.filter(r => now - r[0] < 8 * 86400);
  const r5 = [...rows].reverse().find(r => r[3])?.[3] || null, r7 = [...rows].reverse().find(r => r[4])?.[4] || null;
  const rate5 = rateOf(rows, 1, 3, r5, 45 * 60, 10 * 60), rate7 = rateOf(rows, 2, 4, r7, 12 * 3600, 30 * 60);
  const in5 = rows.filter(r => r[1] != null && (r5 ? r[3] != null && Math.abs(r[3] - r5) <= 60 : now - r[0] < 5 * 3600));
  const in7 = rows.filter(r => r[2] != null && (r7 ? r[4] != null && Math.abs(r[4] - r7) <= 60 : now - r[0] < 7 * 86400));
  return { rate5, eta5: r5 && r5 > now ? etaOf(rows, 1, rate5, r5) : null, rate7, eta7: r7 && r7 > now ? etaOf(rows, 2, rate7, r7) : null,
    s5: pickEven(in5, 40).map(r => [r[0], r[1]]), s7: pickEven(in7, 40).map(r => [r[0], r[2]]) };
}
/** The same for each profile, read from the log beside its `.usage`. */
export async function trends(names) {
  if (PLAIN) return [];
  return Promise.all(names.map(async name => {
    let rows = [];
    try { rows = parseLog(await fsp.readFile(path.join(PROFILE_ROOT, name, '.usage.log'), 'utf8')); } catch {}
    return { name, ...trendOf(rows) };
  }));
}
