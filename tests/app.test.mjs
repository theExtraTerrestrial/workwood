// End-to-end tests. Everything runs in a throwaway HOME (see sandbox.mjs): the real
// Workwood service and the real claudius, with a scripted stand-in for `claude`.
// No real account is used and nothing is sent to Anthropic.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { makeSandbox, startService, readLog, setLive, assertContained, removeSandbox, addSession } from './sandbox.mjs';

let sb, svc, browser, page;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await sleep(60); }
  throw new Error('timed out waiting for ' + what + (last instanceof Error ? ': ' + last.message : ''));
}
const state = async () => new Promise((resolve, reject) => {
  fetch(new URL('/api/events?token=test-token', svc.address)).then(async r => {
    const reader = r.body.getReader(); let buf = '';
    for (;;) { const { value } = await reader.read(); buf += new TextDecoder().decode(value); const m = buf.match(/event: state\ndata: (.*)\n\n/); if (m) { reader.cancel(); return resolve(JSON.parse(m[1])); } }
  }, reject);
});
const session = id => svc.call('sessions/' + id).then(r => r.body);
const idle = id => until(async () => { const s = await session(id); return s.run && (s.run.status === 'idle' || s.run.status === 'stopped') && s; }, 'the turn to end');
const pending = id => until(async () => (await session(id)).run?.pending, 'a card');
const lastText = s => s.items.filter(i => i.kind === 'assistant').pop()?.text;
async function newSession(text, profile = 'live', extra = {}) {
  const r = await svc.call('sessions', { cwd: sb.projects.alpha, profile, text, ...extra });
  assert.equal(r.status, 200, JSON.stringify(r.body));
  return r.body.sessionId;
}

before(async () => {
  sb = makeSandbox();
  svc = await startService(sb);
  await until(async () => (await state()).fresh, 'the first full load');
});
after(async () => { await browser?.close(); svc?.stop(); if (sb && !process.env.KEEP_SANDBOX) removeSandbox(sb); });

/* ---------- the service ---------- */

test('rejects requests without the token', async () => {
  const r = await fetch(new URL('/api/sessions/' + sb.sessions.alphaLive, svc.address));
  assert.equal(r.status, 403);
  assert.equal((await fetch(new URL('/', svc.address))).status, 403);
});

test('lists profiles with the global one first, usage, and the "use next" pick', async () => {
  const s = await until(async () => { const x = await state(); return x.next && x; }, 'the "use next" pick').catch(e => { throw new Error(e.message + '\nservice said: ' + svc.stderr()); });
  assert.deepEqual(s.profiles.map(p => p.name), ['live', 'full', 'other']);
  assert.equal(s.profiles[0].global, true);
  assert.deepEqual(s.profiles.map(p => p.h5), [34, 100, 12]);
  assert.equal(s.next, 'other');
});

test('groups sessions by the account that last ran them', async () => {
  const s = await state(), by = id => s.sessions.find(x => x.id === id);
  assert.equal(by(sb.sessions.alphaLive).profile, 'live');
  assert.equal(by(sb.sessions.betaOther).profile, 'other');
  assert.equal(by(sb.sessions.betaOther).project, 'beta');
  assert.equal(by(sb.sessions.alphaLive).title, 'Tidy the alpha readme');
});

test('marks a session that is busy in a terminal, and refuses to write to it', async () => {
  const s = await until(async () => { const st = await state(); return st.sessions.find(x => x.id === sb.sessions.alphaOutside && x.outside) && st; }, 'live status');
  const o = s.sessions.find(x => x.id === sb.sessions.alphaOutside);
  assert.equal(o.locked, true); assert.equal(o.status, 'work'); assert.match(o.line, /In a terminal · working/);
  const r = await svc.call(`sessions/${o.id}/send`, { text: 'hello' });
  assert.equal(r.status, 409);
});

test('reads a conversation from the shared history', async () => {
  const s = await session(sb.sessions.alphaLive);
  assert.deepEqual(s.items.map(i => i.kind), ['user', 'tools', 'assistant', 'done']);
  assert.equal(s.items[0].text, 'Tidy the alpha readme');
  assert.equal(s.items[3].ms, 192000);
  assert.equal(s.context.used, 42000);
});

test('starts a session on the global profile without touching Claudius', async () => {
  const before = readLog(sb).length;
  const id = await newSession('plain hello');
  const s = await idle(id);
  assert.equal(lastText(s), 'Echo: plain hello');
  const log = readLog(sb).slice(before);
  assert.ok(log.some(l => /account=live@example.com config=global resume=no/.test(l)), log.join('|'));
  assert.ok(!log.some(l => l.startsWith('claudius refresh')));
});

test('starts a session on another profile through Claudius, and lists it under that profile', async () => {
  const before = readLog(sb).length;
  const id = await newSession('hello from other', 'other');
  await idle(id);
  const log = readLog(sb).slice(before);
  assert.ok(log.includes('claudius refresh other'), log.join('|'));
  assert.ok(log.some(l => /account=other@example.com config=other/.test(l)), log.join('|'));
  const s = await state();
  assert.equal(s.sessions.find(x => x.id === id).profile, 'other');
  // Claudius wired the shared history into the profile
  assert.ok(fs.lstatSync(path.join(sb.home, '.claude-profiles', 'other', 'projects')).isSymbolicLink());
});

test('a follow-up message resumes the same session with the chosen model and effort', async () => {
  const id = await newSession('first');
  await idle(id);
  const before = readLog(sb).length;
  assert.equal((await svc.call(`sessions/${id}/send`, { text: 'second', model: 'claude-haiku-5-5', effort: 'low' })).status, 200);
  const s = await until(async () => { const x = await session(id); return lastText(x) === 'Echo: second' && x; }, 'the second reply');
  assert.ok(s.items.some(i => i.kind === 'user' && i.text === 'first'));
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`resume=${id} model=claude-haiku-5-5 effort=low`)), readLog(sb).slice(before).join('|'));
});

test('question card: answers reach the agent', async () => {
  const id = await newSession('please ASK me');
  const p = await pending(id);
  assert.equal(p.kind, 'question'); assert.equal(p.input.questions.length, 2);
  assert.equal((await state()).sessions.find(x => x.id === id).line, '2 questions for you');
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'answer', answers: { 'Which direction should I take?': 'Dark', 'What else should it include?': 'Tests, Docs' } });
  assert.equal(lastText(await idle(id)), 'ANSWERS {"Which direction should I take?":"Dark","What else should it include?":"Tests, Docs"}');
});

test('permission card: allow once, allow for the session, always in the project, deny with a note', async () => {
  let id = await newSession('need PERMISSION'), p = await pending(id);
  assert.equal(p.kind, 'permission'); assert.equal(p.input.command, 'touch probe.txt');
  assert.deepEqual(p.choices.map(c => c.id), ['session:0', 'project:0']);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow' });
  assert.equal(lastText(await idle(id)), 'RAN null');

  id = await newSession('need PERMISSION'); p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow', choice: 'session:0' });
  assert.match(lastText(await idle(id)), /"destination":"session"/);

  id = await newSession('need PERMISSION'); p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow', choice: 'project:0' });
  assert.match(lastText(await idle(id)), /"destination":"localSettings"/);

  id = await newSession('need PERMISSION'); p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'deny', text: 'use mkdir' });
  assert.match(lastText(await idle(id)), /^DENIED .*use mkdir/);
});

test('an old card cannot be answered twice', async () => {
  const id = await newSession('need PERMISSION'), p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow' });
  await idle(id);
  assert.equal((await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow' })).status, 500);
});

test('plan card: approve', async () => {
  const id = await newSession('make a PLAN'), p = await pending(id);
  assert.equal(p.kind, 'plan'); assert.match(p.input.plan, /Split it in two/);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'allow' });
  assert.equal(lastText(await idle(id)), 'PLAN APPROVED');
});

