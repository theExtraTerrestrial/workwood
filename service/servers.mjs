// Servers: a project's dev server and its companions (a worker, a queue) running in a checkout or worktree, whoever
// started them. Workwood finds them by asking the computer which processes listen on a port and which folder each runs
// in; a repo that lists its servers (.workwood/servers.json, or a Procfile) can also have Workwood start them, each
// worktree on its own ports. Workwood knows nothing of Foreman or Rails: it runs the lines it is given.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import net from 'node:net';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { placeOf } from './sources.mjs';

const run = promisify(execFile);
const LINUX = process.platform === 'linux', MAC = process.platform === 'darwin';
const KEEP = 200_000;                          // characters of a server's output kept
const WATCH_FOR = 10 * 60_000;                 // a folder is looked at for this long after a window last showed it
const SAVED = path.join(os.homedir(), '.config', 'workwood', 'servers.json');
const PORT_FROM = +process.env.WORKWOOD_PORT_FROM || 3100, PORT_STEP = 10, PORT_TO = 9900;

let saved = (() => { try { return JSON.parse(fs.readFileSync(SAVED, 'utf8')); } catch { return {}; } })();
saved.ports ||= {};   // top -> first port of its block
saved.setup ||= {};   // top -> { root, teardown }: the checkout it was made from and what undoes its setup, once its setup has run
const save = () => { try { fs.mkdirSync(path.dirname(SAVED), { recursive: true }); fs.writeFileSync(SAVED + '.tmp', JSON.stringify(saved)); fs.renameSync(SAVED + '.tmp', SAVED); } catch {} };

const watched = new Map();   // top -> when a window last showed a session there (performance.now())
const own = new Map();       // `${top}\n${name}` -> a server Workwood started
let found = new Map();       // top -> [server] from the last look
let onChange = () => {}, timer = null, looking = null;

/** Starts looking every few seconds; `changed` is called when what is running changes. */
export function watchServers(changed) { onChange = changed; if (!timer) { timer = setInterval(look, 3000); timer.unref(); } }
/** A window shows a session working in `top`: look there for a while. */
export function watch(top) { if (!top) return; const had = watched.has(top); watched.set(top, performance.now()); if (!had) look(); }

/* ---------- what a repo lists ---------- */
// JSON with // comments allowed (outside strings).
function parseLoose(text) {
  let out = '', str = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (str) { out += c; if (c === '\\') out += text[++i] ?? ''; else if (c === '"') str = false; continue; }
    if (c === '"') { str = true; out += c; continue; }
    if (c === '/' && text[i + 1] === '/') { while (i < text.length && text[i] !== '\n') i++; out += '\n'; continue; }
    out += c;
  }
  return JSON.parse(out.replace(/,(\s*[}\]])/g, '$1'));
}
const confCache = new Map();
/** What a checkout lists: its Procfile's lines, the setup and teardown commands, and which one has the page. Null for none. */
export async function confOf(top) {
  if (!top) return null;
  const had = confCache.get(top);
  if (had && performance.now() - had.at < 2500) return had.v;
  let v = null;
  try {
    let c = {};
    try { c = parseLoose(await fsp.readFile(path.join(top, '.workwood', 'servers.json'), 'utf8')) || {}; } catch (e) { if (e.code !== 'ENOENT') c = { error: 'Workwood could not read .workwood/servers.json: ' + e.message }; }
    let file = typeof c.procfile === 'string' ? c.procfile : null, text = null;
    for (const f of file ? [file] : ['Procfile.dev', 'Procfile']) { try { text = await fsp.readFile(path.join(top, f), 'utf8'); file = f; break; } catch {} }
    const lines = [];
    for (const l of (text || '').split('\n')) { const m = /^\s*([A-Za-z0-9_-]+)\s*:\s*(.+?)\s*$/.exec(l); if (m && !l.trim().startsWith('#')) lines.push({ name: m[1], cmd: m[2] }); }
    if (lines.length || c.error) {
      const open = lines.some(l => l.name === c.open) ? c.open : lines.some(l => l.name === 'web') ? 'web' : lines[0]?.name || null;
      v = { file, lines, open, setup: typeof c.setup === 'string' ? c.setup : null, teardown: typeof c.teardown === 'string' ? c.teardown : null, error: c.error || null };
    }
  } catch {}
  confCache.set(top, { at: performance.now(), v });
  return v;
}

