// The changes view: what differs between a project's working tree and its last commit. Read only.

import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';   // what to compare with before the first commit
const MAX_FILES = 400, MAX_LINES = 4000, MAX_COUNTED = 1e6;

// --no-optional-locks: looking must never get in the way of a git command the agent is running.
const git = (cwd, args) => new Promise(res => execFile('git', ['--no-optional-locks', '-c', 'core.quotepath=off', '-C', cwd, ...args],
  { maxBuffer: 64e6, encoding: 'utf8', timeout: 20000 }, (err, out) => res({ code: err ? (typeof err.code === 'number' ? err.code : 1) : 0, out: out || '' })));

async function repo(cwd) {
  if (!cwd) return null;
  const top = await git(cwd, ['rev-parse', '--show-toplevel']);
  if (top.code) return null;
  const root = top.out.trim();
  const head = await git(root, ['rev-parse', '--verify', '-q', 'HEAD']);
  return { root, base: head.code ? EMPTY_TREE : 'HEAD' };
}

async function countLines(file) {
  try {
    const st = await fs.lstat(file);
    if (!st.isFile() || st.size > MAX_COUNTED) return null;
    const buf = await fs.readFile(file);
    if (buf.includes(0)) return null;
    let n = 0; for (const c of buf) if (c === 10) n++;
    return n + (buf.length && buf[buf.length - 1] !== 10 ? 1 : 0);
  } catch { return null; }
}

export async function changesFor(cwd) {
  const r = await repo(cwd);
  if (!r) return { repo: false, files: [], add: 0, del: 0 };
  const [num, stat] = await Promise.all([
    git(r.root, ['diff', '--numstat', '-z', '--no-renames', r.base]),
    git(r.root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames']),
  ]);
  const files = new Map();
  for (const rec of num.out.split('\0')) {
    const m = rec.match(/^(\d+|-)\t(\d+|-)\t([\s\S]+)$/);
    if (m) files.set(m[3], { path: m[3], add: m[1] === '-' ? 0 : +m[1], del: m[2] === '-' ? 0 : +m[2], binary: m[1] === '-', kind: 'changed' });
  }
  const fresh = [];
  for (const rec of stat.out.split('\0')) {
    if (rec.length < 4) continue;
    const xy = rec.slice(0, 2), p = rec.slice(3);
    if (xy === '??') { const f = { path: p, add: 0, del: 0, binary: false, kind: 'new' }; files.set(p, f); fresh.push(f); }
    else if (files.has(p)) files.get(p).kind = xy.includes('D') ? 'deleted' : xy.includes('A') ? 'new' : 'changed';
  }
  await Promise.all(fresh.slice(0, MAX_FILES).map(async f => { const n = await countLines(path.join(r.root, f.path)); if (n === null) f.binary = true; else f.add = n; }));
  const all = [...files.values()].sort((a, b) => a.path < b.path ? -1 : 1);
  return { repo: true, root: r.root, count: all.length, files: all.slice(0, MAX_FILES),
    add: all.reduce((n, f) => n + f.add, 0), del: all.reduce((n, f) => n + f.del, 0) };
}

export async function changeOf(cwd, rel) {
  const r = await repo(cwd);
  if (!r || !rel) return null;
  const abs = path.resolve(r.root, rel);
  if (abs !== r.root && !abs.startsWith(r.root + path.sep)) return null;
  const p = path.relative(r.root, abs);
  const st = await git(r.root, ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', p]);
  const d = st.out.startsWith('??')
    ? await git(r.root, ['diff', '--no-color', '--no-index', '--', '/dev/null', p])
    : await git(r.root, ['diff', '--no-color', '--no-renames', r.base, '--', p]);
  const lines = [];
  let body = false, binary = false, cut = false;
  for (const l of d.out.split('\n')) {
    if (!body) { if (l.startsWith('Binary files ') || l.startsWith('GIT binary patch')) binary = true; if (!l.startsWith('@@')) continue; body = true; }
    if (l.startsWith('\\')) continue;
    if (lines.length >= MAX_LINES) { cut = true; break; }
    lines.push({ t: l.startsWith('@@') ? 'hd' : l[0] === '+' ? 'p' : l[0] === '-' ? 'm' : 'c', s: l.startsWith('@@') ? l.replace(/^(@@[^@]*@@).*/, '$1') : l });
  }
  if (lines.length && lines[lines.length - 1].s === '') lines.pop();
  return { path: p, lines, binary, cut };
}