test('a limit stops the turn, and it continues on another profile under the same session', async () => {
  const id = await newSession('hit the LIMIT');
  const s = await idle(id);
  assert.equal(s.run.status, 'stopped'); assert.equal(s.run.stopped.reason, 'limit');
  assert.equal((await state()).sessions.find(x => x.id === id).line, 'Stopped · limit reached');
  const before = readLog(sb).length;
  await svc.call(`sessions/${id}/send`, { text: 'Continue where you left off.', profile: 'other' });
  const t = await until(async () => { const x = await session(id); return x.run.status === 'idle' && x; }, 'the continued turn');
  assert.equal(lastText(t), 'Echo: Continue where you left off.');
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`config=other resume=${id}`)));
  await until(async () => (await state()).sessions.find(x => x.id === id)?.profile === 'other', 'the session to move to the other profile');
});

test('a lost sign-in is reported as such', async () => {
  const s = await idle(await newSession('lose AUTH'));
  assert.equal(s.run.stopped.reason, 'auth');
});

test('stop interrupts a working turn', async () => {
  const id = await newSession('be SLOW');
  await until(async () => (await session(id)).run?.activity?.startsWith('Running'), 'the turn to be busy');
  await svc.call(`sessions/${id}/stop`, {});
  const s = await idle(id);
  assert.equal(s.run.status, 'idle');
  assert.ok(readLog(sb).includes('interrupted'));
});

test('previews: files the agent wrote are listed, and served with their neighbours but nothing else', async () => {
  const id = await newSession('build a MOCKUP'), dir = path.join(sb.projects.alpha, 'mockups');
  const s = await idle(id);
  const card = s.items.find(i => i.kind === 'work');
  assert.deepEqual(card.files.map(f => [f.name, f.kind]), [['light.html', 'page'], ['dark.html', 'page'], ['shot.png', 'image']]); // the stylesheet is not something to show
  assert.ok(s.items.indexOf(card) > s.items.findIndex(i => i.kind === 'assistant' && /Both directions/.test(i.text))); // below the reply that presents them
  assert.deepEqual(s.work.map(f => f.name), ['light.html', 'dark.html', 'shot.png']);
  const base = (await state()).preview, get = (p, headers) => fetch(`${base}/${id}${p}`, { headers });
  assert.ok(new URL(base).port !== new URL(svc.address).port); // a different site from the app
  const page = await get(dir + '/light.html?v=1');
  assert.equal(page.status, 200); assert.match(page.headers.get('content-type'), /text\/html/); assert.match(await page.text(), /Light direction/);
  const css = await get(dir + '/style.css'); assert.equal(css.status, 200); assert.match(css.headers.get('content-type'), /text\/css/);
  const part = await get(dir + '/shot.png', { range: 'bytes=0-7' });
  assert.equal(part.status, 206); assert.equal((await part.arrayBuffer()).byteLength, 8);
  fs.writeFileSync(path.join(sb.projects.alpha, '.env'), 'SECRET=1'); fs.writeFileSync(path.join(sb.projects.beta, 'notes.html'), 'beta');
  fs.symlinkSync(path.join(sb.home, '.claude.json'), path.join(dir, 'link.json'));
  for (const p of [sb.projects.alpha + '/.env', sb.projects.beta + '/notes.html', sb.home + '/.claude/.credentials.json', dir + '/link.json', dir + '/../../beta/notes.html', '/etc/passwd'])
    assert.notEqual((await get(p)).status, 200, p);
  assert.equal((await fetch(`${base.replace(/[^/]+$/, 'wrong-key')}/${id}${dir}/light.html`)).status, 403);
  assert.equal((await fetch(new URL(`/${base.split('/').pop()}/${id}${dir}/light.html`, svc.address))).status, 404); // not from the app's own address
  // after the turn the same cards come from the saved history; a deleted file drops out
  fs.rmSync(path.join(dir, 'dark.html'));
  await svc.call(`sessions/${id}/send`, { text: 'and now?' }); const later = await idle(id);
  assert.deepEqual(later.items.find(i => i.kind === 'work').files.map(f => f.name), ['light.html', 'shot.png']);
  assert.deepEqual(later.work.map(f => f.name), ['light.html', 'shot.png']);
});

test('previews: cards are there by the time the agent asks about them', async () => {
  const id = await newSession('a MOCKUP then ASK');
  await pending(id);
  assert.equal((await session(id)).items.filter(i => i.kind === 'work').length, 1);
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
});

test('a session reports the model and effort it last ran on, and the context window that model has', async () => {
  const s = await session(sb.sessions.betaFable);
  assert.equal(s.model, 'claude-fable-5-2'); assert.equal(s.effort, 'xhigh');
  assert.deepEqual(s.context, { used: 42000, window: 1000000 });
  const plain = await session(sb.sessions.betaOther);
  assert.equal(plain.model, 'claude-test'); assert.equal(plain.effort, null); assert.equal(plain.context.window, 200000);
});

test('defaults come from Claude Code settings, the project\'s over the profile\'s', async () => {
  const q = cwd => svc.call(`defaults?cwd=${encodeURIComponent(cwd)}&profile=live`).then(r => r.body);
  assert.deepEqual(await q(sb.projects.beta), { model: 'claude-sonnet-5-5', effort: 'high' });
  const dir = path.join(sb.home, 'workspace', 'epsilon', '.claude'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ model: 'opus[1m]', effortLevel: 'low' }));
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify({ effortLevel: 'max' }));
  assert.deepEqual(await q(path.dirname(dir)), { model: 'claude-opus-5-5[1m]', effort: 'max' });
  assert.deepEqual((await session(sb.sessions.betaFable)).defaults, { model: 'claude-sonnet-5-5', effort: 'high' });
});

const fileOf = id => path.join(sb.home, '.claude', 'projects', sb.projects.alpha.replace(/[^A-Za-z0-9]/g, '-'), id + '.jsonl');
const listed = async id => (await state()).sessions.find(x => x.id === id);

test('rename: the name is saved the way Claude Code saves it, and survives a re-read', async () => {
  const id = await newSession('hello'); await idle(id);
  const before = fs.statSync(fileOf(id)).mtimeMs;
  assert.equal((await svc.call(`sessions/${id}/rename`, { title: '   ' })).status, 400);
  assert.equal((await svc.call(`sessions/${id}/rename`, { title: '  Parser  "clean-up"\n notes ' })).status, 200);
  assert.equal((await listed(id)).title, 'Parser "clean-up" notes');
  const last = JSON.parse(fs.readFileSync(fileOf(id), 'utf8').trim().split('\n').pop());
  assert.deepEqual(last, { type: 'custom-title', customTitle: 'Parser "clean-up" notes', sessionId: id });
  assert.ok(Math.abs(fs.statSync(fileOf(id)).mtimeMs - before) < 5, 'renaming must not move the session to the top');
  await svc.call(`sessions/${id}/send`, { text: 'again' }); await idle(id); await sleep(2500); // the pool is re-read after a turn
  assert.equal((await listed(id)).title, 'Parser "clean-up" notes');
});

test('archive: hides a session in Workwood only, and remembers it', async () => {
  const id = sb.sessions.betaOther, kept = path.join(sb.home, '.config', 'workwood', 'state.json');
  assert.equal((await svc.call(`sessions/${id}/archive`, {})).status, 200);
  assert.equal((await listed(id)).archived, true);
  assert.deepEqual(JSON.parse(fs.readFileSync(kept, 'utf8')).archived, [id]);
  assert.equal((await session(id)).items[0].text, 'Add a beta changelog'); // still readable
  await svc.call(`sessions/${id}/archive`, { on: false });
  assert.equal((await listed(id)).archived, false);
  assert.deepEqual(JSON.parse(fs.readFileSync(kept, 'utf8')).archived, []);
});

test('open in terminal: resumes under the session\'s own profile, and not while it is in use', async () => {
  assert.equal((await svc.call(`sessions/${sb.sessions.alphaLive}/terminal`, {})).status, 200);
  assert.equal((await svc.call(`sessions/${sb.sessions.betaOther}/terminal`, {})).status, 200);
  await until(() => readLog(sb).filter(l => l.startsWith('terminal ')).length === 2, 'both terminals');
  const lines = readLog(sb).filter(l => l.startsWith('terminal '));
  assert.equal(lines[0], `terminal ${sb.projects.alpha} claude --resume ${sb.sessions.alphaLive}`);
  assert.equal(lines[1], `terminal ${sb.projects.beta} claudius run other --resume ${sb.sessions.betaOther}`);
  const r = await svc.call(`sessions/${sb.sessions.alphaOutside}/terminal`, {});
  assert.equal(r.status, 409); assert.match(r.body.error, /already open in a terminal/);
  const id = await newSession('SLOW job'); await until(async () => (await session(id)).run?.status === 'working', 'a working turn');
  assert.equal((await svc.call(`sessions/${id}/terminal`, {})).status, 409);
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
});

