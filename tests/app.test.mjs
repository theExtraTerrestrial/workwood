// End-to-end tests. Everything runs in a throwaway HOME (see sandbox.mjs): the real
// Workwood service, with a scripted stand-in for `claude`.
// No real account is used and nothing is sent to Anthropic.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { makeSandbox, startService, readLog, setLive, assertContained, removeSandbox, addSession, upstreamCommit } from './sandbox.mjs';

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

test('reads limits itself, one profile at a time, without renewing a sign-in, and keeps Claudius\'s cache in step', async () => {
  const credsFile = path.join(sb.home, '.claude-profiles', 'other', '.credentials.json'), creds = fs.readFileSync(credsFile, 'utf8');
  await until(async () => (await state()).profiles.every(p => !p.reading), 'the readings at start-up');
  sb.usage.other = [55, 61]; const from = sb.usageReads.length;
  try {
    assert.equal((await svc.call('limits/refresh', {})).status, 200);
    const s = await until(async () => { const x = await state(); return x.profiles.every(p => !p.reading) && x.profiles.find(p => p.name === 'other').h5 === 55 && x; }, 'the new reading');
    const o = s.profiles.find(p => p.name === 'other');
    assert.equal(o.d7, 61); assert.ok(o.r5 > Date.now() / 1000); assert.equal(o.failed, null);
    assert.deepEqual([...sb.usageReads.slice(from)].sort(), ['full', 'live', 'other']);
    assert.equal(sb.usageMost, 1, 'two readings overlapped');
    assert.match(fs.readFileSync(path.join(sb.home, '.claude-profiles', 'other', '.usage'), 'utf8'), /^55 61 \d+ \d+ \d+\n$/);
    assert.equal(fs.readFileSync(credsFile, 'utf8'), creds);
    assert.equal((await svc.call('limits/refresh', { profile: 'nobody' })).status, 404);
  } finally {
    sb.usage.other = [12, 20]; await svc.call('limits/refresh', { profile: 'other' });
    await until(async () => (await state()).profiles.find(p => p.name === 'other').h5 === 12, 'the old reading back');
  }
});

test('a lapsed sign-in is renewed once, under the lock Claude Code and Claudius take, and then read', async () => {
  const P = path.join(sb.home, '.claude-profiles', 'full'), f = path.join(P, '.credentials.json'), was = fs.readFileSync(f, 'utf8');
  const lapse = () => { const c = JSON.parse(fs.readFileSync(f, 'utf8')); c.claudeAiOauth.expiresAt = Date.now() - 1000; fs.writeFileSync(f, JSON.stringify(c)); return c.claudeAiOauth.refreshToken; };
  try {
    const rt = lapse(), from = sb.renewals.length;
    await svc.call('limits/refresh', { profile: 'full' }); await svc.call('limits/refresh', { profile: 'full' });
    await until(async () => { const x = (await state()).profiles.find(q => q.name === 'full'); return !x.reading && !x.failed && sb.usageReads.includes('full') && x; }, 'the renewed reading');
    assert.deepEqual(sb.renewals.slice(from), [rt]);                          // once, though asked twice
    const o = JSON.parse(fs.readFileSync(f, 'utf8')).claudeAiOauth;
    assert.equal(o.refreshToken, rt + '+'); assert.ok(o.expiresAt > Date.now() + 3000e3); assert.equal(o.subscriptionType, 'pro');   // the rest is kept
    assert.ok(!fs.existsSync(path.join(P, '.oauth_refresh.lock')) && !fs.existsSync(P + '.lock'));   // both locks let go

    // While another program holds the lock (as a renewing Claude Code would), nothing is sent and the reading waits.
    lapse(); fs.mkdirSync(path.join(P, '.oauth_refresh.lock')); const from2 = sb.renewals.length;
    await svc.call('limits/refresh', { profile: 'full' });
    const p = await until(async () => { const x = (await state()).profiles.find(q => q.name === 'full'); return x.failed === 'busy' && !x.reading && x; }, 'the busy reading', 12000);
    assert.equal(p.h5, 100); assert.equal(sb.renewals.length, from2);
    // A lock nobody has touched for a minute was left behind by a program that died: it is taken over.
    const old = new Date(Date.now() - 120e3); fs.utimesSync(path.join(P, '.oauth_refresh.lock'), old, old);
    await svc.call('limits/refresh', { profile: 'full' });
    await until(async () => { const x = (await state()).profiles.find(q => q.name === 'full'); return !x.failed && !x.reading && sb.renewals.length === from2 + 1 && x; }, 'the stale lock taken over');
    // Even when a file was left inside it: the old `<profile>.lock` with a `.claude.json` in it once stopped every reading.
    lapse(); fs.mkdirSync(P + '.lock'); fs.writeFileSync(path.join(P + '.lock', '.claude.json'), '{}'); fs.utimesSync(P + '.lock', old, old);
    await svc.call('limits/refresh', { profile: 'full' });
    await until(async () => { const x = (await state()).profiles.find(q => q.name === 'full'); return !x.failed && !x.reading && sb.renewals.length === from2 + 2 && x; }, 'the stale lock with a file in it taken over');
    assert.ok(!fs.existsSync(P + '.lock'));
  } finally { for (const l of [path.join(P, '.oauth_refresh.lock'), P + '.lock']) fs.rmSync(l, { recursive: true, force: true }); fs.writeFileSync(f, was); }
});

test('the session list names a session as Claude Code titled it, and resumes it in the folder it is filed under', async () => {
  const main = sb.projects.beta, wt = path.join(main, '.claude', 'worktrees', 'fix_it-1');
  fs.mkdirSync(wt, { recursive: true });
  const id = '0aef439b-9da4-4f4e-b3fe-c75badd1bf34', dir = path.join(sb.home, '.claude', 'projects', wt.replace(/[^A-Za-z0-9]/g, '-'));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, id + '.jsonl'), [
    { type: 'session-owner', accountUuid: '22222222-2222-4222-8222-222222222222', sessionId: id },
    { type: 'user', cwd: main, sessionId: id, message: { role: 'user', content: 'start in the checkout' } },
    { type: 'assistant', cwd: wt, sessionId: id, gitBranch: 'fix', message: { role: 'assistant', content: [{ type: 'text', text: 'moved' }] } },
    { type: 'ai-title', aiTitle: 'Fix the worktree resume', sessionId: id },
  ].map(l => JSON.stringify(l)).join('\n') + '\n');
  try {
    const s = await until(async () => (await state()).sessions.find(x => x.id === id), 'the new session', 40000);
    assert.equal(s.cwd, wt); assert.equal(s.title, 'Fix the worktree resume'); assert.equal(s.profile, 'other');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('linking a profile shares everything but what makes it its own account, and keeps what was in the way', async () => {
  const P = path.join(sb.home, '.claude-profiles', 'full'), H = path.join(sb.home, '.claude');
  fs.mkdirSync(path.join(P, 'plans'), { recursive: true }); fs.writeFileSync(path.join(P, 'plans', 'own-plan.md'), 'mine');   // real data where a link goes
  fs.writeFileSync(path.join(H, '.oauth_refresh.lock.owner'), '{}');                                                          // Claude Code's lock record
  fs.symlinkSync(path.join(H, 'policy-limits.json'), path.join(P, 'policy-limits.json'));                                    // a link an older tool made
  try {
    const id = await newSession('hello from full', 'full'); await idle(id);
    assert.equal(fs.readlinkSync(path.join(P, 'plans')), path.join(H, 'plans'));
    assert.equal(fs.readFileSync(path.join(H, 'plans', 'own-plan.md'), 'utf8'), 'mine');                // merged into the pool
    assert.ok(fs.existsSync(path.join(P, 'plans.pre-share.bak', 'own-plan.md')));                       // and set aside, not deleted
    assert.ok(!fs.existsSync(path.join(P, '.oauth_refresh.lock.owner')));
    assert.ok(!fs.existsSync(path.join(P, 'policy-limits.json')));
    for (const own of ['.credentials.json', '.claude.json', 'settings.json']) assert.ok(!fs.lstatSync(path.join(P, own)).isSymbolicLink(), own);
  } finally { fs.rmSync(path.join(H, '.oauth_refresh.lock.owner'), { force: true }); }
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
  // Claude Code's own instructions, with Workwood's note on how to ask about files after them
  assert.ok(log.some(l => l.startsWith('appended This session runs in Workwood') && l.includes('`preview`')), log.join('|'));
  // when the turn ends, the context is Claude Code's own count, not the last reply's size (which /compact leaves behind)
  assert.deepEqual({ used: s.context.used, window: s.context.window }, { used: 51000, window: 200000 });
});

test('starts a session on another profile without Claudius: wired to the shared history, and listed under that profile', async () => {
  const before = readLog(sb).length;
  const id = await newSession('hello from other', 'other');
  await idle(id);
  const log = readLog(sb).slice(before), P = path.join(sb.home, '.claude-profiles', 'other');
  assert.ok(!log.some(l => l.startsWith('claudius')), log.join('|'));
  assert.ok(log.some(l => /account=other@example.com config=other/.test(l)), log.join('|'));
  assert.equal(fs.readlinkSync(path.join(P, 'projects')), path.join(sb.home, '.claude', 'projects'));
  assert.equal(JSON.parse(fs.readFileSync(path.join(P, '.claude.json'), 'utf8')).hasCompletedOnboarding, true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(P, 'settings.json'), 'utf8')).model, 'sonnet');   // filled in from the global settings
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
  const s = await idle(id);
  assert.equal(lastText(s), 'ANSWERS {"Which direction should I take?":"Dark","What else should it include?":"Tests, Docs"}');
  // and the thread keeps what you answered, live and read back from the history
  // each says which options it picked: one, or several where the question let you pick several
  const want = [['Direction', 'Dark', ['Dark'], false], ['Scope', 'Tests, Docs', ['Tests', 'Docs'], true]], of = items => items.filter(x => x.kind === 'answers').map(x => x.answers.map(a => [a.head, a.a, a.picks, !!a.multi]));
  assert.deepEqual(of(s.items), [want]);
  const { readTranscript } = await import('../service/transcript.mjs');
  assert.deepEqual(of((await readTranscript(fileOf(id))).items), [want]);
});

test('question card: words written instead of answering stay in the thread; declining with none leaves nothing', async () => {
  let id = await newSession('ASK but I say');
  let p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'deny', text: 'neither, make it grey' });
  let s = await idle(id);
  assert.deepEqual(s.items.filter(x => x.kind === 'answers').map(x => x.said), ['neither, make it grey']);
  // and the questions they stood in for stay with them
  assert.deepEqual(s.items.find(x => x.kind === 'answers').asked.map(a => a.head), ['Direction', 'Scope']);
  id = await newSession('ASK and I decline'); p = await pending(id);
  await svc.call(`sessions/${id}/answer`, { requestId: p.id, action: 'deny' });
  s = await idle(id);
  assert.equal(s.items.filter(x => x.kind === 'answers').length, 0);
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

test('a /compact stopped by a limit holds the session like any limit, and continuing on another profile compacts again', async () => {
  const id = await newSession('set up a COMPACT_FAILS');
  await idle(id);
  assert.equal((await svc.call(`sessions/${id}/send`, { text: '/compact' })).status, 200);
  const s = await until(async () => { const x = await session(id); return x.run?.status === 'stopped' && x; }, 'the compact to stop');
  assert.equal(s.run.stopped.reason, 'limit'); assert.equal(s.run.stopped.redo, '/compact');
  assert.match(s.run.stopped.text, /Error during compaction: You've hit your 5-hour limit/);
  const last = s.items.at(-1); assert.deepEqual([last.kind, last.stop, last.redo], ['note', 'limit', '/compact']);
  // read back from the history, it is the same stop, with the command to run again
  const { readTranscript } = await import('../service/transcript.mjs');
  const back = await readTranscript(fileOf(id));
  assert.deepEqual(back.items.filter(x => x.kind === 'note').map(x => [x.stop, x.redo]), [['limit', '/compact']]);
  // continuing by itself runs the compact again on the other profile, not "continue"
  assert.equal((await svc.call('settings', { autoContinue: true })).body.autoContinue, true);
  try {
    const id2 = await newSession('another COMPACT_FAILS');
    await idle(id2);
    const before = readLog(sb).length;
    await svc.call(`sessions/${id2}/send`, { text: '/compact' });
    await until(async () => (await state()).sessions.find(x => x.id === id2 && x.auto), 'the planned continue');
    const t = await until(async () => { const x = await session(id2); return x.run?.status === 'idle' && readLog(sb).slice(before).some(l => l.includes(`config=other resume=${id2}`)) && x; }, 'the compact again on other', 8000);
    assert.equal(t.items.filter(x => x.kind === 'user' && /Continue where you left off/.test(x.text || '')).length, 0);
  } finally { await svc.call('settings', { autoContinue: false }); }
});

test('handoff: a separate model writes it from the history, a new session goes on from it with recall, and the old one leaves the inbox', async () => {
  const ho = await import('../service/handoff.mjs');
  const id = await newSession('first we split the parser');
  await idle(id);
  await svc.call(`sessions/${id}/send`, { text: 'no, keep the old API' }); await idle(id);
  const dir = path.dirname(fileOf(id)), files = () => fs.readdirSync(dir).filter(f => f.endsWith('.jsonl')).length, had = files();
  let before = readLog(sb).length;
  assert.equal((await svc.call(`sessions/${id}/handoff`, { model: 'haiku', effort: 'low' })).status, 200);
  const st = await until(async () => { const x = await state(); return x.sessions.find(s => s.thread === 2) && x; }, 'the new session of the thread');
  const next = st.sessions.find(s => s.thread === 2).id;
  assert.notEqual(next, id);
  assert.equal(st.sessions.find(s => s.id === id).done, true);               // the thread goes on in the new one
  const log = readLog(sb).slice(before);
  assert.ok(log.some(l => /model=haiku effort=low .*persist=no/.test(l)), log.join('|'));   // the writer: the model picked, saved nowhere
  assert.ok(log.includes('writer saw ["first we split the parser","no, keep the old API"]'), log.join('|'));
  assert.ok(log.includes('mcp workwood allowed=mcp__workwood__recall'), log.join('|'));    // the new session has the recall tool, allowed without asking
  const all = log.join('\n'), note = all.slice(all.indexOf('<handoff>'), all.indexOf('</handoff>'));
  assert.match(note, /## Decided\n- Keep the old API\./); assert.match(note, /## Your messages, word for word\n.*first we split the parser\n.*no, keep the old API/);
  assert.match(all, /This session continues an earlier session of the same work[^\n]*mcp__workwood__recall/);
  const s2 = await idle(next);
  assert.deepEqual(s2.thread.sessions.map(x => [x.id, x.n, x.turns]), [[id, 1, 2]]);
  assert.equal(s2.thread.n, 2); assert.equal(s2.thread.handoff.model, 'haiku'); assert.equal(s2.thread.handoff.first, ho.FIRST);
  assert.ok(s2.items.some(i => i.kind === 'user' && i.text === ho.FIRST));
  assert.equal(files(), had + 1);                                              // only the new session was saved, not the writer's run
  await until(async () => (await state()).sessions.find(s => s.id === next)?.title === 'first we split the parser', 'the thread\'s name on the new session');
  // every later turn of the new session starts with the handoff and the tool too
  before = readLog(sb).length;
  await svc.call(`sessions/${next}/send`, { text: 'and now?' }); await idle(next);
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`resume=${next}`)) && readLog(sb).slice(before).includes('mcp workwood allowed=mcp__workwood__recall'), readLog(sb).slice(before).join('|'));
  assert.ok(readLog(sb).slice(before).includes('<handoff>'));
  // handed off again: the writer reads the handoff the session began from; the thread holds three
  before = readLog(sb).length;
  assert.equal((await svc.call(`sessions/${next}/handoff`, { model: 'sonnet', effort: 'medium', text: 'carry on with the tests' })).status, 200);
  const third = await until(async () => (await state()).sessions.find(s => s.thread === 3)?.id, 'the third session');
  assert.ok(readLog(sb).slice(before).some(l => l.startsWith('writer with previous')));
  const s3 = await idle(third);
  assert.deepEqual(s3.thread.sessions.map(x => [x.id, x.topic, x.turns]), [[id, 'The parser is split in two.', 2], [next, 'The parser is split in two.', 1]]);   // each said by the handoff written from it; the message it began with is not yours   // each said by the handoff written from it
  assert.equal(s3.thread.handoff.first, null);                                 // what you wrote yourself stays your message
  assert.ok(s3.items.some(i => i.kind === 'user' && i.text === 'carry on with the tests'));
  assert.equal((await svc.call(`sessions/${third}/handoff`, {})).status, 200);  // settled before another test runs
  await until(async () => (await state()).sessions.find(s => s.thread === 4), 'a fourth');
});

test('handoff: refused while the session works; a writer that fails leaves the session as it was', async () => {
  const id = await newSession('this one is SLOW');
  await until(async () => (await session(id)).run?.status === 'working', 'the turn to start');
  assert.equal((await svc.call(`sessions/${id}/handoff`, {})).status, 409);
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
  const id2 = await newSession('HANDOFF_FAILS here');
  await idle(id2);
  assert.equal((await svc.call(`sessions/${id2}/handoff`, {})).status, 200);
  await until(async () => (await session(id2)).handing === null && (await state()).sessions.find(s => s.id === id2).status === 'idle', 'the writer to give up');
  const st = await state();
  assert.equal(st.sessions.find(s => s.id === id2).done, false);
  assert.ok(!st.sessions.some(s => s.thread && s.title === 'HANDOFF_FAILS here'));
});