/* ---------- ports: a block of ten for each checkout, the same every time ---------- */
function baseOf(top) {
  if (saved.ports[top]) return saved.ports[top];
  const used = new Set(Object.values(saved.ports));
  let p = PORT_FROM; while (used.has(p) && p < PORT_TO) p += PORT_STEP;
  saved.ports[top] = p; save();
  return p;
}
const free = port => new Promise(r => { const s = net.createServer(); s.once('error', () => r(false)); s.listen(port, '127.0.0.1', () => s.close(() => r(true))); });
const listening = port => new Promise(r => {
  let left = 2; const one = host => { const c = net.connect({ port, host }); c.setTimeout(800);
    const end = ok => { c.destroy(); if (ok) { left = -9; r(true); } else if (--left === 0) r(false); };
    c.once('connect', () => end(true)); c.once('error', () => end(false)); c.once('timeout', () => end(false)); };
  one('127.0.0.1'); one('::1');
});

/* ---------- the processes on this computer ---------- */
const SHELLS = new Set(['sh', 'bash', 'zsh', 'fish', 'dash', 'ksh', 'tcsh', 'csh']);
const RUNNERS = new Set(['env', 'exec', 'sh', 'bash', 'zsh', 'dash', 'node', 'nodejs', 'ruby', 'python', 'python3', 'bundle', 'npx', 'npm', 'yarn', 'pnpm', 'bun', 'deno', 'run', 'run-script', 'uv', 'poetry', 'pipenv', 'perl', 'php', 'java']);
const TOOLS = /vscode-server|\.vscode|\.cursor-server|code-server|language-?server|tsserver|typingsInstaller|gopls|rust-analyzer|solargraph|ruby-lsp|pyright|pylsp|eslint_?d|jdtls|clangd|copilot/i;
const base = a => path.basename(String(a || '')).replace(/^-/, '');
// A login or interactive shell: a shell with no script and no -c. Climbing from a server stops below it.
const interactive = p => SHELLS.has(base(p.argv[0])) && !p.argv.slice(1).some(a => !a.startsWith('-') || /^-[a-z]*c/i.test(a));
const claudeProc = p => p.argv.slice(0, 3).some(a => base(a) === 'claude' || /claude-code|claude-agent-sdk/.test(a));
// What a command is, past its interpreter: `ruby bin/rails server` and `bundle exec rails s` are both "rails".
function partsOf(argv) {
  let a = argv.length === 1 && /\s/.test(argv[0]) ? argv[0].split(/\s+/) : argv.slice();   // a process that renamed itself
  let i = 0;
  while (i < a.length && (RUNNERS.has(base(a[i])) || /^[A-Z_][A-Z0-9_]*=/.test(a[i]) || (a[i].startsWith('-') && i > 0))) i++;
  return a.slice(i < a.length ? i : 0);
}
const keyOf = argv => base(partsOf(argv)[0] || argv[0]).replace(/\.(rb|js|mjs|py|sh)$/, '');
const nameOf = argv => { const w = partsOf(argv)[0] || argv[0] || '?'; return path.isAbsolute(w) ? path.basename(w) : w; };
const cmdOf = argv => (argv.length === 1 ? argv[0] : argv.map(a => /\s/.test(a) ? `'${a}'` : a).join(' ')).slice(0, 400);
const keyOfLine = cmd => keyOf(cmd.replace(/\$\{?PORT\}?/g, '0').split(/\s+/));

let bootMs = null;
async function boot() { if (bootMs == null) { try { bootMs = +/^btime (\d+)/m.exec(await fsp.readFile('/proc/stat', 'utf8'))[1] * 1000; } catch { bootMs = 0; } } return bootMs; }
const TICK = 100;   // clock ticks a second (USER_HZ), the same on every Linux this runs on