test('delete: removes the history for good, but never a session that is in use', async () => {
  const busy = await svc.call(`sessions/${sb.sessions.alphaOutside}/delete`, {});
  assert.equal(busy.status, 409); assert.match(busy.body.error, /open in a terminal/);
  const id = await newSession('SLOW job'); await until(async () => (await session(id)).run?.status === 'working', 'a working turn');
  assert.equal((await svc.call(`sessions/${id}/delete`, {})).status, 409);
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
  const sub = path.join(path.dirname(fileOf(id)), id, 'subagents', 'agent-1.jsonl');
  fs.mkdirSync(path.dirname(sub), { recursive: true }); fs.writeFileSync(sub, '{}\n');
  const others = fs.readdirSync(path.dirname(fileOf(id))).filter(f => !f.startsWith(id)).sort();
  assert.equal((await svc.call(`sessions/${id}/delete`, {})).status, 200);
  assert.equal(fs.existsSync(fileOf(id)), false); assert.equal(fs.existsSync(path.dirname(path.dirname(sub))), false);
  assert.deepEqual(fs.readdirSync(path.dirname(fileOf(id))).sort(), others, 'nothing else may go');
  assert.equal(await listed(id), undefined);
  assert.equal((await svc.call(`sessions/${id}`)).status, 404);
  assert.equal((await svc.call(`sessions/${id}/delete`, {})).status, 404);
  await sleep(2500); assert.equal(await listed(id), undefined); // and it does not come back with the next re-read
});

// Listens to a session's terminal the way the window does.
async function watchTerm(id) {
  const ctl = new AbortController(), w = { text: '', exit: null, close: () => ctl.abort() };
  const r = await fetch(new URL(`/api/sessions/${id}/term?token=test-token`, svc.address), { signal: ctl.signal });
  w.status = r.status;
  if (r.status === 200) (async () => {
    const reader = r.body.getReader(), dec = new TextDecoder(); let buf = '';
    try { for (;;) { const { value, done } = await reader.read(); if (done) break; buf += dec.decode(value, { stream: true });
      for (let i; (i = buf.indexOf('\n\n')) >= 0; buf = buf.slice(i + 2)) { const m = buf.slice(0, i).match(/^event: (\w+)\ndata: (.*)$/s); if (m[1] === 'data') w.text += JSON.parse(m[2]); else w.exit = JSON.parse(m[2]); } } } catch {}
  })();
  return w;
}
const type = (id, data) => svc.call(`sessions/${id}/term/input`, { data });

test('terminal view: a real terminal on the session, typed into, resized, and picked up again later', async () => {
  const id = await newSession('hello'); await idle(id);
  assert.equal((await watchTerm(id)).status, 404);                       // nothing to attach to yet
  assert.equal((await svc.call(`sessions/${id}/term`, { cols: 90, rows: 25 })).status, 200);
  const a = await watchTerm(id);
  await until(() => a.text.includes(`resumed ${id}, 90x25`), 'the terminal to start');
  assert.ok(readLog(sb).includes(`terminal account=live@example.com config=global resume=${id}`));
  const row = await listed(id); assert.equal(row.term, true); assert.equal(row.outside, false); assert.match(row.line, /In the terminal view/);
  await type(id, 'hello there\r'); await until(() => a.text.includes('you said: hello there'), 'the reply');
  await svc.call(`sessions/${id}/term/resize`, { cols: 70, rows: 20 }); await until(() => a.text.includes('[size 70x20]'), 'the new size');
  a.close();
  assert.equal((await svc.call(`sessions/${id}/term`, { cols: 70, rows: 20 })).status, 200); // asking again starts nothing new
  const b = await watchTerm(id);
  await until(() => b.text.includes('you said: hello there'), 'what was printed before');
  assert.equal(readLog(sb).filter(l => l.startsWith('terminal account') && l.endsWith(id)).length, 1);
  assert.equal(lastText(await session(id)), 'TERMINAL REPLY to hello there');   // the chat reads what the terminal added
  await type(id, '/exit\r'); await until(() => b.exit, 'the terminal to close');
  assert.equal(b.exit.code, 0); assert.equal((await listed(id)).term, false);
  await svc.call(`sessions/${id}/term`, {}); const c = await watchTerm(id);
  await type(id, 'crash\r'); await until(() => c.exit, 'the crash'); assert.equal(c.exit.code, 3);
});

test('terminal view: one owner at a time', async () => {
  const id = await newSession('SLOW job'); await until(async () => (await session(id)).run?.status === 'working', 'a working turn');
  const busy = await svc.call(`sessions/${id}/term`, {});
  assert.equal(busy.status, 409); assert.equal(busy.body.busy, true);     // the chat turn holds the session
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
  assert.equal((await svc.call(`sessions/${sb.sessions.alphaOutside}/term`, {})).status, 409); // so does a terminal elsewhere
  assert.equal((await svc.call(`sessions/${id}/term`, {})).status, 200);
  const t = await watchTerm(id); await until(() => t.text.includes('resumed'), 'the terminal');
  assert.equal((await svc.call(`sessions/${id}/terminal`, {})).status, 409);
  assert.equal((await svc.call(`sessions/${id}/send`, { text: 'back in the chat' })).status, 200); // writing in the chat takes it back
  await until(() => t.exit, 'the terminal to be closed'); await idle(id);
  assert.equal((await listed(id)).term, false);
  assert.match(lastText(await session(id)), /./);
});

test('terminal view: runs under the session\'s own profile', async () => {
  const id = sb.sessions.betaOther;
  assert.equal((await svc.call(`sessions/${id}/term`, {})).status, 200);
  const t = await watchTerm(id); await until(() => t.text.includes('resumed'), 'the terminal');
  assert.ok(readLog(sb).includes(`terminal account=other@example.com config=other resume=${id}`));
  await svc.call(`sessions/${id}/term/close`, {}); await until(() => t.exit, 'the terminal to close');
});

test('changes: what differs from the last commit, file by file, and nothing outside the project', async () => {
  const id = sb.sessions.betaOther, c = (await svc.call(`sessions/${id}/changes`)).body;
  assert.equal(c.repo, true);
  const f = Object.fromEntries(c.files.map(x => [x.path, x]));
  assert.deepEqual([f['notes.txt'].add, f['notes.txt'].del, f['notes.txt'].kind], [2, 1, 'changed']);
  assert.deepEqual([f['old.txt'].del, f['old.txt'].kind], [1, 'deleted']);
  assert.deepEqual([f['fresh.md'].add, f['fresh.md'].kind], [2, 'new']);
  assert.equal(f['pic.bin'].binary, true);
  assert.equal(c.count, c.files.length);
  assert.equal(c.add, c.files.reduce((n, x) => n + x.add, 0));
  const diff = async p => (await svc.call(`sessions/${id}/changes/file?path=${encodeURIComponent(p)}`));
  const notes = (await diff('notes.txt')).body;
  assert.equal(notes.lines[0].t, 'hd');
  assert.deepEqual(notes.lines.filter(l => l.t !== 'hd' && l.t !== 'c').map(l => l.s), ['-two', '+2', '+four']);
  assert.deepEqual((await diff('fresh.md')).body.lines.filter(l => l.t === 'p').map(l => l.s), ['+# Fresh', '+A new file.']);
  assert.equal((await diff('pic.bin')).body.binary, true);
  assert.equal((await diff('../../.claude/settings.json')).status, 404);
  assert.equal((await diff(path.join(sb.home, '.claude', 'settings.json'))).status, 404);
  // a folder that is not a repository has no changes view
  assert.equal((await svc.call(`sessions/${sb.sessions.alphaLive}/changes`)).body.repo, false);
});