test('handoff: Auto picks the writer by how much went on; the facts are kept word for word', async () => {
  const ho = await import('../service/handoff.mjs');
  assert.equal(ho.pickModel('auto', { messages: 3, failed: 0, corrections: 0, chars: 9000 }), 'haiku');
  assert.equal(ho.pickModel('auto', { messages: 20, failed: 4, corrections: 2, chars: 300000 }), 'sonnet');
  assert.equal(ho.pickModel('auto', { messages: 22, failed: 16, corrections: 1, chars: 90000 }), 'opus');   // many failures: intricate
  assert.equal(ho.pickModel('auto', { messages: 12, failed: 1, corrections: 9, chars: 90000 }), 'opus');   // turned around often
  assert.equal(ho.pickModel('sonnet', { messages: 99, failed: 99, corrections: 99, chars: 1 }), 'sonnet');
  const dir = fs.mkdtempSync(path.join(sb.root, 'facts-')), f = path.join(dir, 's.jsonl'), L = o => JSON.stringify({ timestamp: '2026-11-20T10:00:00Z', ...o });
  fs.writeFileSync(f, [
    L({ type: 'user', message: { role: 'user', content: 'Make the parser faster' } }),
    L({ type: 'user', isMeta: true, message: { role: 'user', content: 'a reminder nobody typed' } }),
    L({ type: 'assistant', message: { model: 'm', content: [{ type: 'text', text: 'Trying a cache.' }, { type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'npm test' } }, { type: 'tool_use', id: 't2', name: 'Edit', input: { file_path: path.join(dir, 'src', 'p.js') } }] } }),
    L({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', is_error: true, content: 'Exit code 1\nexpected 3, got 4' }, { type: 'tool_result', tool_use_id: 't2', content: 'ok' }] } }),
    L({ type: 'assistant', message: { model: 'm', content: [{ type: 'tool_use', id: 'q1', name: 'AskUserQuestion', input: { questions: [{ question: 'Keep the cache?', options: [] }] } }] } }),
    L({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'q1', content: 'answered' }] }, toolUseResult: { answers: { 'Keep the cache?': 'No' } } }),
    L({ type: 'user', message: { role: 'user', content: [{ type: 'text', text: 'no, drop the cache' }] } }),
  ].join('\n') + '\n');
  const c = await ho.collect(f, dir);
  assert.deepEqual(c.facts.messages.map(m => m.text), ['Make the parser faster', 'no, drop the cache']);
  assert.deepEqual(c.facts.answers.map(a => [a.q, a.a]), [['Keep the cache?', 'No']]);
  assert.deepEqual(c.facts.files, [path.join('src', 'p.js')]);
  assert.deepEqual(c.facts.failed.map(x => [x.cmd, x.err]), [['npm test', 'expected 3, got 4']]);
  assert.deepEqual(c.stats, { messages: 2, failed: 1, corrections: 1, chars: c.digest.length });
  const t = ho.factsText(c.facts);
  assert.match(t, /## Your messages, word for word\n- 2026-11-20 10:00 — Make the parser faster\n- 2026-11-20 10:00 — no, drop the cache/);
  assert.match(t, /## Your answers\n- Keep the cache\?: No/); assert.match(t, /## Commands that failed\n- `npm test`\n  expected 3, got 4/);
  assert.equal(await ho.countMessages(f), 2);
  // files a command wrote and files a commit took count as changed; an error is told by its message, not its stack;
  // a lookup that found nothing, a failure the same command later got past, and a repeated error are left out or folded
  assert.deepEqual(ho.writtenBy("python3 - <<'EOF'\np='ui/a.js';s=open(p).read()\nopen(p,'w').write(s)\nEOF\nsed -i 's/x y/z/' b.js && echo hi > c.log 2>/dev/null"), ['ui/a.js', 'b.js', 'c.log']);
  assert.equal(ho.errorOf("/x.cjs:2\n    throw err;\n    ^\n\nError: Executable doesn't exist at /chrome\n    at run (/x.cjs:2:35)\n    at Object.<anonymous> (/x.cjs:6:45) {\n  log: [],\n}\nNode.js v26.1.0"), "Error: Executable doesn't exist at /chrome");
  execFileSync('git', ['init', '-q', dir]); fs.mkdirSync(path.join(dir, 'ui'));
  for (const n of ['ui/a.js', 'b.js', 'd.md']) fs.writeFileSync(path.join(dir, n), 'x');
  execFileSync('git', ['-C', dir, 'add', 'd.md']); execFileSync('git', ['-C', dir, '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-qm', 'd']);
  const hash = execFileSync('git', ['-C', dir, 'rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  const h = path.join(dir, 'h.jsonl'), B = (id, command) => ({ type: 'tool_use', id, name: 'Bash', input: { command } }), R = (id, content, is_error) => ({ type: 'tool_result', tool_use_id: id, content, is_error });
  fs.writeFileSync(h, [
    L({ type: 'assistant', message: { model: 'm', content: [B('a', "python3 - <<'EOF'\np='ui/a.js'\nopen(p,'w').write('y')\nEOF"), B('b', "sed -i 's/a/b/' b.js /tmp/elsewhere.js"), B('c', 'which chromium'), B('d', 'node build.mjs'), B('e', 'npm run lint'), B('f', 'npm run lint --fix'), B('g', 'npm run lint --fix')] } }),
    L({ type: 'user', message: { role: 'user', content: [R('a', 'ok'), R('b', 'ok'), R('c', 'Exit code 1\n', true), R('d', 'Exit code 1\nError: no input', true), R('e', 'Exit code 2\n3 problems', true), R('f', 'Exit code 2\n3 problems', true), R('g', 'Exit code 2\n3 problems', true)] } }),
    L({ type: 'assistant', message: { model: 'm', content: [B('h', 'git commit -am d'), B('i', 'node build.mjs')] } }),
    L({ type: 'user', message: { role: 'user', content: [R('h', `[main ${hash}] d\n 1 file changed`), R('i', 'built')] } }),
  ].join('\n') + '\n');
  const hc = await ho.collect(h, dir);
  assert.deepEqual(hc.facts.files, ['ui/a.js', 'b.js', 'd.md']);
  assert.deepEqual(hc.facts.failed.map(x => [x.cmd, x.err, x.times]), [['npm run lint --fix', '3 problems', 3]]);
  assert.match(ho.factsText(hc.facts), /- `npm run lint --fix` \(3 times\)\n  3 problems/);
  // recall: newest session first, a few short excerpts with who and when; nothing found says so
  const g = path.join(dir, 'older.jsonl');
  fs.writeFileSync(g, L({ type: 'user', message: { role: 'user', content: 'The cache must go, it breaks on port 4519' } }) + '\n');
  const r = await ho.search([{ file: f, label: 'Session 2' }, { file: g, label: 'Session 1' }], 'cache');
  assert.match(r.text, /^\d+ of \d+ matches in the earlier sessions of this thread:/);
  assert.ok(r.hits.length <= 5 && r.hits[0].session.label === 'Session 2', JSON.stringify(r.hits.map(h => h.session.label)));
  const p = await ho.search([{ file: f, label: 'Session 2' }, { file: g, label: 'Session 1' }], 'port 4519');
  assert.match(p.text, /\[Session 1 · 2026-11-20 10:00 · you\]\nThe cache must go, it breaks on port 4519/);
  // what people wrote ranks above a command with the same words, and a command is quoted short
  const k = path.join(dir, 'k.jsonl');
  fs.writeFileSync(k, [L({ type: 'assistant', message: { model: 'm', content: [B('z', 'cat > x.html <<EOF\n' + 'filler '.repeat(300) + 'the split button goes\n' + 'filler '.repeat(300) + '\nEOF')] } }),
    L({ type: 'user', message: { role: 'user', content: 'I do not like the split button' } })].join('\n') + '\n');
  const sb2 = await ho.search([{ file: k, label: 'Session 1' }], 'split button');
  assert.deepEqual(sb2.hits.map(x => x.who), ['you', 'agent ran']);
  assert.ok(sb2.text.split('agent ran]\n')[1].length <= 302, sb2.text);
  assert.match((await ho.search([{ file: f, label: 'Session 2' }], 'zebra')).text, /^Nothing in the earlier sessions of this thread mentions "zebra"/);
});

test('settings: who writes a handoff and when it is offered are kept, and odd values refused', async () => {
  assert.deepEqual((await state()).prefs.handoff, { model: 'auto', effort: 'medium', offer: 400000 });
  assert.deepEqual((await svc.call('settings', { handoff: { model: 'opus', effort: 'high', offer: 200000 } })).body.handoff, { model: 'opus', effort: 'high', offer: 200000 });
  assert.deepEqual((await svc.call('settings', { handoff: { model: 'gpt', offer: 7 } })).body.handoff, { model: 'auto', effort: 'high', offer: 400000 });
  await svc.call('settings', { handoff: { model: 'auto', effort: 'medium', offer: 400000 } });
});

test('with the setting on, a limit continues by itself on the profile with most room after the wait, unless cancelled', async () => {
  assert.equal((await svc.call('settings', { autoContinue: true })).body.autoContinue, true);
  try {
    const id = await newSession('hit the LIMIT');
    const s = await until(async () => (await state()).sessions.find(x => x.id === id && x.auto), 'the planned continue');
    assert.equal(s.auto.to, 'other'); assert.equal(s.line, 'Limit reached · continuing on other soon');   // "full" is at its limit
    assert.equal((await session(id)).run.status, 'stopped');                                             // it waits first
    const before = readLog(sb).length;
    const t = await until(async () => { const x = await session(id); return x.run.status === 'idle' && x; }, 'the continued turn', 8000);
    assert.equal(lastText(t), 'Echo: Continue where you left off.');
    assert.ok(readLog(sb).slice(before).some(l => l.includes(`config=other resume=${id}`)));
    assert.equal((await state()).sessions.find(x => x.id === id).auto, null);

    const id2 = await newSession('hit the LIMIT again');
    await until(async () => (await state()).sessions.find(x => x.id === id2)?.auto, 'the planned continue');
    assert.equal((await svc.call(`sessions/${id2}/stay`, {})).status, 200);
    assert.equal((await state()).sessions.find(x => x.id === id2).auto, null);
    await sleep(3000);
    assert.equal((await session(id2)).run.status, 'stopped');                                            // cancelled: it stays put
    assert.equal((await state()).sessions.find(x => x.id === id2).profile, 'live');
  } finally { await svc.call('settings', { autoContinue: false }); }
});

test('a lost sign-in is reported as such, and the profile keeps it until a turn on it goes well', async () => {
  const id = await newSession('lose AUTH', 'other');
  const s = await idle(id);
  assert.equal(s.run.stopped.reason, 'auth');
  const p = await until(async () => (await state()).profiles.find(x => x.name === 'other' && x.stop), 'the stop on the profile');
  assert.equal(p.stop.reason, 'auth'); assert.equal(p.stop.sessionId, id);
  await idle(await newSession('fine again', 'other'));
  await until(async () => !(await state()).profiles.find(x => x.name === 'other').stop, 'the stop to clear');
  await until(async () => (await state()).profiles.every(p => !p.reading), 'the readings after those turns', 12000);
});

test('a lost sign-in after Claude Code reports work left over from before still stops the turn as signed out', async () => {
  const s = await idle(await newSession('ORPHANED and AUTH', 'other'));
  assert.equal(s.run.status, 'stopped');
  assert.equal(s.run.stopped.reason, 'auth');
  assert.equal(s.items.filter(x => x.kind === 'done').length, 0);
});

test('a lost sign-in saved in the history reads back as the stop it was, once no turn holds it in memory', async () => {
  const id = addSession(sb, 'beta', 'other', 'Earlier work', 'ok', 5, { stop: 'authentication_failed' });
  await idle(await newSession('nudge a refresh'));
  await until(() => listed(id), 'the session from before', 15000);
  const s = await session(id), last = s.items.at(-1);
  assert.equal(s.run, null);
  assert.deepEqual([last.kind, last.stop, last.profile, last.text], ['note', 'auth', 'other', undefined]);
  assert.equal(s.items.filter(x => x.kind === 'assistant' && /authenticate/.test(x.text)).length, 0);
  sb.sessions.signedOut = id;
});

test('a failed turn is kept on its profile until dismissed; a limit is not', async () => {
  await idle(await newSession('BREAK it', 'other'));
  const p = await until(async () => (await state()).profiles.find(x => x.name === 'other' && x.stop), 'the stop on the profile');
  assert.equal(p.stop.reason, 'error'); assert.equal(p.stop.text, 'API Error: 500 Internal server error');
  assert.equal((await svc.call('profiles/nobody/dismiss', {})).status, 404);
  assert.equal((await svc.call('profiles/other/dismiss', {})).status, 200);
  assert.equal((await state()).profiles.find(x => x.name === 'other').stop, null);
  await idle(await newSession('hit the LIMIT', 'other'));
  assert.equal((await state()).profiles.find(x => x.name === 'other').stop, null);
  await until(async () => (await state()).profiles.every(p => !p.reading), 'the readings after those turns', 12000);
});

test('any other error ends the turn with a note, not a stop that holds the session', async () => {
  const id = await newSession('BREAK it');
  const s = await idle(id);
  assert.equal(s.run.status, 'idle');
  assert.equal(s.items.at(-1).kind, 'note'); assert.equal(s.items.at(-1).text, 'API Error: 500 Internal server error');
  await until(async () => (await state()).sessions.find(x => x.id === id)?.status === 'idle', 'the sidebar to show it idle, not stopped');
});

test('marking a stopped session done keeps it out of the inbox', async () => {
  const id = await newSession('another LIMIT');
  assert.equal((await idle(id)).run.status, 'stopped');
  await svc.call(`sessions/${id}/done`, {});
  const x = (await state()).sessions.find(x => x.id === id);
  assert.equal(x.done, true); assert.equal(x.status, 'idle');
  assert.equal((await session(id)).run.status, 'idle');
  await svc.call(`sessions/${id}/done`, { on: false });               // leave the done list as it was
});

test('stop interrupts a working turn', async () => {
  const id = await newSession('be SLOW');
  await until(async () => (await session(id)).run?.activity?.startsWith('Running'), 'the turn to be busy');
  await svc.call(`sessions/${id}/stop`, {});
  const s = await idle(id);
  assert.equal(s.run.status, 'idle');
  assert.ok(readLog(sb).includes('interrupted'));
});

const stepsOf = s => s.items.flatMap(i => i.kind === 'tools' ? i.tools : []);
test('a command step carries its text, its time, how it ended and its output; one command can be stopped on its own', async () => {
  const id = await newSession('run COMMANDS');
  const st = await until(async () => { const t = stepsOf(await session(id)); return t.find(x => x.id === 'toolu_serve')?.task && t; }, 'the second command to start');
  const fail = st.find(x => x.id === 'toolu_fail');
  assert.equal(fail.cmd, 'node --test tests/ 2>&1 | grep "<fail>"');
  assert.deepEqual([fail.state, fail.code, fail.past, fail.lines, fail.cut], ['bad', 1, 'Ran', 21, true]);
  assert.ok(fail.end - fail.start >= 100, 'timed from the call to its result');   // 300 ms apart in the fake; a busy machine may handle the start late
  assert.match(fail.out, /line 20\nfail 2$/); assert.ok(!/^line 1\n/.test(fail.out), 'only the end of the output travels with the step');
  const full = (await svc.call(`sessions/${id}/output?tool=toolu_fail`)).body.text;
  assert.ok(full.startsWith('line 1\n') && full.endsWith('fail 2') && !full.startsWith('Exit code'));
  const serve = st.find(x => x.id === 'toolu_serve');
  assert.equal(serve.limit, 600000); assert.ok(!serve.state && !serve.end, 'still running');
  assert.equal((await svc.call(`sessions/${id}/stop-step`, { id: 'toolu_serve' })).status, 200);
  const s = await idle(id);
  assert.equal(lastText(s), 'Commands done.');                    // the turn carried on
  assert.equal(stepsOf(s).find(x => x.id === 'toolu_serve').state, 'stop');
  assert.ok(readLog(sb).includes('stopped task task_serve'));
  assert.equal((await svc.call(`sessions/${id}/stop-step`, { id: 'toolu_serve' })).status, 409);
  // the saved history gives the same, and the whole output too
  const { readTranscript, outputFromTranscript } = await import('../service/transcript.mjs');
  const saved = stepsOf(await readTranscript(fileOf(id))).find(x => x.id === 'toolu_fail');
  assert.deepEqual([saved.state, saved.code, saved.lines], ['bad', 1, 21]);
  assert.equal(await outputFromTranscript(fileOf(id), 'toolu_fail'), full);
});

test('a model\'s context window: the Claude 5 models hold a million, older ones 200k; what Claude Code reported is kept on disk', async () => {
  const { windowFor } = await import('../service/transcript.mjs');
  for (const m of ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-2', 'claude-sonnet-4-5[1m]']) assert.equal(windowFor(m), 1000000, m);
  for (const m of ['claude-sonnet-4-5', 'claude-3-5-haiku-20241022']) assert.equal(windowFor(m), 200000, m);
  assert.equal(windowFor('claude-sonnet-4-5', 250000), 1000000);
  // the service learns claude-test's window from a finished turn (the stand-in reports 200k) and keeps it for the next start
  const kept = path.join(sb.home, '.cache', 'workwood', 'windows.json');
  await until(() => fs.existsSync(kept) && JSON.parse(fs.readFileSync(kept, 'utf8'))['claude-test'] === 200000, 'the learned window on disk', 20000);
});

test('the prompt cache: each reply says when it was written and for how long it is kept', async () => {
  const { readTranscript } = await import('../service/transcript.mjs');
  const f = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'ww-cache-')), 's.jsonl');
  const A = (ts, cache) => JSON.stringify({ type: 'assistant', timestamp: ts, message: { role: 'assistant', model: 'claude-test', content: [{ type: 'text', text: 'ok' }],
    usage: { input_tokens: 2, cache_read_input_tokens: 90000, cache_creation_input_tokens: 1000, output_tokens: 10, ...(cache ? { cache_creation: cache } : {}) } } });
  fs.writeFileSync(f, A('2026-11-24T10:00:00.000Z', { ephemeral_1h_input_tokens: 1000, ephemeral_5m_input_tokens: 0 }) + '\n');
  assert.deepEqual(pick((await readTranscript(f)).context), { at: Date.parse('2026-11-24T10:00:00.000Z'), ttl: 3600 });
  // a reply that only read the cache keeps the length it had; one written for five minutes (overage) shortens it
  fs.appendFileSync(f, A('2026-11-24T10:20:00.000Z', null) + '\n');
  assert.deepEqual(pick((await readTranscript(f)).context), { at: Date.parse('2026-11-24T10:20:00.000Z'), ttl: 3600 });
  fs.appendFileSync(f, A('2026-11-24T10:30:00.000Z', { ephemeral_1h_input_tokens: 0, ephemeral_5m_input_tokens: 800 }) + '\n');
  assert.deepEqual(pick((await readTranscript(f)).context), { at: Date.parse('2026-11-24T10:30:00.000Z'), ttl: 300 });
  // the list reads the same from the file's tail; lines Claude Code adds when a session is only opened change nothing
  const { lastReply } = await import('../service/sources.mjs');
  const opened = fs.readFileSync(f, 'utf8') + JSON.stringify({ type: 'cost-state', sessionId: 's', totalCostUSD: 1 }) + '\n';
  assert.deepEqual(lastReply(opened), { at: Date.parse('2026-11-24T10:30:00.000Z'), ttl: 300 });
  assert.deepEqual(lastReply(A('2026-11-24T10:00:00.000Z', { ephemeral_1h_input_tokens: 1000 }) + '\n' + A('2026-11-24T10:20:00.000Z', null)), { at: Date.parse('2026-11-24T10:20:00.000Z'), ttl: 3600 });
  assert.equal(lastReply(JSON.stringify({ type: 'cost-state' })), null);
  fs.rmSync(path.dirname(f), { recursive: true, force: true });
  function pick(c) { return { at: c.at, ttl: c.ttl }; }
});

test('work left in the background keeps the session open: an agent with its own steps, a monitor and its events, a failure that marks it unread, a stop', async () => {
  const id = await newSession('start BACKGROUND work');
  let s = await until(async () => { const s = await session(id); return s.run?.lingering && s.run.bg.length === 2 && s; }, 'the turn to end with work left running');
  assert.equal(s.run.status, 'idle'); assert.equal(lastText(s), 'Started.');
  assert.deepEqual(s.run.bg.map(t => `${t.kind} ${t.name}`).sort(), ['monitor Watch the tests', 'shell Start the dev server']);
  const agent = stepsOf(s).find(x => x.id === 'toolu_fg');
  assert.deepEqual([agent.state, agent.kind, agent.tokens, agent.count, agent.sub.map(x => `${x.past} ${x.what}`)], ['ok', 'Explore', 22000, 1, ['Read README.md']]);
  assert.equal(agent.report, 'Found it in README.md.\nIt has a title and one line.');
  assert.equal((await listed(id)).bg, 2);
  await until(async () => (await session(id)).run.bg.find(t => t.kind === 'shell')?.last === 'ready on http://localhost:4310', 'the server\'s last line');
  // a monitor's event: a note in the conversation, on its step, and the turn Claude Code starts for it
  s = await until(async () => { const s = await session(id); return s.items.some(i => i.kind === 'assistant' && i.text === 'Saw a failing test.') && s; }, 'the turn the event woke');
  const ev = s.items.find(i => i.kind === 'bg' && i.event);
  assert.deepEqual([ev.event, ev.of, ev.name], ['FAIL parser test', 'monitor', 'Watch the tests']);
  assert.ok(s.items.indexOf(ev) < s.items.findIndex(i => i.text === 'Saw a failing test.'), 'the note comes before the reply it caused');
  assert.equal(stepsOf(s).find(x => x.id === 'toolu_mon').events[0].x, 'FAIL parser test');
  assert.equal((await svc.call(`sessions/${id}/task-output?task=task_mon`)).body.text, 'FAIL parser test\n');
  await svc.call(`sessions/${id}/seen`, {});
  // the dev server fails after the turn: a red note, its step ends red, and the session is unread again
  s = await until(async () => { const s = await session(id); return s.run.bg.length === 1 && s.items.some(i => i.kind === 'bg' && i.bad) && s; }, 'the server to fail');
  const dev = stepsOf(s).find(x => x.id === 'toolu_dev');
  assert.deepEqual([dev.state, dev.code], ['bad', 1]);
  await until(async () => (await listed(id)).unread, 'the session to be unread');
  // you write while the monitor still runs: the same Claude Code takes it as a new turn
  const starts = () => readLog(sb).filter(l => l.startsWith('session ')).length;
  const before = starts();
  await until(async () => (await session(id)).run.lingering, 'the woken turn to end');
  assert.equal((await svc.call(`sessions/${id}/send`, { text: 'still there?' })).status, 200);
  s = await until(async () => { const s = await session(id); return lastText(s) === 'Echo: still there?' && s.run.lingering && s; }, 'the reply in the same session');
  assert.equal(starts(), before, 'no second Claude Code was started');
  // stopping the last task closes the session after a moment
  assert.equal((await svc.call(`sessions/${id}/stop-step`, { id: 'toolu_mon' })).status, 200);
  s = await until(async () => { const s = await session(id); return !s.run.lingering && !s.run.bg.length && s; }, 'the session to close');
  assert.equal(stepsOf(s).find(x => x.id === 'toolu_mon').state, 'stop');
  assert.equal((await listed(id)).bg, 0);
  // and the saved history tells the same story
  const { readTranscript } = await import('../service/transcript.mjs');
  const saved = await readTranscript(fileOf(id));
  assert.deepEqual(saved.items.filter(i => i.kind === 'bg').map(i => i.event || i.text), ['FAIL parser test', 'Background command "Start the dev server" failed with exit code 1', 'Monitor "Watch the tests" stopped']);
  assert.deepEqual(stepsOf(saved).filter(x => x.bg).map(x => `${x.id} ${x.state}`), ['toolu_dev bad', 'toolu_mon stop']);
});

test('a message sent while the agent works reaches it: taken into the running turn, or run as the next one', async () => {
  const working = id => until(async () => { const s = await session(id); return s.run?.status === 'working' && s.items.some(i => i.kind === 'tools') && s; }, 'the agent to be working');
  const a = await newSession('please LISTEN while you build');
  await working(a);
  const q = (await svc.call(`sessions/${a}/send`, { text: 'use the blue one' })).body;
  assert.ok(q.ok && q.queued);
  const s1 = await idle(a);
  assert.equal(lastText(s1), 'Heard mid-turn: use the blue one');
  assert.deepEqual(s1.items.filter(i => i.kind === 'user').map(i => i.text), ['please LISTEN while you build', 'use the blue one']);

  const b = await newSession('QUEUE up some work');
  await working(b);
  assert.equal((await svc.call(`sessions/${b}/send`, { text: 'and then this' })).status, 200);
  const s2 = await until(async () => { const s = await session(b); return s.run?.status === 'idle' && /Echo: and then this/.test(lastText(s) || '') && s; }, 'the following turn to end');
  assert.ok(s2.items.some(i => i.kind === 'assistant' && /First part done/.test(i.text)));
  const again = (await svc.call('sessions/' + b)).body;                      // and it reads back the same from the saved history
  assert.deepEqual(again.items.filter(i => i.kind === 'user').map(i => i.text), ['QUEUE up some work', 'and then this']);
});

test('a message sent during /compact is answered in the chat, not left to Claude Code alone', async () => {
  const id = await newSession('hello there');
  await idle(id);
  assert.equal((await svc.call(`sessions/${id}/send`, { text: '/compact' })).status, 200);
  await until(async () => (await session(id)).run?.status === 'working', 'the compact to start');
  assert.ok((await svc.call(`sessions/${id}/send`, { text: 'carry on after' })).body.queued);
  const s = await until(async () => { const x = await session(id); return x.run?.status === 'idle' && /Echo: carry on after/.test(lastText(x) || '') && x; }, 'the message after the compact to be answered here');
  assert.ok(s.items.some(i => i.kind === 'user' && i.text === 'carry on after'));
});

