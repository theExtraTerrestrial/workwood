// A throwaway HOME for tests, in the same spirit as Claudius's own test suite:
// a plausible ~/.claude pool, profiles with made-up tokens, a fake `claude` that
// plays a scripted agent, and the real `claudius` reading all of it. Nothing here
// touches the real home; `assertContained` checks that at the end.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REAL_HOME = os.homedir();
const REAL_CLAUDIUS = execFileSync('bash', ['-lc', 'readlink -f "$(command -v claudius)"'], { encoding: 'utf8' }).trim();
const NODE = process.execPath;
const w = (file, text, mode) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text, mode ? { mode } : undefined); };
const now = () => Math.floor(Date.now() / 1000);

export const ACCOUNTS = { live: '11111111-1111-4111-8111-111111111111', other: '22222222-2222-4222-8222-222222222222', full: '33333333-3333-4333-8333-333333333333' };

export function makeSandbox() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'workwood-test.'));
  const home = path.join(root, 'home'), bin = path.join(root, 'bin');
  const creds = name => JSON.stringify({ claudeAiOauth: { accessToken: 'tok-' + name, refreshToken: 'rt', expiresAt: (now() + 3600) * 1000, subscriptionType: 'pro' } });
  const ident = name => JSON.stringify({ oauthAccount: { emailAddress: `${name}@example.com`, accountUuid: ACCOUNTS[name], organizationName: 'Test' }, hasCompletedOnboarding: true, projects: {} });

  // the global pool: ~/.claude is the live account
  for (const d of ['agents', 'commands', 'skills', 'plans', 'tasks', 'sessions', 'file-history', 'plugins']) fs.mkdirSync(path.join(home, '.claude', d), { recursive: true });
  w(path.join(home, '.claude', 'CLAUDE.md'), '');
  w(path.join(home, '.claude', 'history.jsonl'), '');
  w(path.join(home, '.claude', 'settings.json'), JSON.stringify({ model: 'sonnet', effortLevel: 'high' }));
  w(path.join(home, '.claude', '.credentials.json'), creds('live'), 0o600);
  w(path.join(home, '.claude.json'), ident('live'));

  // three profiles: the live one, a second account, and one at its 5-hour limit
  const usage = { live: [34, 41], other: [12, 20], full: [100, 72] };
  for (const name of Object.keys(ACCOUNTS)) {
    const d = path.join(home, '.claude-profiles', name);
    w(path.join(d, '.credentials.json'), creds(name), 0o600);
    w(path.join(d, '.claude.json'), ident(name));
    w(path.join(d, '.usage'), `${usage[name][0]} ${usage[name][1]} ${now()} ${now() + 1700} ${now() + 400000}\n`, 0o600);
  }
  w(path.join(home, '.claude-profiles', '.active_profile'), 'live');

  // two projects with past sessions
  const projects = {};
  for (const p of ['alpha', 'beta']) { projects[p] = path.join(home, 'workspace', p); fs.mkdirSync(projects[p], { recursive: true }); }
  w(path.join(projects.alpha, '.claude', 'skills', 'mockup', 'SKILL.md'), '---\nname: mockup\ndescription: Build standalone mockups\n---\n');
  // beta is a git repository with a commit, and then some changes on top of it
  const g = (...args) => execFileSync('git', ['-C', projects.beta, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', '-c', 'commit.gpgsign=false', ...args],
    { env: { ...process.env, HOME: home, GIT_CONFIG_NOSYSTEM: '1' }, stdio: 'ignore' });
  w(path.join(projects.beta, 'notes.txt'), 'one\ntwo\nthree\n'); w(path.join(projects.beta, 'old.txt'), 'gone soon\n');
  g('init', '-q', '-b', 'main'); g('add', '-A'); g('commit', '-q', '-m', 'start');
  w(path.join(projects.beta, 'notes.txt'), 'one\n2\nthree\nfour\n'); fs.rmSync(path.join(projects.beta, 'old.txt'));
  w(path.join(projects.beta, 'fresh.md'), '# Fresh\nA new file.\n'); fs.writeFileSync(path.join(projects.beta, 'pic.bin'), Buffer.from([1, 0, 2, 0, 3]));
  const sb = { root, home, bin, projects, log: path.join(root, 'claude.log'), agents: path.join(root, 'agents.json'), sessions: {} };
  sb.sessions.alphaLive = addSession(sb, 'alpha', 'live', 'Tidy the alpha readme', 'The readme is tidied.', 300);
  sb.sessions.betaOther = addSession(sb, 'beta', 'other', 'Add a beta changelog', 'The changelog is added.', 7200);
  sb.sessions.betaFable = addSession(sb, 'beta', 'other', 'Plan the beta launch', 'Planned.', 9000, { model: 'claude-fable-5-2', effort: 'xhigh' });
  sb.sessions.alphaOutside = addSession(sb, 'alpha', 'live', 'Refactor the alpha parser', 'Working on it.', 60);
  w(sb.agents, JSON.stringify([{ pid: 1, cwd: projects.alpha, kind: 'interactive', sessionId: sb.sessions.alphaOutside, name: 'outside', status: 'busy' }]));
  w(sb.log, '');

  // fake commands, first on PATH
  w(path.join(bin, 'claude'), `#!${NODE}\nimport(${JSON.stringify(path.join(HERE, 'fake-claude.mjs'))});\n`, 0o755);
  // The real claudius does the listing. `refresh` would call the real token endpoint, so it is only recorded.
  w(path.join(bin, 'claudius'), `#!/usr/bin/env bash\nif [[ "\${1:-}" == "refresh" ]]; then echo "claudius refresh \${2:-}" >> ${JSON.stringify(sb.log)}; exit 0; fi\nexec ${JSON.stringify(REAL_CLAUDIUS)} "$@"\n`, 0o755);

  // Opening an editor or a terminal is only recorded.
  for (const name of ['code', 'terminal']) w(path.join(bin, name), `#!/usr/bin/env bash\necho "${name} $*" >> ${JSON.stringify(sb.log)}\n`, 0o755);

  sb.env = { ...Object.fromEntries(Object.entries(process.env).filter(([k]) => !/^CLAUDE|^ANTHROPIC|^WORKWOOD|^NODE_|^npm_/.test(k))),
    HOME: home, PATH: `${bin}:${process.env.PATH}`, ASDF_DATA_DIR: process.env.ASDF_DATA_DIR || path.join(REAL_HOME, '.asdf'),
    FAKE_CLAUDE_LOG: sb.log, FAKE_CLAUDE_AGENTS: sb.agents, WORKWOOD_TOKEN: 'test-token', WORKWOOD_STT: path.join(HERE, 'fake-stt.mjs'), WORKWOOD_TERMINAL: path.join(bin, 'terminal') };
  return sb;
}