test('skills: the list Claude Code reports for a folder and profile, labelled by where each comes from', async () => {
  const get = (cwd, profile) => svc.call(`skills?cwd=${encodeURIComponent(cwd)}&profile=${profile}`);
  const before = readLog(sb).length, had = (await state()).sessions.length, a = (await get(sb.projects.alpha, 'live')).body.skills, by = Object.fromEntries(a.map(s => [s.name, s]));
  assert.deepEqual(a.map(s => s.from), [...a.map(s => s.from)].sort((x, y) => ['Project', 'Yours', 'Plugin', 'Built in'].indexOf(x) - ['Project', 'Yours', 'Plugin', 'Built in'].indexOf(y)));
  assert.deepEqual([by.mockup.from, by.teach.from, by['tools:lint'].from, by['code-review'].from], ['Project', 'Yours', 'Plugin', 'Built in']);
  assert.equal(by.mockup.about, 'Build standalone mockups to compare side by side');
  assert.equal(by['tools:lint'].about, 'Lint the changed files');
  assert.ok(!by.__internal && !by['extra-usage'] && by['on-global']);
  // the same skill is not the project's in another folder, and another profile is read from its own folder
  const b = (await get(sb.projects.beta, 'other')).body.skills;
  assert.equal(b.find(s => s.name === 'mockup').from, 'Yours');
  assert.ok(b.some(s => s.name === 'on-other'));
  assert.equal((await get('/etc', 'live')).status, 400);
  // Claude Code was started once per folder and profile, and no session came of it
  assert.deepEqual(readLog(sb).slice(before).map(l => /config=(\S+)/.exec(l)[1]), ['global', 'other']);
  await get(sb.projects.alpha, 'live');
  assert.equal(readLog(sb).length, before + 2);              // a second look is answered from memory
  assert.equal((await state()).sessions.length, had);
});

test('a message that starts with a skill keeps the skill apart from the text', async () => {
  const id = await newSession('/mockup two directions for the header');
  const live = (await idle(id)).items.find(i => i.kind === 'user');
  assert.deepEqual([live.skill, live.text], ['mockup', 'two directions for the header']);
  const saved = addSession(sb, 'alpha', 'live', '<command-message>teach</command-message>\n<command-name>/teach</command-name>\n<command-args>git rebase</command-args>', 'Taught.', 30);
  await until(async () => (await svc.call('sessions/' + saved)).status === 200, 'the session to be listed', 15000);
  const u = (await session(saved)).items.find(i => i.kind === 'user');
  assert.deepEqual([u.skill, u.text], ['teach', 'git rebase']);
});

const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';
test('attachments: pictures go to the agent as pictures, other files are saved and named in the message', async () => {
  const before = readLog(sb).length;
  const r = await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Look at these', attachments: [
    { name: 'shot.png', type: 'image/png', data: PNG }, { name: '../../notes.txt', type: 'text/plain', data: Buffer.from('remember the milk').toString('base64') }] });
  assert.equal(r.status, 200);
  const s = await idle(r.body.sessionId), u = s.items.find(i => i.kind === 'user');
  assert.deepEqual([u.text, u.images, u.files], ['Look at these', 1, ['notes.txt']]);
  assert.ok(readLog(sb).slice(before).some(l => l.startsWith('pictures=1')));
  const saved = /- (\S+notes\.txt)/.exec(lastText(s))[1];                  // the agent was told where the file is
  assert.ok(saved.startsWith(path.join(sb.home, '.cache', 'workwood', 'attachments') + path.sep));
  assert.equal(fs.readFileSync(saved, 'utf8'), 'remember the milk');
  // a message can be attachments alone; and the saved history reads back the same way
  assert.equal((await svc.call(`sessions/${r.body.sessionId}/send`, { text: '', attachments: [{ name: 'a.png', type: 'image/png', data: PNG }] })).status, 200);
  assert.deepEqual((await idle(r.body.sessionId)).items.filter(i => i.kind === 'user').map(i => [i.text, i.images]), [['Look at these', 1], ['', 1]]);
  assert.equal((await svc.call(`sessions/${r.body.sessionId}/send`, { text: '' })).status, 400);
  // a file that is already on disk is named where it is, not copied; a picture among them is still sent as one
  const logo = path.join(sb.projects.alpha, 'logo.png'), spec = path.join(sb.projects.alpha, 'spec.txt');
  fs.writeFileSync(logo, Buffer.from(PNG, 'base64')); fs.writeFileSync(spec, 'the spec');
  const copies = fs.readdirSync(path.join(sb.home, '.cache', 'workwood', 'attachments')).length, at = readLog(sb).length;
  const there = await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Use these', attachments: [{ name: 'logo.png', type: 'image/png', path: logo }, { name: 'spec.txt', type: 'text/plain', path: spec }] });
  const ts = await idle(there.body.sessionId), tu = ts.items.find(i => i.kind === 'user');
  assert.deepEqual([tu.text, tu.images, tu.files], ['Use these', undefined, ['logo.png', 'spec.txt']]);
  assert.ok(lastText(ts).includes('- ' + logo) && lastText(ts).includes('- ' + spec));
  assert.ok(readLog(sb).slice(at).some(l => l.startsWith('pictures=1')));
  assert.equal(fs.readdirSync(path.join(sb.home, '.cache', 'workwood', 'attachments')).length, copies);
  assert.equal((await svc.call(`sessions/${there.body.sessionId}/send`, { text: 'x', attachments: [{ name: 'gone.txt', path: path.join(sb.projects.alpha, 'gone.txt') }] })).status, 400);
  const old = addSession(sb, 'alpha', 'live', [{ type: 'text', text: 'Compare\n\nAttached files:\n- /x/y/spec.pdf\n- /x/y/data.csv' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG } }], 'Compared.', 20);
  await until(async () => (await svc.call('sessions/' + old)).status === 200, 'the session to be listed', 15000);
  const o = (await session(old)).items.find(i => i.kind === 'user');
  assert.deepEqual([o.text, o.images, o.files], ['Compare', 1, ['spec.pdf', 'data.csv']]);
});

test('dictation: a recording comes back as text, and only with the token', async () => {
  const say = (seconds, q = '') => fetch(new URL('/api/voice' + q, svc.address), { method: 'POST', headers: { 'x-workwood-token': 'test-token' }, body: new Float32Array(16000 * seconds) }).then(r => r.json());
  assert.deepEqual(await say(1), { text: 'dictated words' });
  assert.deepEqual(await say(0.05), { text: '' });                  // too short to be speech
  assert.equal((await svc.call('voice')).body.state, 'ready');
  assert.equal((await fetch(new URL('/api/voice', svc.address), { method: 'POST', body: new Float32Array(16000) })).status, 403);
});

test('settings: default profile and dictation language are kept; sign-in again runs Claudius in a terminal', async () => {
  assert.deepEqual((await svc.call('settings', { defaultProfile: 'other', language: 'latvian' })).body, { defaultProfile: 'other', language: 'latvian' });
  assert.deepEqual((await state()).prefs, { defaultProfile: 'other', language: 'latvian' });
  const kept = JSON.parse(fs.readFileSync(path.join(sb.home, '.config', 'workwood', 'state.json'), 'utf8'));
  assert.deepEqual([kept.defaultProfile, kept.language, Array.isArray(kept.archived)], ['other', 'latvian', true]);
  assert.deepEqual((await svc.call('settings', { defaultProfile: 'nobody', language: 'x;rm' })).body, { defaultProfile: null, language: null });
  const a = (await svc.call('about')).body;
  assert.deepEqual([a.version, a.claude, typeof a.speech.model], ['0.1.0', '2.1.322', 'string']);
  assert.equal((await svc.call('profiles/nobody/login', {})).status, 404);
  assert.equal((await svc.call('profiles/other/login', { cols: 80, rows: 20 })).status, 200);
  const seen = await new Promise((resolve, reject) => {
    let text = '', sent = false;
    fetch(new URL('/api/profiles/other/login?token=test-token', svc.address)).then(async r => {
      const dec = new TextDecoder();
      for await (const chunk of r.body) {
        text += dec.decode(chunk);
        if (!sent && text.includes('paste the code')) { sent = true; svc.call('profiles/other/login/input', { data: 'good\r' }); }
        if (text.includes('event: exit')) return resolve(text);
      }
      resolve(text);
    }, reject);
  });
  assert.match(seen, /Signed in to other\./);
  assert.match(seen, /event: exit\ndata: \{"code":0\}/);
  assert.ok(readLog(sb).includes('claudius relogin other'));
});

