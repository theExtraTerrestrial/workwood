// The website's stand-in for the Workwood service. The window on the page is the app's own page (ui/),
// unchanged; this file answers its calls and sends it events the way service/server.mjs does, playing
// a scripted morning. Nothing here talks to a server. It is loaded before ui/app.js.
//   ?scene=hero (default) | answer | limit | terminal     which part of the story the window opens on
(() => {
  const HOME = '/home/you', WS = HOME + '/workspace';
  const scene = new URLSearchParams(location.search).get('scene') || 'hero';
  const nowS = () => Math.floor(Date.now() / 1000), iso = () => new Date().toISOString();
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  let touched = false;   // once the visitor uses the window, the story stops playing by itself
  for (const t of ['pointerdown', 'keydown', 'wheel']) addEventListener(t, e => { if (e.isTrusted) touched = true; }, { capture: true, passive: true });

  /* ---------- what the service would know ---------- */
  const prof = (name, h5, d7, more = {}) => ({ name, global: false, email: `you@${name}.example`, org: 'Personal', plan: 'max', lapsed: false, h5, d7,
    r5: nowS() + 1700, r7: nowS() + 400000, at: nowS(), reading: false, failed: null, stop: null, ...more });
  const profiles = [prof('work', 34, 41, { global: true, org: 'Team' }), prof('personal', 100, 72), prof('side', 12, 20)];
  const projects = ['shop', 'api'].map(name => ({ cwd: `${WS}/${name}`, name, recent: true }));
  const prefs = { defaultProfile: null, language: null, folders: [], doneDays: 7, bypass: false };
  const S = new Map();   // id -> session
  let seq = 0;
  const tool = (group, verb, past, what, more = {}) => ({ group, verb, past, what, ...more });
  const read = f => tool('read', 'Reading', 'Read', f), write = f => tool('edit', 'Writing', 'Wrote', f), edit = f => tool('edit', 'Editing', 'Edited', f);
  const cmd = (what, c) => tool('run', 'Running', 'Ran', what, { cmd: c });
  const page = (dir, name) => ({ path: `${WS}/${dir}/${name}`, name, kind: 'page', v: 1, ts: iso() });

  function session(id, project, title, { profile = 'work', branch = 'main', age = 0, past = [], script = [], outside = false } = {}) {
    const s = { id, title, project, cwd: `${WS}/${project}`, root: `${WS}/${project}`, branch, profile, mts: nowS() - age, outside, unread: false, done: false,
      items: [], run: null, script, at: 0, n: seq += 1000 };
    for (const step of past) apply(s, step, true);
    S.set(id, s); return s;
  }

  /* ---------- the story ---------- */
  session('changelog', 'shop', 'Add a changelog', { age: 7200, past: [['user', 'Add a changelog for the last three releases.'], ['tools', [read('git log'), write('CHANGELOG.md')]],
    ['say', 'The changelog is in `CHANGELOG.md`, with one section per release.'], ['done', 192000]] });
  session('invoice', 'shop', 'Invoice PDF export', { branch: 'invoice-pdf', age: 40, past: [['user', 'Customers need their invoices as PDF. Add an export button to the invoice page.'], ['start']],
    script: [['tool', read('invoice.rb'), 1500], ['tool', edit('invoice_pdf.rb'), 3200], ['tool', edit('invoice.html.erb'), 2600], ['tool', cmd('Run the invoice tests', 'bundle exec rspec spec/invoice_spec.rb'), 5200],
      ['say', 'Invoices can now be saved as PDF: there is an **Export PDF** button on the invoice page, and the 9 invoice tests pass.'], ['done']] });
  session('checkout', 'shop', 'Checkout redesign', { branch: 'checkout-v2', past: [['user', 'Redesign the checkout header. Make two versions I can compare.'], ['start']],
    script: [['say', 'I will build two versions of the header so you can look at both.'], ['tool', read('checkout.html'), 1100], ['tool', write('compact.html'), 1500], ['tool', write('tall.html'), 1500],
      ['work', [page('shop/mockups', 'compact.html'), page('shop/mockups', 'tall.html')]],
      ['ask', { kind: 'question', toolName: 'AskUserQuestion', choices: [], input: { questions: [{ question: 'Which header do you want?', header: 'Header', multiSelect: false,
        options: [{ label: 'Compact', description: 'One row: logo, steps and the total.' }, { label: 'Tall', description: 'Two rows, with the order summary on top.' }] }] } }],
      ['tool', edit('checkout.html'), 1700], ['tool', edit('checkout.css'), 1700], ['tool', cmd('Run the checkout tests', 'npm test -- checkout'), 2600],
      ['say', a => `The **${a.toLowerCase()}** header is now in \`checkout.html\`, and all 14 checkout tests pass.`], ['done']] });
  session('parser', 'api', 'Refactor the parser', { age: 90, outside: true });
  session('node24', 'api', 'Upgrade to Node 24', { profile: 'personal', branch: 'node-24', age: 600, past: [['user', 'Upgrade the project to Node 24 and fix what breaks.'], ['tools', [read('package.json'), edit('package.json'), cmd('Install the packages', 'npm install')]],
    ['limit']], script: [['tool', cmd('Run the tests', 'npm test'), 2600], ['tool', edit('server.js'), 1800], ['say', 'The project runs on Node 24 now. One call to a removed API needed changing, in `server.js`.'], ['done']] });
  session('login', 'api', 'Fix flaky login test', { branch: 'fix-login', age: 20, past: [['user', 'The login test fails about one run in ten. Find out why and fix it.'], ['tools', [read('spec/login_spec.rb'), read('app/auth.rb')]],
    ['say', 'Found it. The test reads the session cookie before the page has set it. I made the test wait for the cookie, and want to run it to be sure.'], ['start'],
    ['ask', { kind: 'permission', toolName: 'Bash', input: { command: 'bundle exec rspec spec/login_spec.rb', description: 'Run the login test' },
      choices: [{ id: 'session:0', label: 'Allow this session', code: 'Bash(bundle exec rspec:*)' }, { id: 'project:0', label: 'Always allow in this project', code: 'Bash(bundle exec rspec:*)' }] }]],
    script: [['tool', cmd('Run the login test', 'bundle exec rspec spec/login_spec.rb'), 2800], ['say', 'Fixed. The test now waits for the session cookie, and it passed 50 runs in a row.'], ['done']] });

  /* ---------- playing a session's steps ---------- */
  function newRun(s) { return { status: 'working', activity: 'Starting', startedAt: Date.now(), profile: s.profile, context: { used: 38000 + s.items.length * 2100, window: 200000 }, pending: null, stopped: null,
    model: 'claude-sonnet-5-5', effort: 'high', mode: 'default', bg: [], lingering: false, queued: [] }; }
  function put(s, item, quiet) { if (item.n == null) item.n = ++s.n; const i = s.items.findIndex(x => x.n === item.n); if (i >= 0) s.items[i] = item; else s.items.push(item); if (!quiet) emit('item', { sessionId: s.id, item }); return item; }
  function ran(s, quiet) { s.mts = nowS(); if (!quiet) { emit('run', { sessionId: s.id, run: s.run }); pushState(); } }
  // One step. `quiet` builds the past without telling the window (it reads it when it opens the session).
  function apply(s, [kind, a, b], quiet) {
    if (kind === 'user') put(s, { kind: 'user', text: a, ts: iso() }, quiet);
    else if (kind === 'say') put(s, { kind: 'assistant', text: typeof a === 'function' ? a(s.answer || 'Compact') : a }, quiet);
    else if (kind === 'tools') put(s, { kind: 'tools', tools: a.map((t, i) => ({ ...t, id: `t${s.n}-${i}`, start: Date.now() - 4000, state: 'ok', end: Date.now() - 2000 })) }, quiet);
    else if (kind === 'work') put(s, { kind: 'work', files: a }, quiet);
    else if (kind === 'done') { put(s, { kind: 'done', ms: a || Date.now() - (s.run?.startedAt || Date.now()), ts: iso() }, quiet); if (s.run) { s.run.status = 'idle'; s.run.activity = null; } s.tools = null; if (!quiet) { ran(s); emit('turn-end', { sessionId: s.id }); s.unread = true; pushState(); } }
    else if (kind === 'start') { s.run = newRun(s); ran(s, quiet); }
    else if (kind === 'ask') { s.run = s.run || newRun(s); s.run.status = 'waiting'; s.run.activity = a.kind === 'question' ? 'Asking you' : 'Running'; s.run.pending = { id: `${s.id}-ask-${s.n}`, ...a }; s.tools = null; ran(s, quiet); }
    else if (kind === 'limit') { put(s, { kind: 'note', stop: 'limit', profile: s.profile, ts: iso() }, quiet); s.run = { ...newRun(s), status: 'stopped', activity: null, context: null, stopped: { reason: 'limit', text: 'You have reached your 5-hour limit.' } }; ran(s, quiet); }
  }
  async function play(s) {
    if (s.playing) return; s.playing = true;
    if (!s.run || s.run.status !== 'working') { s.run = newRun(s); ran(s); }
    while (s.at < s.script.length) {
      const step = s.script[s.at++], [kind, a, b] = step;
      if (kind === 'tool') {   // a step that takes time: shown running, then finished, in the same group as the steps before it
        const t = { ...a, id: `t${s.n}-${s.at}`, start: Date.now() };
        s.tools = s.tools || { kind: 'tools', tools: [] }; s.tools.tools.push(t); put(s, { ...s.tools, tools: [...s.tools.tools] }); s.tools.n = s.items.at(-1).n;
        s.run.activity = `${a.verb} ${a.what}`; ran(s);
        await sleep(b); if (s.gone) return;
        Object.assign(t, { state: 'ok', end: Date.now() }); put(s, { ...s.tools, tools: [...s.tools.tools] });
      } else {
        if (kind !== 'done') s.tools = kind === 'ask' ? null : s.tools;
        if (kind === 'say') { s.tools = null; s.run.activity = 'Writing'; ran(s); await sleep(500); }
        apply(s, step);
        if (kind === 'ask') { s.playing = false; return; }   // carries on when you answer
        await sleep(kind === 'say' ? 700 : 350);
      }
      if (s.gone) return;
    }
    s.playing = false;
  }
  // What you typed is not in the story: say so, the way a turn would.
  async function reply(s, text) {
    put(s, { kind: 'user', text, ts: iso() }); s.run = newRun(s); ran(s); await sleep(900);
    put(s, { kind: 'assistant', text: 'This window is a demo, so nothing really runs here. In the app, Claude Code would be working on this now, and the session would show as working in the list.' });
    apply(s, ['done', 1400]);
  }

  /* ---------- what the window is told ---------- */
  const waitingLine = p => p.kind === 'question' ? `${p.input.questions.length} question${p.input.questions.length > 1 ? 's' : ''} for you` : p.kind === 'plan' ? 'Plan ready for review'
    : p.toolName === 'Bash' ? 'Wants to run a command' : 'Wants to edit a file';
  function view(s) {
    let status = 'idle', line = '';
    if (s.outside) { status = 'work'; line = 'In a terminal · working'; }
    else if (s.run?.status === 'working') { status = 'work'; line = s.run.activity || 'Working'; }
    else if (s.run?.status === 'waiting') { status = 'wait'; line = waitingLine(s.run.pending); }
    else if (s.run?.status === 'stopped') { status = 'wait'; line = 'Stopped · limit reached'; }
    return { id: s.id, title: s.title, project: s.project, cwd: s.cwd, branch: s.branch, mts: s.mts, root: s.root, profile: s.profile, status, line,
      outside: s.outside, term: false, locked: s.outside, unread: status === 'idle' && s.unread, done: s.done, bg: 0 };
  }
  const streams = new Set();
  const emit = (type, data) => streams.forEach(es => es.emit(type, data));
  const pushState = () => emit('state', { profiles, next: 'side', projects, sessions: [...S.values()].map(view), ready: true, fresh: true, prefs, plain: false, folders: [WS], home: HOME, preview: 'demo-files' });

  /* ---------- the calls the window makes ---------- */
  const SKILLS = [['mockup', 'Build standalone mockups to compare side by side', 'Project'], ['code-review', 'Review the current changes for bugs', 'Built in'], ['simplify', 'Tidy the changed code', 'Built in'], ['init', 'Write a CLAUDE.md for this project', 'Built in']]
    .map(([name, about, from]) => ({ name, about, hint: '', from }));
  function call(method, path, b) {
    const [p, query] = path.split('?'), parts = p.split('/'), s = parts[0] === 'sessions' ? S.get(parts[1]) : null, act = parts[2];
    if (p === 'sessions' && method === 'POST') { const pr = projects.find(x => x.cwd === b.cwd) || projects[0], id = 'new' + Date.now();
      const n = session(id, pr.name, String(b.text).slice(0, 60), { profile: b.profile || 'work' }); pushState(); reply(n, b.text); return { sessionId: id }; }
    if (s && !act && method === 'GET') return { items: s.items, context: s.run?.context || { used: 42000, window: 200000 }, total: s.items.length, cut: false, work: [], model: 'claude-sonnet-5-5', effort: 'high', mode: null,
      place: { cwd: s.cwd, project: s.project, worktree: null, branch: s.branch }, defaults: { model: 'claude-sonnet-5-5', effort: 'high', mode: null }, run: s.run };
    if (s && act === 'answer') { const v = b.answers && Object.values(b.answers)[0]; if (v) s.answer = String(v); if (b.action === 'deny' && s.run.pending.kind === 'permission') { s.run.pending = null; put(s, { kind: 'assistant', text: 'All right, I will not run it.' }); apply(s, ['done', 900]); return { ok: true }; }
      s.run.pending = null; s.run.status = 'working'; ran(s); play(s); return { ok: true }; }
    if (s && act === 'send') { if (s.run?.status === 'stopped' && b.profile) { s.profile = b.profile; put(s, { kind: 'user', text: b.text, ts: iso() }); s.run = null; play(s); } else reply(s, b.text); return { ok: true }; }
    if (s && act === 'seen') { if (s.unread) { s.unread = false; pushState(); } return { ok: true }; }
    if (s && act === 'done') { s.done = !!b.on; pushState(); return { ok: true }; }
    if (s && act === 'rename') { s.title = String(b.title || s.title).slice(0, 120); pushState(); return { ok: true }; }
    if (s && act === 'delete') { s.gone = true; S.delete(s.id); pushState(); return { ok: true }; }
    if (s && act === 'stop') { s.gone = s.playing; s.playing = false; if (s.run) { s.run.pending = null; apply(s, ['done', 800]); } return { ok: true }; }
    if (s && act === 'changes') return query ? { diff: '' } : { repo: false, files: [], add: 0, del: 0 };
    if (s && act === 'context') { const used = s.run?.context?.used || 42000; return { used, window: 200000, percent: Math.round(used / 2000), reserve: 33000,
      rows: [{ name: 'Messages', tokens: used - 21000 }, { name: 'System prompt and tools', tokens: 14000 }, { name: 'Memory and project files', tokens: 4000 }, { name: 'Skills', tokens: 3000 }] }; }
    if (s && act === 'work') return Object.fromEntries(s.items.filter(i => i.kind === 'work').flatMap(i => i.files).map(f => [f.path, f.v]));
    if (s && act === 'term' && parts[3] === 'input') { typed(s.id, b.data); return { ok: true }; }
    if (parts[0] === 'skills') return { skills: SKILLS };
    if (parts[0] === 'defaults') return { model: 'claude-sonnet-5-5', effort: 'high', mode: null };
    if (parts[0] === 'about') return { version: 'demo', claude: 'demo', node: '', speech: { model: '', ready: false } };
    if (parts[0] === 'settings') { Object.assign(prefs, b || {}); pushState(); return { ok: true, ...prefs }; }
    if (parts[0] === 'projects' && method === 'POST') { const name = String(b.name || b.path || 'project').split('/').pop(); projects.push({ cwd: `${WS}/${name}`, name, recent: true }); pushState(); return { ok: true, cwd: `${WS}/${name}` }; }
    return { ok: true };
  }
  const realFetch = window.fetch.bind(window);
  window.fetch = async (url, init = {}) => {
    const u = String(url); if (!u.startsWith('/api/')) return realFetch(url, init);
    await sleep(60);
    let body = null; try { body = init.body ? JSON.parse(init.body) : null; } catch {}
    if (u.startsWith('/api/voice')) return new Response(JSON.stringify({ error: 'Dictation is not part of this demo.' }), { status: 500, headers: { 'content-type': 'application/json' } });
    return new Response(JSON.stringify(call(init.method || 'GET', u.slice(5), body || {})), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  /* ---------- the event streams ---------- */
  const terms = new Map();   // session -> its terminal stream
  window.EventSource = class {
    constructor(url) { this.url = url; this.readyState = 1; this.on = {};
      const term = /^\/api\/sessions\/([^/]+)\/term\?/.exec(url);
      if (term) { terms.set(term[1], this); setTimeout(() => terminal(term[1], this), 150); }
      else if (url.startsWith('/api/events')) { streams.add(this); setTimeout(pushState, 0); } }
    addEventListener(type, fn) { (this.on[type] = this.on[type] || []).push(fn); }
    emit(type, data) { if (this.readyState === 1) (this.on[type] || []).forEach(fn => fn({ data: JSON.stringify(data) })); }
    close() { this.readyState = 2; streams.delete(this); }
  };
  // Claude Code's own screen, as far as a demo can show it.
  const E = '\x1b[', dim = t => `${E}2m${t}${E}0m`, grn = t => `${E}32m${t}${E}0m`, ora = t => `${E}38;5;209m${t}${E}0m`, bold = t => `${E}1m${t}${E}0m`;
  const prompt = `\r\n${dim('─'.repeat(72))}\r\n${bold('>')} `;
  async function terminal(id, es) {
    const s = S.get(id); if (!s) return;
    const lines = [`${ora('✻')} ${bold('Claude Code')}  ${dim(`~/workspace/${s.project} · resumed "${s.title}"`)}`, ''];
    for (const it of s.items) {
      if (it.kind === 'user') lines.push(`${dim('>')} ${it.text}`, '');
      if (it.kind === 'tools') for (const t of it.tools) lines.push(`${grn('●')} ${t.past || t.verb}(${t.cmd || t.what})`);
      if (it.kind === 'assistant') lines.push('', `${grn('●')} ${it.text.replace(/[*`]/g, '')}`, '');
    }
    for (const l of lines) { es.emit('data', l + '\r\n'); await sleep(45); }
    es.emit('data', prompt);
  }
  function typed(id, data) {
    const es = terms.get(id); if (!es) return;
    if (data === '\r') es.emit('data', `\r\n\r\n${grn('●')} This terminal is part of the demo. In the app it is Claude Code itself, in the same session.\r\n${prompt}`);
    else if (data === '\x7f') es.emit('data', '\b \b');
    else if (data >= ' ') es.emit('data', data);
  }

  /* ---------- the story plays by itself until you touch the window ---------- */
  const el = sel => document.querySelector(sel), press = sel => { const e = typeof sel === 'string' ? el(sel) : sel; if (e && !touched) e.click(); return !!e; };
  const option = label => [...document.querySelectorAll('#qcard .qopt')].find(o => o.textContent.includes(label));
  async function until(test, ms = 15000) { for (let t = 0; t < ms && !touched; t += 150) { if (test()) return true; await sleep(150); } return false; }
  const open = { hero: 'checkout', answer: 'checkout', limit: 'node24', terminal: 'changelog' }[scene] || 'checkout';
  if (!location.hash) history.replaceState(null, '', location.pathname + location.search + '#' + open);
  if (scene === 'answer') { const s = S.get('checkout'); while (s.script[s.at][0] !== 'ask') { const st = s.script[s.at++]; apply(s, st[0] === 'tool' ? ['tools', [st[1]]] : st, true); } apply(s, s.script[s.at++], true); }
  addEventListener('load', async () => {
    await sleep(500);
    if (scene === 'hero') {
      play(S.get('invoice')); await sleep(900); play(S.get('checkout'));
      if (!await until(() => option('Tall'))) return;
      await sleep(2600); press(option('Tall')); await sleep(2600); press(option('Compact')); await sleep(1500); press('#qcard [data-act=send]');
      await until(() => S.get('checkout').run?.status === 'idle', 20000); await sleep(3500);
      if (press(`.sess[data-id="login"]`)) { await sleep(3200); press([...document.querySelectorAll('#qcard .qbtn')].find(b => b.textContent.includes('Allow this session'))); }
      await until(() => S.get('login').run?.status === 'idle', 12000); await sleep(6000);
    } else if (scene === 'answer') {
      for (let i = 0; i < 4 && await until(() => option('Tall')); i++) { await sleep(2600); press(option(i % 2 ? 'Compact' : 'Tall')); }
      await sleep(2600);
    } else if (scene === 'limit') {
      await until(() => el('#qcard .qbtn')); await sleep(4200); press([...document.querySelectorAll('#qcard .qbtn')].find(b => b.textContent.includes('Continue on side')));
      await until(() => S.get('node24').run?.status === 'idle', 15000); await sleep(5000);
    } else if (scene === 'terminal') {
      await until(() => el('.me')); await sleep(2200); press('#vTerm'); await sleep(6500); press('#vChat'); await sleep(2500);
    }
    if (!touched) location.reload();   // and round again
  });
})();