/** Every process of this user: pid -> { pid, ppid, pgid, argv, cwd, start }. */
async function processes() {
  const out = new Map();
  if (LINUX) {
    const bt = await boot();
    await Promise.all((await fsp.readdir('/proc')).filter(d => /^\d+$/.test(d)).map(async d => {
      try {
        const [stat, cmd, cwd] = await Promise.all([fsp.readFile(`/proc/${d}/stat`, 'utf8'), fsp.readFile(`/proc/${d}/cmdline`, 'utf8'), fsp.readlink(`/proc/${d}/cwd`)]);
        const f = stat.slice(stat.lastIndexOf(')') + 2).split(' '), argv = cmd.split('\0'); while (argv.length && !argv[argv.length - 1]) argv.pop();
        if (!argv.length || f[0] === 'Z') return;
        out.set(+d, { pid: +d, ppid: +f[1], pgid: +f[2], argv, cwd: cwd.replace(/ \(deleted\)$/, ''), start: bt + (+f[19] / TICK) * 1000 });
      } catch {}
    }));
  } else if (MAC) {
    try {
      const { stdout } = await run('ps', ['-x', '-o', 'pid=,ppid=,pgid=,etime=,command='], { maxBuffer: 16 << 20 });
      for (const l of stdout.split('\n')) {
        const m = /^\s*(\d+)\s+(\d+)\s+(\d+)\s+(\S+)\s+(.*)$/.exec(l); if (!m) continue;
        const e = m[4].split(/[-:]/).map(Number), secs = e.reduce((a, n, i) => a + n * [1, 60, 3600, 86400][e.length - 1 - i], 0);
        out.set(+m[1], { pid: +m[1], ppid: +m[2], pgid: +m[3], argv: m[5].split(/\s+/), cwd: null, start: Date.now() - secs * 1000 });
      }
      const { stdout: cw } = await run('lsof', ['-nP', '-a', '-d', 'cwd', '-u', String(os.userInfo().uid), '-Fpn'], { maxBuffer: 16 << 20 });
      let pid = null; for (const l of cw.split('\n')) { if (l[0] === 'p') pid = +l.slice(1); else if (l[0] === 'n' && out.has(pid)) out.get(pid).cwd = l.slice(1); }
    } catch {}
  }
  return out;
}
/** Which of `pids` listen on a TCP port: pid -> [port]. */
async function ports(pids) {
  const by = new Map();
  if (LINUX) {
    const inode = new Map();
    for (const f of ['/proc/net/tcp', '/proc/net/tcp6']) {
      try { for (const l of (await fsp.readFile(f, 'utf8')).split('\n').slice(1)) { const c = l.trim().split(/\s+/); if (c[3] === '0A') inode.set(c[9], parseInt(c[1].split(':').pop(), 16)); } } catch {}
    }
    if (!inode.size) return by;
    await Promise.all(pids.map(async pid => {
      try {
        for (const fd of await fsp.readdir(`/proc/${pid}/fd`)) {
          let l; try { l = await fsp.readlink(`/proc/${pid}/fd/${fd}`); } catch { continue; }
          const m = /^socket:\[(\d+)\]$/.exec(l), port = m && inode.get(m[1]);
          if (port != null) { const a = by.get(pid) || []; if (!a.includes(port)) a.push(port); by.set(pid, a); }
        }
      } catch {}
    }));
  } else if (MAC && pids.length) {
    try {
      const { stdout } = await run('lsof', ['-nP', '-a', '-iTCP', '-sTCP:LISTEN', '-p', pids.join(','), '-Fpn'], { maxBuffer: 16 << 20 });
      let pid = null; for (const l of stdout.split('\n')) { if (l[0] === 'p') pid = +l.slice(1); else if (l[0] === 'n') { const port = +l.split(':').pop(); const a = by.get(pid) || []; if (port && !a.includes(port)) a.push(port); by.set(pid, a); } }
    } catch {}
  }
  for (const a of by.values()) a.sort((x, y) => x - y);
  return by;
}

