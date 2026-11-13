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
    browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox'] });
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

/* ---------- last: nothing leaked out of the sandbox ---------- */

test('sandbox containment', () => {
  assert.deepEqual(assertContained(sb), []);
  assert.ok(sb.home.startsWith(os.tmpdir()));
});
