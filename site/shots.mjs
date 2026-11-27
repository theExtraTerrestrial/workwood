// The pictures on the website's features grid and in the README: site/shots/<name>-dark.jpg and -light.jpg.
// They are the app itself, run as the tests run it (tests/sandbox.mjs): a throwaway home with made-up projects
// and a scripted stand-in for `claude`, so nothing of yours shows. Needs the headless Chromium the window tests use.
//     npm run shots              all of them
//     npm run shots -- wall,rewind   only those
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeSandbox, startService, removeSandbox } from '../tests/sandbox.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'site', 'shots');
const ONLY = (process.argv[2] || '').split(',').filter(Boolean);
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 10000) {
  const end = performance.now() + ms; let last;
  while (performance.now() < end) { try { last = await fn(); if (last) return last; } catch (e) { last = e; } await sleep(80); }
  throw new Error('timed out waiting for ' + what + (last instanceof Error ? ': ' + last.message : ''));
}
function findChrome() {
  if (process.env.WORKWOOD_CHROME) return process.env.WORKWOOD_CHROME;
  const root = path.join(os.homedir(), ...(process.platform === 'darwin' ? ['Library', 'Caches'] : ['.cache']), 'ms-playwright');
  const rels = ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux/chrome', 'chrome-linux64/chrome',
    'chrome-headless-shell-mac-arm64/chrome-headless-shell', 'chrome-headless-shell-mac-x64/chrome-headless-shell'];
  try { for (const d of fs.readdirSync(root).sort().reverse()) for (const rel of rels) { const p = path.join(root, d, rel); if (fs.existsSync(p)) return p; } } catch {}
  return null;
}
const chrome = findChrome();
if (!chrome) { console.error('No Chromium found; run: npx playwright install chromium-headless-shell (or set WORKWOOD_CHROME)'); process.exit(1); }
const { chromium } = await import('playwright-core');

/* ---------- a believable sandbox: four projects and a few finished sessions ---------- */
const sb = makeSandbox();
fs.rmSync(path.join(sb.home, '.claude', 'projects'), { recursive: true, force: true });   // not the tests' own sessions
fs.writeFileSync(sb.agents, '[]');
for (const p of ['storefront', 'docs-site', 'billing-api', 'mobile-app']) { sb.projects[p] = path.join(sb.home, 'workspace', p); fs.mkdirSync(sb.projects[p], { recursive: true }); }
// dictation hears a sentence, a little more of it the longer you speak
const stt = path.join(sb.root, 'stt.mjs');
fs.writeFileSync(stt, `const W = 'also make the sort dropdown remember the last choice for each collection'.split(' ');
export default async audio => W.slice(0, Math.min(W.length, 3 + Math.floor(audio.length / 9000))).join(' ');\n`);
sb.env.WORKWOOD_STT = stt;