const within = (dir, top) => dir === top || (dir || '').startsWith(top + path.sep);
let lastProcs = new Map();
/** Looks again: which servers run in the checkouts a window shows, and in those with servers Workwood started. */
async function look() {
  if (looking) return looking;
  return looking = (async () => {
    for (const [t, at] of watched) if (performance.now() - at > WATCH_FOR && ![...own.values()].some(o => o.top === t)) watched.delete(t);
    await gone();
    const tops = new Set([...watched.keys(), ...[...own.values()].map(o => o.top)]);
    const next = new Map([...tops].map(t => [t, []]));
    if ((LINUX || MAC) && tops.size) {
      const procs = await processes(); lastProcs = procs;
      const kids = new Map(); for (const p of procs.values()) { if (!kids.has(p.ppid)) kids.set(p.ppid, []); kids.get(p.ppid).push(p); }
      const ownPid = new Map(); for (const o of own.values()) if (o.child && o.state !== 'exited') ownPid.set(o.child.pid, o);
      // The processes in a watched checkout, each with its checkout's top (the most specific: a worktree inside the main checkout is its own).
      const where = new Map(), topOf = new Map();
      for (const p of procs.values()) {
        if (!p.cwd || p.pid === process.pid || ![...tops].some(t => within(p.cwd, t))) continue;
        if (!topOf.has(p.cwd)) topOf.set(p.cwd, (await placeOf(p.cwd)).top);
        const t = topOf.get(p.cwd); if (tops.has(t)) where.set(p.pid, t);
      }
      const lp = await ports([...where.keys()]);
      for (const top of tops) {
        const conf = await confOf(top), keys = new Map((conf?.lines || []).map(l => [keyOfLine(l.cmd), l.name]));
        const lineOf = p => keys.get(keyOf(p.argv)) || null;
        const mine = [...where].filter(([, t]) => t === top).map(([pid]) => procs.get(pid));
        const hit = p => !TOOLS.test(p.argv.join(' ')) && !claudeProc(p) && !interactive(p) && (lp.has(p.pid) || !!lineOf(p) || ownPid.has(p.pid));
        const isHit = new Set(mine.filter(hit).map(p => p.pid));
        // Each one climbs to the top of its group: up through its parents in the same checkout, stopping below a
        // terminal's shell, Claude Code, or this service.
        const roots = new Map();
        for (const pid of isHit) {
          let p = procs.get(pid);
          while (!ownPid.has(p.pid)) {
            const up = procs.get(p.ppid);
            if (!up || up.pid === process.pid || where.get(up.pid) !== top || interactive(up) || claudeProc(up) || TOOLS.test(up.argv.join(' '))) break;
            p = up;
          }
          if (!roots.has(p.pid)) roots.set(p.pid, []);
          roots.get(p.pid).push(procs.get(pid));
        }
        const by = (p, f) => { for (let q = p; q; q = procs.get(q.ppid)) { if (f(q)) return q; if (q.pid === 1 || q.ppid === q.pid) break; } return null; };
        for (const [rid, members] of roots) {
          const root = procs.get(rid), o = ownPid.get(rid);
          const who = o ? 'workwood' : by(root, q => q.pid === process.pid) ? 'agent' : 'you';
          // The members under the root, each counted once at its highest hit below the root, with the ports of all under it.
          const kidOf = new Map();
          for (const m of members) {
            if (m.pid === rid) continue;
            let top1 = m; for (let q = procs.get(m.ppid); q && q.pid !== rid; q = procs.get(q.ppid)) if (isHit.has(q.pid)) top1 = q;
            const k = kidOf.get(top1.pid) || { p: top1, ports: [] }; for (const x of lp.get(m.pid) || []) if (!k.ports.includes(x)) k.ports.push(x); kidOf.set(top1.pid, k);
          }
          const all = [...new Set(members.flatMap(m => lp.get(m.pid) || []))].sort((a, b) => a - b);
          let list = [...kidOf.values()].map(k => ({ name: lineOf(k.p) || nameOf(k.p.argv), ports: k.ports.sort((a, b) => a - b), cmd: cmdOf(k.p.argv) }));
          const single = list.length === 1 && !isHit.has(rid) ? [...kidOf.values()][0].p : null;   // a wrapper around one: show the one
          if (single) list = [];
          const shown = single || root;
          const s = { id: 'p' + rid, pid: rid, top, who, name: o?.name || lineOf(shown) || lineOf(root) || nameOf(shown.argv), cmd: o?.cmd || cmdOf(root.argv), ports: all, kids: list,
            start: root.start, lines: [...new Set([lineOf(root), ...members.map(lineOf)].filter(Boolean))], argv: root.argv };
          if (o) { o.ports = all; continue; }   // shown as Workwood's own, below
          next.get(top).push(s);
        }
      }
    }
    for (const o of own.values()) if (next.has(o.top)) next.get(o.top).push(pubOwn(o));
    for (const l of next.values()) l.sort((a, b) => (a.who === 'workwood') - (b.who === 'workwood') || a.start - b.start);
    const was = JSON.stringify([...found]), now = JSON.stringify([...next]);
    found = next;
    if (was !== now) onChange();
  })().finally(() => { looking = null; });
}
const pubOwn = o => ({ id: o.id, pid: o.child?.pid || null, top: o.top, who: 'workwood', by: o.by, name: o.name, cmd: o.cmd, ports: o.state === 'exited' ? [] : o.ports || [], kids: [],
  start: o.start, state: o.state, code: o.code ?? null, port: o.port, setup: o.name === 'setup' || undefined, lines: o.name === 'setup' ? [] : [o.name] });