test('the queue: a message waits until the step ends; it can be taken back to change it, or sent now', async () => {
  const id = await newSession('do these STEPS');
  await until(async () => { const s = await session(id); return s.run?.status === 'working' && s.items.some(i => i.kind === 'tools'); }, 'the slow step to start');
  const first = (await svc.call(`sessions/${id}/send`, { text: 'first draft' })).body.queued;
  let s = await session(id);
  assert.deepEqual(s.run.queued.map(q => q.text), ['first draft']);
  assert.ok(!s.items.some(i => i.kind === 'user' && i.text === 'first draft'));      // the agent does not have it yet
  const back = (await svc.call(`sessions/${id}/unqueue`, { ids: [first] })).body.items;
  assert.deepEqual(back.map(m => m.text), ['first draft']);
  assert.deepEqual((await session(id)).run.queued, []);
  assert.deepEqual((await svc.call(`sessions/${id}/unqueue`, { ids: [first] })).body.items, []);   // taken back once only

  const now = (await svc.call(`sessions/${id}/send`, { text: 'go faster' })).body.queued;
  assert.equal((await svc.call(`sessions/${id}/now`, { id: now })).status, 200);
  s = await until(async () => { const x = await session(id); return x.run?.status === 'idle' && /Echo: go faster/.test(lastText(x) || '') && x; }, 'the message sent now to be answered');
  assert.deepEqual(s.items.filter(i => i.kind === 'user').map(i => i.text), ['do these STEPS', 'go faster']);
  assert.ok(!s.items.some(i => i.kind === 'assistant' && /Steps done/.test(i.text)));   // the slow step was cut short
  assert.equal((await svc.call(`sessions/${id}/now`, { id: now })).status, 409);
});

test('previews: files a command made are offered too, live and when read back; a file it only named is not', async () => {
  const id = await newSession('take a SCREENSHOT');
  const live = await idle(id), names = s => s.work.map(f => f.name).sort();
  assert.deepEqual(names(live), ['home.png', 'report.html']);
  assert.deepEqual(live.items.find(i => i.kind === 'work').files.map(f => f.name).sort(), ['home.png', 'report.html']);
  const base = (await state()).preview;
  assert.equal((await fetch(`${base}/${id}${path.join(sb.projects.alpha, 'shots', 'out', 'home.png')}`)).status, 200);
  const { readTranscript } = await import('../service/transcript.mjs');
  const file = path.join(sb.home, '.claude', 'projects', sb.projects.alpha.replace(/[^A-Za-z0-9]/g, '-'), id + '.jsonl');
  assert.deepEqual(names(await readTranscript(file, 400, sb.projects.alpha)), ['home.png', 'report.html']);
});

test('previews: a command\'s file is found from the folder its shell was in, and early in a long session too', async () => {
  const { readTranscript } = await import('../service/transcript.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-early-')), project = path.join(dir, 'project'), tree = path.join(project, 'trees', 'one');
  fs.mkdirSync(path.join(tree, 'out'), { recursive: true });
  const page = path.join(tree, 'out', 'page.html');
  fs.writeFileSync(page, '<p>hi</p>');
  const t = Date.parse('2026-01-02T10:00:00Z'), at = ms => new Date(t + ms).toISOString();
  fs.utimesSync(page, new Date(t + 1000), new Date(t + 1000));
  // The shell moved into the worktree in a command the transcript does not show; only the line's cwd says so.
  const made = [
    { type: 'assistant', cwd: tree, timestamp: at(0), message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id: 't1', name: 'Bash', input: { command: 'node gen.mjs > out/page.html' } }] } },
    { type: 'user', cwd: tree, timestamp: at(1500), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 't1', content: '' }] } },
    { type: 'system', subtype: 'turn_duration', durationMs: 2000, timestamp: at(2000) },
  ];
  const padding = n => Array.from({ length: n }, (_, i) => ({ type: 'user', cwd: project, timestamp: at(10000 + i), message: { role: 'user', content: 'x'.repeat(100000) } }));
  const write = (name, lines) => { const f = path.join(dir, name); fs.writeFileSync(f, lines.map(l => JSON.stringify(l)).join('\n') + '\n'); return f; };
  try {
    const short = await readTranscript(write('short.jsonl', made), 400, project);
    assert.deepEqual(short.work.map(f => f.path), [page]);
    const long = await readTranscript(write('long.jsonl', [...made, ...padding(80)]), 400, project);   // 8 MB: the page is before the part that is read
    assert.ok(long.cut && !long.items.some(i => i.kind === 'work'));
    assert.deepEqual(long.work.map(f => f.path), [page]);
    fs.rmSync(page);
    assert.deepEqual((await readTranscript(path.join(dir, 'long.jsonl'), 400, project)).work, []);   // gone since: left out
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('previews: a named file rewritten later in the turn by a command that does not name it is still offered', async () => {
  const { readTranscript } = await import('../service/transcript.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-again-')), page = path.join(dir, 'mock.html');
  fs.writeFileSync(page, '<p>hi</p>');
  const t = Date.parse('2026-01-02T10:00:00Z'), at = ms => new Date(t + ms).toISOString();
  fs.utimesSync(page, new Date(t + 61000), new Date(t + 61000));   // last written by the second command
  const run = (id, ms, command) => [
    { type: 'assistant', cwd: dir, timestamp: at(ms), message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id, name: 'Bash', input: { command } }] } },
    { type: 'user', cwd: dir, timestamp: at(ms + 1500), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: '' }] } },
  ];
  const lines = [
    { type: 'user', cwd: dir, timestamp: at(-1000), message: { role: 'user', content: 'make it' } },
    ...run('t1', 0, `python3 gen.py && F=${page} && chrome --screenshot file://$F`),
    ...run('t2', 60000, 'sed -i "" s/a/b/ gen.py && python3 gen.py'),
    { type: 'system', subtype: 'turn_duration', durationMs: 62000, timestamp: at(62000) },
  ];
  const f = path.join(dir, 's.jsonl');
  fs.writeFileSync(f, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  try {
    const r = await readTranscript(f, 400, dir);
    assert.deepEqual(r.items.find(i => i.kind === 'work')?.files.map(x => x.path), [page]);
    fs.utimesSync(page, new Date(t + 3600e3), new Date(t + 3600e3));   // written after the turn: not this turn's
    assert.deepEqual((await readTranscript(f, 400, dir)).work, []);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('previews: a picture a script made under a path no command names is offered once the agent opens it', async () => {
  const { readTranscript } = await import('../service/transcript.mjs');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ww-read-')), shot = path.join(dir, 'shots', 'step.png'), old = path.join(dir, 'old.png');
  fs.mkdirSync(path.dirname(shot)); fs.writeFileSync(shot, 'png'); fs.writeFileSync(old, 'png');
  const t = Date.parse('2026-01-02T10:00:00Z'), at = ms => new Date(t + ms).toISOString();
  fs.utimesSync(shot, new Date(t + 1000), new Date(t + 1000));   // written by the smoke script
  fs.utimesSync(old, new Date(t - 3600e3), new Date(t - 3600e3)); // from an hour before: looked at, not made
  const tool = (id, ms, name, input) => [
    { type: 'assistant', cwd: dir, timestamp: at(ms), message: { model: 'claude-opus-5-5', content: [{ type: 'tool_use', id, name, input }] } },
    { type: 'user', cwd: dir, timestamp: at(ms + 1500), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: '' }] } },
  ];
  const lines = [
    { type: 'user', cwd: dir, timestamp: at(-1000), message: { role: 'user', content: 'check it' } },
    ...tool('t1', 0, 'Bash', { command: 'node smoke.js' }),
    ...tool('t2', 5000, 'Read', { file_path: shot }),
    ...tool('t3', 6000, 'Read', { file_path: old }),
    { type: 'system', subtype: 'turn_duration', durationMs: 8000, timestamp: at(8000) },
  ];
  const padding = Array.from({ length: 80 }, (_, i) => ({ type: 'user', cwd: dir, timestamp: at(10000 + i), message: { role: 'user', content: 'x'.repeat(100000) } }));
  const write = (name, l) => { const f = path.join(dir, name); fs.writeFileSync(f, l.map(x => JSON.stringify(x)).join('\n') + '\n'); return f; };
  try {
    assert.deepEqual((await readTranscript(write('s.jsonl', lines), 400, dir)).work.map(f => f.path), [shot]);
    assert.deepEqual((await readTranscript(write('long.jsonl', [...lines, ...padding]), 400, dir)).work.map(f => f.path), [shot]);   // early in a long session too
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
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
  assert.deepEqual({ used: s.context.used, window: s.context.window }, { used: 42000, window: 1000000 });
  assert.ok(s.context.at > 0, 'the time of the last reply, for the cache');
  const plain = await session(sb.sessions.betaOther);
  assert.equal(plain.model, 'claude-test'); assert.equal(plain.effort, null); assert.equal(plain.context.window, 200000);
});

test('defaults come from Claude Code settings, the project\'s over the profile\'s', async () => {
  const q = cwd => svc.call(`defaults?cwd=${encodeURIComponent(cwd)}&profile=live`).then(r => r.body);
  assert.deepEqual(await q(sb.projects.beta), { model: 'claude-sonnet-5-5', effort: 'high', mode: null });
  const dir = path.join(sb.home, 'workspace', 'epsilon', '.claude'); fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'settings.json'), JSON.stringify({ model: 'opus[1m]', effortLevel: 'low' }));
  fs.writeFileSync(path.join(dir, 'settings.local.json'), JSON.stringify({ effortLevel: 'max', permissions: { defaultMode: 'acceptEdits' } }));
  assert.deepEqual(await q(path.dirname(dir)), { model: 'claude-opus-5-5[1m]', effort: 'max', mode: 'acceptEdits' });
  assert.deepEqual((await session(sb.sessions.betaFable)).defaults, { model: 'claude-sonnet-5-5', effort: 'high', mode: null });
});

test('permission mode: chosen for a new session, changed mid-turn, kept for the next turn, and read back from the history', async () => {
  const id = await newSession('MODEWAIT please', 'live', { mode: 'plan' });
  assert.ok(readLog(sb).some(l => l.includes('mode=plan')), readLog(sb).join('|'));
  await until(async () => (await session(id)).run?.mode === 'plan', 'the run to report plan');
  assert.deepEqual((await svc.call(`sessions/${id}/mode`, { mode: 'auto' })).body, { live: true });
  const s = await idle(id);
  assert.equal(lastText(s), 'Mode now: auto'); assert.equal(s.mode, 'auto');
  const before = readLog(sb).length;
  await svc.call(`sessions/${id}/send`, { text: 'again' }); await until(async () => lastText(await session(id)) === 'Echo: again', 'the next reply');
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`resume=${id}`) && l.includes('mode=auto')), readLog(sb).slice(before).join('|'));
  // a session not open in Workwood shows the mode its history last recorded
  assert.equal((await session(sb.sessions.betaOther)).mode, null);
});

test('permission mode: Bypass only once turned on in Settings; "make this my default" writes the profile\'s own setting', async () => {
  assert.equal((await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'hi', mode: 'bypassPermissions' })).status, 400);
  assert.equal((await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'hi', mode: 'dontAsk' })).status, 400);
  assert.equal((await svc.call('default-mode', { profile: 'other', mode: 'bypassPermissions' })).status, 400);
  await svc.call('settings', { bypass: true });
  try {
    const id = await newSession('yolo', 'live', { mode: 'bypassPermissions' }); await idle(id);
    assert.ok(readLog(sb).some(l => l.includes('mode=bypassPermissions')));
  } finally { await svc.call('settings', { bypass: false }); }
  const file = path.join(sb.home, '.claude-profiles', 'other', 'settings.json'), had = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  try {
    if (had == null) fs.writeFileSync(file, JSON.stringify({ model: 'haiku', permissions: { allow: ['Bash(ls)'] } }));
    assert.equal((await svc.call('default-mode', { profile: 'other', mode: 'auto' })).status, 200);
    const s = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(s.permissions.defaultMode, 'auto'); assert.ok(s.permissions.allow?.length || had != null);
    assert.equal((await svc.call(`defaults?cwd=${encodeURIComponent(sb.projects.alpha)}&profile=other`)).body.mode, 'auto');
  } finally { if (had == null) fs.rmSync(file, { force: true }); else fs.writeFileSync(file, had); }
});

test('a profile\'s own model, effort and permission mode: set, cleared, checked, and a broken settings.json reported', async () => {
  const file = path.join(sb.home, '.claude-profiles', 'other', 'settings.json'), had = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  try {
    fs.writeFileSync(file, JSON.stringify({ permissions: { allow: ['Bash(ls)'] }, theme: 'dark' }));
    let r = await svc.call('profiles/other/defaults', { model: 'claude-opus-5-5', effort: 'high', mode: 'plan' });
    assert.equal(r.status, 200); assert.deepEqual(r.body, { model: 'claude-opus-5-5', effort: 'high', mode: 'plan' });
    let s = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(s.model, 'claude-opus-5-5'); assert.equal(s.effortLevel, 'high'); assert.equal(s.permissions.defaultMode, 'plan');
    assert.deepEqual(s.permissions.allow, ['Bash(ls)']); assert.equal(s.theme, 'dark');
    r = await svc.call('profiles/other/defaults', { effort: '' });          // only the key given changes
    s = JSON.parse(fs.readFileSync(file, 'utf8'));
    assert.equal(s.effortLevel, undefined); assert.equal(s.model, 'claude-opus-5-5'); assert.equal(r.body.effort, null);
    assert.equal((await svc.call('profiles/other/defaults', { model: 'gpt-9' })).status, 400);
    assert.equal((await svc.call('profiles/other/defaults', { effort: 'huge' })).status, 400);
    assert.equal((await svc.call('profiles/other/defaults', { mode: 'bypassPermissions' })).status, 400);
    assert.equal((await svc.call('profiles/nobody/defaults', { mode: 'plan' })).status, 404);
    fs.writeFileSync(file, '{ not json');
    assert.equal((await svc.call('defaults?profile=other')).body.bad, file);
    assert.equal((await svc.call('profiles/other/defaults', { mode: 'plan' })).status, 500);
    assert.equal(fs.readFileSync(file, 'utf8'), '{ not json');             // a file it cannot read is left alone
  } finally { if (had == null) fs.rmSync(file, { force: true }); else fs.writeFileSync(file, had); }
});