test('creates a project folder, and refuses odd names', async () => {
  const ok = await svc.call('projects', { name: 'gamma' });
  assert.equal(ok.status, 200); assert.ok(fs.statSync(path.join(sb.home, 'workspace', 'gamma')).isDirectory());
  assert.equal((await svc.call('projects', { name: '../escape' })).status, 500);
  assert.equal((await svc.call('projects', { name: 'gamma' })).status, 500);
});

/* ---------- the window, driven by real clicks ---------- */

function findChrome() {
  if (process.env.WORKWOOD_CHROME) return process.env.WORKWOOD_CHROME;
  const root = path.join(os.homedir(), '.cache', 'ms-playwright');
  try { for (const d of fs.readdirSync(root).sort().reverse()) for (const rel of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome']) { const p = path.join(root, d, rel); if (fs.existsSync(p)) return p; } } catch {}
  return null;
}
const chrome = findChrome();
const ui = (name, fn) => test(name, { skip: chrome ? false : 'no Chromium found; set WORKWOOD_CHROME or run: npx playwright install chromium-headless-shell' }, async () => {
  if (!page) {
    const { chromium } = await import('playwright-core');
    browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] });
    page = await browser.newPage({ viewport: { width: 1400, height: 880 } });
    page.setDefaultTimeout(8000);
    await page.goto(svc.address + '#' + sb.sessions.alphaLive);
  }
  try { await fn(); } catch (e) { await page.screenshot({ path: path.join(os.tmpdir(), 'workwood-test-failure.png') }).catch(() => {}); throw e; }
});
const send = async text => { await page.fill('#input', text); await page.press('#input', 'Enter'); };
const startNew = async (text, pick = {}) => {
  await page.click('#newBtn');
  if (pick.project) { await page.click('#pProject'); await page.click(`#mProject .item:has-text("${pick.project}")`); }
  if (pick.profile) { await page.click('#pProfile'); await page.click(`#mProfile [data-prof="${pick.profile}"]`); }
  await send(text);
};

ui('window: shows profiles, sessions and the opened conversation', async () => {
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  assert.deepEqual(await page.locator('.grp').evaluateAll(els => els.map(e => e.dataset.grp)), ['live', 'full', 'other']);
  assert.match(await page.locator('.grp[data-grp=live]').innerText(), /GLOBAL/i);
  assert.match(await page.locator('.sub .st').first().innerText(), /5h full · clears \d+m/);
  assert.equal(await page.locator('#title').innerText(), 'Tidy the alpha readme');
  assert.match(await page.locator('.tfoot').innerText(), /Worked for 3m 12s/);
  assert.match(await page.locator('#pCtx').innerText(), /21% · 42k of 200k/);
  await page.click('.grp[data-grp=live] ~ .more'); // the tests above made more sessions than the list shows at first
  await page.waitForSelector('.sess .xb');
  assert.equal(await page.locator('.sess .xb').count(), 1);
});

ui('window: steps expand when the activity line is clicked', async () => {
  await page.click('.act');
  assert.match(await page.locator('.w2').innerText(), /Reading README\.md/);
});

ui('window: a session busy in a terminal has a locked message box', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaOutside}"]`);
  await page.waitForSelector('.box.off');
  assert.equal(await page.locator('#input').isDisabled(), true);
  assert.match(await page.locator('#input').getAttribute('placeholder'), /In use in a terminal/);
});

ui('window: new session with project and profile menus', async () => {
  const before = readLog(sb).length;
  await startNew('typed in the window', { project: 'beta', profile: 'other' });
  await page.waitForSelector('.ai:has-text("Echo: typed in the window")');
  assert.equal(await page.locator('#where').innerText().then(t => t.includes('beta')), true);
  assert.ok(readLog(sb).slice(before).some(l => /config=other/.test(l)));
  await page.waitForSelector('.tfoot');
});

ui('window: model and effort menus apply to the next message', async () => {
  await page.click('#pModel'); await page.click('#mModel .item:has-text("Sonnet 5.5")');
  await page.click('#pEffort'); await page.click('#mEffort .item:has-text("Max")');
  const before = readLog(sb).length;
  await send('with other settings');
  await page.waitForSelector('.ai:has-text("Echo: with other settings")');
  assert.ok(readLog(sb).slice(before).some(l => l.includes('model=claude-sonnet-5-5 effort=max')), readLog(sb).slice(before).join('|'));
});