const ACC = { live: '11111111-1111-4111-8111-111111111111', other: '22222222-2222-4222-8222-222222222222' };
let counter = 0;
function conv(project, turns, ageSeconds, owner = 'live') {
  const id = `10000000-0000-4000-8000-${String(++counter).padStart(12, '0')}`;
  const cwd = sb.projects[project], dir = path.join(sb.home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'));
  const lines = [{ type: 'session-owner', accountUuid: ACC[owner], sessionId: id }];
  let parent = null;
  turns.forEach(([prompt, reply], i) => {
    const base = { cwd, sessionId: id, timestamp: new Date(Date.now() - (ageSeconds + (turns.length - i) * 240) * 1000).toISOString(), version: '2.1.322', gitBranch: 'main', isSidechain: false, userType: 'external' };
    lines.push({ ...base, type: 'user', uuid: `${id}-u${i}`, parentUuid: parent, message: { role: 'user', content: prompt } },
      { ...base, type: 'assistant', uuid: `${id}-a${i}`, parentUuid: `${id}-u${i}`, message: { role: 'assistant', model: 'claude-opus-5-5', content: [{ type: 'text', text: reply }], usage: { input_tokens: 52000 + i * 9000, output_tokens: 1800 } } },
      { ...base, type: 'system', subtype: 'turn_duration', durationMs: 60000 + i * 47000, uuid: `${id}-s${i}` });
    parent = `${id}-s${i}`;
  });
  const file = path.join(dir, id + '.jsonl');
  fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(file, lines.map(l => JSON.stringify(l)).join('\n') + '\n');
  const t = new Date(Date.now() - ageSeconds * 1000); fs.utimesSync(file, t, t);
  return id;
}
const sf = sb.projects.storefront, design = path.join(sf, 'design');
fs.mkdirSync(design, { recursive: true });
const ITEMS = ['#d9a066 Wool scarf €39', '#7a8b6f Field jacket €129', '#b85c38 Clay mug €18', '#3d5a80 Linen shirt €59', '#e0c097 Canvas tote €25', '#5c4b51 Knit beanie €22',
  '#8d6a9f Candle set €31', '#2f4f4f Rain boots €89', '#c9a227 Honey jar €12', '#6b8f71 Plant pot €27', '#a44a3f Leather belt €45', '#4a6fa5 Denim cap €19'];
fs.writeFileSync(path.join(design, 'product-grid.html'), `<!doctype html><meta charset=utf-8><style>body{margin:0;font:15px system-ui;background:#f6f4ef;color:#222}header{padding:22px 32px;font-weight:700;font-size:20px}main{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;padding:0 32px 32px}.c{background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px #0001}.i{height:150px}.c p{margin:10px 14px 4px;font-weight:600}.c span{display:block;margin:0 14px 14px;color:#777}</style><header>Autumn collection</header><main>${ITEMS.map(x => { const [c, ...n] = x.split(' '); const p = n.pop(); return `<div class=c><div class=i style="background:${c}"></div><p>${n.join(' ')}</p><span>${p}</span></div>`; }).join('')}</main>`);
const S = {
  grid: conv('storefront', [
    ['The product grid feels slow on the collection page. Can you find out why and fix it?',
      'The grid was re-rendering every card whenever the filter bar changed, because each card received a fresh `onSelect` closure.\n\nI moved the handler up and memoised the card, so a filter change now renders only the cards whose data changed:\n\n```tsx\nconst ProductCard = memo(function ProductCard({ product, onSelect }: Props) {\n  return (\n    <button className="card" onClick={() => onSelect(product.id)}>\n      <img src={product.image} alt="" loading="lazy" />\n      <p>{product.name}</p>\n    </button>\n  );\n});\n```\n\nOn a 400-item collection the filter now responds in about 40 ms instead of 600 ms.'],
    ['Nice. Can you also mock up a denser grid layout?',
      'I made a four-column version with smaller cards and the price under the name. It is in `design/product-grid.html`, and a screenshot of it is in `design/product-grid.png`. I left the old layout alone.\n\nThe cards keep their 12 px radius. Only the gap shrinks, from 24 px to 18 px.'],
    ['Looks good. Add the sort dropdown next to the filters.',
      'Done. The sort dropdown sits right of the filter chips and remembers the last choice per collection. It offers Newest, Price low to high, Price high to low and Bestselling.\n\nThe grid keeps its scroll position when the sort changes, so people do not lose their place in a long collection.'],
  ], 1500),
  docs: conv('docs-site', [['Write a getting-started page for the CLI', 'The page is at `docs/getting-started.md`. It covers install, first login and the three commands people need on day one.']], 5400),
  billing: conv('billing-api', [['Why do some invoices round to the wrong cent?', 'Taxes were rounded per line and then summed. They now round once on the total, as the tax office expects. I added tests for the three invoices from the bug report.']], 9000, 'other'),
  mobile: conv('mobile-app', [['Add pull to refresh on the orders screen', 'Pull to refresh is in. It reuses the existing orders query and shows the native spinner on both platforms.']], 20000),
  export: conv('billing-api', [['Add an endpoint to export invoices as CSV', 'GET /invoices/export streams a CSV with one row per invoice line. It takes the same filters as the list endpoint.']], 30000, 'other'),
};

const PORT = 47000 + Math.floor(Math.random() * 900), INNER = PORT + 1000;
const svc = await startService(sb, { WORKWOOD_PHONE_DIR: path.join(sb.root, 'phone'), WORKWOOD_PHONE_PORT: String(PORT), WORKWOOD_PHONE_INNER: String(INNER),
  WORKWOOD_PHONE_HOST: '127.0.0.1', WORKWOOD_PHONE_WSL: '1', WORKWOOD_PREVIEW_KEY: 'shots' });
const call = svc.call;
const browser = await chromium.launch({ executablePath: chrome, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
const page = await ctx.newPage(); page.setDefaultTimeout(10000);
fs.mkdirSync(OUT, { recursive: true });

// the picture of product-grid.html the agent "made"
{ const t = await ctx.newPage(); await t.setViewportSize({ width: 1100, height: 700 }); await t.goto('file://' + path.join(design, 'product-grid.html'));
  await t.screenshot({ path: path.join(design, 'product-grid.png') }); await t.close(); }

const state = () => new Promise((resolve, reject) => {
  fetch(new URL('/api/events?token=test-token', svc.address)).then(async r => { const reader = r.body.getReader(); let buf = '';
    for (;;) { const { value } = await reader.read(); buf += new TextDecoder().decode(value); const m = buf.match(/event: state\ndata: (.*)\n\n/); if (m) { reader.cancel(); return resolve(JSON.parse(m[1])); } } }, reject);
});
const session = id => call('sessions/' + id).then(r => r.body);
async function newSession(project, text, title) {
  const r = await call('sessions', { cwd: sb.projects[project], profile: 'live', text });
  if (r.status !== 200) throw new Error(JSON.stringify(r.body));
  await until(async () => (await call(`sessions/${r.body.sessionId}/rename`, { title })).status === 200, 'the session to be saved');
  return r.body.sessionId;
}
const open = async id => { await page.click(`.sess[data-id="${id}"]`); await page.waitForFunction(id => V.sel === id && !V.loading, id); };
// the sandbox's folder reads as ~ in a hover note's path
const tidy = p => p.evaluate(h => { for (const d of document.querySelectorAll('#tip .dir')) if (d.textContent.includes(h)) d.textContent = d.textContent.split(h).join('~'); }, sb.home);

// A box around what the picture is about, grown to `ratio` (width / height) and kept inside the window.
async function around(p, sels, { pad = 40, ratio = 1.6, min = 0 } = {}) {
  const boxes = (await Promise.all(sels.map(s => p.locator(s).first().boundingBox()))).filter(Boolean);
  const vw = p.viewportSize().width, vh = p.viewportSize().height;
  let x1 = Math.min(...boxes.map(b => b.x)) - pad, y1 = Math.min(...boxes.map(b => b.y)) - pad;
  let x2 = Math.max(...boxes.map(b => b.x + b.width)) + pad, y2 = Math.max(...boxes.map(b => b.y + b.height)) + pad;
  let w = Math.max(x2 - x1, min), h = y2 - y1;
  if (w / h < ratio) w = h * ratio; else h = w / ratio;
  w = Math.min(w, vw); h = Math.min(h, vh);
  const cx = (x1 + x2) / 2, cy = (y1 + y2) / 2;
  const x = Math.max(0, Math.min(vw - w, cx - w / 2)), y = Math.max(0, Math.min(vh - h, cy - h / 2));
  return { x, y, width: w, height: h };
}
// Each picture twice, in the dark and the light theme, the same moment.
async function both(name, clip, p = page) {
  for (const t of ['dark', 'light']) {
    await p.evaluate(t => setTheme(t), t); await sleep(700);
    await p.screenshot({ path: path.join(OUT, `${name}-${t}.jpg`), type: 'jpeg', quality: 86, ...(clip ? { clip: typeof clip === 'function' ? await clip() : clip } : {}) });
  }
  await p.evaluate(() => setTheme('dark'));
  console.log('  ' + name);
}
const shot = async (name, fn) => { if (ONLY.length && !ONLY.includes(name)) return; try { await fn(); } catch (e) { console.error(`  ${name} FAILED: ${e.message.split('\n')[0]}`); process.exitCode = 1; } };

await until(async () => (await state()).fresh, 'the first full load');
await page.goto(svc.address + '#' + S.grid);
await page.waitForSelector('.me');
await page.evaluate(() => localStorage.setItem('ww.bg.home', 'constel'));
console.log('Taking shots into ' + path.relative(ROOT, OUT));

await shot('previews', async () => {
  await open(S.grid);
  const link = page.locator('.ai :text("design/product-grid.png")').first();
  await link.scrollIntoViewIfNeeded(); await link.click();
  await page.waitForSelector('#pvw:not([hidden]), #stage img', { state: 'attached' }); await sleep(1200);
  await both('previews', { x: 560, y: 0, width: 880, height: 550 });
  await page.keyboard.press('Escape'); await sleep(300);
  await page.locator('.ai :text("design/product-grid.png")').first().hover(); await sleep(1200); await tidy(page);
  await both('paths', () => around(page, ['.ai :text("design/product-grid.png")', '#tip'], { pad: 30 }));
  await page.mouse.move(1300, 120);
});

await shot('drafts', async () => {
  await open(S.grid); await page.fill('#input', 'Also check the grid on small screens before we ship');
  await open(S.docs); await page.fill('#input', 'Add a section on signing in with SSO');
  await open(S.billing); await page.mouse.move(900, 500); await sleep(300);
  const side = await page.locator('#list').boundingBox();
  await both('drafts', { x: 0, y: side.y, width: side.x + side.width, height: (side.x + side.width) / 1.6 });
  await page.fill('#input', '');
});

await shot('rewind', async () => {
  await open(S.grid);
  await page.hover('.me >> nth=1'); await page.click('.me >> nth=1 >> .rwb');
  await page.waitForSelector('#rwm:not([hidden])'); await sleep(300);
  await both('rewind', () => around(page, ['#rwm', '.me >> nth=1', '.rwcut'], { pad: 36 }));
  await page.keyboard.press('Escape');
});

await shot('read', async () => {
  await open(S.grid);
  await page.fill('#input', '');                                                     // Space pauses only with the box empty
  await page.locator('.tfoot [data-ra]').last().scrollIntoViewIfNeeded();
  await page.click('.tfoot [data-ra] >> nth=-1');
  await page.waitForSelector('#hstrip.ply'); await page.waitForFunction(() => CSS.highlights.get('ra-now'));
  await page.focus('#input'); await page.keyboard.press('Space');                    // paused, so the lit sentence stays
  await page.waitForSelector('#hstrip [data-ra-pp][data-tip="Play"]');
  await page.keyboard.press('ArrowRight'); await sleep(150); await page.keyboard.press('Space'); await sleep(120); await page.keyboard.press('Space');
  await page.mouse.move(1300, 120); await sleep(300);
  await both('read', () => around(page, ['.ai >> nth=-1', '#hstrip', '#box'], { pad: 30 }));
  await page.keyboard.press('Escape');
});

await shot('handoff', async () => {
  await open(S.grid);
  await page.click('#pCtx'); await page.waitForSelector('#mCtx [data-handoff]');
  await page.mouse.move(300, 120); await sleep(600);                                  // no hover note over the menu
  await both('handoff', () => around(page, ['#mCtx', '#box'], { pad: 40 }));
  await page.keyboard.press('Escape');
});

await shot('dictation', async () => {
  await open(S.grid);
  await page.fill('#input', 'Great.');
  await page.click('#mic'); await page.waitForSelector('#box.rec');
  await page.waitForFunction(() => /remember/.test(document.getElementById('input').value), null, { timeout: 15000 });
  await page.mouse.move(1300, 120);
  await both('dictation', () => around(page, ['.ai >> nth=-1', '#box'], { pad: 30 }));
  await page.keyboard.press('Escape'); await page.waitForSelector('#box:not(.rec)'); await page.fill('#input', '');
});

await shot('phone', async () => {
  await call('phone/on', { on: true });
  // as the Windows window does: it reports the PC's address and keeps the port open, again and again
  await until(async () => { await call('phone/relay', { ips: ['192.168.1.24'], name: 'DESKTOP-HOME', listening: true });
    const s = (await call('phone')).body; return s.listening && s.url; }, 'the phone port', 30000);
  const code = new URL((await call('phone')).body.url).searchParams.get('pair');
  const pctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, ignoreHTTPSErrors: true });
  const pp = await pctx.newPage(); pp.setDefaultTimeout(10000);
  try {
    await pp.goto(`https://127.0.0.1:${INNER}/?pair=${code}`);
    await pp.waitForSelector('html.ph[data-pt=home]'); await sleep(1200);
    await both('phone', null, pp);
    await pp.click('[data-pt=sessions]'); await pp.click(`.sess[data-id="${S.grid}"]`);
    await pp.waitForSelector('html[data-pt=session]'); await pp.waitForFunction(() => !V.loading && V.items.length); await sleep(1000);
    await both('phone-session', null, pp);
  } finally { await pctx.close(); }
  // the two side by side, a landscape picture for the README's table
  const pair = await ctx.newPage();
  try {
    await pair.setViewportSize({ width: 640, height: 400 });
    for (const t of ['dark', 'light']) {
      const bg = t === 'dark' ? 'radial-gradient(420px 260px at 0 0,hsl(168 62% 30%/.38),transparent 70%),linear-gradient(172deg,hsl(168 26% 12%),#101114)'
        : 'radial-gradient(420px 260px at 0 0,hsl(168 72% 78%/.7),transparent 70%),linear-gradient(172deg,hsl(168 40% 91%),#eceef2)';
      const img = n => `<img src="data:image/jpeg;base64,${fs.readFileSync(path.join(OUT, n + '-' + t + '.jpg')).toString('base64')}" style="height:520px;border-radius:26px;box-shadow:0 18px 50px rgba(0,0,0,.45)">`;
      await pair.setContent(`<body style="margin:0;height:400px;overflow:hidden;background:${bg};display:flex;gap:28px;justify-content:center;padding-top:30px">${img('phone')}${img('phone-session')}</body>`);
      await pair.waitForFunction(() => [...document.images].every(i => i.complete && i.naturalWidth));
      await pair.screenshot({ path: path.join(OUT, `phones-${t}.jpg`), type: 'jpeg', quality: 86 });
    }
    console.log('  phones');
  } finally { await pair.close(); }
});

await shot('wall', async () => {
  const perm = await newSession('storefront', 'PERMISSION', 'Clear the image cache before the deploy');
  const q = await newSession('docs-site', 'POINTED', 'Pick a landing page direction');
  const two = await newSession('mobile-app', 'ASK', 'Plan the onboarding screens');
  await newSession('billing-api', 'Summarise the refund flow', 'Summarise the refund flow');
  for (const id of [perm, q, two]) await until(async () => (await session(id)).run?.pending, 'a card');
  await page.click('#newBtn'); await page.click('#dseg [data-hv="wall"]'); await page.waitForSelector('#main.wall');
  await page.waitForSelector(`#now .nc.ask[data-nid="${perm}"]`);
  await page.mouse.move(900, 600); await sleep(1500);
  await both('wall-full');                                                            // the README's opening picture
  const m = await page.locator('#main').boundingBox();
  await both('wall', { x: m.x, y: m.y + m.height - m.width / 2.6, width: m.width, height: m.width / 2.6 });
});

await browser.close(); svc.stop();
if (!process.env.KEEP_SANDBOX) removeSandbox(sb);
console.log('Done.');