test('profiles carry their account email and organisation', async () => {
  const s = await state();
  assert.ok(s.profiles.every(p => typeof p.email === 'string' && typeof p.org === 'string'));
  assert.ok(s.profiles.some(p => p.email));
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

test('done: takes a session out of the inbox in Workwood only, remembers it, and new work brings it back', async () => {
  const id = sb.sessions.betaOther, kept = () => JSON.parse(fs.readFileSync(path.join(sb.home, '.config', 'workwood', 'state.json'), 'utf8'));
  assert.equal((await listed(id)).done, false);
  assert.equal((await svc.call(`sessions/${id}/done`, {})).status, 200);
  assert.equal((await listed(id)).done, true);
  const handedOff = () => Object.values(kept().chains || {});   // sessions handed off leave the inbox as done too
  assert.deepEqual(Object.keys(kept().done).filter(x => !handedOff().includes(x)), [id]);
  assert.equal((await session(id)).items[0].text, 'Add a beta changelog'); // still readable
  await svc.call(`sessions/${id}/done`, { on: false });
  assert.equal((await listed(id)).done, false);
  assert.deepEqual(Object.keys(kept().done).filter(x => !handedOff().includes(x)), []);
  await svc.call(`sessions/${id}/done`, {});                              // a message in a done session reopens it
  await svc.call(`sessions/${id}/send`, { text: 'one more thing' }); await idle(id);
  assert.equal((await listed(id)).done, false);
});

test('inbox: a finished turn is unread until seen; untouched sessions clear themselves; outside sessions show only while they run', async () => {
  const id = await newSession('read me later'); await idle(id);
  await until(async () => (await listed(id)).unread, 'the unread mark');
  await svc.call(`sessions/${id}/seen`, {});
  assert.equal((await listed(id)).unread, false);
  assert.equal((await listed(sb.sessions.alphaOld)).done, true);           // eight days untouched
  assert.equal((await svc.call('settings', { doneDays: 0 })).body.doneDays, 0);
  assert.equal((await listed(sb.sessions.alphaOld)).done, false);          // never clear
  assert.equal((await svc.call('settings', { doneDays: 7 })).body.doneDays, 7);
  assert.equal((await listed(sb.sessions.alphaOutside)).done, false);      // busy in a terminal
  const quiet = addSession(sb, 'beta', 'other', 'Made in a terminal, now idle', 'ok', 30);
  await svc.call(`sessions/${id}/send`, { text: 'nudge a refresh' }); await idle(id);
  assert.equal((await until(() => listed(quiet), 'the new session', 15000)).done, true);
});

test('worktrees: a session in a worktree belongs to its project, and reports the worktree and branch it is in', async () => {
  const wt = path.join(sb.home, 'workspace', 'beta-login-fix');
  execFileSync('git', ['-C', sb.projects.beta, '-c', 'user.name=Test', '-c', 'user.email=test@example.invalid', 'worktree', 'add', '-q', '-b', 'login-fix', wt], { env: { ...process.env, HOME: sb.home, GIT_CONFIG_NOSYSTEM: '1' }, stdio: 'ignore' });
  sb.projects.betaWt = wt;
  const id = addSession(sb, 'betaWt', 'other', 'Fix the login in a worktree', 'ok', 20);
  await idle(await newSession('nudge a refresh'));
  const s = await until(() => listed(id), 'the worktree session', 15000);
  assert.deepEqual([s.project, s.root], ['beta', sb.projects.beta]);
  assert.deepEqual((await session(id)).place, { cwd: wt, project: 'beta', worktree: 'beta-login-fix', branch: 'login-fix' });
  assert.deepEqual((await session(sb.sessions.betaOther)).place, { cwd: sb.projects.beta, project: 'beta', worktree: null, branch: 'main' });

  // VS Code opens where the work is: the worktree's own folder, not the project it was made from
  assert.equal((await svc.call('open-editor', { sessionId: id })).status, 200);
  await until(() => readLog(sb).includes(`code ${wt}`), 'VS Code in the worktree');
  assert.equal((await svc.call('open-editor', { sessionId: sb.sessions.betaOther })).status, 200);
  await until(() => readLog(sb).includes(`code ${sb.projects.beta}`), 'VS Code in the project');
  // a `code` that fails says so, rather than the button doing nothing
  const stub = path.join(sb.bin, 'code'), kept = fs.readFileSync(stub, 'utf8');
  fs.writeFileSync(stub, '#!/usr/bin/env bash\nexit 3\n');
  try {
    const r = await svc.call('open-editor', { sessionId: sb.sessions.betaOther });
    assert.equal(r.status, 500);
    assert.match(r.body.error, /VS Code could not be opened/);
  } finally { fs.writeFileSync(stub, kept); }
});

test('open in terminal: resumes under the session\'s own profile, and not while it is in use', async () => {
  // One at a time: the two terminals start on their own, so the log would not keep their order otherwise.
  assert.equal((await svc.call(`sessions/${sb.sessions.alphaLive}/terminal`, {})).status, 200);
  await until(() => readLog(sb).filter(l => l.startsWith('terminal ')).length === 1, 'the first terminal');
  assert.equal((await svc.call(`sessions/${sb.sessions.betaOther}/terminal`, {})).status, 200);
  await until(() => readLog(sb).filter(l => l.startsWith('terminal ')).length === 2, 'both terminals');
  const lines = readLog(sb).filter(l => l.startsWith('terminal '));
  assert.equal(lines[0], `terminal ${sb.projects.alpha} claude --resume ${sb.sessions.alphaLive}`);
  assert.equal(lines[1], `terminal ${sb.projects.beta} env CLAUDE_CONFIG_DIR=${path.join(sb.home, '.claude-profiles', 'other')} claude --resume ${sb.sessions.betaOther}`);
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

test('home: where each session was left, what is not committed, and each profile\'s limits over time', async () => {
  const h = (await svc.call('home')).body, s = await state();
  const newest = s.sessions.filter(x => x.root === sb.projects.beta).sort((a, b) => b.mts - a.mts)[0];
  assert.ok(h.words[newest.id]?.text, JSON.stringify(h.words));                      // the agent's last words in each project's newest session
  assert.ok(h.words[newest.id]?.first, JSON.stringify(h.words));                     // and what you opened it with, which a left-off card shows
  const beta = h.uncommitted.find(u => u.project === 'beta');
  assert.ok(beta && beta.count >= 1 && beta.add >= 1, JSON.stringify(h.uncommitted));
  assert.equal(beta.cwd, sb.projects.beta);
  assert.equal(s.sessions.find(x => x.id === beta.sessionId)?.root, sb.projects.beta); // a click opens the newest session there
  assert.ok(!h.uncommitted.some(u => u.project === 'alpha'));                       // not a repository
  assert.deepEqual(h.trends.map(t => t.name).sort(), ['full', 'live', 'other']);
  assert.ok(Array.isArray(h.made));
});

test('home: a profile\'s rate and when it would reach the limit, as Claudius reckons them', async () => {
  const { trendOf, parseLog } = await import('../service/home.mjs');
  const n = 2e9, log = r => parseLog(r.map(x => x.join(' ')).join('\n'));
  // 10% to 20% in 20 minutes: 30% an hour, so the 5-hour limit is reached in 2h 40m, before the window resets
  const t = trendOf(log([[n - 1800, 10, 5, n + 12000, n + 90000], [n - 600, 20, 6, n + 12000, n + 90000]]), n);
  assert.equal(t.rate5, 30); assert.equal(t.eta5, n - 600 + 9600);
  assert.equal(t.rate7, null);                                                        // too short a stretch to say for a week
  assert.deepEqual(t.s5, [[n - 1800, 10], [n - 600, 20]]);
  // the window resets before that: nothing to warn about
  assert.equal(trendOf(log([[n - 1800, 10, 5, n + 3000, n + 90000], [n - 600, 20, 6, n + 3000, n + 90000]]), n).eta5, null);
  // a reading from the window before does not count towards the rate
  assert.equal(trendOf(log([[n - 7200, 90, 5, n - 3000, n + 90000], [n - 1800, 10, 5, n + 12000, n + 90000], [n - 600, 20, 6, n + 12001, n + 90000]]), n).rate5, 30);
  assert.equal(trendOf(log([['x'], [n - 600, '-', '-', '-', '-']]), n).rate5, null);   // a torn or empty log is no rate, not an error
});

test('home: when you worked, per project, from the transcripts', async () => {
  const a = (await svc.call('home/activity')).body;
  const alpha = a.projects.find(p => p.root === sb.projects.alpha);
  assert.ok(alpha && alpha.turns.length >= 2, JSON.stringify(a.projects));
  assert.ok(alpha.turns.every(t => Date.now() / 1000 - t < 31 * 86400));
  assert.ok(a.profiles.length >= 1 && a.profiles.every(p => p.name && Array.isArray(p.blocks)), JSON.stringify(a.profiles));   // the same, per profile
  assert.equal(a.profiles.reduce((n, p) => n + p.turns.length, 0), a.projects.reduce((n, p) => n + p.turns.length, 0));       // every turn once either way
  assert.ok(alpha.blocks.length >= 1 && alpha.blocks.every(([s, e, k]) => e > s && k >= 0));
  assert.ok(a.sessions7 >= 2);
  assert.equal((await svc.call('home/activity')).body.projects.find(p => p.root === sb.projects.alpha).turns.length, alpha.turns.length);   // read again: nothing counted twice
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
  assert.deepEqual([u.text, u.pics?.length, u.files], ['Look at these', 1, ['notes.txt']]);
  // the picture is kept once, by what is in it, and the window gets it back with the token only
  const kept = path.join(sb.home, '.cache', 'workwood', 'pictures', u.pics[0].id);
  assert.match(u.pics[0].id, /^[0-9a-f]{32}\.png$/); assert.equal(fs.readFileSync(kept).toString('base64'), PNG);
  const pic = await fetch(new URL(`/api/picture/${u.pics[0].id}?token=test-token`, svc.address));
  assert.equal(pic.status, 200); assert.equal(pic.headers.get('content-type'), 'image/png');
  assert.equal(Buffer.from(await pic.arrayBuffer()).toString('base64'), PNG);
  assert.equal((await fetch(new URL(`/api/picture/${u.pics[0].id}`, svc.address))).status, 403);
  assert.equal((await fetch(new URL('/api/picture/..%2F..%2F.claude.json?token=test-token', svc.address))).status, 404);
  assert.ok(readLog(sb).slice(before).some(l => l.startsWith('pictures=1')));
  const saved = /- (\S+notes\.txt)/.exec(lastText(s))[1];                  // the agent was told where the file is
  assert.ok(saved.startsWith(path.join(sb.home, '.cache', 'workwood', 'attachments') + path.sep));
  assert.equal(fs.readFileSync(saved, 'utf8'), 'remember the milk');
  // a message can be attachments alone; and the saved history reads back the same way
  assert.equal((await svc.call(`sessions/${r.body.sessionId}/send`, { text: '', attachments: [{ name: 'a.png', type: 'image/png', data: PNG }] })).status, 200);
  assert.deepEqual((await idle(r.body.sessionId)).items.filter(i => i.kind === 'user').map(i => [i.text, i.pics?.length]), [['Look at these', 1], ['', 1]]);
  assert.equal((await svc.call(`sessions/${r.body.sessionId}/send`, { text: '' })).status, 400);
  // a file that is already on disk is named where it is, not copied; a picture among them is still sent as one
  const logo = path.join(sb.projects.alpha, 'logo.png'), spec = path.join(sb.projects.alpha, 'spec.txt');
  fs.writeFileSync(logo, Buffer.from(PNG, 'base64')); fs.writeFileSync(spec, 'the spec');
  const copies = fs.readdirSync(path.join(sb.home, '.cache', 'workwood', 'attachments')).length, at = readLog(sb).length;
  const there = await svc.call('sessions', { cwd: sb.projects.alpha, profile: 'live', text: 'Use these', attachments: [{ name: 'logo.png', type: 'image/png', path: logo }, { name: 'spec.txt', type: 'text/plain', path: spec }] });
  const ts = await idle(there.body.sessionId), tu = ts.items.find(i => i.kind === 'user');
  assert.deepEqual([tu.text, tu.pics?.map(p => p.name), tu.files], ['Use these', ['logo.png'], ['spec.txt']]);   // a picture by its path: shown once, as a picture with its name
  assert.ok(lastText(ts).includes('- ' + logo) && lastText(ts).includes('- ' + spec));
  assert.ok(readLog(sb).slice(at).some(l => l.startsWith('pictures=1')));
  assert.equal(fs.readdirSync(path.join(sb.home, '.cache', 'workwood', 'attachments')).length, copies);
  assert.equal((await svc.call(`sessions/${there.body.sessionId}/send`, { text: 'x', attachments: [{ name: 'gone.txt', path: path.join(sb.projects.alpha, 'gone.txt') }] })).status, 400);
  // the Windows window names a file the Windows way
  const viaWin = await svc.call(`sessions/${there.body.sessionId}/send`, { text: 'And this', attachments: [{ name: 'spec.txt', path: '\\\\wsl.localhost\\Ubuntu' + spec.replace(/\//g, '\\') }] });
  assert.equal(viaWin.status, 200);
  assert.ok(lastText(await idle(there.body.sessionId)).includes('- ' + spec));
  const old = addSession(sb, 'alpha', 'live', [{ type: 'text', text: 'Compare\n\nAttached files:\n- /x/y/spec.pdf\n- /x/y/data.csv' }, { type: 'image', source: { type: 'base64', media_type: 'image/png', data: PNG } }], 'Compared.', 20);
  await until(async () => (await svc.call('sessions/' + old)).status === 200, 'the session to be listed', 15000);
  const o = (await session(old)).items.find(i => i.kind === 'user');
  assert.deepEqual([o.text, o.pics?.length, o.files], ['Compare', 1, ['spec.pdf', 'data.csv']]);
});

test('dictation: a recording comes back as text, and only with the token', async () => {
  const say = (seconds, q = '') => fetch(new URL('/api/voice' + q, svc.address), { method: 'POST', headers: { 'x-workwood-token': 'test-token' }, body: new Float32Array(16000 * seconds) }).then(r => r.json());
  assert.deepEqual(await say(1), { text: 'dictated words' });
  assert.deepEqual(await say(0.05), { text: '' });                  // too short to be speech
  assert.equal((await svc.call('voice')).body.state, 'ready');
  assert.equal((await fetch(new URL('/api/voice', svc.address), { method: 'POST', body: new Float32Array(16000) })).status, 403);
});

test('dictation: the model is loaded only when dictation starts, and let go after a while without it', async () => {
  const quick = await startService(sb, { WORKWOOD_STT_IDLE: '600' });
  try {
    const voice = async (q = '') => (await quick.call('voice' + q)).body;
    assert.equal((await voice()).state, 'idle');                                          // nothing in memory at start-up
    await until(async () => (await voice('?warm')).state === 'ready', 'the model to load when dictation starts');
    await until(async () => (await voice()).state === 'idle', 'the model to be let go when nothing wants it', 5000);
    const r = await fetch(new URL('/api/voice', quick.address), { method: 'POST', headers: { 'x-workwood-token': 'test-token' }, body: new Float32Array(16000) });
    assert.deepEqual(await r.json(), { text: 'dictated words' });                         // and loaded again for the next recording
  } finally { quick.stop(); }
});

test('dictation: the GPU model is downloaded only when asked, then used, and can be turned off again', async () => {
  const say = () => fetch(new URL('/api/voice', svc.address), { method: 'POST', headers: { 'x-workwood-token': 'test-token' }, body: new Float32Array(16000) }).then(r => r.json());
  const voice = async () => (await svc.call('voice')).body;
  let v = await voice();
  assert.deepEqual([v.better.gpu, v.better.state, v.device, (await state()).prefs.speech], ['Test GPU', 'absent', 'cpu', 'small']);
  assert.equal((await svc.call('settings', { speech: 'turbo' })).body.speech, 'turbo');   // wanted, but not here yet: the standard model goes on
  assert.equal((await voice()).device, 'cpu');
  await svc.call('settings', { speech: 'small' });
  assert.equal((await svc.call('voice/better', {})).body.better.state, 'present');       // the stand-in arrives at once
  await until(async () => (await state()).prefs.speech === 'turbo', 'the GPU model to be turned on once it is here');
  await until(async () => { v = await voice(); return v.state === 'ready' && v.device === 'cuda'; }, 'the GPU model to be in use');
  assert.equal(v.model, 'Whisper Large v3 Turbo');
  assert.deepEqual(await say(), { text: 'dictated words' });
  assert.equal(JSON.parse(fs.readFileSync(path.join(sb.home, '.config', 'workwood', 'state.json'), 'utf8')).speech, 'turbo');
  await svc.call('settings', { speech: 'small' });
  await until(async () => { v = await voice(); return v.state === 'ready' && v.device === 'cpu'; }, 'the standard model to be back');
  assert.deepEqual(await say(), { text: 'dictated words' });
});

test('settings: default profile and dictation language are kept; sign-in again runs Claudius in a terminal', async () => {
  const handoff = { model: 'auto', effort: 'medium', offer: 400000 };
  assert.deepEqual((await svc.call('settings', { defaultProfile: 'other', language: 'latvian' })).body, { defaultProfile: 'other', language: 'latvian', folders: [], doneDays: 7, bypass: false, autoContinue: false, speech: 'small', cacheMinutes: 60, handoff });
  assert.deepEqual((await state()).prefs, { defaultProfile: 'other', language: 'latvian', folders: [], doneDays: 7, bypass: false, autoContinue: false, speech: 'small', cacheMinutes: 60, handoff });
  const kept = JSON.parse(fs.readFileSync(path.join(sb.home, '.config', 'workwood', 'state.json'), 'utf8'));
  assert.deepEqual([kept.defaultProfile, kept.language, typeof kept.done], ['other', 'latvian', 'object']);
  assert.deepEqual((await svc.call('settings', { defaultProfile: 'nobody', language: 'x;rm' })).body, { defaultProfile: null, language: null, folders: [], doneDays: 7, bypass: false, autoContinue: false, speech: 'small', cacheMinutes: 60, handoff });
  const a = (await svc.call('about')).body;
  assert.deepEqual([a.version, a.claude, typeof a.speech.model], ['0.1.0', '2.1.322', 'string']);
  assert.equal((await svc.call('profiles/nobody/login', {})).status, 404);
});

// Claude Code's own sign-in, in a terminal, answered with a code: "good" signs in, anything else fails.
async function signInWith(name, code, start) {
  assert.equal((await start()).status, 200);
  return new Promise((resolve, reject) => {
    let text = '', sent = false;
    fetch(new URL(`/api/profiles/${name}/login?token=test-token`, svc.address)).then(async r => {
      const dec = new TextDecoder();
      for await (const chunk of r.body) {
        text += dec.decode(chunk);
        if (!sent && text.includes('paste the code')) { sent = true; svc.call(`profiles/${name}/login/input`, { data: code + '\r' }); }
        if (text.includes('event: exit')) return resolve(text);
      }
      resolve(text);
    }, reject);
  });
}
const P = name => path.join(sb.home, '.claude-profiles', name);

test('sign in again: Claude Code\'s own sign-in into the profile\'s folder; a failed one puts the old sign-in back', async () => {
  const f = path.join(P('other'), '.credentials.json'), was = fs.readFileSync(f, 'utf8'), before = readLog(sb).length;
  try {
    let seen = await signInWith('other', 'bad', () => svc.call('profiles/other/login', { cols: 80, rows: 20 }));
    assert.match(seen, /event: exit\ndata: \{"code":1\}/);
    await until(() => fs.existsSync(f) && !fs.existsSync(f + '.bak'), 'the old sign-in back');
    assert.equal(fs.readFileSync(f, 'utf8'), was);
    seen = await signInWith('other', 'good', () => svc.call('profiles/other/login', { cols: 80, rows: 20 }));
    assert.match(seen, /Login successful/);
    await until(() => JSON.parse(fs.readFileSync(f, 'utf8')).claudeAiOauth.subscriptionType === 'max' && !fs.existsSync(f + '.bak'), 'the new sign-in kept');
    const log = readLog(sb).slice(before);
    assert.ok(log.includes('auth login config=other'), log.join('|'));
    assert.ok(!log.some(l => l.startsWith('claudius')), log.join('|'));
  } finally { fs.writeFileSync(f, was); }
});

test('add a profile: listed once its sign-in has landed, wired for shared sessions; a failed sign-in leaves nothing', async () => {
  assert.equal((await svc.call('profiles', { name: '  ' })).status, 400);
  assert.equal((await svc.call('profiles', { name: 'other' })).status, 409);
  let seen = await signInWith('ghost', 'bad', () => svc.call('profiles', { name: 'Ghost', cols: 80, rows: 20 }));
  assert.match(seen, /event: exit/);
  await until(() => !fs.existsSync(P('ghost')), 'the half-made profile to go');
  assert.ok(!(await state()).profiles.some(p => p.name === 'ghost'));
  sb.usage['work-two'] = [5, 9];
  const r = await svc.call('profiles', { name: 'Work Two!', cols: 80, rows: 20 });
  assert.deepEqual(r.body, { name: 'work-two' });
  assert.ok(!(await state()).profiles.some(p => p.name === 'work-two'));   // not listed while it signs in
  seen = await signInWith('work-two', 'good', async () => ({ status: 200 }));
  const p = await until(async () => (await state()).profiles.find(x => x.name === 'work-two' && x.h5 != null), 'the new profile with its limits');
  assert.equal(p.plan, 'max'); assert.equal(p.global, false); assert.equal(p.h5, 5);
  assert.equal(fs.readlinkSync(path.join(P('work-two'), 'projects')), path.join(sb.home, '.claude', 'projects'));
  assert.equal((fs.statSync(path.join(P('work-two'), '.credentials.json')).mode & 0o777), 0o600);
});

test('rename and remove a profile; the active one cannot be removed, and a profile in use cannot be touched', async () => {
  await svc.call('settings', { defaultProfile: 'work-two' });
  assert.equal((await svc.call('profiles/work-two/rename', { to: 'other' })).status, 409);
  assert.equal((await svc.call('profiles/work-two/rename', { to: 'Spare' })).status, 200);
  let s = await state();
  assert.ok(s.profiles.some(p => p.name === 'spare') && !s.profiles.some(p => p.name === 'work-two'));
  assert.equal(s.prefs.defaultProfile, 'spare');
  assert.ok(fs.existsSync(path.join(P('spare'), '.credentials.json')));
  const r = await svc.call('profiles/live/remove', {});
  assert.equal(r.status, 409); assert.match(r.body.error, /~\/\.claude is signed in to/);
  // a turn working on it holds it
  const id = await newSession('SLOW hold the profile', 'spare');
  await until(async () => (await session(id)).run?.status === 'working', 'the turn to start');
  assert.equal((await svc.call('profiles/spare/remove', {})).status, 409);
  await svc.call(`sessions/${id}/stop`, {}); await idle(id);
  assert.equal((await svc.call('profiles/spare/remove', {})).status, 200);
  s = await state();
  assert.ok(!s.profiles.some(p => p.name === 'spare')); assert.equal(s.prefs.defaultProfile, null);
  assert.ok(!fs.existsSync(P('spare')));
  assert.ok(fs.existsSync(path.join(sb.home, '.claude', 'projects')));   // the shared history stays
});

test('without Claudius (as on Windows): one account, sessions read straight from the history, and a turn runs', async () => {
  const plain = await startService(sb, { WORKWOOD_PLAIN: '1' });
  try {
    const st = await until(async () => {
      const r = await fetch(new URL('/api/events?token=test-token', plain.address)), reader = r.body.getReader();
      const { value } = await reader.read(); reader.cancel();
      const s = JSON.parse(/data: (.*)/.exec(new TextDecoder().decode(value))[1]);
      return s.fresh && s.sessions.length && s;
    }, 'the plain service to list sessions', 15000);
    assert.equal(st.plain, true);
    assert.equal(st.profiles.length, 1);
    assert.equal(st.profiles[0].global, true);
    await until(async () => {   // its limits come from the usage endpoint, as there is no Claudius cache
      const r = await fetch(new URL('/api/events?token=test-token', plain.address)), reader = r.body.getReader();
      const { value } = await reader.read(); reader.cancel();
      const p = JSON.parse(/data: (.*)/.exec(new TextDecoder().decode(value))[1]).profiles[0];
      return p.h5 === 34 && p.d7 === 41;
    }, 'the plain service to read its limits');
    const old = st.sessions.find(x => x.id === sb.sessions.betaOther);
    assert.deepEqual([old.title, old.project, old.profile, old.branch], ['Add a beta changelog', 'beta', st.profiles[0].name, 'main']);
    assert.equal(st.sessions.find(x => x.title === '/teach git rebase')?.project, 'alpha');   // a session that began with a skill
    const r = await plain.call('sessions', { cwd: sb.projects.alpha, profile: st.profiles[0].name, text: 'Hello from plain' });
    assert.equal(r.status, 200);
    await until(async () => { const s = (await plain.call('sessions/' + r.body.sessionId)).body; return s.run?.status === 'idle' && /Echo: Hello from plain/.test(lastText(s)); }, 'the turn to end');
  } finally { plain.stop(); }
});

test('project folders: the menu offers what is inside them, new folders go into the first, a wrong one is refused', async () => {
  const extra = path.join(sb.home, 'elsewhere'); fs.mkdirSync(path.join(extra, 'zeta'), { recursive: true });
  try {
    assert.deepEqual((await state()).folders, [path.join(sb.home, 'workspace')]);
    const bad = await svc.call('settings', { folders: [path.join(sb.home, 'nowhere')] });
    assert.equal(bad.status, 400); assert.match(bad.body.error, /no folder/);
    assert.equal((await svc.call('settings', { folders: ['relative/path'] })).status, 400);
    const ok = await svc.call('settings', { folders: ['~/elsewhere', path.join(sb.home, 'workspace')] });
    assert.deepEqual(ok.body.folders, [extra, path.join(sb.home, 'workspace')]);
    const st = await state();
    assert.ok(st.projects.some(p => p.cwd === path.join(extra, 'zeta') && !p.recent));
    assert.ok(st.projects.some(p => p.cwd === sb.projects.alpha));
    assert.equal((await svc.call('projects', { name: 'eta' })).status, 200);
    assert.ok(fs.statSync(path.join(extra, 'eta')).isDirectory());
    const status = (await svc.call('status')).body;
    assert.equal(typeof status.wait, 'number'); assert.equal(typeof status.work, 'number');
  } finally { await svc.call('settings', { folders: [] }); }
  assert.ok(!(await state()).projects.some(p => p.cwd === path.join(extra, 'zeta')));
});

test('creates a project folder, and refuses odd names', async () => {
  const ok = await svc.call('projects', { name: 'gamma' });
  assert.equal(ok.status, 200); assert.ok(fs.statSync(path.join(sb.home, 'workspace', 'gamma')).isDirectory());
  assert.equal((await svc.call('projects', { name: '../escape' })).status, 500);
  assert.equal((await svc.call('projects', { name: 'gamma' })).status, 500);
});

test('updates: checks the folder Workwood runs from against its upstream, and refuses over uncommitted changes', async () => {
  const head = () => execFileSync('git', ['-C', sb.app, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  await until(async () => (await state()).update?.state === 'current', 'the check at start');
  upstreamCommit(sb, 'One more thing'); const tip = upstreamCommit(sb, 'Two more things');
  let u = (await svc.call('update/check', {})).body;
  assert.equal(u.state, 'ready'); assert.equal(u.behind, 2); assert.deepEqual(u.titles, ['Two more things', 'One more thing']); assert.equal(u.head, tip);
  assert.equal((await state()).update.state, 'ready');
  // an edit to a tracked file is in the way; a file git does not know is not
  fs.appendFileSync(path.join(sb.app, 'package.json'), '\n'); fs.writeFileSync(path.join(sb.app, 'scratch.txt'), 'mine');
  u = (await svc.call('update/check', {})).body;
  assert.equal(u.state, 'blocked'); assert.equal(u.why, 'Uncommitted changes in package.json'); assert.deepEqual(u.files, ['package.json']);
  const refused = await svc.call('update/apply', {});
  assert.equal(refused.status, 409); assert.match(refused.body.error, /Uncommitted changes/);
  assert.notEqual(head(), tip);
  execFileSync('git', ['-C', sb.app, 'checkout', '--', 'package.json']);
  // package-lock.json changed on its own is npm's rewrite (an older npm drops fields), not an edit: it does not block
  fs.appendFileSync(path.join(sb.app, 'package-lock.json'), '\n');
  assert.equal((await svc.call('update/check', {})).body.state, 'ready');   // pulled by the window's test below, lock and all
});

test('the window has no browser tooltips: every hover note is its own (an iframe keeps its title, for screen readers)', () => {
  for (const f of ['ui/index.html', 'ui/app.js']) {
    const text = fs.readFileSync(new URL('../' + f, import.meta.url), 'utf8');
    const left = [...text.matchAll(/<(\w+)[^<>]*\stitle=|\.title\s*=(?!=)/g)].filter(m => m[1] !== 'iframe' && !/s\.title\s*=/.test(text.slice(m.index - 2, m.index + 10)));
    assert.deepEqual(left.map(m => text.slice(m.index, m.index + 60)), [], f);
  }
});

/* ---------- the window, driven by real clicks ---------- */

function findChrome() {
  if (process.env.WORKWOOD_CHROME) return process.env.WORKWOOD_CHROME;
  // Where Playwright keeps its browsers: ~/.cache on Linux, ~/Library/Caches on macOS.
  const root = path.join(os.homedir(), ...(process.platform === 'darwin' ? ['Library', 'Caches'] : ['.cache']), 'ms-playwright');
  const rels = ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell'];
  try { for (const d of fs.readdirSync(root).sort().reverse()) for (const rel of rels) { const p = path.join(root, d, rel); if (fs.existsSync(p)) return p; } } catch {}
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

ui('window: an update shows as a card above the sidebar footer; Update pulls it, Later hides it, Settings says where things stand', async () => {
  const head = () => execFileSync('git', ['-C', sb.app, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const tip = execFileSync('git', ['-C', sb.app, 'rev-parse', '@{u}'], { encoding: 'utf8' }).trim();
  await page.waitForSelector('#upd:visible');
  assert.match(await page.locator('#upd .ut').innerText(), /Update ready/);
  assert.match(await page.locator('#upd .ud').innerText(), /2 new changes|Restarting stops/);
  const box = await page.locator('#upd').boundingBox(), foot = await page.locator('.side-foot').boundingBox();
  const list = await page.locator('#list').boundingBox();
  assert.ok(box.y + box.height <= foot.y && list.y + list.height <= box.y, 'the card sits above the footer, below the list');
  // no window around the page (a browser tab), so it updates and then asks for a restart by hand
  await page.click('#upd [data-u=go]');
  await page.waitForSelector('#upd .ut:has-text("Updated")');
  assert.match(await page.locator('#upd .ud').innerText(), /Restart Workwood to use it/);
  assert.equal(head(), tip);
  await page.click('#upd [data-u=later]');
  await page.waitForSelector('#upd', { state: 'hidden' });
  await page.click('#bGear'); await page.click('#gAll'); await page.click('#stabs [data-st="3"]');
  await page.waitForSelector('#sUpd:has-text("Updated. Restart Workwood to use it.")');
  await page.click('#dClose');
});

ui('window: shows the inbox by project, the opened conversation, and limits under the message box', async () => {
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  const groups = await page.locator('.grp b').allInnerTexts();
  assert.ok(groups.includes('alpha') && groups.includes('beta') && new Set(groups).size === groups.length, groups.join());
  assert.equal(await page.locator(`.sess[data-id="${sb.sessions.alphaOld}"]`).count(), 0);   // cleared itself; still found by search
  assert.equal(await page.locator('#title').innerText(), 'Tidy the alpha readme');
  assert.match(await page.locator('#where').innerText(), /alpha/);
  assert.match(await page.locator('.tfoot').innerText(), /Worked for 3m 12s/);
  assert.equal(await page.locator('#pProfile').innerText(), 'live');
  assert.match((await page.locator('#lim').innerText()).replace(/\s+/g, ' '), /5h ?34% ?7d ?41%/);
  // the last reply's size; opening a session does not start Claude Code to count it (that waits for the breakdown)
  await page.waitForFunction(() => document.querySelector('#pCtx').innerText.trim() === '21%');
  assert.match(await page.locator('#pCtx').getAttribute('data-tip'), /42k of 200k/);
  await sleep(500);
  assert.ok(!readLog(sb).some(l => l.includes(`resume=${sb.sessions.alphaLive}`)), readLog(sb).join('|'));
  await page.waitForSelector('.sess .xb');
  assert.equal(await page.locator('.sess .xb').count(), 1);
  assert.equal(await page.locator(`.sess[data-id="${sb.sessions.alphaOutside}"] .st .spin`).count(), 1);
});

ui('window: the line under the message box lets things go as it narrows, and never overflows', async () => {
  const at = w => page.evaluate(async w => {
    const c = document.querySelector('.composer'); c.style.width = w + 'px'; await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const sup = c.querySelector('.support'), shown = s => { const e = document.querySelector(s); return !!e && e.getClientRects().length > 0; };
    return { over: sup.scrollWidth - sup.clientWidth, bars: shown('#lim .bar'), eff: shown('#pModel .eff'), d7: [...document.querySelectorAll('#lim .m')].filter(m => m.getClientRects().length).length,
      mode: shown('#pMode .lbl'), pct: shown('#pCtx .pct'), name: shown('#pProfile .nm>span'), initial: getComputedStyle(document.querySelector('#pProfile .nm'), '::before').display !== 'none', text: sup.innerText.replace(/\s+/g, ' ') };
  }, w);
  // widths are the composer's; its 24px padding each side leaves the line 48px less
  try {
    let r = await at(760); assert.ok(r.bars && r.eff && r.d7 === 2 && r.mode && r.pct && r.name && !r.initial, JSON.stringify(r));
    r = await at(650); assert.ok(!r.bars && r.eff && r.d7 === 2, JSON.stringify(r));
    r = await at(570); assert.ok(!r.eff && r.d7 === 2 && r.mode, JSON.stringify(r));
    r = await at(510); assert.ok(r.d7 === 1 && r.mode && r.pct, JSON.stringify(r));
    assert.match(r.text, /7d 41%/);                                                // the fuller window is the one kept
    r = await at(450); assert.ok(!r.mode && !r.pct && r.name, JSON.stringify(r));
    r = await at(360); assert.ok(!r.name && r.initial && /^41% Test/.test(r.text), JSON.stringify(r));   // "l", the initial, is drawn by CSS
    // the longest labels it can show still fit at every width
    await page.evaluate(() => { document.querySelector('#pProfile .nm>span').textContent = 'erhards'; document.querySelector('#pMode .lbl').textContent = 'Accept edits';
      document.querySelector('#pModel .eff').innerHTML = ' <i>·</i> Medium'; document.querySelector('#pCtx .pct').textContent = '100%'; });
    for (let w = 800; w >= 300; w -= 5) { const r = await at(w); assert.ok(r.over <= 1, `${w}px overflows by ${r.over}px: ${r.text}`); }
  } finally { await page.evaluate(() => { document.querySelector('.composer').style.width = ''; renderComposer(); }); }
});

ui('window: steps expand when the activity line is clicked', async () => {
  await page.click('.act');
  assert.match((await page.locator('.steps').innerText()).replace(/\s+/g, ' '), /Read README\.md/);
  await page.click('.act');
  assert.equal(await page.locator('.steps').count(), 0);
});

ui('window: a reply with a list inside a list shows it nested', async () => {
  const id = await newSession('nested\n\n- Output:\n  - a successful one\n  - a failed one\n    1. deeper\n- Back out'), row = `.sess[data-id="${id}"]`;
  await idle(id); await page.waitForSelector(row); await page.click(row);
  await page.waitForSelector('.ai ul');
  assert.deepEqual(await page.locator('.ai > ul > li').evaluateAll(l => l.map(li => li.firstChild.textContent.trim())), ['Output:', 'Back out']);
  assert.deepEqual(await page.locator('.ai > ul > li > ul > li').evaluateAll(l => l.map(li => li.firstChild.textContent.trim())), ['a successful one', 'a failed one']);
  assert.equal(await page.locator('.ai ul ul ol li').innerText(), 'deeper');
});

ui('window: background work: a closed tray over the message box, a header button, a badge in the sidebar, each task\'s output in the side panel', async () => {
  const id = await newSession('start BACKGROUND work'), row = `.sess[data-id="${id}"]`;
  await page.waitForSelector(row); await page.click(row);
  await page.waitForSelector('#tray .tl:has-text("2 running")');
  assert.equal(await page.locator('#tray .tk').count(), 0, 'the tray starts closed');
  assert.deepEqual(await page.locator('#tray .tkk').allInnerTexts(), ['Start the dev server', 'Watch the tests']);
  assert.equal(await page.locator('#tkN').innerText(), '2');
  assert.equal(await page.locator(`${row} .bgc`).innerText(), '2');
  // the agent's step holds its own steps, its size and a few lines of its report
  await page.click('.acts .act');
  assert.match((await page.locator('.agb .agt').innerText()).replace(/\s+/g, ' '), /1 step · 22k tokens/);
  assert.match(await page.locator('.agb .steps').innerText(), /Read\s+README\.md/);
  assert.match(await page.locator('.agr').innerText(), /^Report\. Found it in README\.md\./);
  await page.click('#tray .tl');
  await page.waitForSelector('#tray .tk:has-text("Start the dev server") .tk2:has-text("ready on http://localhost:4310")');
  await page.click('#tray .tk:has-text("Start the dev server") [data-bgout]');
  await page.waitForFunction(() => /Error: port in use|ready on/.test(document.querySelector('#tkOut')?.textContent || ''));
  assert.equal(await page.locator('#bTasks.on').count(), 1);
  // the monitor's event shows in the conversation, before the reply it woke
  await page.waitForSelector('.bgn.monitor:has-text("FAIL parser test")');
  await page.waitForSelector('.bgn.bad:has-text("failed with exit code 1")');
  await page.waitForSelector('#tray .tl:has-text("1 running")');
  await page.click('#tray .tk:has-text("Watch the tests") [data-bgstop]');
  await page.waitForSelector('#tray', { state: 'hidden' });
  await page.waitForSelector('#bTasks', { state: 'hidden' });
  await page.waitForFunction(r => !document.querySelector(r + ' .bgc'), row);
  assert.equal(await page.locator('#tkw').isHidden(), true);
});

ui('window: while a turn runs its steps are open: each command in its own block, with its time; a failure shows its end; one command stops on its own', async () => {
  const id = await newSession('run COMMANDS'), row = `.sess[data-id="${id}"]`;
  await page.waitForSelector(row); await page.click(row);
  await page.waitForSelector('.step.s-run .stx');                                     // open by itself, the running one with a Stop
  assert.equal(await page.locator('.step.s-bad .cbk pre').innerText(), '$ node --test tests/ 2>&1 | grep "<fail>"');   // shown as sent, not as markup
  assert.equal(await page.locator('.step.s-bad .stt').innerText(), 'exit 1');
  // a finished step before the newest is one line; a click on it shows its command, another hides it
  assert.equal(await page.locator('.step.s-ok.shut .cbk').count(), 0); assert.match(await page.locator('.step.s-ok .sth').innerText(), /Install what it needs/);
  await page.click('.step.s-ok .sth'); assert.equal(await page.locator('.step.s-ok .cbk pre').innerText(), '$ npm ci');
  await page.click('.step.s-ok .sth'); assert.equal(await page.locator('.step.s-ok .cbk').count(), 0);
  assert.match(await page.locator('.step.s-bad .sth .el').innerText(), /^\d+\.\ds$/);
  assert.equal(await page.locator('.step.s-bad .cbo pre').innerText(), 'line 19\nline 20\nfail 2');
  assert.match(await page.locator('.step.s-run .stl').innerText(), /stops after 10m/);
  const t1 = await page.locator('.step.s-run .el.live').innerText(); await page.waitForTimeout(450);
  assert.notEqual(await page.locator('.step.s-run .el.live').innerText(), t1, 'the clock counts');
  await page.click('.step.s-bad [data-out]');
  await page.waitForFunction(() => /^line 1\n/.test(document.querySelector('.step.s-bad .cbo pre')?.innerText || ''));
  await page.click('.step.s-run .stx');
  await page.waitForSelector('.ai:has-text("Commands done.")');
  await page.waitForFunction(() => !document.querySelector('.steps'));               // closed again once the turn is over
  await page.click('.acts .act');
  assert.equal(await page.locator('.step.s-stop .stt').innerText(), 'stopped');
  assert.equal(await page.locator('.step.s-stop .cbo pre').innerText(), 'Terminated');
});

ui('window: a session busy in a terminal has a locked message box', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaOutside}"]`);
  await page.waitForSelector('.box.off');
  assert.equal(await page.locator('#input').isDisabled(), true);
  assert.match(await page.locator('#input').getAttribute('placeholder'), /In use in a terminal/);
});

ui('window: the profile menu is a table of 5h and 7d limits, most room first, and reads them again', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('#pProfile span:has-text("live")');
  assert.equal(await page.locator('#pProfile .adot').count(), 0);              // "full" is at its limit, but this session runs on "live"
  await page.click('#pProfile');
  const rows = page.locator('#mProfile .prow');
  assert.equal(await rows.count(), 3);
  assert.deepEqual(await rows.evaluateAll(r => r.map(x => x.dataset.prof)), ['other', 'live', 'full']);   // most room first
  assert.deepEqual(await page.locator('#mProfile .phd span').allInnerTexts(), ['', 'Account', '5h', '7d']);
  const full = page.locator('#mProfile .prow[data-prof="full"]');
  assert.deepEqual(await full.locator('.pc .v').allInnerTexts(), ['100%', '72%']);
  assert.equal(await full.locator('.pc.hot').count(), 1);
  assert.equal(await page.locator('#mProfile .prow[data-prof="live"] .pc .bar b').count(), 2);   // how far each window has run
  await page.waitForSelector('#mProfile .pft .pread:has-text("Updated")');        // next to the refresh button, once a reading an earlier turn started is in
  sb.usage.other = [44, 20]; const from = sb.usageReads.length;
  try {
    await page.click('#mProfile [data-refresh]');
    assert.equal(await page.locator('#mProfile').isHidden(), false);          // the menu stays open
    await page.waitForFunction(() => document.querySelector('#mProfile .prow[data-prof="other"] .pc .v')?.textContent === '44%');
    await page.waitForFunction(() => !document.querySelector('#mProfile .rf.busy'));
    assert.ok(sb.usageReads.slice(from).includes('other'));
  } finally {
    sb.usage.other = [12, 20]; await svc.call('limits/refresh', { profile: 'other' });
    await page.keyboard.press('Escape');
  }
});

ui('window: new session with project and profile menus', async () => {
  const before = readLog(sb).length;
  await startNew('typed in the window', { project: 'beta', profile: 'other' });
  await page.waitForSelector('.ai:has-text("Echo: typed in the window")');
  assert.equal(await page.locator('#where').innerText().then(t => t.includes('beta')), true);
  assert.ok(readLog(sb).slice(before).some(l => /config=other/.test(l)));
  await page.waitForSelector('.tfoot');
});

ui('window: the + on a project in the sidebar starts a session there, on the profile last used in it', async () => {
  await page.click('#newBtn');
  await page.click('#pProject'); await page.click('#mProject .item:has-text("alpha")');
  assert.equal(await page.locator('#pProfile').innerText(), 'live');
  const grp = page.locator('.grp[data-grp$="beta"]');
  await grp.hover(); await grp.locator('[data-gnew]').click();
  assert.match(await page.locator('#pProject').innerText(), /beta/);
  assert.equal(await page.locator('#pProfile').innerText(), 'other');   // beta's sessions ran on "other"
  assert.equal(await grp.evaluate(e => e.classList.contains('shut')), false);   // the + does not fold the project
});

ui('window: model and effort menus apply to the next message', async () => {
  await page.click('#pModel'); await page.click('#mModel .item:has-text("Sonnet 5.5")');
  await page.click('#pModel'); await page.click('#mModel [data-e=max]'); await page.keyboard.press('Escape');
  assert.equal(await page.locator('#pModel').innerText(), 'Sonnet 5.5 · Max');
  const before = readLog(sb).length;
  await send('with other settings');
  await page.waitForSelector('.ai:has-text("Echo: with other settings")');
  assert.ok(readLog(sb).slice(before).some(l => l.includes('model=claude-sonnet-5-5 effort=max')), readLog(sb).slice(before).join('|'));
});

ui('window: the mode picker starts a session in a mode, Shift+Tab switches it mid-turn, and Bypass waits for the setting', async () => {
  await page.click('#newBtn');
  await page.click('#pProject'); await page.click('#mProject .item:has-text("alpha")');
  await page.click('#pMode');
  assert.deepEqual(await page.locator('#mMode .item[data-mode] b').allInnerTexts(), ['Ask', 'Accept edits', 'Plan', 'Auto']);
  await page.click('#mMode [data-mode=plan]');
  assert.equal(await page.locator('#pMode').innerText(), 'Plan');
  assert.ok(await page.locator('#box.m-plan').count());
  const before = readLog(sb).length;
  await send('MODEWAIT in the window');
  await until(() => readLog(sb).slice(before).some(l => l.includes('mode=plan')), 'a session in plan mode');
  await until(() => page.evaluate(() => V.run?.status === 'working' && !!V.sel), 'the turn to be running');
  await page.focus('#input'); await page.keyboard.press('Shift+Tab');   // plan -> auto
  await page.waitForSelector('.ai:has-text("Mode now: auto")');
  assert.equal(await page.locator('#pMode').innerText(), 'Auto');
  await page.click('#pMode'); assert.equal(await page.locator('#mMode [data-mode=bypassPermissions]').count(), 0); await page.keyboard.press('Escape');
  await svc.call('settings', { bypass: true });
  try {
    await page.evaluate(() => { A.prefs = { ...A.prefs, bypass: true }; });
    await page.click('#pMode'); assert.equal(await page.locator('#mMode [data-mode=bypassPermissions]').count(), 1); await page.keyboard.press('Escape');
  } finally { await svc.call('settings', { bypass: false }); await page.evaluate(() => { A.prefs = { ...A.prefs, bypass: false }; }); }
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
  // what you answered stays as a settled card: one question at a time with your pick, the next a click on its name away
  const card = page.locator('.ans').last();
  assert.match(await card.innerText(), /1 of 2 · Answered\s+Which direction should I take\?\s+Dark/i);
  assert.equal(await card.locator('.apage:not([hidden]) .apk').count(), 1);
  await card.locator('[data-astep="1"]').click();
  assert.match(await card.innerText(), /2 of 2 · Answered\s+What else should it include\?\s+Tests\s+Mobile/i);
  assert.equal(await card.locator('.apage:not([hidden]) .apk .mark.sq').count(), 2);
});

ui('window: a typed answer replaces the options', async () => {
  await startNew('ASK me again');
  await page.fill('#qText', 'something else'); await page.click('[data-act=next]');
  await page.click('.qopt:has-text("Docs")'); await page.click('[data-act=send]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
  assert.match(await page.locator('.ai').last().innerText(), /"something else".*"Docs"/);
  const card = page.locator('.ans').last();                                         // your own words show as written, not as a pick
  assert.match(await card.locator('.apage:not([hidden])').innerText(), /You wrote\s+something else/i);
  assert.equal(await card.locator('.apage:not([hidden]) .apk').count(), 0);
});

ui('window: Stop on a question card ends the turn without an answer, by click or by Escape', async () => {
  await startNew('ASK and then stop');
  await page.waitForSelector('#qcard:has-text("Which direction")');
  let before = readLog(sb).length;
  await page.click('#qcard [data-act=stop]');
  await page.waitForSelector('#qcard', { state: 'hidden' });
  await page.waitForSelector('#send[data-tip="Send"]');
  assert.ok(readLog(sb).slice(before).some(l => l.includes('interrupted')));
  await startNew('ASK and then escape');
  await page.waitForSelector('#qcard:has-text("Which direction")');
  await page.waitForTimeout(600);                                                     // a card that has just appeared ignores the keys
  before = readLog(sb).length;
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Escape');
  await page.waitForSelector('#qcard', { state: 'hidden' });
  await page.waitForSelector('#send[data-tip="Send"]');
  assert.ok(readLog(sb).slice(before).some(l => l.includes('interrupted')));
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

ui('window: a long card scrolls inside itself, and Enter and Escape answer it', async () => {
  await startNew('a HUGE file');
  await page.waitForSelector('.frow:has-text("huge.rb")');
  await page.click('[data-act=full]');
  await page.waitForSelector('.peek.all');
  const m = await page.evaluate(() => {
    const r = s => document.querySelector(s).getBoundingClientRect(), b = document.querySelector('#qcard .qbody');
    return { vh: innerHeight, card: r('#qcard'), deny: r('#qcard [data-act=deny]'), box: r('#qText'), scrolls: b.scrollHeight > b.clientHeight + 100 };
  });
  assert.ok(m.card.top >= 0 && m.card.height <= m.vh * 0.6 + 1, JSON.stringify(m));   // the card stays inside the window
  assert.ok(m.deny.bottom <= m.vh && m.box.bottom <= m.vh, JSON.stringify(m));        // with its buttons and answer box in reach
  assert.equal(m.scrolls, true);
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('End');
  assert.ok(await page.locator('#qcard .qbody').evaluate(b => b.scrollTop > 100));
  await page.fill('#qText', 'x');                                                     // typing survives the live updates
  await page.waitForTimeout(600);
  assert.equal(await page.inputValue('#qText'), 'x');
  await page.press('#qText', 'Escape');                                               // first Escape only clears what was typed
  assert.equal(await page.inputValue('#qText'), '');
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Enter');
  await page.waitForSelector('.ai:has-text("WROTE")');
  await startNew('another HUGE file');
  await page.waitForSelector('.frow:has-text("huge.rb")');
  await page.waitForTimeout(600);                                                     // a card that has just appeared ignores the keys
  await page.evaluate(() => document.activeElement.blur());
  await page.keyboard.press('Escape');
  await page.waitForSelector('.ai:has-text("DENIED")');
});

ui('window: plan card', async () => {
  await startNew('show a PLAN');
  await page.waitForSelector('.planbody:has-text("Split it in two")');
  await page.click('.qbtn:has-text("Approve and start")');
  await page.waitForSelector('.ai:has-text("PLAN APPROVED")');
});

ui('window: a question about mockups shows them as pictures to pick; the corner button opens one large; options and tabs follow each other', async () => {
  await startNew('a MOCKUP then ASK');
  await page.waitForSelector('#qcard:has-text("Which mockup?")');
  await page.waitForSelector('#qcard .qgrid.pics .qopt.pic');
  assert.deepEqual(await page.locator('#qcard .qopt.pic b').allInnerTexts(), ['Light', 'Dark']);
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=0 >> iframe').locator('h1').innerText(), 'Light direction');
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=1 >> iframe').locator('h1').innerText(), 'Dark direction');
  assert.equal(await page.locator('#panel').isHidden(), true);                   // the panel stays shut until you ask for it
  await page.evaluate(() => { document.querySelector('#qcard .qopt.pic iframe').dataset.same = '1'; });
  await page.click('#qcard .qopt.pic:has-text("Dark") .cap');                    // picking lights the picture, and nothing else moves
  await page.waitForSelector('#qcard .qopt.pic.on:has-text("Dark")');
  assert.equal(await page.locator('#panel').isHidden(), true);
  assert.equal(await page.locator('#qcard .qopt.pic iframe[data-same]').count(), 1);   // the pictures were not loaded again
  await page.hover('#qcard .qopt.pic:has-text("Light")');
  await page.click('#qcard .qopt.pic:has-text("Light") .big');                   // the corner button opens that one large
  await page.waitForSelector('#cmw:not([hidden]) #cmSeg button.on:has-text("Light")');
  assert.deepEqual(await page.locator('#cmSeg button').allInnerTexts(), ['Light', 'Dark', 'Side by side']);
  assert.equal(await page.frameLocator('#cmStage iframe').locator('h1').innerText(), 'Light direction');
  assert.equal(await page.locator('#qcard .qopt.pic:has(.big.on) b').innerText(), 'Light');
  assert.equal(await page.locator('#qcard .qopt.pic.on b').innerText(), 'Dark');   // opening one large does not pick it
  await page.click('#qcard .qopt.pic:has-text("Dark") .cap');                    // with the panel open, picking an option shows it there
  await page.waitForSelector('#cmSeg button.on:has-text("Dark")');
  assert.equal(await page.frameLocator('#cmStage iframe').locator('h1').innerText(), 'Dark direction');
  await page.click('#cmSeg button:has-text("Light")');                          // and a tab picks its option
  await page.waitForSelector('#qcard .qopt.on:has-text("Light")');
  await page.click('#cmSeg button:has-text("Side by side")');
  await page.waitForFunction(() => document.querySelectorAll('#cmStage iframe').length === 2);
  assert.deepEqual(await page.locator('#cmStage .cmlab').allInnerTexts(), ['Light', 'Dark']);
  assert.equal(await page.locator('#qcard .big.on').count(), 0);
  await page.click('.hc:has-text("shot.png")');                                  // any other file from the turn can still be opened
  await page.waitForSelector('#pvw:not([hidden])'); assert.equal(await page.locator('#cmw').isHidden(), true);
  assert.equal(await page.locator('#qcard').isVisible(), true);                  // beside the question, not over it
  await page.click('#qcard .qopt.pic:has-text("Dark") .big');                    // a corner button brings the comparison back
  await page.waitForSelector('#cmw:not([hidden]) #cmSeg button.on:has-text("Dark")');
  await page.click('#qcard .qopt.pic:has-text("Dark") .big');                    // and the one of the picture shown closes the panel
  await page.waitForSelector('#panel', { state: 'hidden' });
  await page.click('#qcard .qopt.pic:has-text("Dark") .big'); await page.waitForSelector('#cmw:not([hidden])');
  await page.click('#cmClose'); await page.waitForSelector('#panel', { state: 'hidden' });
  assert.equal(await page.locator('#qcard').isVisible(), true);                  // closing it leaves the question
  const size = page.viewportSize();
  try {                                                                          // a narrow window: rows again, the picture kept small
    await page.setViewportSize({ width: 470, height: size.height });
    await page.waitForFunction(() => { const [a, b] = document.querySelectorAll('#qcard .qopt.pic'); return a.getBoundingClientRect().top < b.getBoundingClientRect().top - 10 && a.querySelector('.th').offsetWidth < 100; });
  } finally { await page.setViewportSize(size); }
  await page.waitForFunction(() => { const [a, b] = document.querySelectorAll('#qcard .qopt.pic'); return Math.abs(a.getBoundingClientRect().top - b.getBoundingClientRect().top) < 2; });
  await page.click('#qcard [data-act="send"]');
  await page.waitForSelector('.ai:has-text("PICKED")'); assert.match(await page.locator('.ai:has-text("PICKED")').innerText(), /Light/);   // the tab picked it; opening Dark large did not change that
  assert.equal(await page.locator('#cmw').isHidden(), true);
});

ui('window: a question whose options carry their own text shows that text in the pictures; a plain question has none', async () => {
  await startNew('show me SNIPPETS');
  await page.waitForSelector('#qcard .qopt.pic .th.txt:has-text("top")');
  assert.equal(await page.locator('#panel').isHidden(), true);
  await page.click('#qcard .qopt.pic:has-text("Split") .cap');
  await page.hover('#qcard .qopt.pic:has-text("Split")'); await page.click('#qcard .qopt.pic:has-text("Split") .big');
  await page.waitForSelector('#cmStage .cmtext:has-text("| a  | b  |")');
  await page.click('#qcard [data-act="send"]'); await page.waitForSelector('.ai:has-text("PICKED")');
  await page.waitForSelector('#panel', { state: 'hidden' });
  await startNew('just ASK me');
  await page.waitForSelector('#qcard:has-text("Which direction")');
  assert.equal(await page.locator('#panel').isHidden(), true);
  assert.equal(await page.locator('#qcard .qopt.pic, #qcard [data-big]').count(), 0);
  await page.click('#qcard .qopt:has-text("Light")'); await page.click('#qcard [data-act="next"]');
  await page.click('#qcard .qopt:has-text("Tests")'); await page.click('#qcard [data-act="send"]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
});

ui('window: mockups are matched to options by their folder and title, not only by a name the label contains', async () => {
  await startNew('make header VARIANTS');
  await page.waitForSelector('#qcard .qgrid.pics .qopt.pic');
  assert.deepEqual(await page.locator('#qcard .qopt.pic b').allInnerTexts(), ['Compact', 'Tall']);
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=0 >> iframe').locator('h1').innerText(), 'Compact one');   // v1/index.html, written second
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=1 >> iframe').locator('h1').innerText(), 'Tall one');
  await page.click('#qcard .qopt.pic:has-text("Tall") .cap'); await page.click('#qcard [data-act="send"]');
  await page.waitForSelector('.ai:has-text("PICKED")');
});

ui('window: an option whose preview is a file\'s path shows that file, even one no tool wrote; not one outside the project', async () => {
  await startNew('show what is POINTED at');
  await page.waitForSelector('#qcard .qgrid.pics .qopt.pic');
  assert.deepEqual(await page.locator('#qcard .qopt.pic b').allInnerTexts(), ['Calm', 'Loud']);
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=0 >> iframe').locator('h1').innerText(), 'Calm page');
  assert.equal(await page.frameLocator('#qcard .qopt.pic >> nth=1 >> iframe').locator('h1').innerText(), 'Loud page');
  assert.equal(await page.locator('#qcard .qopt:not(.pic):has-text("Neither")').count(), 1);   // its path is not one it may show
  await page.click('#qcard .qopt.pic:has-text("Calm") .cap'); await page.click('#qcard [data-act="send"]');
  await page.waitForSelector('.ai:has-text("PICKED")');
});

ui('window: a session working in the app says what it is doing under its name; not one in a terminal, not in the compact sidebar', async () => {
  await startNew('be SLOW for the second line');
  await page.waitForSelector('.sess.sel .l2:has-text("Running Wait a long time")');
  assert.equal(await page.locator(`.sess[data-id="${sb.sessions.alphaOutside}"] .l2`).count(), 0);   // working, but in a terminal
  assert.equal(await page.locator('.sess .l2').count(), 1);
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('b');
  await page.waitForSelector('.app.compact'); assert.equal(await page.locator('.sess.sel .l2').isHidden(), true);
  await page.keyboard.press('b'); await page.waitForSelector('.app:not(.compact)');
  await page.click('#send'); await page.waitForSelector('.sys:has-text("Interrupted")');
  await page.waitForFunction(() => !document.querySelector('.sess .l2'));       // it goes when the session stops
});

ui('window: limit card continues on another profile, and goes the moment you press', async () => {
  await startNew('hit the LIMIT now');
  await page.waitForSelector('#qcard:has-text("Limit reached on live")');
  assert.equal(await page.locator('#pProfile').innerText(), 'live');       // a new session starts on the global profile again
  assert.equal(await page.locator('#qcard .qbtn.off').innerText().then(t => /full/.test(t)), true);
  await page.click('#pProfile'); await page.click('#mProfile [data-prof="live"]');   // picked before: the card's choice still wins
  await page.route('**/api/sessions/*/send', async r => { await sleep(600); await r.continue().catch(() => {}); });   // the test may have moved on (and unrouted) by then
  await page.click('#qcard .qbtn:has-text("Continue on other")');
  await page.waitForSelector('#qcard', { state: 'hidden', timeout: 400 });
  await page.waitForSelector('.ai:has-text("Echo: Continue where you left off.")');
  await page.unroute('**/api/sessions/*/send');
  await page.waitForFunction(() => document.querySelector('#pProfile').innerText === 'other');
});

ui('window: stop button', async () => {
  await startNew('be SLOW in the window');
  await page.waitForSelector('.w1:has-text("Running Wait a long time")');
  assert.equal(await page.locator('#send').getAttribute('data-tip'), 'Stop');
  await page.click('#send');
  await page.waitForSelector('.sys:has-text("Interrupted")');
  assert.equal(await page.locator('#send').getAttribute('data-tip'), 'Send');
});

ui('window: preview cards open at full width, the header button beside the conversation; step, pick from the list, close', async () => {
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
  assert.equal(await page.locator('#conv').isHidden(), true);                    // a card opens at full width
  await page.click('#bFull'); assert.equal(await page.locator('#conv').isVisible(), true);
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
  assert.equal(await page.locator('#conv').isHidden(), true);
  await page.click('#pNext'); assert.equal(await page.locator('#pName').innerText(), 'dark.html');
  assert.equal(await page.frameLocator('#stage iframe').locator('h1').innerText(), 'Dark direction');
  // refresh picks up what is not watched, here a stylesheet the page uses
  fs.writeFileSync(path.join(path.dirname(await page.locator('.hc.on').getAttribute('data-open')), 'style.css'), 'h1{color:rgb(9, 9, 9)}');
  await page.click('#bRefresh');
  await page.waitForFunction(() => true); await until(async () => await page.frameLocator('#stage iframe').locator('h1').evaluate(el => getComputedStyle(el).color) === 'rgb(9, 9, 9)', 'the refreshed stylesheet', 3000);
  await page.click('#moreBtn'); assert.deepEqual(await page.locator('#menu b').allInnerTexts(), ['light.html', 'dark.html', 'shot.png']);
  await page.click('#menu button:has-text("shot.png")');
  await page.waitForFunction(() => document.querySelector('#stage img')?.naturalWidth === 2);
  await page.click('#bFull'); assert.equal(await page.locator('#conv').isVisible(), true);
  await page.click('#bFull'); assert.equal(await page.locator('#conv').isHidden(), true);
  await page.click('#bClose'); assert.equal(await page.locator('#panel').isHidden(), true);
  // the header has its own button for the preview: it opens again on what was last looked at, and closes it
  assert.equal(await page.locator('#pvN').innerText(), '3');
  await page.click('#bPreview'); assert.equal(await page.locator('#pName').innerText(), 'shot.png');
  assert.equal(await page.locator('#bPreview.on').count(), 1);
  assert.equal(await page.locator('#conv').isVisible(), true);                   // from the header it opens beside the conversation
  await page.click('#bPreview'); assert.equal(await page.locator('#panel').isHidden(), true);
  // the same by keys: N opens and closes it, M toggles its full width
  await page.evaluate(() => document.activeElement?.blur()); await page.keyboard.press('n'); await page.waitForSelector('#panel:not([hidden])');
  await page.keyboard.press('m'); assert.equal(await page.locator('#conv').isHidden(), true);
  await page.keyboard.press('m'); assert.equal(await page.locator('#conv').isVisible(), true);
  const first = await page.locator('#pName').innerText();                        // ← → step through what the session made
  await page.keyboard.press('ArrowRight'); assert.notEqual(await page.locator('#pName').innerText(), first);
  await page.keyboard.press('ArrowLeft'); assert.equal(await page.locator('#pName').innerText(), first);
  await page.keyboard.press('n'); assert.equal(await page.locator('#panel').isHidden(), true);
  await page.click('.hc:has-text("dark.html")'); await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.ai:has-text("The readme is tidied.")'); assert.equal(await page.locator('#panel').isHidden(), true); // another session, no panel
  assert.equal(await page.locator('#bPreview').isHidden(), true);                                      // and nothing to preview
});

ui('window: new folder from the project menu', async () => {
  await page.click('#newBtn'); await page.click('#pProject'); await page.click('[data-mk]');
  await page.fill('#mkName', 'delta'); await page.press('#mkName', 'Enter');
  await page.waitForFunction(() => document.querySelector('#pProject').innerText.includes('delta'));
  assert.ok(fs.existsSync(path.join(sb.home, 'workspace', 'delta')));
  await page.click('#pProject'); await page.fill('#pFind', 'bet');
  assert.deepEqual(await page.locator('#mProject .item[data-proj] b').allInnerTexts().then(a => a.sort()), ['beta', 'beta-login-fix']);   // a worktree can be picked like any folder
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
  assert.match(await page.locator(`.sess[data-id="${id}"]`).getAttribute('data-tip'), /In a terminal · waiting for you/);
  assert.equal(await page.locator(`.sess[data-id="${id}"] .askl`).innerText(), 'Waiting');
});

ui('window: session menu: rename in place, open in a terminal', async () => {
  const id = sb.sessions.alphaLive, row = `.sess[data-id="${id}"]`;
  await page.click(row); await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.hover(row); await page.click(`${row} [data-dots]`);
  assert.deepEqual(await page.locator('#smenu button').allInnerTexts(), ['Rename', 'Open in VS Code', 'Open in terminal', 'Mark done', 'Delete']);
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

ui('window: done takes a session out of the sidebar; search finds it, and it can come back', async () => {
  const id = sb.sessions.alphaLive, row = `.sess[data-id="${id}"]`;
  await page.click(row); await page.hover(row); await page.click(`${row} [data-done]`);
  await page.waitForFunction(r => !document.querySelector(r), row);
  assert.notEqual(await page.locator('#title').innerText(), 'Readme tidy-up'); // moved on to another session
  assert.equal((await listed(id)).done, true);
  await page.keyboard.press('Control+k'); await page.fill('#fQ', 'readme tidy');
  assert.deepEqual(await page.locator('#fList .lab').allInnerTexts(), ['Done']);
  await page.press('#fQ', 'Enter');
  await page.waitForSelector(row + '.isdone.sel');                          // shown while you look at it
  assert.equal(await page.locator('#bDone').innerText(), 'Back to inbox');
  await page.click('#bDone');
  await page.waitForFunction(r => !document.querySelector(r).classList.contains('isdone'), row);
  await page.keyboard.press('Control+d');                                    // the key does the same as the button
  await page.waitForFunction(r => !document.querySelector(r), row);
  await page.click('#bHist'); await page.fill('#fQ', 'readme tidy'); await page.click(`#fList [data-find="${id}"]`);
  await page.waitForSelector(row + '.isdone'); await page.click('#bDone');
  await page.waitForFunction(r => !document.querySelector(r).classList.contains('isdone'), row);
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
  await page.click(row); await page.waitForSelector('.me:has-text("Plan the beta launch")');
  assert.equal(await page.locator('#pModel').innerText(), 'Fable 5.2 · Extra');
  assert.equal((await page.locator('#pCtx').innerText()).trim(), '4%'); assert.match(await page.locator('#pCtx').getAttribute('data-tip'), /42k of 1M/);
  const before = readLog(sb).length;
  await send('carry on'); await page.waitForSelector('.ai:has-text("Echo: carry on")');
  assert.ok(readLog(sb).slice(before).some(l => l.includes(`resume=${id} model=claude-fable-5-2 effort=xhigh`)), readLog(sb).slice(before).join('|'));
  await page.click('#pModel'); await page.click('#mModel [data-e=low]'); await page.keyboard.press('Escape');   // a choice belongs to this session only
  assert.match(await page.locator('#pModel').innerText(), / · Low$/);
  await page.click(`.sess[data-id="${sb.sessions.betaOther}"]`); await page.waitForSelector('.me:has-text("Add a beta changelog")');
  assert.equal(await page.locator('#pModel').innerText(), 'Test · High');                // nothing recorded for effort: the default from settings
  await page.click(row); await page.waitForSelector('.me:has-text("Plan the beta launch")');
  assert.match(await page.locator('#pModel').innerText(), / · Low$/);
});

ui('window: a new session shows the real default model and effort, marked as the default in the menu', async () => {
  await page.click('#newBtn');
  await page.waitForFunction(() => document.querySelector('#pModel').innerText === 'Sonnet 5.5 · High');
  await page.click('#pModel');
  const names = await page.locator('#mModel .item b').allInnerTexts();
  assert.ok(names.includes('Sonnet 5.5') && !names.includes('Default'), names.join());
  assert.deepEqual(await page.locator('#mModel .item:has(small.def) b').allInnerTexts(), ['Sonnet 5.5']);
  assert.match(await page.locator('#mModel .cap2').innerText(), /High is your default effort/);
  await page.click('#mModel [data-v="claude-haiku-5-5"]');
  assert.equal(await page.locator('#pModel').innerText(), 'Haiku 5.5 · High');
  await page.click('#pModel'); await page.click('#mModel [data-v="claude-sonnet-5-5"]');
  assert.equal(await page.locator('#pModel').innerText(), 'Sonnet 5.5 · High');
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

ui('window: the skills button in the box opens the same list as "/", and keeps what you had written', async () => {
  await page.fill('#input', '');
  await page.click('#bSkills');
  await page.waitForSelector('#slash .skr[data-sk="code-review"]');
  assert.equal(await page.inputValue('#input'), '/');
  assert.equal(await page.locator('#skw, #skl').count(), 0);                 // no side panel for skills any more
  // one line each, the whole description on hover
  assert.ok((await page.locator('#slash .skr[data-sk="compact"]').boundingBox()).height < 36);
  assert.equal(await page.getAttribute('#slash .skr[data-sk="compact"]', 'title'), null);   // no second, system tooltip
  await page.setViewportSize({ width: 700, height: 500 });
  await page.hover('#slash .skr[data-sk="compact"]');
  await page.waitForSelector('#tip:visible');
  assert.equal(await page.innerText('#tip'), 'Free up context by summarizing the conversation so far');
  const tb = await page.locator('#tip').boundingBox();
  assert.ok(tb.width <= 280 && tb.x >= 0 && tb.x + tb.width <= 700 && tb.y >= 0 && tb.y + tb.height <= 500, JSON.stringify(tb));
  await page.setViewportSize({ width: 1400, height: 880 });
  await page.mouse.move(5, 5);
  await page.waitForSelector('#tip', { state: 'hidden' });
  await page.hover('#bSkills'); await page.waitForSelector('#tip.note:visible');                // a name, a dim line, and its key
  assert.equal(await page.textContent('#tip .tipn'), 'Skills/'); assert.equal(await page.innerText('#tip kbd'), '/');
  await page.hover('#mic');                                                                    // straight on to the next one: no wait
  await page.waitForFunction(() => document.querySelector('#tip .tipn')?.textContent.startsWith('Dictate'), null, { timeout: 300 });
  assert.deepEqual(await page.locator('#tip kbd').allInnerTexts(), ['Ctrl', 'Shift', 'Space']);
  await page.mouse.move(5, 5); await page.waitForSelector('#tip', { state: 'hidden' });
  await page.click('#bSkills');                                              // pressing it again closes the list
  await page.waitForSelector('#slash', { state: 'hidden' }); assert.equal(await page.inputValue('#input'), '');
  await page.fill('#input', 'a header');                                     // with a message already written, the skill goes in front of it
  await page.click('#bSkills'); await page.click('#slash .skr[data-sk="mockup"]');
  assert.equal(await page.inputValue('#input'), '/mockup a header');
  await page.press('#input', 'Enter');
  await page.waitForSelector('.me:has-text("a header") .chip:has-text("mockup")');
});

ui('window: attach files with the paperclip, remove one, send; the message shows the picture as a card and the file by name', async () => {
  await page.click(`.sess[data-id="${sb.sessions.alphaLive}"]`);
  await page.waitForSelector('.me:has-text("Tidy the alpha readme")');
  await page.setInputFiles('#filePick', [
    { name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') },
    { name: 'second.png', mimeType: 'image/png', buffer: Buffer.from(PNG, 'base64') },
    { name: 'tokens.css', mimeType: 'text/css', buffer: Buffer.from(':root{}') }]);
  await page.waitForSelector('#atts .ath >> nth=1');
  assert.match(await page.innerText('#atts .fch'), /tokens\.css/);
  await page.click('#atts .ath >> nth=1 >> [data-rm]');
  assert.equal(await page.locator('#atts .ath').count(), 1);
  await send('Use these for the header');
  const mine = '.me:has-text("Use these for the header")';
  await page.waitForSelector(`${mine} .mpic img`);
  assert.equal(await page.locator(`${mine} .mpic`).count(), 1);
  assert.equal(await page.innerText(`${mine} .matt`), 'tokens.css');
  const img = page.locator(`${mine} .mpic img`);
  await until(async () => (await img.getAttribute('src')).startsWith('/api/picture/') && await img.evaluate(i => i.naturalWidth === 1), 'the service\'s copy of the picture, once it has the message', 5000);
  await page.click(`${mine} .mpic`); await page.waitForSelector('#lbx:not([hidden]) #lbxImg');      // opens large
  await page.keyboard.press('Escape'); await page.waitForSelector('#lbx', { state: 'hidden' });
  assert.equal(await page.locator('#atts .ath, #atts .fch').count(), 0);   // the box is empty again
  // where the window can tell where a file lives (the Electron window), the path is sent, not the contents
  const real = path.join(sb.projects.alpha, 'spec.txt'); fs.writeFileSync(real, 'the spec');
  await page.evaluate(p => { window.workwood = { pathFor: () => p }; }, real);
  await page.waitForSelector('.ai:has-text("Echo: Use these for the header")');
  await page.waitForSelector('#send[data-tip="Send"]');             // the first turn is over; until then the button means Stop
  await page.setInputFiles('#filePick', [{ name: 'spec.txt', mimeType: 'text/plain', buffer: Buffer.from('not this') }]);
  await page.waitForSelector('#atts .fch[data-tip]');
  await send('Follow the spec');
  await page.waitForSelector(`.ai li:has-text("${real}")`);
  await page.evaluate(() => { delete window.workwood; });
});

ui('window: a question card has its own mic for the typed answer, and the dictated text is sent', async () => {
  await startNew('ASK me by voice');
  await page.waitForSelector('#qcard:has-text("Which direction")');
  await page.click('#qcard [data-mic]');
  await page.waitForSelector('#qcard .qtype.rec #voice');                            // the waveform shows in the answer field
  await page.waitForFunction(() => /dictated words/.test(document.getElementById('qText').value));
  await page.click('#qcard [data-mic]');
  await page.waitForSelector('#voice', { state: 'hidden' });
  assert.match(await page.inputValue('#qText'), /^(dictated words ?)+$/);
  assert.equal(await page.locator('#box #voice').count(), 1);                        // and goes back to the message box afterwards
  await page.click('[data-act=next]');
  await page.click('.qopt:has-text("Docs")');
  await page.click('#qcard [data-mic]');                                             // still recording when Send is pressed: the text goes along
  await page.waitForFunction(() => /dictated words/.test(document.getElementById('qText').value));
  await page.click('[data-act=send]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
  assert.match(await page.locator('.ai').last().innerText(), /"dictated words.*".*"dictated words.*"/);
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

ui('window: while the agent works you can write to it; the button stops only when the box is empty', async () => {
  await startNew('please LISTEN while you build');
  await page.waitForSelector('.w1:has-text("Build everything")');
  assert.equal(await page.locator('#send').getAttribute('data-tip'), 'Stop');
  assert.match(await page.locator('#input').getAttribute('placeholder'), /reads this when the current step ends/);
  await page.press('#input', 'Enter');                                            // Enter on an empty box does not stop the turn
  await page.fill('#input', 'use the blue one');
  assert.equal(await page.locator('#send').getAttribute('data-tip'), 'Send');
  await page.press('#input', 'Enter');
  await page.waitForSelector('.me:has-text("use the blue one")');
  await page.waitForSelector('.ai:has-text("Heard mid-turn: use the blue one")');
  assert.equal(await page.locator('#input').inputValue(), '');
});

ui('window: a message written while the agent works waits on top of the box; ↑ takes it back, Send now sends it at once', async () => {
  await startNew('do these STEPS');
  await page.waitForSelector('.w1:has-text("Build slowly")');
  await page.fill('#input', 'second thought'); await page.press('#input', 'Enter');
  await page.waitForSelector('#queue .qm:has-text("second thought")');
  assert.equal(await page.inputValue('#input'), '');
  assert.equal(await page.locator('.me:has-text("second thought")').count(), 0);
  await page.press('#input', 'ArrowUp');
  await until(async () => await page.inputValue('#input') === 'second thought', 'the message to come back to the box');
  await page.waitForSelector('#queue', { state: 'hidden' });
  await page.fill('#input', 'second thought, better'); await page.press('#input', 'Enter');
  await page.click('#queue .qm:has-text("second thought, better") [data-qnow]');
  await page.waitForSelector('.ai:has-text("Echo: second thought, better")');
  await page.waitForSelector('#queue', { state: 'hidden' });
  assert.equal(await page.locator('.ai:has-text("Steps done")').count(), 0);
});

ui('window: a long conversation has a rail of turns and an outline you can search and jump from', async () => {
  await startNew('first thing to do'); await page.waitForSelector('.ai:has-text("Echo: first thing")');
  assert.equal(await page.locator('#rail').isHidden(), true);                      // nothing to navigate yet
  const rid = await page.locator('.sess.sel').getAttribute('data-id');
  for (const t of ['take a SCREENSHOT', 'third and last']) { await idle(rid); await page.waitForSelector('#send[data-tip="Send"]'); await send(t); await page.waitForSelector(`.me:has-text("${t}")`); await until(async () => (await session(rid)).items.some(i => i.kind === 'user' && i.text === t), 'the message to arrive'); }
  await page.waitForSelector('.ai:has-text("Echo: third and last")');
  await page.waitForFunction(() => document.querySelectorAll('#rail button').length === 3);
  assert.match(await page.locator('#rail button').nth(1).getAttribute('data-tip'), /^Turn 2 of 3 .*1 command.* — take a SCREENSHOT$/);
  await page.click('#bOutline');
  assert.equal(await page.locator('#olT').innerText(), 'Conversation · 3 turns');
  assert.deepEqual(await page.locator('#oll .olrow b').allInnerTexts(), ['first thing to do', 'take a SCREENSHOT', 'third and last']);
  assert.equal(await page.locator('#oll .daysep').innerText(), 'Today');
  await page.fill('#olQ', 'screenshot is ready');                                  // finds what the agent said, too
  assert.deepEqual(await page.locator('#oll .olrow b').allInnerTexts(), ['take a SCREENSHOT']);
  await page.fill('#olQ', 'zebra'); await page.waitForSelector('#oll:has-text("Nothing in this conversation matches.")');
  await page.fill('#olQ', ''); await page.click('#oll .olrow >> nth=0');
  await page.waitForFunction(() => document.getElementById('scroll').scrollTop < 40);
  await page.click('#olClose'); await page.waitForSelector('#panel', { state: 'hidden' });
  const id = await page.locator('.sess.sel').getAttribute('data-id');              // a session not started shows no rail from the one before
  await page.click('#newBtn'); await page.waitForSelector('#dash .hs');
  assert.equal(await page.locator('#rail').isHidden(), true);
  await page.click(`.sess[data-id="${id}"]`);
  await page.waitForFunction(() => document.querySelectorAll('#rail button').length === 3);
});

ui('window: home shows where work was left and each profile\'s limits, with two other views a click away', async () => {
  await page.click('#newBtn'); await page.waitForSelector('#dash .hcard');
  const widths = sel => page.$$eval(sel, l => { l[0].classList.add('waits'); return [...new Set(l.map(e => Math.round(e.getBoundingClientRect().width)))].length; });
  assert.equal(await widths('#dash .hcard'), 1);                                    // a card waiting on you is as wide as the rest
  assert.equal(await page.locator('#title').innerText(), 'Home');
  assert.equal(await page.locator('#hello').isHidden(), true);
  assert.equal(await page.locator('#dash .pcard').count(), 3);
  await page.waitForSelector('#dash .pcard.full:has-text("5-hour limit reached")');
  await page.waitForSelector('#dash .hrow:has-text("beta")');
  await page.click('#dash .pcard[data-prof="other"]');                              // a profile card opens that profile's settings
  await page.waitForSelector('#spage .pfr.on[data-psel="other"]');
  await page.keyboard.press('Escape'); await page.waitForSelector('#sdim', { state: 'hidden' });
  await page.waitForSelector('#hbg:not([hidden]) .blob');                           // the background, aurora unless you chose another
  await page.click('#hset'); await page.waitForSelector('#spage .hbgt.on[data-bgk="aurora"]');   // the quiet button beside the views: Settings, Look
  await page.click('#spage [data-bgk="constel"]'); await page.waitForSelector('#spage .hbgt.on[data-bgk="constel"]');
  await page.waitForSelector('#spage [data-tk="constel"] svg.sky .star');            // its preview is the same drawing
  await page.keyboard.press('Escape');
  await page.waitForSelector('#hbg svg.sky .fig .star');                             // a figure per project, a star per recent session
  const sky = await page.evaluate(() => [...document.querySelectorAll('#hbg .fig')].map(f => {
    const st = [...f.querySelectorAll('.st')].map(c => [+c.getAttribute('cx'), +c.getAttribute('cy'), +c.getAttribute('r')]);
    const ends = [...f.querySelectorAll('.ln')].flatMap(l => l.getAttribute('d').slice(1).split('L').map(p => p.split(' ').map(Number)));
    return { stars: st.length, lines: ends.length / 2, near: ends.every(([x, y]) => st.some(([a, b, r]) => Math.abs(Math.hypot(x - a, y - b) - (r + 7)) < 1)) };
  }));
  assert.ok(sky.length >= 1);
  for (const f of sky) { assert.equal(f.lines, f.stars - 1); assert.ok(f.near); }      // each figure is joined into one, and every line ends at a star
  await page.click('#hset'); await page.click('#spage [data-bgk="none"]'); await page.keyboard.press('Escape');
  assert.equal(await page.locator('#hbg .fld:not(.glow), #hbg svg').count(), 0);
  await page.evaluate(() => localStorage.removeItem('ww.bg.home'));
  await page.click('#dseg [data-hv="projects"]'); await page.waitForSelector('#dash .pj:has-text("alpha")');
  assert.equal(await widths('#dash .pj'), 1);
  await page.click('#dseg [data-hv="time"]'); await page.waitForSelector('#dash .hstat');
  await page.click('#dash [data-tscale="week"]'); await page.waitForSelector('#dash .lane .ltrk b');
  await page.click('#dash [data-tscale="30"]'); await page.waitForSelector('#dash .heat .c.l1, #dash .heat .c.l2, #dash .heat .c.l3, #dash .heat .c.l4');
  assert.equal(await page.locator('#dash .heat > i.c').count() % 30, 0);            // 30 days a row
  await page.click('#dash [data-tby="profiles"]'); await page.waitForSelector('#dash [data-tby="profiles"].on');
  await page.waitForSelector('#dash .heat .hpn');
  await page.click('#dash [data-tby="projects"]');
  await page.click('#dash .heat .c[data-tday="0"] >> nth=0'); await page.waitForSelector('#dash [data-tscale="day"].on');   // a day in the heatmap opens that day
  assert.equal(await page.locator('#dash .tlbl').innerText(), 'Today');
  await page.click('#dash [data-tstep="1"]'); assert.equal(await page.locator('#dash .tlbl').innerText(), 'Yesterday');
  assert.equal(await page.locator('#dash .sk').count(), 0);                          // read once, nothing is a skeleton any more
  assert.ok(await page.evaluate(() => JSON.parse(localStorage.getItem('ww.homeCache')).act.projects.length));   // and it is remembered for next time
  await page.click('#dash [data-tscale="week"]');
  await page.click('#dseg [data-hv="pick"]'); await page.waitForSelector('#dash .hcard');
  const id = await page.locator('#dash .hcard').first().getAttribute('data-sid');
  await page.click('#dash .hcard >> nth=0'); await page.waitForSelector(`.sess.sel[data-id="${id}"]`);
  assert.equal(await page.locator('#dash').isHidden(), true);
  assert.equal(await page.locator('#dseg').isHidden(), true);
  assert.equal(await page.locator('#hbg .fld:not(.glow), #hbg svg').count(), 0);    // a conversation starts with a plain background
});

ui('window: Look sets the theme, and a background for a session and the sidebar with their own motion', async () => {
  await page.click('.sess >> nth=0'); await page.waitForSelector('.sess.sel');
  await page.click('#bGear'); await page.click('#gAll'); await page.click('#stabs [data-st="4"]');
  await page.click('#spage [data-th="auto"]');
  assert.equal(await page.evaluate(() => localStorage.getItem('ww.theme')), 'auto');
  assert.equal(await page.evaluate(() => document.documentElement.dataset.theme), await page.evaluate(() => matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  await page.click('#spage [data-th="dark"]');
  await page.click('#spage [data-bgp="session"]'); await page.waitForSelector('#spage [data-bgp="session"].on');
  assert.equal(await page.locator('#spage [data-bgk="constel"]').count(), 0);          // the constellation maps the inbox: Home only
  await page.click('#spage [data-bgk="paper"]'); await page.waitForSelector('#spage .srow.lstack.off');   // Paper never moves
  await page.click('#spage [data-bgk="aurora"]'); await page.click('#spage [data-bgm="never"]');
  await page.keyboard.press('Escape');
  await page.waitForSelector('#hbg.insession .blob');
  assert.equal(await page.evaluate(() => document.getElementById('hbg').classList.contains('moving')), false);
  assert.equal(await page.evaluate(() => document.getElementById('main').classList.contains('bglane')), true);   // the reading column stays calm
  await page.click('#bGear'); await page.click('#gAll'); await page.click('#stabs [data-st="4"]');
  await page.click('#spage [data-bgp="side"]'); await page.click('#spage [data-bgk="dusk"]'); await page.keyboard.press('Escape');
  await page.waitForSelector('#sbg.inside .dusk');
  await page.evaluate(() => { for (const k of ['ww.bg.session', 'ww.motion.session', 'ww.bg.side']) localStorage.removeItem(k); });
  await page.reload(); await page.waitForSelector('.sess');
  assert.equal(await page.locator('#sbg .fld:not(.glow)').count(), 0);
});

ui('window: scrolled up, a mark counts the replies that arrive below, and a click lands on the first of them', async () => {
  const top = () => page.evaluate(() => document.getElementById('scroll').scrollTop);
  await startNew('some CHATTER please'); await page.waitForSelector('.ai:has-text("Chatter opening, paragraph 40.")');
  assert.equal(await page.locator('#jump').isHidden(), true);                      // at the bottom the thread follows, and there is no mark
  await page.evaluate(() => { document.getElementById('scroll').scrollTop = 0; });
  await page.waitForSelector('#jump:not(.new)');                                   // scrolled up with nothing new: a plain arrow to the latest
  assert.equal((await page.locator('#jump').innerText()).trim(), '');
  await page.waitForSelector('#jump:not(.new) .dot');                              // a step is not a message: a live dot, no count
  await page.waitForSelector('#jump.new:has-text("3 new messages")');              // only replies count
  assert.equal(await top(), 0);                                                    // the thread stayed where you were reading
  assert.equal(await page.locator('.newline').count(), 1);
  assert.equal(await page.evaluate(() => document.querySelector('.newline').nextElementSibling.textContent.trim()), 'Chatter reply 1.');
  await page.click('#jump');                                                       // lands on the first new one, or the end when they all fit
  await page.waitForFunction(() => { const s = document.getElementById('scroll'), l = document.querySelector('.newline'); return Math.abs(s.scrollTop - (l.offsetTop - 16)) < 4 || s.scrollHeight - s.scrollTop - s.clientHeight < 4; });
  await page.waitForSelector('#jump', { state: 'hidden' });                        // read: the count is gone, and so is the mark at the bottom
  assert.equal(await page.locator('.newline').count(), 1);                         // the line keeps your place until you send something
  const id = await page.locator('.sess.sel').getAttribute('data-id'); await idle(id); await page.waitForSelector('#send[data-tip="Send"]');
  await page.evaluate(() => { document.getElementById('scroll').scrollTop = 0; });
  await page.waitForSelector('#jump:not(.new)');
  await send('and now'); await page.waitForSelector('.ai:has-text("Echo: and now")');   // sending takes you to the bottom and clears the line
  assert.equal(await page.locator('.newline').count(), 0);
  assert.equal(await page.locator('#jump').isHidden(), true);
});

ui('window: the mark keeps the first new reply at the top of the view while more arrives under it', async () => {
  await startNew('some TALL CHATTER please'); await page.waitForSelector('.ai:has-text("Chatter opening, paragraph 40.")');
  await page.evaluate(() => { document.getElementById('scroll').scrollTop = 0; });
  await page.waitForSelector('#jump.new:has-text("1 new message")');
  await page.click('#jump');                                                       // short, and the last thing there: it lands at the end, the reply low in the view
  await page.waitForSelector('.ai:has-text("Tall reply 2, paragraph 60.")');       // then a long one arrives under it
  await page.waitForFunction(() => { const s = document.getElementById('scroll'), el = [...document.querySelectorAll('.ai')].find(e => e.textContent.startsWith('Tall reply 1,'));
    const y = el.getBoundingClientRect().top - s.getBoundingClientRect().top; return y > 0 && y < 80; });   // the reply you went to is at the top, whole
  const id = await page.locator('.sess.sel').getAttribute('data-id'); await idle(id);
});

ui('window: at the end, a long new reply is brought in with its first line at the top of the view', async () => {
  await send('long CHATTER at the end');                                          // in the open conversation, so the reply arrives live
  await page.waitForFunction(() => document.querySelectorAll('.ai').length && [...document.querySelectorAll('.ai')].filter(e => e.textContent.startsWith('Chatter opening,')).length === 2);
  await page.waitForFunction(() => { const s = document.getElementById('scroll'), el = [...document.querySelectorAll('.ai')].filter(e => e.textContent.startsWith('Chatter opening,')).pop();
    const y = el.getBoundingClientRect().top - s.getBoundingClientRect().top; return y > 0 && y < 80; });
  const id = await page.locator('.sess.sel').getAttribute('data-id'); await idle(id);
});

ui('window: the context figure opens what fills it, and can compact the conversation', async () => {
  const id = await page.locator('.sess.sel').getAttribute('data-id'), asked = () => readLog(sb).filter(l => l.includes(`resume=${id}`) && l.includes('model=default')).length;
  const before = asked();
  await page.click('#pCtx');
  await page.waitForSelector('#mCtx .crow:has-text("Messages")');
  await page.waitForFunction(() => document.querySelector('#pCtx').innerText.trim() === '26%');   // Claude Code's own count, now asked
  // asked again (past the window's own 30 s) with no reply since: the service's answer holds, Claude Code is not started again
  await page.keyboard.press('Escape'); await page.evaluate(() => { V.ctx.at = 0; });
  await page.click('#pCtx'); await page.waitForSelector('#mCtx .crow:has-text("Messages")'); await sleep(300);
  assert.equal(asked() - before, 1);
  assert.deepEqual(await page.locator('#mCtx .crow').allInnerTexts().then(a => a.map(t => t.replace(/\s+/g, ' '))), ['Messages 30k', 'System tools 16k', 'System prompt 5k']);
  await page.click('#mCtx [data-compact]');
  await page.waitForSelector('.me:has(.chip:has-text("compact"))');
  await page.waitForSelector('#mCtx', { state: 'hidden' });
});

ui('window: hand off from the context menu or with /handoff; the thread reads as one, its outline grouped by session', async () => {
  await startNew('a HANDOFF_SLOW test');
  await page.waitForSelector('.ai:has-text("Echo: a HANDOFF_SLOW test")');
  const first = await page.locator('.sess.sel').getAttribute('data-id'); await idle(first);
  await page.click('#pCtx'); await page.waitForSelector('#mCtx [data-handoff]');
  assert.deepEqual(await page.locator('#mCtx .item.act2 b').allInnerTexts(), ['Continue in a new session', 'Summarise to make room']);
  await page.click('#mCtx [data-hpick]'); await page.click('#mHand [data-hm="haiku"]');   // for this handoff only
  assert.match(await page.locator('#mCtx [data-hpick]').innerText(), /^Haiku · medium$/);
  const before = readLog(sb).length;
  await page.click('#mCtx [data-handoff]');
  await page.waitForSelector('.seam.writing:has-text("Writing the handoff · Haiku · medium")');
  await page.waitForSelector('.chain:has-text("2 sessions")', { timeout: 12000 });          // the new session opens, as part of the thread
  assert.ok(readLog(sb).slice(before).some(l => /model=haiku effort=medium .*persist=no/.test(l)));
  await page.waitForSelector('.seam:has-text("Session 1")'); await page.waitForSelector('.past.me:has-text("a HANDOFF_SLOW test")');
  assert.equal(await page.locator('.me:has-text("Continue from the handoff")').count(), 0);  // the handoff stands in for the message it started with
  assert.equal(await page.locator('.sess.sel .thr i').count(), 2);
  await page.click('.seam:has-text("Session 2") .tag'); await page.waitForSelector('.hoff:has-text("Keep the old API")');
  // the outline: a group per session, and Find looks through all of them
  await page.click('.chain'); await page.waitForFunction(() => /^Thread · 2 sessions · \d+ turns?$/.test(document.getElementById('olT').textContent));
  await page.waitForSelector('.sgh:has-text("Session 1")'); await page.fill('#olQ', 'slow');
  await page.waitForSelector('.sg:has-text("Session 1") .olrow mark:has-text("SLOW")');
  await page.fill('#olQ', '');
  // past the offer, a strip above the message box; dismissed, it stays away for this session
  await page.evaluate(() => { V.context = { used: 160000, window: 200000 }; renderComposer(); });
  await page.waitForSelector('#hstrip:has-text("Context 160k")'); await page.click('#hstrip [data-hx]');
  await page.waitForSelector('#hstrip', { state: 'hidden' });
  await page.evaluate(() => { renderComposer(); }); assert.equal(await page.locator('#hstrip').isVisible(), false);
  // /handoff is offered first, and what follows it is the new session's first message
  await page.fill('#input', '/hand'); await page.waitForSelector('#slash .skr:has-text("/handoff")'); await page.fill('#input', '');
  await page.evaluate(() => { V.sk = { key: null, list: null, err: null }; });   // later tests type commands before the list is read
  const second = await page.locator('.sess.sel').getAttribute('data-id'); await idle(second);
  await send('/handoff go on with the docs');
  await page.waitForSelector('.chain:has-text("3 sessions")', { timeout: 12000 });
  await page.waitForSelector('.me:not(.past):has-text("go on with the docs")');
  await page.waitForSelector('.tstub:has-text("Session 1")');                               // the oldest waits behind a line
  // an old session says where its thread goes on
  await page.evaluate(id => openSession(id), first);
  await page.waitForSelector('.tstub:has-text("continues in Session 2")'); await page.click('.tstub [data-tgo]');
  await page.waitForSelector('.chain:has-text("2 sessions")');
  const third = await page.evaluate(() => A.sessions.find(s => s.thread === 3).id); await idle(third);
});

ui('window: small things on the cards: skip a question, approve a plan but be asked, see a whole edit, wait out a limit', async () => {
  await startNew('just ASK me');
  await page.waitForSelector('#qcard:has-text("Which direction")');
  await page.click('#qcard [data-act="skip"]');
  await page.click('#qcard .qopt:has-text("Docs")'); await page.click('#qcard [data-act="send"]');
  await page.waitForSelector('.ai:has-text("ANSWERS")');
  assert.match(await page.locator('.ai:has-text("ANSWERS")').innerText(), /"Which direction should I take\?":"Skipped".*"Docs"/);

  await startNew('make a PLAN first');
  await page.click('#qcard [data-choice="plan:ask"]');
  await page.waitForSelector('.ai:has-text("PLAN APPROVED")');
  assert.match(await page.locator('.ai:has-text("PLAN APPROVED")').innerText(), /"type":"setMode","mode":"default","destination":"session"/);

  await startNew('hit the LIMIT now');
  await page.waitForSelector('#qcard:has-text("Limit reached on live")');
  assert.match(await page.locator('#qcard .why').innerText(), /Nothing is lost\./);
  await page.waitForSelector('.sys:has-text("limit reached on live")');           // and the thread says where it stopped
  await page.click('#qcard button:has-text("Wait for the limit to clear")');
  await page.waitForSelector('#qcard', { state: 'hidden' });
});

ui('window: a /compact stopped by a limit offers another profile, and continuing there compacts at once', async () => {
  await startNew('ready a COMPACT_FAILS'); await page.waitForSelector('.ai:has-text("Echo: ready a COMPACT_FAILS")');
  await send('/compact');
  // with the skills already read, the first Enter picks /compact from the list and the second sends it
  if ((await page.inputValue('#input')).trim() === '/compact') await page.press('#input', 'Enter');
  await page.waitForSelector('#qcard:has-text("Limit reached on live")');
  assert.match(await page.locator('#qcard .why').innerText(), /Error during compaction/);
  await page.click('#qcard [data-go="other"]');
  await page.waitForSelector('.me:has(.chip:has-text("compact")) >> nth=1');                   // the compact again, not "continue"
  assert.equal(await page.locator('.me:has-text("Continue where you left off")').count(), 0);
});

ui('window: the setting to continue at a limit by itself, and the card counts down with a way to cancel', async () => {
  await page.click('#bGear'); await page.click('#gAll');
  await page.click('#spage [data-set="auto"]');
  await page.waitForSelector('#spage [data-set="auto"].on');
  await page.click('#dClose');
  try {
    await startNew('hit the LIMIT and wait');
    await page.waitForSelector('#qcard .auto:has-text("Continuing on other in")');
    assert.match(await page.locator('#qcard .auto .acd').innerText(), /^0:0\d$/);
    assert.match(await page.locator('#qcard .qbtn.pri').innerText(), /Continue on other/);   // the one it will take comes first
    await page.click('#qcard .auto [data-act="stay"]');
    await page.waitForSelector('#qcard .auto', { state: 'detached' });
    await page.waitForSelector('#qcard:has-text("Limit reached on live")');                // the card stays, for you to choose
    await sleep(3000);
    assert.equal(await page.locator('#qcard:has-text("Limit reached on live")').count(), 1);
  } finally { await svc.call('settings', { autoContinue: false }); }
});

ui('window: a project can be given by typing its folder', async () => {
  const dir = path.join(sb.home, 'somewhere', 'theta'); fs.mkdirSync(dir, { recursive: true });
  await page.click('#newBtn'); await page.click('#pProject');
  await page.fill('#pFind', '~/somewhere/nope'); await page.click('#mProject [data-path]');
  await page.waitForSelector('text=There is no folder at');
  await page.fill('#pFind', '~/somewhere/theta'); await page.click('#mProject [data-path]');
  await page.waitForSelector('#pProject:has-text("theta")');
  await send('hello from theta'); await page.waitForSelector('.ai:has-text("Echo: hello from theta")');
  assert.equal(await page.locator('#where').innerText().then(t => t.includes('theta')), true);
});

ui('window: the sidebar goes compact by itself in a narrow window, and by its button or B at any width', async () => {
  const size = page.viewportSize(), compact = () => page.evaluate(() => document.querySelector('.app').classList.contains('compact'));
  const width = () => page.evaluate(() => document.querySelector('.side').offsetWidth);
  try {
    assert.equal(await compact(), false); assert.equal(await page.locator('#envl').isHidden(), true);   // one place only: no switch
    await page.click('#bSide'); assert.equal(await compact(), true); assert.equal(await width(), 52);
    assert.equal(await page.locator('.sess .txt').first().isHidden(), true);
    assert.match(await page.locator('.sess[data-id]').first().getAttribute('data-tip'), / — /);       // the name is in the hover note
    assert.equal(await page.locator('.sess[data-id]').first().getAttribute('title'), null);
    assert.equal(await page.evaluate(() => localStorage.getItem('ww.side')), 'compact');                  // remembered for next time
    await page.focus('#input'); await page.keyboard.press('b'); assert.equal(await compact(), true);      // a letter typed in the box is just a letter
    await page.fill('#input', '');
    await page.locator('#bSide').focus(); await page.keyboard.press('b'); assert.equal(await compact(), false);
    await page.setViewportSize({ width: 950, height: size.height }); await page.waitForFunction(() => document.querySelector('.app').classList.contains('compact'));
    await page.click('#bSide'); assert.equal(await compact(), false);                                    // you can still ask for the full one
    await page.setViewportSize(size); assert.equal(await compact(), false);
    await page.click('#bSide'); await page.click('#bSide'); assert.equal(await compact(), false);
    assert.equal(await page.evaluate(() => localStorage.getItem('ww.side')), 'auto');
  } finally { await page.setViewportSize(size); await page.evaluate(() => localStorage.removeItem('ww.side')); }
});

ui('window: Settings is one size on every tab, Profiles too', async () => {
  await page.evaluate(() => openSettings(0));          // not by the gear: the next test's click on it would land inside its double-click guard
  const sizes = [];
  for (const t of await page.locator('#stabs [data-st]').all()) { await t.click(); const b = await page.locator('#dlg').boundingBox(); sizes.push(`${b.width}x${b.height}`); }
  assert.deepEqual([...new Set(sizes)], ['760x540']);
  await page.keyboard.press('Escape'); await page.waitForSelector('#sdim', { state: 'hidden' });
});

ui('window: Settings, Profiles: add a profile by signing in, rename it in place, remove it after a question', async () => {
  await page.click('#bGear'); await page.click('#gAll'); await page.click('#stabs [data-st="1"]');
  await page.click('#spage .pfr[data-psel="live"]');
  await page.waitForSelector('#spage .pfd[data-p="live"] [data-pe="ask"][disabled]');      // the active one cannot be removed
  await page.click('#spage [data-padd]');
  await page.fill('#sNew', 'UI Extra'); await page.press('#sNew', 'Enter');
  await page.waitForSelector('#lgx .xterm');
  await page.waitForSelector('.lgbar b:has-text("Add ui-extra")');
  await page.waitForFunction(() => document.querySelector('#lgx .xterm-rows')?.innerText.includes('paste the code'));
  await page.keyboard.type('good'); await page.keyboard.press('Enter');
  await page.waitForSelector('#lgNote:has-text("ui-extra is added")');
  await page.click('#lgBack');
  await page.waitForSelector('#spage .pfd[data-p="ui-extra"]');                               // the new one opens
  await page.click('#spage .pfd [data-pe="rename"]');
  await page.fill('#sRen', 'ui-renamed'); await page.press('#sRen', 'Escape');                // Escape keeps the name, and the dialog
  await page.waitForSelector('#spage .pfd[data-p="ui-extra"] [data-pe="rename"]'); assert.equal(await page.isVisible('#sdim'), true);
  await page.click('#spage .pfd [data-pe="rename"]');
  await page.fill('#sRen', 'ui-renamed'); await page.press('#sRen', 'Enter');
  await page.waitForSelector('#spage .pfd[data-p="ui-renamed"]');
  await page.click('#spage .pfd [data-pe="ask"]');
  await page.waitForSelector('#spage .sconf:has-text("Remove ui-renamed?")');
  await page.click('#spage .sconf [data-pe="cancel"]');
  await page.click('#spage .pfd [data-pe="ask"]');
  await page.click('#spage .sconf [data-pe="remove"]');
  await page.waitForFunction(() => !document.querySelector('#spage .pfr[data-psel="ui-renamed"]'));
  assert.ok(!fs.existsSync(path.join(sb.home, '.claude-profiles', 'ui-renamed')));
  await page.click('#dClose');
});

ui('window: Settings, Profiles: a profile\'s problems with what to do, its own defaults, and the default for new sessions', async () => {
  await page.click('#bGear'); await page.click('#gAll'); await page.click('#stabs [data-st="1"]');
  // "full" has used its 5 hours: it says so, and when it is the default, offers to start new sessions elsewhere
  await svc.call('settings', { defaultProfile: 'full' });
  await page.click('#spage .pfr[data-psel="full"]');
  await page.waitForSelector('#spage .pfr[data-psel="full"] small.bad:has-text("5-hour limit reached")');
  await page.waitForSelector('#spage .pb.bad:has-text("5-hour limit reached") [data-fix="mkdef"]');
  await page.click('#spage .pb [data-fix="mkdef"]');
  await until(async () => { const d = (await state()).prefs.defaultProfile; return d && d !== 'full'; }, 'another default');
  // a failed turn shows on its profile until dismissed
  await idle(await newSession('BREAK it', 'other'));
  await page.click('#spage .pfr[data-psel="other"]');
  await page.waitForSelector('#spage .pb.warn:has-text("The last turn failed")');
  await page.click('#spage .pb [data-fix="dismiss"]');
  await page.waitForFunction(() => !document.querySelector('#spage .pb.warn'));
  // its own model, written into its settings.json
  const file = path.join(sb.home, '.claude-profiles', 'other', 'settings.json'), had = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  try {
    await page.waitForSelector('#sModel:not([disabled])');
    await page.selectOption('#sModel', 'claude-sonnet-5-5');
    await until(() => { try { return JSON.parse(fs.readFileSync(file, 'utf8')).model === 'claude-sonnet-5-5'; } catch { return false; } }, 'the model to be saved');
  } finally { if (had == null) fs.rmSync(file, { force: true }); else fs.writeFileSync(file, had); }
  // new sessions start here
  await page.click('#spage .pfr[data-psel="live"]'); await page.click('#spage [data-fix="mkdef"][data-name="live"]');
  await until(async () => (await state()).prefs.defaultProfile === 'live', 'the default profile');
  await page.click('#spage .pfr[data-psel="other"]'); await page.click('#spage [data-fix="mkdef"][data-name="other"]');
  await until(async () => (await state()).prefs.defaultProfile === 'other', 'the default profile');
  await page.waitForSelector('#spage .pfr[data-psel="other"] .pstar');
  await page.click('#dClose');
});

ui('window: the settings dialog: tabs, default profile for new sessions, sign in again from the Profiles tab', async () => {
  await page.click('#bGear'); await page.click('#gAll');
  await page.waitForSelector('#spage .pgh:has-text("General")');
  await page.selectOption('#sLang', 'german');
  await page.selectOption('#sDays', '14'); await until(async () => (await state()).prefs.doneDays === 14, 'the clearing time to be saved'); await page.selectOption('#sDays', '7');
  await until(async () => { const p = (await state()).prefs; return p.defaultProfile === 'other' && p.language === 'german'; }, 'the settings to be saved');
  await page.fill('#sFolders', '/nowhere/at/all'); await page.press('#sFolders', 'Enter');
  await page.waitForSelector('text=There is no folder at');
  await page.fill('#sFolders', '~/workspace; ~/.claude'); await page.press('#sFolders', 'Enter');
  await until(async () => (await state()).prefs.folders.length === 2, 'the project folders to be saved');
  await page.waitForFunction(() => document.querySelector('#sFolders')?.value.includes('workspace') && document.activeElement?.id !== 'sFolders'); await sleep(200);
  await page.click('#sFolders'); await page.fill('#sFolders', ''); await page.press('#sFolders', 'Enter');
  await until(async () => (await state()).prefs.folders.length === 0, 'the project folders to be cleared');
  await page.click('#stabs [data-st="3"]');
  await page.waitForSelector('#spage .srow:has-text("Claude Code") .sstate:has-text("2.1.322")');
  await page.click('#stabs [data-st="2"]');
  await page.waitForSelector('#spage .srow:has-text("/code-review")');
  await page.click('#stabs [data-st="1"]');
  await page.click('#spage .pfr[data-psel="full"]');
  await page.click('#spage .pfd [data-login="full"]');
  await page.waitForSelector('#lgx .xterm');
  await page.waitForFunction(() => document.querySelector('#lgx .xterm-rows')?.innerText.includes('paste the code'));
  // the sign-in page opens in the browser itself, not an empty window first (Windows was handed about:blank)
  await page.evaluate(() => { window.wwOpened = []; window.wwOpen = window.open; window.open = u => { window.wwOpened.push(u); return null; }; });
  await page.click('#lgOpen');
  assert.deepEqual(await page.evaluate(() => window.wwOpened), ['https://claude.example/oauth/authorize?code=true&state=s1']);
  await page.evaluate(() => { window.open = window.wwOpen; });
  assert.equal(await page.isVisible('#lgCopy'), true);
  // the note sits under the title, not squeezed into a column beside the buttons
  const lg = await page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); return { note: r('lgNote'), open: r('lgOpen'), back: r('lgBack') }; });
  assert.ok(lg.note.height < 40 && lg.note.width > 150, `the note is a line or two: ${JSON.stringify(lg.note)}`);
  assert.ok(lg.open.height < 34 && Math.abs(lg.open.top - lg.back.top) < 2, 'the buttons stay on one line');
  await page.click('#lgx .xterm');
  await page.keyboard.type('good'); await page.keyboard.press('Enter');
  await page.waitForSelector('#lgNote:has-text("Signed in")');
  await page.click('#lgBack');
  await page.waitForSelector('#spage .pfd[data-p="full"]');
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

ui('window: a session whose history ends signed out offers the sign-in, though no turn is in memory', async () => {
  await page.keyboard.press('Escape');
  await svc.call(`sessions/${sb.sessions.signedOut}/done`, { on: false });   // cleared as quiet by now: back to the inbox
  await page.click(`.sess[data-id="${sb.sessions.signedOut}"]`);
  await page.waitForSelector('.sys:has-text("other was signed out")');
  await page.waitForSelector('#qcard:has-text("other is signed out") [data-signin="other"]');
  assert.equal(await page.isVisible('#box'), false);
  await page.click('#qcard [data-act="dismiss"]');
  await page.waitForSelector('#box', { state: 'visible' });
  assert.equal(await page.isHidden('#qcard'), true);
});

ui('window: a sent message shows at once, before the service answers, and comes back to the box if it could not be sent', async () => {
  await page.keyboard.press('Escape');
  await startNew('quick first'); await page.waitForSelector('.ai:has-text("Echo: quick first")'); await page.waitForSelector('#send[data-tip="Send"]');
  await page.route('**/api/sessions/*/send', async r => { await sleep(700); await r.continue().catch(() => {}); });   // the test may have moved on (and unrouted) by then
  await send('shown straight away');
  await page.waitForSelector('#thread [data-k="pend"]:has-text("shown straight away")', { timeout: 400 });
  assert.equal(await page.inputValue('#input'), '');
  await page.waitForSelector('.ai:has-text("Echo: shown straight away")');
  assert.equal(await page.locator('#thread [data-k="pend"]').count(), 0);
  assert.equal(await page.locator('.me:has-text("shown straight away")').count(), 1);
  await page.unroute('**/api/sessions/*/send'); await page.waitForSelector('#send[data-tip="Send"]');
  await page.route('**/api/sessions/*/send', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"The service is not answering."}' }));
  await send('never arrives');
  await page.waitForSelector('#oops:has-text("The service is not answering.")');
  assert.equal(await page.inputValue('#input'), 'never arrives');
  assert.equal(await page.locator('.me:has-text("never arrives")').count(), 0);
  await page.unroute('**/api/sessions/*/send'); await page.fill('#input', '');
});

ui('window: an answered card goes at once, and comes back if the answer could not be sent', async () => {
  await startNew('ASK me something');
  await page.waitForSelector('#qcard .qopt');
  await page.route('**/api/sessions/*/answer', r => r.fulfill({ status: 500, contentType: 'application/json', body: '{"error":"The service is not answering."}' }));
  await page.click('.qopt:has-text("Dark")'); await page.click('[data-act=next]'); await page.click('.qopt:has-text("Tests")'); await page.click('[data-act=send]');
  await page.waitForSelector('#oops:has-text("The service is not answering.")');
  await page.waitForSelector('#qcard .qopt');                                // back, with nothing lost
  await page.unroute('**/api/sessions/*/answer');
  await page.route('**/api/sessions/*/answer', async r => { await sleep(700); await r.continue().catch(() => {}); });   // the test may have moved on (and unrouted) by then
  await page.click('#qcard [data-act=send]');
  await page.waitForSelector('#qcard', { state: 'hidden', timeout: 400 });
  await page.waitForSelector('#thread [data-k="working"]');
  await page.unroute('**/api/sessions/*/answer');
  await page.waitForSelector('#send[data-tip="Send"]');
});

test('sandbox containment', () => {
  assert.deepEqual(assertContained(sb), []);
  assert.ok(sb.home.startsWith(fs.realpathSync(os.tmpdir())));
});

ui('window: a warm cache shows as a small clock by the session and in the composer; past it, a countdown and then a warning above the message box', async () => {
  const shots = process.env.WORKWOOD_SHOTS, shot = async (n, clip) => { if (shots) { fs.mkdirSync(shots, { recursive: true }); await page.screenshot({ path: path.join(shots, n + '.png'), ...(clip ? { clip } : {}) }); } };
  await page.keyboard.press('Escape');
  await page.mouse.move(700, 400);
  const id = await page.evaluate(() => A.sessions.find(s => s.status === 'idle' && !s.done && !s.outside && !s.term && document.querySelector(`.sess[data-id="${s.id}"]`))?.id);
  assert.ok(id, 'an idle session in the inbox');
  const row = `.sess[data-id="${id}"]`;
  await page.click(row); await page.mouse.move(700, 400);
  await page.waitForFunction(id => V.sel === id && V.context && !V.loading, id);
  // as if its last reply came `min` minutes ago (applied again until it shows: a state pushed in between brings the real time back)
  const at = (min, sel) => page.waitForFunction(([id, min, sel]) => { const t = Date.now() - min * 60000, s = A.sessions.find(x => x.id === id);
    let set = true;
    if (!s.reply || Math.abs(s.reply.at - t) > 60000) { s.reply = { at: t, ttl: 3600 }; renderList(); set = false; }
    if (Math.abs(V.context.at - t) > 60000) { V.context.at = t; renderStrip(); set = false; }
    return set && !!document.querySelector(sel); }, [id, min, sel], { polling: 200 });
  // warm: a clock by the session and in the composer, its tooltip saying what it means; no strip
  await at(22, `${row} .wdial`);
  await page.waitForSelector('#cWarm .wdial');
  assert.equal(await page.isHidden('#hstrip'), true);
  assert.match(await page.getAttribute(`${row} .wdial`, 'data-tip'), /^Cache warm · 38 min left$/);
  await page.hover(`${row} .wdial`);
  await page.waitForTimeout(700);
  const list = await page.locator('#list').boundingBox();
  await shot('warm-list', { x: list.x, y: list.y, width: list.width, height: Math.min(list.height, 360) });
  await page.mouse.move(700, 400);
  await page.hover('#cWarm .wdial'); await page.waitForTimeout(700);
  const sup = await page.locator('#box').boundingBox();
  await shot('warm-composer', { x: sup.x - 30, y: sup.y - 90, width: sup.width + 60, height: sup.height + 140 });
  await page.mouse.move(700, 400);
  // eight minutes left: the quiet countdown too
  await at(52, '#hstrip.cache:not(.expired)');
  assert.match(await page.locator('#hstrip').innerText(), /Cache cools in 8 min/);
  assert.equal(await page.locator('#hstrip [data-hgo]').count(), 0);
  await page.waitForTimeout(400);
  const box = await page.locator('#hstrip').boundingBox(), clip = { x: box.x - 30, y: box.y - 20, width: box.width + 60, height: box.height + 140 };
  await shot('countdown-strip', clip);
  // two hours: no clock anywhere (cold is the usual state), and the warning with the handoff
  await at(120, '#hstrip.expired');
  assert.equal(await page.locator(`${row} .wdial`).count(), 0);
  assert.equal(await page.isHidden('#cWarm'), true);
  assert.match(await page.locator('#hstrip').innerText(), /Cache likely expired\s*· idle 2 h · your next message re-reads \d+k tokens/);
  assert.equal(await page.locator('#hstrip [data-hgo]').count(), 1);
  await page.waitForTimeout(400);
  await shot('expired-strip', clip);
  // × hides it until the next reply
  await page.click('#hstrip [data-cx]');
  assert.equal(await page.isHidden('#hstrip'), true);
  // the setting: no warning and no clock at all
  await svc.call('settings', { cacheMinutes: 0 });
  await page.waitForFunction(() => A.prefs.cacheMinutes === 0);
  await at(22, 'body');
  await page.waitForFunction(r => !document.querySelector(r + ' .wdial') && !document.querySelector('#cWarm .wdial'), row);
  await svc.call('settings', { cacheMinutes: 60 });
  await page.waitForFunction(() => A.prefs.cacheMinutes === 60);
});
