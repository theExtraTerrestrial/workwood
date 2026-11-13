// The terminal view: a real Claude Code terminal for a session, running inside the service
// so it keeps going while you look at something else. One per session at most.
import pty from 'node-pty';

export const terms = new Map(); // sessionId -> terminal
const KEEP = 400_000;           // characters of output kept for a window that attaches later

/** Starts a terminal for a session, or returns the one already running. */
export function openTerm({ sessionId, cwd, file, args, env, cols, rows, onChange }) {
  const had = terms.get(sessionId);
  if (had) return had;
  const p = pty.spawn(file, args, { name: 'xterm-256color', cols: size(cols, 100), rows: size(rows, 30), cwd, env: { ...env, TERM: 'xterm-256color', COLORTERM: 'truecolor' } });
  const t = { p, sessionId, out: '', clients: new Set(), startedAt: Date.now(), done: null };
  t.gone = new Promise(r => { t.done = r; });
  const tell = (type, data) => { const msg = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`; for (const c of t.clients) c.write(msg); };
  p.onData(d => { t.out = (t.out + d).slice(-KEEP); tell('data', d); });
  p.onExit(({ exitCode }) => {
    if (terms.get(sessionId) === t) terms.delete(sessionId);
    tell('exit', { code: exitCode });
    for (const c of t.clients) c.end();
    t.done(); onChange?.();
  });
  terms.set(sessionId, t);
  onChange?.();
  return t;
}
const size = (n, d) => Math.max(2, Math.min(500, Math.floor(Number(n)) || d));

/** Sends what the terminal printed so far, then everything it prints from now on. */
export function attach(sessionId, res) {
  const t = terms.get(sessionId);
  if (!t) return false;
  if (t.out) res.write(`event: data\ndata: ${JSON.stringify(t.out)}\n\n`);
  t.clients.add(res);
  res.on('close', () => t.clients.delete(res));
  return true;
}
export function typeInto(sessionId, data) { const t = terms.get(sessionId); if (!t) return false; t.p.write(String(data)); return true; }
export function resize(sessionId, cols, rows) { const t = terms.get(sessionId); if (!t) return false; try { t.p.resize(size(cols, 100), size(rows, 30)); } catch {} return true; }

/** Ends a session's terminal and waits until it is really gone. */
export async function closeTerm(sessionId) {
  const t = terms.get(sessionId);
  if (!t) return;
  try { t.p.kill('SIGHUP'); } catch {}
  const timer = setTimeout(() => { try { t.p.kill('SIGKILL'); } catch {} }, 2000);
  await t.gone; clearTimeout(timer);
}
export function closeAll() { for (const t of terms.values()) try { t.p.kill('SIGHUP'); } catch {} }
