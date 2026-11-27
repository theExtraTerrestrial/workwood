// Whether you are at this PC, for the phone's notifications. At the PC a notification waits a minute, and one you
// handle here meanwhile is never sent; away, it goes at once. Each Workwood page on this PC reports how long since the
// last input (to the whole computer where its window can read that, else to the page itself), whether the screen is
// locked, and which session it shows. With no page reporting, Workwood is not open here: you are away.
// Times are performance.now(): this computer's clock steps back now and then (WSL).
export const HOLD_MS = Number(process.env.WORKWOOD_PC_HOLD) || 60_000;
export const HOLDS = ['wait', 'never', 'now'], AWAY_MINS = [2, 5, 15];
const FRESH = 45_000;          // a page reports every 15 seconds; one silent for longer is gone
const reports = new Map();     // page -> { idle (s), locked, viewing, at }
let manual = null;             // Away now, by hand: { at }. It ends at the next input a minute after it was set.

export function report(page, b) {
  const t = performance.now(), idle = Math.max(0, Number(b.idle) || 0);
  reports.set(String(page).slice(0, 40), { idle, locked: b.locked === true, viewing: typeof b.viewing === 'string' ? b.viewing : null, at: t });
  if (manual && idle < 5 && t - manual.at > 60_000) manual = null;
  for (const [k, r] of reports) if (t - r.at > FRESH * 4) reports.delete(k);
}
export const setAway = on => { manual = on ? { at: performance.now() } : null; };
const live = () => { const t = performance.now(); return [...reports.values()].filter(r => t - r.at < FRESH); };
/** { away, why: closed | manual | locked | idle | here, idle: seconds since the last input, or null } */
export function now(awayMin) {
  const t = performance.now(), l = live();
  if (!l.length) return { away: true, why: 'closed', idle: null };
  const idle = Math.min(...l.map(r => r.idle + (t - r.at) / 1000));
  if (manual) return { away: true, why: 'manual', idle };
  if (l.some(r => r.locked)) return { away: true, why: 'locked', idle };
  return idle >= awayMin * 60 ? { away: true, why: 'idle', idle } : { away: false, why: 'here', idle };
}
/** The sessions a page on this PC shows now. */
export const viewing = () => new Set(live().map(r => r.viewing).filter(Boolean));