let counter = 0;
/** Writes a small finished session into the pool, owned by one of the accounts. */
export function addSession(sb, project, owner, prompt, reply, ageSeconds = 0, ran = {}) {
  const id = `00000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;
  const cwd = sb.projects[project], dir = path.join(sb.home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));
  const ts = new Date(Date.now() - ageSeconds * 1000).toISOString();
  const base = { cwd, sessionId: id, timestamp: ts, version: '2.1.322', gitBranch: 'main', isSidechain: false, userType: 'external' };
  const lines = [
    { type: 'session-owner', accountUuid: ACCOUNTS[owner], sessionId: id },
    { ...base, type: 'user', uuid: id + '-u', parentUuid: null, message: { role: 'user', content: prompt } },
    { ...base, type: 'assistant', uuid: id + '-a', parentUuid: id + '-u', ...(ran.effort ? { effort: ran.effort } : {}), message: { role: 'assistant', model: ran.model || 'claude-test', content: [{ type: 'tool_use', id: 't1', name: 'Read', input: { file_path: path.join(cwd, 'README.md') } }, { type: 'text', text: reply }], usage: { input_tokens: 40000, output_tokens: 2000 } } },
    { ...base, type: 'system', subtype: 'turn_duration', durationMs: 192000, uuid: id + '-s' },
  ];
  const file = path.join(dir, id + '.jsonl');
  w(file, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  const t = new Date(Date.now() - ageSeconds * 1000); fs.utimesSync(file, t, t);
  return id;
}

/** Starts the Workwood service inside the sandbox. */
export async function startService(sb) {
  const child = spawn(NODE, [path.join(HERE, '..', 'service', 'server.mjs')], { env: sb.env, stdio: ['ignore', 'pipe', 'pipe'] });
  let err = ''; child.stderr.on('data', d => { err += d; });
  const address = await new Promise((resolve, reject) => {
    let out = '';
    child.stdout.on('data', d => { out += d; const m = out.match(/Open: (\S+)/); if (m) resolve(m[1]); });
    child.on('exit', c => reject(new Error(`service exited (${c}): ${err}`)));
    setTimeout(() => reject(new Error('service did not start: ' + err)), 15000);
  });
  const call = async (p, body) => {
    const r = await fetch(new URL('/api/' + p, address), { method: body ? 'POST' : 'GET', headers: { 'x-workwood-token': 'test-token', 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    return { status: r.status, body: await r.json().catch(() => ({})) };
  };
  return { address, call, stop: () => child.kill(), stderr: () => err };
}

export const readLog = sb => fs.readFileSync(sb.log, 'utf8').split('\n').filter(Boolean);
export const setLive = (sb, list) => fs.writeFileSync(sb.agents, JSON.stringify(list));

/** No symlink in the sandbox may lead back into the real home, and no test profile may exist there. */
export function assertContained(sb) {
  const bad = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name);
      if (e.isSymbolicLink()) { let t = ''; try { t = fs.realpathSync(p); } catch {} if (t.startsWith(REAL_HOME + path.sep) && !t.startsWith(sb.root)) bad.push(`${p} -> ${t}`); }
      else if (e.isDirectory()) walk(p);
    }
  })(sb.home);
  for (const name of ['other', 'full', 'live']) if (fs.existsSync(path.join(REAL_HOME, '.claude-profiles', name, '.claude.json'))) {
    const j = JSON.parse(fs.readFileSync(path.join(REAL_HOME, '.claude-profiles', name, '.claude.json'), 'utf8'));
    if (Object.values(ACCOUNTS).includes(j.oauthAccount?.accountUuid)) bad.push(`test profile ${name} leaked into the real home`);
  }
  return bad;
}

export const removeSandbox = sb => fs.rmSync(sb.root, { recursive: true, force: true });