ui('window: question card, two steps, by clicking', async () => {
  await startNew('ASK me in the window');
  await page.click('.qopt:has-text("Dark")');
  await page.click('[data-act=next]');
  await page.click('.qopt:has-text("Tests")'); await page.click('.qopt:has-text("Mobile")');
  await page.click('[data-act=back]');
  assert.equal(await page.locator('.qopt.on').innerText().then(t => t.includes('Dark')), true); // the first answer is kept
  await page.click('[data-act=next]');
  await page.click('[data-act=send]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
  assert.match(await page.locator('.ai').last().innerText(), /"Dark".*"Tests, Mobile"/);
  assert.equal(await page.locator('#qcard').isHidden(), true);
});

ui('window: a typed answer replaces the options', async () => {
  await startNew('ASK me again');
  await page.fill('#qText', 'something else'); await page.click('[data-act=next]');
  await page.click('.qopt:has-text("Docs")'); await page.click('[data-act=send]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
  assert.match(await page.locator('.ai').last().innerText(), /"something else".*"Docs"/);
});

ui('window: permission card for a command, and for an edit', async () => {
  await startNew('need PERMISSION here');
  await page.waitForSelector('.cmd:has-text("touch probe.txt")');
  assert.equal(await page.locator('.sess.sel.wait').count(), 1);
  await page.click('.qbtn:has-text("Allow this session")');
  await page.waitForSelector('.ai:has-text("RAN")');
  await startNew('an EDIT please');
  await page.waitForSelector('.peek .p:has-text("before_save :tidy")');
  assert.match(await page.locator('.frow').innerText(), /app\.rb/);
  await page.fill('#qText', 'not that file'); await page.press('#qText', 'Enter');
  await page.waitForSelector('.ai:has-text("DENIED")');
  assert.match(await page.locator('.ai').last().innerText(), /not that file/);
});

ui('window: plan card', async () => {
  await startNew('show a PLAN');
  await page.waitForSelector('.planbody:has-text("Split it in two")');
  await page.click('.qbtn:has-text("Approve and start")');
  await page.waitForSelector('.ai:has-text("PLAN APPROVED")');
});

ui('window: limit card continues on another profile; the session moves groups', async () => {
  await startNew('hit the LIMIT now');
  assert.match(await page.locator('.sess.sel').evaluate(el => { let g = el; while (!g.classList.contains('grp')) g = g.previousElementSibling; return g.dataset.grp; }), /live/); // a new session starts on the global profile again
  await page.waitForSelector('#qcard:has-text("Limit reached on live")');
  assert.equal(await page.locator('#qcard .qbtn.off').innerText().then(t => /full/.test(t)), true);
  await page.click('#qcard .qbtn:has-text("Continue on other")');
  await page.waitForSelector('.ai:has-text("Echo: Continue where you left off.")');
  await page.waitForFunction(() => { const sel = document.querySelector('.sess.sel'); let g = sel; while (g && !g.classList.contains('grp')) g = g.previousElementSibling; return g && g.dataset.grp === 'other'; });
});

ui('window: stop button', async () => {
  await startNew('be SLOW in the window');
  await page.waitForSelector('.w1:has-text("Running Wait a long time")');
  assert.equal(await page.locator('#send').getAttribute('title'), 'Stop');
  await page.click('#send');
  await page.waitForSelector('.sys:has-text("Interrupted")');
  assert.equal(await page.locator('#send').getAttribute('title'), 'Send');
});

ui('window: preview cards open the side panel; step, pick from the list, full width, close', async () => {
  await startNew('please build a MOCKUP');
  await page.waitForSelector('.hero.n3'); assert.equal(await page.locator('.hero .hc').count(), 3);
  assert.match(await page.locator('.hero .hc').first().innerText(), /light\.html\s+Page · mockups/);
  assert.equal(await page.locator('#panel').isHidden(), true);
  await page.click('.hc:has-text("light.html")');
  assert.equal(await page.locator('#pName').innerText(), 'light.html'); assert.equal(await page.locator('#pCnt').innerText(), '1 of 3');
  const shown = page.frameLocator('#stage iframe').locator('h1');
  assert.equal(await shown.innerText(), 'Light direction');
  assert.equal(await shown.evaluate(el => getComputedStyle(el).color), 'rgb(1, 2, 3)'); // its stylesheet loaded too
  assert.equal(await page.locator('.hc.on').count(), 1);
  const frame = await page.locator('#stage iframe').elementHandle();
  await page.click('#input'); await page.fill('#input', 'thanks'); await page.press('#input', 'Enter');
  await page.waitForSelector('.ai:has-text("Echo: thanks")');
  assert.equal(await page.evaluate(el => el.isConnected, frame), true); // the open preview is not reloaded by new messages
  // ...but it is shown again when the file itself has changed by the time the next message arrives
  fs.writeFileSync(await page.locator('.hc.on').getAttribute('data-open'), '<h1>Light, revised</h1>');
  await send('look again'); // any activity in the session triggers the check
  await page.frameLocator('#stage iframe').locator('h1:has-text("Light, revised")').waitFor({ timeout: 3000 });
  // a file worked on again gets its card under the newest turn; the older turn keeps a one-line mention
  await send('a second MOCKUP round'); await page.waitForSelector('.ai:has-text("Both directions are ready.") >> nth=1');
  await page.waitForFunction(() => document.querySelectorAll('.hero').length === 1 && document.querySelectorAll('.hero .hc').length === 3);
  assert.match(await page.locator('.sknote.wk').innerText(), /Worked on light\.html, dark\.html, shot\.png/);
  assert.equal(await page.evaluate(() => !!(document.querySelector('.sknote.wk').compareDocumentPosition(document.querySelector('.hero')) & Node.DOCUMENT_POSITION_FOLLOWING)), true);
  await page.click('.sknote.wk button:has-text("light.html")'); assert.equal(await page.locator('#pName').innerText(), 'light.html');
  await page.click('#pNext'); assert.equal(await page.locator('#pName').innerText(), 'dark.html');
  assert.equal(await page.frameLocator('#stage iframe').locator('h1').innerText(), 'Dark direction');
  // refresh picks up what is not watched, here a stylesheet the page uses
  fs.writeFileSync(path.join(path.dirname(await page.locator('.hc.on').getAttribute('data-open')), 'style.css'), 'h1{color:rgb(9, 9, 9)}');
  await page.click('#bRefresh');
  await page.waitForFunction(() => true); await until(async () => await page.frameLocator('#stage iframe').locator('h1').evaluate(el => getComputedStyle(el).color) === 'rgb(9, 9, 9)', 'the refreshed stylesheet', 3000);
  await page.click('#moreBtn'); assert.deepEqual(await page.locator('#menu b').allInnerTexts(), ['light.html', 'dark.html', 'shot.png']);
  await page.click('#menu button:has-text("shot.png")');
  await page.waitForFunction(() => document.querySelector('#stage img')?.naturalWidth === 2);
  await page.click('#bFull'); assert.equal(await page.locator('#conv').isHidden(), true);
  await page.click('#bFull'); assert.equal(await page.locator('#conv').isVisible(), true);
  await page.click('#bClose'); assert.equal(await page.locator('#panel').isHidden(), true);
  await page.click('.hc:has-text("dark.html")'); await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.ai:has-text("The readme is tidied.")'); assert.equal(await page.locator('#panel').isHidden(), true); // another session, no panel
});

ui('window: new folder from the project menu', async () => {
  await page.click('#newBtn'); await page.click('#pProject'); await page.click('[data-mk]');
  await page.fill('#mkName', 'delta'); await page.press('#mkName', 'Enter');
  await page.waitForFunction(() => document.querySelector('#pProject').innerText.includes('delta'));
  assert.ok(fs.existsSync(path.join(sb.home, 'workspace', 'delta')));
  await page.click('#pProject'); await page.fill('#pFind', 'bet');
  assert.deepEqual(await page.locator('#mProject .item[data-proj] b').allInnerTexts(), ['beta']);
  await page.keyboard.press('Escape');
});

ui('window: theme switch from the settings menu, remembered after reload', async () => {
  await page.click('#bGear'); await page.click('#gTheme');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
  await page.reload(); await page.waitForSelector('.sess');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), 'light');
});

ui('window: a session that starts in a terminal elsewhere shows up without a reload', async () => {
  const id = addSession(sb, 'beta', 'other', 'Started outside the app', 'ok', 1);
  setLive(sb, [{ pid: 2, cwd: sb.projects.beta, kind: 'interactive', sessionId: id, name: 'x', status: 'waiting', waitingFor: 'input needed' }]);
  await svc.call(`sessions/${sb.sessions.alphaLive}/send`, { text: 'nudge a refresh' }); // a finished turn re-reads the pool
  await page.waitForSelector(`.sess[data-id="${id}"] .xb`, { timeout: 15000 });
  assert.match(await page.locator(`.sess[data-id="${id}"]`).innerText(), /In a terminal · waiting for you/);
});

ui('window: session menu: rename in place, open in a terminal', async () => {
  const id = sb.sessions.alphaLive, row = `.sess[data-id="${id}"]`;
  await page.click(row); await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.hover(row); await page.click(`${row} [data-dots]`);
  assert.deepEqual(await page.locator('#smenu button').allInnerTexts(), ['Rename', 'Open in VS Code', 'Open in terminal', 'Archive', 'Delete']);
  await page.click('#smenu [data-do=rename]');
  assert.equal(await page.inputValue('#renIn'), 'Tidy the alpha readme');
  await page.keyboard.press('Escape');                                   // Escape leaves the name alone
  assert.match(await page.locator(`${row} .l1 b`).innerText(), /Tidy the alpha readme/);
  await page.click(row, { button: 'right' }); await page.click('#smenu [data-do=rename]');
  await page.fill('#renIn', 'Readme tidy-up'); await page.press('#renIn', 'Enter');
  await page.waitForFunction(() => document.querySelector('#title').innerText === 'Readme tidy-up');
  assert.equal(await page.locator(`${row} .l1 b`).innerText(), 'Readme tidy-up');
  await until(async () => (await listed(id)).title === 'Readme tidy-up', 'the saved name');
  await page.click(row, { button: 'right' }); await page.click('#smenu [data-do=term]');
  await until(() => readLog(sb).includes(`terminal ${sb.projects.alpha} claude --resume ${id}`), 'the terminal');
  await page.click(row, { button: 'right' }); await page.click('#smenu [data-do=code]');
  await until(() => readLog(sb).includes(`code ${sb.projects.alpha}`), 'the editor');
});

ui('window: archive hides a session until archived ones are shown', async () => {
  const id = sb.sessions.alphaLive, row = `.sess[data-id="${id}"]`;
  await page.click(row); await page.hover(row); await page.click(`${row} [data-arch]`);
  await page.waitForFunction(r => !document.querySelector(r), row);
  assert.notEqual(await page.locator('#title').innerText(), 'Readme tidy-up'); // moved on to another session
  await page.click('#bGear'); assert.match(await page.locator('#gArch').innerText(), /Hidden/);
  await page.click('#gArch'); await page.keyboard.press('Escape');
  await page.waitForSelector(row + '.arch');
  await page.reload(); await page.waitForSelector(row + '.arch');              // the choice to show them is remembered
  await page.hover(row); await page.click(`${row} [data-arch]`);
  await page.waitForFunction(r => !document.querySelector(r).classList.contains('arch'), row);
  await page.click('#bGear'); await page.click('#gArch'); await page.keyboard.press('Escape');
  await page.waitForSelector(row);
});