// The agent's background commands, so a server one of them started is shown on its row: [{ id, cmd, name, sessionId }].
let tasksOf = () => [];
export function linkTasks(f) { tasksOf = f; }
const taskFor = s => { if (s.who !== 'agent') return null; const text = s.argv.join(' '); return tasksOf().find(t => t.cmd && text.includes(t.cmd.trim())) || null; };
/** What runs in each checkout looked at: top -> { list, conf }. */
export async function serversNow() {
  const out = {};
  for (let [top, list] of found) {
    const c = await confOf(top);
    const at = s => s.who === 'workwood' ? (c?.lines.findIndex(l => l.name === s.name) ?? 0) + (s.name === 'setup' ? -1 : 0) : -2;   // Workwood's own in the Procfile's order, after the rest
    list = [...list].sort((a, b) => at(a) - at(b) || a.start - b.start);
    out[top] = { root: (await placeOf(top)).root, list: list.map(({ argv, ...s }) => ({ ...s, task: (t => t && { id: t.id, sessionId: t.sessionId, name: t.name })(taskFor({ ...s, argv })), restart: s.who === 'workwood' ? s.name !== 'setup' : !!c && s.lines.length > 0 })),
      conf: c && { file: c.file, names: c.lines.map(l => l.name), open: c.open, error: c.error, setup: !!c.setup, done: !!saved.setup[top] } };
  }
  return out;
}