ui('window: delete asks first', async () => {
  const id = await newSession('throwaway'); await idle(id);
  const row = `.sess[data-id="${id}"]`;
  await page.waitForSelector(row); await page.click(row); await page.waitForSelector('.me:has-text("throwaway")');
  await page.click(row, { button: 'right' }); await page.click('#smenu [data-do=delete]');
  assert.match(await page.locator('#ask').innerText(), /Delete this session\?[\s\S]*throwaway[\s\S]*cannot be undone/);
  await page.click('#ask [data-no]');
  assert.equal(await page.locator('#dim').isHidden(), true); assert.ok(fs.existsSync(fileOf(id)));
  await page.click(row, { button: 'right' }); await page.click('#smenu [data-do=delete]'); await page.click('#ask [data-yes]');
  await page.waitForFunction(r => !document.querySelector(r), row);
  assert.equal(fs.existsSync(fileOf(id)), false);
  assert.equal(await page.locator('.me:has-text("throwaway")').count(), 0);  // the window moved on to another session
});

ui('window: terminal view: type in it, go back to the chat, come back to the same terminal', async () => {
  const id = await newSession('for the terminal'); await idle(id);
  const row = `.sess[data-id="${id}"]`;
  await page.waitForSelector(row); await page.click(row); await page.waitForSelector('.me:has-text("for the terminal")');
  await page.click('#vTerm');
  await page.waitForFunction(() => document.querySelector('#xt .xterm-rows')?.innerText.includes('resumed'));
  assert.equal(await page.locator('#conv').isHidden(), true);
  await page.click('#xt'); await page.keyboard.type('hi from the window'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('#xt .xterm-rows').innerText.includes('you said: hi from the window'));
  await page.waitForSelector(`${row} .xb`);                                   // the sidebar says where the session lives now
  await page.click('#vChat');
  await page.waitForSelector('.ai:has-text("TERMINAL REPLY to hi from the window")');
  assert.equal(await page.locator('#term').isHidden(), true);
  await page.click('#vTerm');
  await page.waitForFunction(() => document.querySelector('#xt .xterm-rows')?.innerText.includes('you said: hi from the window'));
  await page.click('#xt'); await page.keyboard.type('/exit'); await page.keyboard.press('Enter'); // leaving it returns to the chat
  await page.waitForFunction(() => !document.querySelector('#conv').hidden && document.querySelector('#term').hidden);
  await page.waitForFunction(r => !document.querySelector(r + ' .xb'), row);
});

ui('window: terminal view waits for a chat turn, and reports a terminal that failed', async () => {
  await send('SLOW job'); await page.waitForSelector('.w1');
  await page.click('#vTerm');
  assert.match(await page.locator('#tnote').innerText(), /working in the chat/);
  await page.click('#tnote [data-stopterm]');
  await page.waitForFunction(() => document.querySelector('#xt .xterm-rows')?.innerText.includes('resumed'));
  assert.equal(await page.locator('#tnote').isHidden(), true);
  await page.click('#xt'); await page.keyboard.type('crash'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => /The terminal closed/.test(document.querySelector('#tnote').innerText));
  await page.click('#tnote [data-again]');
  await page.waitForFunction(() => document.querySelector('#tnote').hidden && document.querySelector('#xt .xterm-rows')?.innerText.includes('resumed'));
  await page.click('#xt'); await page.keyboard.type('/exit'); await page.keyboard.press('Enter');
  await page.waitForFunction(() => !document.querySelector('#conv').hidden);
});

ui('window: shows the model and effort a session was using, and keeps them for the next message', async () => {
  const id = sb.sessions.betaFable, row = `.sess[data-id="${id}"]`;
  await page.click('.grp[data-grp=other] ~ .more').catch(() => {});
  await page.click(row); await page.waitForSelector('.me:has-text("Plan the beta launch")');
  assert.equal(await page.locator('#pModel').innerText(), 'Fable 5.2');
  assert.equal(await page.locator('#pEffort').innerText(), 'Extra');
  assert.match(await page.locator('#pCtx').innerText(), /4% · 42k of 1M/);
  const before = readLog(sb).length;
  await send('carry on'); await page.waitForSelector('.ai:has-text("Echo: carry on")');
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`resume=${id} model=claude-fable-5-2 effort=xhigh`)), readLog(sb).slice(before).join('|'));
  await page.click('#pEffort'); await page.click('#mEffort [data-v=low]');            // a choice belongs to this session only
  assert.equal(await page.locator('#pEffort').innerText(), 'Low');
  await page.click(`.sess[data-id="${sb.sessions.betaOther}"]`); await page.waitForSelector('.me:has-text("Add a beta changelog")');
  assert.equal(await page.locator('#pEffort').innerText(), '*High');                    // nothing recorded: the default from settings, starred
  assert.equal(await page.locator('#pModel').innerText(), 'Test');
  await page.click(row); await page.waitForSelector('.me:has-text("Plan the beta launch")');
  assert.equal(await page.locator('#pEffort').innerText(), 'Low');
});

ui('window: a new session shows the real default model and effort, starred', async () => {
  await page.click('#newBtn');
  await page.waitForFunction(() => document.querySelector('#pModel').innerText === '*Sonnet 5.5');
  assert.equal(await page.locator('#pEffort').innerText(), '*High');
  await page.click('#pModel');
  const names = await page.locator('#mModel .item b').allInnerTexts();
  assert.ok(names.includes('*Sonnet 5.5') && !names.includes('Default'), names.join());
  await page.click('#mModel [data-v="claude-haiku-5-5"]');
  assert.equal(await page.locator('#pModel').innerText(), 'Haiku 5.5');
  await page.click('#pModel'); await page.click('#mModel [data-v="claude-sonnet-5-5"]');
  assert.equal(await page.locator('#pModel').innerText(), '*Sonnet 5.5');
});

ui('window: the settings menu stays open when one press arrives as two clicks', async () => {
  await page.keyboard.press('Escape');
  await page.evaluate(() => { const g = document.getElementById('bGear'); g.click(); g.click(); document.body.click(); });
  assert.equal(await page.locator('#gmenu').isVisible(), true);
  await page.mouse.click(700, 300);                                                    // a press elsewhere closes it
  assert.equal(await page.locator('#gmenu').isHidden(), true);
  assert.equal(await page.evaluate(() => document.getElementById('bGear').classList.contains('on')), false);
});

/* ---------- last: nothing leaked out of the sandbox ---------- */

ui('window: the changes panel lists changed files and shows each one\'s diff', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  assert.equal(await page.isVisible('#bChanges'), false);               // alpha is not a repository
  await page.click(`.sess[data-id="${sb.sessions.betaOther}"]`);
  await page.waitForSelector('#bChanges:visible');
  assert.match(await page.innerText('#chN'), /^\d+$/);
  await page.click('#bChanges');
  await page.waitForSelector('#chT:has-text("changed files")');
  await page.click('#files [data-file="notes.txt"]');
  await page.waitForSelector('#diff .m:has-text("-two")');
  assert.deepEqual(await page.locator('#diff .p').allInnerTexts(), ['+2', '+four']);
  await page.click('#files [data-file="fresh.md"]');
  await page.waitForSelector('#diff .p:has-text("+# Fresh")');
  await page.click('#files [data-file="pic.bin"]');
  await page.waitForSelector('#diff .note:has-text("not text")');
  // a change made behind the app's back shows after a refresh
  fs.writeFileSync(path.join(sb.projects.beta, 'later.txt'), 'x\n');
  await page.click('#chRefresh');
  await page.waitForSelector('#files [data-file="later.txt"]');
  fs.rmSync(path.join(sb.projects.beta, 'later.txt'));
  await page.click('#chClose');
  assert.equal(await page.isVisible('#panel'), false);
});