/* ---------- starting the repo's own ---------- */
const ownKey = (top, name) => top + '\n' + name;
let ownSeq = 0;
function envFor(top, pl, port) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) if (/^(WORKWOOD_|CLAUDE|ELECTRON_)/.test(k)) delete env[k];
  return { ...env, PYTHONUNBUFFERED: '1', PORT: String(port), WORKWOOD_WORKTREE: pl.worktree || '', WORKWOOD_BRANCH: pl.branch || '', WORKWOOD_CHECKOUT: pl.root || top };
}
function launch(top, name, cmd, port, env, by = null) {
  const key = ownKey(top, name), had = own.get(key);
  const o = { id: had?.id || 'w' + (++ownSeq), top, name, cmd, port, by: by || had?.by || null, out: '', start: Date.now(), t0: performance.now(), state: 'running', code: null, ports: [] };
  const child = spawn('/bin/sh', ['-c', cmd], { cwd: top, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  o.child = child; o.gone = new Promise(r => { o.ended = r; });
  const take = d => { o.out = (o.out + d).slice(-KEEP); };
  child.stdout.on('data', take); child.stderr.on('data', take);
  child.on('error', e => { take(`\n${e.message}\n`); });
  child.on('exit', (code, sig) => {
    o.state = 'exited'; o.code = code ?? (sig ? 128 : null); o.ended();
    if (o.stopping) own.delete(key); else take(`\n[exited${code != null ? ' with code ' + code : sig ? ' on ' + sig : ''}]\n`);
    look();
  });
  own.set(key, o);
  return o;
}
async function runSetup(top, conf, pl, by) {
  if (!conf.setup || saved.setup[top]) return null;
  const o = launch(top, 'setup', conf.setup, baseOf(top), envFor(top, pl, baseOf(top)), by);
  o.state = 'setup'; look();
  await o.gone;
  if (o.code !== 0) { o.state = 'exited'; throw new Error(`The setup (${conf.setup}) ended with code ${o.code}. Its output is in the list.`); }
  own.delete(ownKey(top, 'setup'));
  saved.setup[top] = { root: pl.root || top, teardown: conf.teardown || null }; save();
  return null;
}
/** Starts the lines of a checkout's Procfile that are not running yet (all, or the ones named), its setup first.
 * `by`: the session they were started for (from its window, or by its agent), shown on its row in the sidebar. */
export async function start(top, names = null, by = null) {
  const conf = await confOf(top);
  if (!conf?.lines.length) throw new Error(conf?.error || 'This folder lists no servers (.workwood/servers.json, Procfile.dev or Procfile).');
  const want = names?.length ? names : conf.lines.map(l => l.name);
  const bad = want.filter(n => !conf.lines.some(l => l.name === n));
  if (bad.length) throw new Error(`No server named ${bad.join(', ')} here. It lists ${conf.lines.map(l => l.name).join(', ')}.`);
  watch(top); await look();
  const pl = await placeOf(top), from = baseOf(top);
  await runSetup(top, conf, pl, by);
  const busy = new Set((found.get(top) || []).filter(s => s.who !== 'workwood' || s.state !== 'exited').flatMap(s => s.lines || []));
  const started = [];
  for (const name of want) {
    if (busy.has(name)) continue;
    const i = conf.lines.findIndex(l => l.name === name), port = from + i;
    if (!await free(port)) throw new Error(`Port ${port}, kept for ${name} in this folder, is taken by something else.`);
    const cmd = conf.lines[i].cmd;
    launch(top, name, cmd, port, envFor(top, pl, port), by); started.push(name);
  }
  watch(top); await look();
  return { started, already: want.filter(n => busy.has(n)) };
}
/** Waits until the named servers listen on their port (or have kept running a moment, for one without a page). */
export async function ready(top, names, ms = 90_000) {
  const t0 = performance.now(), conf = await confOf(top), out = [];
  for (const name of names) {
    const o = own.get(ownKey(top, name)), port = o?.port ?? (baseOf(top) + conf.lines.findIndex(l => l.name === name));
    let ok = false;
    while (performance.now() - t0 < ms) {
      if (o && o.state === 'exited') break;
      if (await listening(port)) { ok = true; break; }
      if (o && name !== conf.open && performance.now() - o.t0 > 3000) { ok = 'up'; break; }
      await new Promise(r => setTimeout(r, 400));
    }
    out.push({ name, port, ok, code: o?.code ?? null });
  }
  return out;
}

/* ---------- stopping ---------- */
const alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } };
function treeOf(pid) { const out = [], walk = p => { for (const q of lastProcs.values()) if (q.ppid === p) { walk(q.pid); out.push(q.pid); } }; walk(pid); out.push(pid); return out; }
function killGroup(pid, pgid, sig) {
  // A group of its own (a terminal's job, or one Workwood started) goes as a whole; otherwise the tree, deepest first.
  const mine = (() => { try { return lastProcs.get(process.pid)?.pgid ?? null; } catch { return null; } })();
  if (pgid === pid && pgid !== mine) { try { process.kill(-pgid, sig); return; } catch {} }
  for (const p of treeOf(pid)) try { process.kill(p, sig); } catch {}
}
/** Stops a server by its id: one Workwood started, or one found running (its whole group). */
export async function stop(top, id) {
  const o = [...own.values()].find(x => x.id === id && x.top === top);
  if (o) {
    o.stopping = true;
    if (o.state === 'exited') { own.delete(ownKey(o.top, o.name)); await look(); return; }
    killGroup(o.child.pid, o.child.pid, 'SIGTERM');
    const t = setTimeout(() => killGroup(o.child.pid, o.child.pid, 'SIGKILL'), 5000);
    await Promise.race([o.gone, new Promise(r => setTimeout(r, 6000))]); clearTimeout(t);
    own.delete(ownKey(o.top, o.name)); await look(); return;
  }
  const s = (found.get(top) || []).find(x => x.id === id);
  if (!s) throw new Error('That server is no longer running.');
  const p = lastProcs.get(s.pid);
  if (!p || Math.abs(p.start - s.start) > 2000) throw new Error('That server is no longer running.');
  killGroup(p.pid, p.pgid, 'SIGTERM');
  for (let i = 0; i < 25 && alive(p.pid); i++) await new Promise(r => setTimeout(r, 200));
  if (alive(p.pid)) killGroup(p.pid, p.pgid, 'SIGKILL');
  await new Promise(r => setTimeout(r, 200));
  await look();
}
/** Restarts one Workwood started, or stops one found running and starts its Procfile lines in its place. */
export async function restart(top, id, by = null) {
  const o = [...own.values()].find(x => x.id === id && x.top === top);
  const names = o ? [o.name] : (found.get(top) || []).find(x => x.id === id)?.lines || [];
  if (!names.length) throw new Error('Workwood does not know how to start that one again.');
  const was = o?.by || by;
  await stop(top, id);
  return start(top, names, was);
}
/** Stops what Workwood started in `top` (all, or the ones named). */
export async function stopNamed(top, names = null) {
  const list = (found.get(top) || []).filter(s => !names?.length || s.lines?.some(n => names.includes(n)) || names.includes(s.name));
  for (const s of list) await stop(top, s.id);
  return list.map(s => s.name);
}
/** The end of a server's output, when Workwood holds it (one it started). */
export function output(top, id) {
  const o = [...own.values()].find(x => x.id === id && x.top === top);
  return o ? o.out.replace(/\x1b\[[0-9;?]*[A-Za-z]|\x1b\][^\x07]*\x07/g, '').replace(/\r(?!\n)/g, '\n') : null;
}
/** The servers Workwood started that are still running, for the question before quitting. */
export const running = () => [...own.values()].filter(o => o.state !== 'exited').map(o => ({ top: o.top, name: o.name }));
/** Stops everything Workwood started, at once (Workwood is quitting). */
export function stopAll() { for (const o of own.values()) if (o.child && o.state !== 'exited') try { process.kill(-o.child.pid, 'SIGTERM'); } catch {} }

/* ---------- a worktree that was removed: its servers stop, and its teardown runs from the checkout it was made from ---------- */
async function gone() {
  for (const [top, was] of Object.entries(saved.setup)) {
    if (fs.existsSync(top)) continue;
    const root = was?.root || String(was);
    delete saved.setup[top]; delete saved.ports[top]; save();
    for (const o of [...own.values()]) if (o.top === top) await stop(top, o.id).catch(() => {});
    const teardown = was?.teardown || (await confOf(root))?.teardown;   // as it was when the setup ran: the list may have left with the worktree
    if (teardown && fs.existsSync(root)) {
      const name = path.basename(top);
      const child = spawn('/bin/sh', ['-c', teardown], { cwd: root, env: { ...envFor(root, { root, worktree: name, branch: '' }, 0), WORKWOOD_WORKTREE: name }, stdio: 'ignore', detached: true });
      child.on('error', () => {}); child.unref();
    }
  }
}