ui('window: "/" lists skills, filters as you type, and Enter picks one', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.fill('#input', '/');
  await page.waitForSelector('#slash .skr[data-sk="mockup"]');
  assert.match(await page.innerText('#slash .skl'), /\d+ skills in this session/i);
  assert.match(await page.innerText('#slash .skr[data-sk="mockup"]'), /Project/);
  await page.fill('#input', '/rev');
  assert.deepEqual(await page.locator('#slash .skr').evaluateAll(els => els.map(e => e.dataset.sk)), ['code-review']);
  await page.fill('#input', '/t');
  await page.press('#input', 'ArrowDown');
  assert.equal(await page.locator('#slash .skr.on').getAttribute('data-sk'), 'tools:lint');
  await page.press('#input', 'Enter');
  assert.equal(await page.inputValue('#input'), '/tools:lint ');
  assert.equal(await page.isVisible('#slash'), false);
  await page.fill('#input', '/zzz');
  await page.waitForSelector('#slash .skr.none');
  await page.press('#input', 'Escape');
  assert.equal(await page.inputValue('#input'), '');
});

ui('window: the skills panel groups skills by source, and a click starts a message with one', async () => {
  await page.click('#bSkills');
  await page.waitForSelector('#skl .skr[data-sk="code-review"]');
  assert.match(await page.innerText('#skT'), /^Skills · \d+$/);
  assert.deepEqual(await page.locator('#skl .skl').allInnerTexts().then(l => l.map(x => x.toLowerCase())), ['project', 'yours', 'plugin', 'built in']);
  // one line each, the whole description on hover; the search narrows by name or description
  assert.ok((await page.locator('#skl .skr[data-sk="compact"]').boundingBox()).height < 36);
  assert.equal(await page.getAttribute('#skl .skr[data-sk="compact"]', 'title'), null);   // no second, system tooltip
  await page.setViewportSize({ width: 700, height: 500 });
  await page.hover('#skl .skr[data-sk="compact"]');
  await page.waitForSelector('#tip:visible');
  assert.equal(await page.innerText('#tip'), 'Free up context by summarizing the conversation so far');
  const tb = await page.locator('#tip').boundingBox();
  assert.ok(tb.width === 300 && tb.x >= 0 && tb.x + tb.width <= 700 && tb.y >= 0 && tb.y + tb.height <= 500, JSON.stringify(tb));
  await page.setViewportSize({ width: 1400, height: 880 });
  await page.mouse.move(5, 5);
  await page.waitForSelector('#tip', { state: 'hidden' });
  await page.fill('#skQ', 'diff');
  assert.deepEqual(await page.locator('#skl .skr').evaluateAll(els => els.map(e => e.dataset.sk)), ['code-review']);
  await page.fill('#skQ', 'zzz');
  await page.waitForSelector('#skl .note:has-text("No skill matches")');
  await page.fill('#skQ', 'mock');
  await page.click('#skl .skr[data-sk="mockup"]');
  assert.equal(await page.inputValue('#input'), '/mockup ');
  await page.type('#input', 'a header');
  await page.press('#input', 'Enter');
  await page.waitForSelector('.me:has-text("a header") .chip:has-text("mockup")');
  await page.click('#skClose');
  assert.equal(await page.isVisible('#panel'), false);
});

ui('window: attach files with the paperclip, remove one, send; the message shows what went with it', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.setInputFiles('#filePick', [
    { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') },
    { name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') },
    { name: 'tokens.css', mimeType: 'text/css', buffer: Buffer.from(':root{}') }]);
  await page.waitForSelector('#atts .ath >> nth=1');
  assert.match(await page.innerText('#fchips .fch'), /tokens\.css/);
  await page.click('#atts .ath >> nth=1 >> [data-rm]');
  assert.equal(await page.locator('#atts .ath').count(), 1);
  await send('Use these for the header');
  await page.waitForSelector('.me:has-text("Use these for the header") .matt:has-text("1 image")');
  assert.match(await page.innerText('.me:has-text("Use these for the header") .matt'), /tokens\.css/);
  assert.equal(await page.locator('#atts .ath, #fchips .fch').count(), 0);   // the box is empty again
  // where the window can tell where a file lives (the Electron window), the path is sent, not the contents
  const real = path.join(sb.projects.alpha, 'spec.txt'); fs.writeFileSync(real, 'the spec');
  await page.evaluate(p => { window.workwood = { pathFor: () => p }; }, real);
  await page.waitForSelector('.ai:has-text("Echo: Use these for the header")');
  await page.waitForSelector('#send[title="Send"]');             // the first turn is over; until then the button means Stop
  await page.setInputFiles('#filePick', [{ name: 'spec.txt', mimeType: 'text/plain', buffer: Buffer.from('not this') }]);
  await page.waitForSelector('#fchips .fch[data-tip]');
  await send('Follow the spec');
  await page.waitForSelector(`.ai li:has-text("${real}")`);
  await page.evaluate(() => { delete window.workwood; });
});

ui('window: the mic button dictates into the message box, after what was typed; Escape discards', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.fill('#input', 'Typed first,');
  await page.click('#mic');
  await page.waitForSelector('#box.rec');
  await page.waitForSelector('#vtime:has-text("0:01")');
  await page.waitForFunction(() => /^Typed first,( dictated words)+$/.test(document.getElementById('input').value));   // heard so far, while still recording
  const early = await page.inputValue('#input');
  await page.click('#mic');
  await page.waitForSelector('#box:not(.rec)');
  await page.waitForSelector('#voice', { state: 'hidden' });
  const said = await page.inputValue('#input');
  assert.match(said, /^Typed first,( dictated words)+$/);
  assert.ok(said.length >= early.length);                        // what was already written down stayed
  await page.click('#mic');
  await page.waitForSelector('#box.rec');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#box:not(.rec)');
  assert.equal(await page.inputValue('#input'), said);
  // the same with the mouse: the discard button; and holding the mic records until it is let go
  await page.click('#mic');
  await page.waitForSelector('#box.rec');
  await page.click('#vCancel');
  await page.waitForSelector('#box:not(.rec)');
  assert.equal(await page.inputValue('#input'), said);
  await page.fill('#input', '');
  const m = await page.locator('#mic').boundingBox();
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2);
  await page.mouse.down();
  await page.waitForSelector('#box.rec');
  await page.waitForFunction(() => /dictated words/.test(document.getElementById('input').value));
  await page.mouse.up();
  await page.waitForSelector('#voice', { state: 'hidden' });
  assert.match(await page.inputValue('#input'), /^dictated words/);
  await page.fill('#input', '');
});

ui('window: the settings dialog: tabs, default profile for new sessions, sign in again from the Profiles tab', async () => {
  await page.click('#bGear'); await page.click('#gAll');
  await page.waitForSelector('#spage .pgh:has-text("General")');
  await page.selectOption('#sProf', 'other');
  await page.selectOption('#sLang', 'german');
  await until(async () => { const p = (await state()).prefs; return p.defaultProfile === 'other' && p.language === 'german'; }, 'the settings to be saved');
  await page.click('#stabs [data-st="3"]');
  await page.waitForSelector('#spage .srow:has-text("Claude Code") .sstate:has-text("2.1.322")');
  await page.click('#stabs [data-st="2"]');
  await page.waitForSelector('#spage .srow:has-text("/code-review")');
  await page.click('#stabs [data-st="1"]');
  await page.click('#spage [data-login="full"]');
  await page.waitForSelector('#lgx .xterm');
  await page.waitForFunction(() => document.querySelector('#lgx .xterm-rows')?.innerText.includes('paste the code'));
  await page.keyboard.type('good'); await page.keyboard.press('Enter');
  await page.waitForSelector('#lgNote:has-text("Signed in")');
  await page.click('#lgBack');
  await page.waitForSelector('#spage [data-login="full"]');
  await page.click('#dClose');
  assert.equal(await page.isVisible('#sdim'), false);
  await page.click('#newBtn');
  await page.waitForSelector('#pProfile:has-text("other")');           // new sessions now start on the chosen profile
  await svc.call('settings', { defaultProfile: null, language: null });
  // a turn that stopped on a lost sign-in offers the same sign-in, one click away
  await startNew('AUTH please');
  await page.click('#qcard [data-signin]');
  await page.waitForSelector('#lgx .xterm');
  assert.match(await page.innerText('.lgbar b'), /Sign in to live/);
  await page.click('#dClose');
});

test('sandbox containment', () => {
  assert.deepEqual(assertContained(sb), []);
  assert.ok(sb.home.startsWith(os.tmpdir()));
});
