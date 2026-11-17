// A stand-in for the `claude` command, used only by the tests. It speaks the same
// line-by-line JSON protocol the Agent SDK expects and plays a short scripted
// turn chosen by a keyword in the message (MOCKUP, ASK, PERMISSION, EDIT, PLAN,
// LIMIT, AUTH, SLOW). It also records which account it was started under.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);
const log = line => { if (process.env.FAKE_CLAUDE_LOG) fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, line + '\n'); };
if (args[0] === '--version') { console.log('2.1.322 (Claude Code)'); process.exit(0); }
if (args[0] === 'agents') { console.log(fs.readFileSync(process.env.FAKE_CLAUDE_AGENTS, 'utf8')); process.exit(0); }
// `claude auth login`, as Workwood runs it for a profile: asks for a code; "good" signs in, into the config folder.
if (args[0] === 'auth' && args[1] === 'login') {
  const dir = process.env.CLAUDE_CONFIG_DIR || path.join(process.env.HOME, '.claude'), name = path.basename(dir);
  log(`auth login config=${name}`);
  process.stdout.write('Open the page and paste the code: ');
  for await (const line of readline.createInterface({ input: process.stdin })) {
    if (line.trim() !== 'good') { process.stdout.write('That code did not work.\r\n'); process.exit(1); }
    const id = path.join(dir, '.claude.json');
    if (!fs.existsSync(id)) fs.writeFileSync(id, JSON.stringify({ oauthAccount: { emailAddress: `${name}@example.com`, accountUuid: '55555555-5555-4555-8555-' + String(name.length).padStart(12, '0'), organizationName: 'Test' } }));
    fs.writeFileSync(path.join(dir, '.credentials.json'), JSON.stringify({ claudeAiOauth: { accessToken: 'tok-' + name, refreshToken: 'rt-' + name, expiresAt: Date.now() + 3600e3, subscriptionType: 'max' } }));
    process.stdout.write('Login successful.\r\n'); process.exit(0);
  }
  process.exit(1);
}
if (args[0] === 'auth') process.exit(1);

// the SDK passes options as --name=value; a person typing would use --name value
const arg = name => { const eq = args.find(a => a.startsWith(name + '=')); if (eq) return eq.slice(name.length + 1); const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const home = process.env.HOME, configDir = process.env.CLAUDE_CONFIG_DIR || null;
const identity = JSON.parse(fs.readFileSync(configDir ? path.join(configDir, '.claude.json') : path.join(home, '.claude.json'), 'utf8')).oauthAccount;
const sessionId = arg('--resume') || randomUUID();
const cwd = process.cwd();
// Typed into directly (the terminal view): a tiny prompt that answers each line, so the tests can see a real terminal at work.
if (process.stdin.isTTY && !args.some(a => a.startsWith('--input-format'))) {
  const w = t => process.stdout.write(t), dims = () => `${process.stdout.columns}x${process.stdout.rows}`;
  const file = path.join(home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'), sessionId + '.jsonl');
  const add = o => fs.appendFileSync(file, JSON.stringify({ cwd, sessionId, timestamp: new Date().toISOString(), gitBranch: 'main', isSidechain: false, ...o }) + '\n');
  log(`terminal account=${identity.emailAddress} config=${configDir ? path.basename(configDir) : 'global'} resume=${arg('--resume') || 'no'}`);
  w(`Fake Claude Code, resumed ${sessionId}, ${dims()}\r\n> `);
  process.stdout.on('resize', () => w(`[size ${dims()}]\r\n> `));
  for await (const line of readline.createInterface({ input: process.stdin })) {
    const said = line.trim();
    if (said === '/exit') process.exit(0);
    if (said === 'crash') process.exit(3);
    if (said) {
      add({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
      add({ type: 'assistant', uuid: randomUUID(), message: { id: 'msg_' + randomUUID(), type: 'message', role: 'assistant', model: 'claude-test', content: [{ type: 'text', text: 'TERMINAL REPLY to ' + said }], usage: { input_tokens: 50000, output_tokens: 1000 } } });
      w(`you said: ${said}\r\n`);
    }
    w('> ');
  }
  process.exit(0);
}
log(`session account=${identity.emailAddress} config=${configDir ? path.basename(configDir) : 'global'} resume=${arg('--resume') || 'no'} model=${arg('--model') || 'default'} effort=${arg('--effort') || 'default'} mode=${arg('--permission-mode') || 'default'}`);
let mode = arg('--permission-mode') || 'default';   // changed mid-session by set_permission_mode

const out = o => process.stdout.write(JSON.stringify(o) + '\n');
// The shared history lives under ~/.claude whichever account is in use, as Claudius arranges.
const transcript = path.join(home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'), sessionId + '.jsonl');
// what you write is saved with the mode it was written in, as Claude Code does
const record = o => { fs.mkdirSync(path.dirname(transcript), { recursive: true }); fs.appendFileSync(transcript, JSON.stringify({ cwd, sessionId, timestamp: new Date().toISOString(), gitBranch: 'main', isSidechain: false, ...(o.type === 'user' && typeof o.message?.content === 'string' ? { permissionMode: mode } : {}), ...o }) + '\n'); };
const say = content => {
  const message = { id: 'msg_' + randomUUID(), type: 'message', role: 'assistant', model: 'claude-test', content, usage: { input_tokens: 50000, output_tokens: 1000 } };
  out({ type: 'assistant', message, parent_tool_use_id: null, session_id: sessionId, uuid: randomUUID() });
  record({ type: 'assistant', uuid: randomUUID(), message });
};
const text = t => say([{ type: 'text', text: t }]);
const finish = (result, extra = {}) => {
  out({ type: 'result', subtype: 'success', is_error: false, duration_ms: 1200, duration_api_ms: 900, num_turns: 1, result, session_id: sessionId, total_cost_usd: 0,
    usage: { input_tokens: 50000, output_tokens: 1000 }, modelUsage: { 'claude-test': { contextWindow: 200000 } }, permission_denials: [], uuid: randomUUID(), queued_turn_count: extra.is_error ? 0 : inbox.length, ...extra });
  if (inbox.length && !extra.is_error) { const next = inbox.shift(); setTimeout(() => turn(flat(next.message.content), next.message.content, next.uuid), 150); }
  else if (extra.is_error) setTimeout(() => process.exit(1), 20);
  else idle = setTimeout(() => process.exit(0), bgAlive ? 600000 : 400);   // a message handed over as the turn ends still runs; work in the background keeps it open
};
let idle = null;
const stepDone = (id, r = {}) => out({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content: 'ok', ...r }] }, parent_tool_use_id: null, session_id: sessionId, uuid: randomUUID() });
let stopTask = null, bgAlive = false;
const sys = (subtype, o = {}) => out({ type: 'system', subtype, ...o, session_id: sessionId, uuid: randomUUID() });
// a turn Claude Code starts by itself when background work moves on: the note it saves for the agent, then a reply
const notice = (inner, reply) => {
  record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: `<task-notification>\n${inner}\n</task-notification>` }, origin: { kind: 'task-notification' } });
  if (!reply) return;
  sys('init', { cwd, tools: [], mcp_servers: [], model: 'claude-test', permissionMode: mode, slash_commands: [], apiKeySource: 'none', output_style: 'default' });
  text(reply);
  out({ type: 'result', subtype: 'success', is_error: false, duration_ms: 300, duration_api_ms: 200, num_turns: 1, result: reply, session_id: sessionId, total_cost_usd: 0,
    usage: { input_tokens: 50000, output_tokens: 100 }, modelUsage: {}, permission_denials: [], uuid: randomUUID(), queued_turn_count: 0 });
};
const result = (id, content, extra) => { const r = { type: 'user', uuid: randomUUID(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: id, content }] } };
  record({ ...r, ...(extra ? { toolUseResult: extra } : {}) }); out({ ...r, parent_tool_use_id: null, session_id: sessionId, ...(extra ? { tool_use_result: extra } : {}) }); };
const flat = c => typeof c === 'string' ? c : c.map(b => b.text || '').join('');

const waiting = new Map(); // request id -> resolve
const inbox = []; let hear = null;   // messages that arrive while a turn runs: handed to a turn that listens, or run as turns of their own
const ask = (toolName, input, suggestions = []) => new Promise(resolve => {
  const toolUseId = 'toolu_' + randomUUID().slice(0, 8), requestId = randomUUID();
  say([{ type: 'tool_use', id: toolUseId, name: toolName, input }]);
  waiting.set(requestId, resolve);
  out({ type: 'control_request', request_id: requestId, request: { subtype: 'can_use_tool', tool_name: toolName, input, tool_use_id: toolUseId, permission_suggestions: suggestions } });
});

let modeChanged = null;
async function turn(prompt, said = prompt, uuid) {
  record({ type: 'session-owner', accountUuid: identity.accountUuid });
  if (/\bMODEWAIT\b/.test(prompt)) {  // works until the mode is changed (or 5 s), then says which mode it is in
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    say([{ type: 'tool_use', id: 'toolu_mw', name: 'Bash', input: { command: 'make slowly', description: 'Build slowly' } }]);
    await new Promise(r => { modeChanged = r; setTimeout(r, 5000); }); modeChanged = null; stepDone('toolu_mw');
    text('Mode now: ' + mode);
    return finish('ok');
  }
  if (/\bLISTEN\b/.test(prompt)) {     // works on something long, and takes what you write meanwhile into the same turn
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    say([{ type: 'tool_use', id: 'toolu_long', name: 'Bash', input: { command: 'make everything', description: 'Build everything' } }]);
    await new Promise(r => setTimeout(r, 700)); stepDone('toolu_long');
    const m = inbox.shift() || await new Promise(r => { hear = r; });
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: m.message.content } });
    text('Heard mid-turn: ' + flat(m.message.content));
    return finish('ok', { user_message_uuids: [m.uuid] });
  }
  if (/\bCHATTER\b/.test(prompt)) {    // a long reply, then a step, then three short replies with steps between: time to scroll up and be told of them
    // (TALL: the first of them is short and the next one long and a while later, so the thread grows after you went to look)
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    const wait = ms => new Promise(r => setTimeout(r, ms));
    text(Array.from({ length: 40 }, (_, i) => `Chatter opening, paragraph ${i + 1}.`).join('\n\n'));
    await wait(1500);
    say([{ type: 'tool_use', id: 'toolu_chat', name: 'Bash', input: { command: 'make notes', description: 'Make notes' } }]);
    await wait(900); stepDone('toolu_chat');
    for (const n of [1, 2, 3]) {   // replies with a step between them: text that runs on is one reply
      await wait(/TALL/.test(prompt) ? 1500 : 250); text(/TALL/.test(prompt) ? Array.from({ length: n === 1 ? 2 : 60 }, (_, i) => `Tall reply ${n}, paragraph ${i + 1}.`).join('\n\n') : `Chatter reply ${n}.`);
      if (n < 3) { say([{ type: 'tool_use', id: 'toolu_chat' + n, name: 'Bash', input: { command: 'make more notes', description: 'Make more notes' } }]); await wait(150); stepDone('toolu_chat' + n); }
    }
    await wait(1200);
    return finish('ok');
  }
  if (/\bSTEPS\b/.test(prompt)) {      // one slow step: what you write meanwhile waits for its end
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    say([{ type: 'tool_use', id: 'toolu_slow', name: 'Bash', input: { command: 'make slowly', description: 'Build slowly' } }]);
    await new Promise(r => setTimeout(r, 4000)); stepDone('toolu_slow');
    text('Steps done.');
    return finish('ok');
  }
  if (/\bCOMMANDS\b/.test(prompt)) {   // a command that works, one that fails, then one that runs until you stop it on its own
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    say([{ type: 'tool_use', id: 'toolu_ok', name: 'Bash', input: { command: 'npm ci', description: 'Install what it needs' } }]);
    stepDone('toolu_ok', { content: 'added 3 packages' });
    say([{ type: 'tool_use', id: 'toolu_fail', name: 'Bash', input: { command: 'node --test tests/ 2>&1 | grep "<fail>"', description: 'Run the tests' } }]);
    await new Promise(r => setTimeout(r, 300));
    const failed = { type: 'user', uuid: randomUUID(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_fail', is_error: true,
      content: 'Exit code 1\n' + Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n') + '\nfail 2' }] } };
    record(failed); out({ ...failed, parent_tool_use_id: null, session_id: sessionId });
    say([{ type: 'tool_use', id: 'toolu_serve', name: 'Bash', input: { command: 'make serve', description: 'Serve the site', timeout: 600000 } }]);
    out({ type: 'system', subtype: 'task_started', task_id: 'task_serve', tool_use_id: 'toolu_serve', description: 'Serve the site', is_backgrounded: false, session_id: sessionId, uuid: randomUUID() });
    await new Promise(r => { stopTask = r; });
    out({ type: 'system', subtype: 'task_notification', task_id: 'task_serve', tool_use_id: 'toolu_serve', status: 'stopped', output_file: '', summary: '', session_id: sessionId, uuid: randomUUID() });
    stepDone('toolu_serve', { is_error: true, content: 'Exit code 143\nTerminated' });
    text('Commands done.');
    return finish('ok');
  }
  if (/\bBACKGROUND\b/.test(prompt)) {   // an agent with steps of its own, then a dev server and a monitor left running after the turn
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    const dir = path.join(home, '.tasks', sessionId); fs.mkdirSync(dir, { recursive: true });
    say([{ type: 'tool_use', id: 'toolu_fg', name: 'Agent', input: { description: 'Map the code', subagent_type: 'Explore', prompt: 'Find the readme.' } }]);
    sys('task_started', { task_id: 'task_fg', tool_use_id: 'toolu_fg', description: 'Map the code', task_type: 'local_agent', subagent_type: 'Explore', is_backgrounded: false });
    out({ type: 'assistant', message: { id: 'msg_s', type: 'message', role: 'assistant', model: 'claude-test', content: [{ type: 'tool_use', id: 'toolu_s1', name: 'Read', input: { file_path: path.join(cwd, 'README.md') } }] }, parent_tool_use_id: 'toolu_fg', session_id: sessionId, uuid: randomUUID() });
    out({ type: 'user', message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_s1', content: 'readme' }] }, parent_tool_use_id: 'toolu_fg', session_id: sessionId, uuid: randomUUID() });
    sys('task_progress', { task_id: 'task_fg', tool_use_id: 'toolu_fg', description: 'Reading README.md', usage: { total_tokens: 21000, tool_uses: 1, duration_ms: 300 } });
    await new Promise(r => setTimeout(r, 200));
    result('toolu_fg', [{ type: 'text', text: 'Found it in README.md.\nIt has a title and one line.\nagentId: a1 (internal)' }], { totalTokens: 22000, totalToolUseCount: 1 });
    sys('task_notification', { task_id: 'task_fg', tool_use_id: 'toolu_fg', status: 'completed', output_file: '', summary: 'Found it in README.md.' });
    bgAlive = true;
    const devOut = path.join(dir, 'task_dev.output'); fs.writeFileSync(devOut, 'starting\nready on http://localhost:4310\n');
    say([{ type: 'tool_use', id: 'toolu_dev', name: 'Bash', input: { command: 'npm run dev', description: 'Start the dev server', run_in_background: true } }]);
    sys('background_tasks_changed', { tasks: [{ task_id: 'task_dev', task_type: 'local_bash', description: 'Start the dev server' }] });
    sys('task_started', { task_id: 'task_dev', tool_use_id: 'toolu_dev', description: 'Start the dev server', task_type: 'local_bash', is_backgrounded: true });
    result('toolu_dev', `Command running in background with ID: task_dev. Output is being written to: ${devOut}. You will be notified when it completes.`, { stdout: '', stderr: '', interrupted: false, backgroundTaskId: 'task_dev' });
    fs.writeFileSync(path.join(dir, 'task_mon.output'), '');
    say([{ type: 'tool_use', id: 'toolu_mon', name: 'Monitor', input: { description: 'Watch the tests', command: 'tail -f test.log', timeout_ms: 600000 } }]);
    sys('task_started', { task_id: 'task_mon', tool_use_id: 'toolu_mon', description: 'Watch the tests', task_type: 'local_bash', is_backgrounded: true });
    sys('background_tasks_changed', { tasks: [{ task_id: 'task_dev', task_type: 'local_bash', description: 'Start the dev server' }, { task_id: 'task_mon', task_type: 'local_bash', description: 'Watch the tests' }] });
    result('toolu_mon', 'Monitor started (task task_mon, expires in 600s unless the source ends first). You will be notified on each event.', { taskId: 'task_mon', timeoutMs: 600000, persistent: false });
    text('Started.');
    finish('ok');
    // later: the monitor sees a line, the dev server fails, and the monitor runs until it is stopped
    stopTask = id => {
      if (id !== 'task_mon') return;
      bgAlive = false;
      sys('task_notification', { task_id: 'task_mon', tool_use_id: 'toolu_mon', status: 'stopped', output_file: path.join(dir, 'task_mon.output'), summary: 'Monitor "Watch the tests" stopped' });
      sys('background_tasks_changed', { tasks: [] });
      notice('<task-id>task_mon</task-id>\n<tool-use-id>toolu_mon</tool-use-id>\n<status>killed</status>\n<summary>Monitor "Watch the tests" stopped</summary>');
    };
    setTimeout(() => {
      fs.appendFileSync(path.join(dir, 'task_mon.output'), 'FAIL parser test\n');
      notice('<task-id>task_mon</task-id>\n<summary>Monitor event: "Watch the tests"</summary>\n<event>FAIL parser test</event>', 'Saw a failing test.');
    }, 900);
    setTimeout(() => {
      fs.appendFileSync(devOut, 'Error: port in use\n');
      sys('task_notification', { task_id: 'task_dev', tool_use_id: 'toolu_dev', status: 'failed', output_file: devOut, summary: 'Background command "Start the dev server" failed with exit code 1' });
      sys('background_tasks_changed', { tasks: [{ task_id: 'task_mon', task_type: 'local_bash', description: 'Watch the tests' }] });
      notice(`<task-id>task_dev</task-id>\n<tool-use-id>toolu_dev</tool-use-id>\n<output-file>${devOut}</output-file>\n<status>failed</status>\n<summary>Background command "Start the dev server" failed with exit code 1</summary>`, 'The dev server stopped: the port is in use.');
    }, 2200);
    return;
  }
  if (/\bQUEUE\b/.test(prompt)) {      // does not look up until the turn is over: what you write runs as the next turn
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
    say([{ type: 'tool_use', id: 'toolu_busy', name: 'Bash', input: { command: 'make part', description: 'Build one part' } }]);
    await new Promise(r => setTimeout(r, 900));
    text('First part done.');
    return finish('ok');
  }
  record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: said } });
  if (/\bLIMIT\b/.test(prompt)) {
    out({ type: 'assistant', error: 'rate_limit', message: { id: 'm', type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'You have reached your 5-hour limit.' }] }, parent_tool_use_id: null, session_id: sessionId });
    return finish('You have reached your 5-hour limit.', { is_error: true });
  }
  if (/\bBREAK\b/.test(prompt)) {
    out({ type: 'assistant', error: 'server_error', message: { id: 'm', type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'API Error: 500 Internal server error' }] }, parent_tool_use_id: null, session_id: sessionId });
    return finish('API Error: 500 Internal server error', { is_error: true });
  }
  if (/\bORPHANED\b/.test(prompt)) {   // resumed with background work a closed Claude Code left behind: reported first, with a result that ran no turn
    sys('task_notification', { task_id: 'task_old', tool_use_id: 'toolu_old', status: 'stopped', output_file: '', summary: 'Orphaned by a previous Claude Code process exit and reported in an aggregate summary.' });
    out({ type: 'result', subtype: 'success', is_error: false, num_turns: 0, duration_ms: 80, duration_api_ms: 0, origin: { kind: 'task-notification' }, queued_turn_count: 0, session_id: sessionId, uuid: randomUUID() });
  }
  if (/\bAUTH\b/.test(prompt)) {
    out({ type: 'assistant', error: 'authentication_failed', message: { id: 'm', type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'OAuth session expired and could not be refreshed' }] }, parent_tool_use_id: null, session_id: sessionId });
    return finish('Failed to authenticate', { is_error: true });
  }
  if (/\bSNIPPETS\b/.test(prompt)) {   // a question whose options carry their own text to look at
    const r = await ask('AskUserQuestion', { questions: [{ question: 'Which layout?', header: 'Layout', multiSelect: false, options: [
      { label: 'Stacked', description: 'One column.', preview: '+-------+\n| top   |\n| below |\n+-------+' },
      { label: 'Split', description: 'Two columns.', preview: '+----+----+\n| a  | b  |\n+----+----+' }] }] });
    text('PICKED ' + JSON.stringify(r.updatedInput?.answers || r.message));
    return finish('ok');
  }
  if (/\bASK\b/.test(prompt) && !/\bMOCKUP\b/.test(prompt)) {
    const input = { questions: [
      { question: 'Which direction should I take?', header: 'Direction', multiSelect: false, options: [{ label: 'Light', description: 'Minimal.' }, { label: 'Dark', description: 'Matches the dashboard.' }] },
      { question: 'What else should it include?', header: 'Scope', multiSelect: true, options: [{ label: 'Tests', description: 'Update specs.' }, { label: 'Docs', description: 'Update the readme.' }, { label: 'Mobile', description: 'Small screens.' }] }] };
    const r = await ask('AskUserQuestion', input);
    return r.behavior === 'allow' ? (text('ANSWERS ' + JSON.stringify(r.updatedInput.answers)), finish('ok')) : (text('DECLINED ' + r.message), finish('ok'));
  }
  if (/\bPERMISSION\b/.test(prompt)) {
    const r = await ask('Bash', { command: 'touch probe.txt', description: 'Create an empty probe file' },
      [{ type: 'addRules', rules: [{ toolName: 'Bash', ruleContent: 'touch probe.txt' }], behavior: 'allow', destination: 'localSettings' }]);
    text(r.behavior === 'allow' ? 'RAN ' + JSON.stringify(r.updatedPermissions || null) : 'DENIED ' + r.message);
    return finish('ok');
  }
  if (/\bHUGE\b/.test(prompt)) {
    const r = await ask('Write', { file_path: path.join(cwd, 'huge.rb'), content: Array.from({ length: 400 }, (_, i) => `line ${i + 1} ` + 'x'.repeat(i % 7 ? 20 : 300)).join('\n') }, []);
    text(r.behavior === 'allow' ? 'WROTE' : 'DENIED ' + r.message);
    return finish('ok');
  }
  if (/\bEDIT\b/.test(prompt)) {
    const r = await ask('Edit', { file_path: path.join(cwd, 'app.rb'), old_string: 'validates :name', new_string: 'validates :name, presence: true\nbefore_save :tidy' },
      [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]);
    text(r.behavior === 'allow' ? 'EDITED ' + JSON.stringify(r.updatedPermissions || null) : 'DENIED ' + r.message);
    return finish('ok');
  }
  if (/\bPLAN\b/.test(prompt)) {
    const r = await ask('ExitPlanMode', { plan: '## Plan\n\n1. Read the parser.\n2. Split it in two.\n3. Add tests.' });
    text(r.behavior === 'allow' ? 'PLAN APPROVED' + (r.updatedPermissions ? ' ' + JSON.stringify(r.updatedPermissions) : '') : 'PLAN REJECTED ' + r.message);
    return finish('ok');
  }
  if (/\bSCREENSHOT\b/.test(prompt)) {   // a command makes the files: nothing is written with the Write tool
    const dir = path.join(cwd, 'shots'); fs.mkdirSync(path.join(dir, 'out'), { recursive: true });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAr7WqXkAAAAASUVORK5CYII=', 'base64');
    fs.writeFileSync(path.join(dir, 'before.png'), png); fs.utimesSync(path.join(dir, 'before.png'), new Date(Date.now() - 3600e3), new Date(Date.now() - 3600e3));
    say([{ type: 'text', text: 'Taking a screenshot.' }, { type: 'tool_use', id: 'toolu_shot', name: 'Bash', input: { command: 'cd shots && S=out && capture --compare before.png $S/home.png && report > report.html', description: 'Take a screenshot' } }]);
    fs.writeFileSync(path.join(dir, 'out', 'home.png'), png); fs.writeFileSync(path.join(dir, 'report.html'), '<h1>Report</h1>');
    const result = { type: 'user', uuid: randomUUID(), message: { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'toolu_shot', content: 'ok' }] } };
    record(result); out({ ...result, parent_tool_use_id: null, session_id: sessionId });
    text('The screenshot is ready.');
    return finish('ok');
  }
  if (/\bMOCKUP\b/.test(prompt)) {
    // writes two pages that share a stylesheet, and a picture; MOCKUP ASK then stops to ask about them
    const dir = path.join(cwd, 'mockups'); fs.mkdirSync(dir, { recursive: true });
    const page = name => `<!doctype html><link rel="stylesheet" href="style.css"><h1>${name} direction</h1><img src="shot.png">`;
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z8Dwn4GBgYGJAQoAHxcCAr7WqXkAAAAASUVORK5CYII=', 'base64');
    const files = [['light.html', page('Light')], ['dark.html', page('Dark')], ['style.css', 'h1{color:rgb(1, 2, 3)}'], ['shot.png', png]];
    say([{ type: 'text', text: 'Building the mockups.' }, ...files.map(([name, body], i) => {
      fs.writeFileSync(path.join(dir, name), body);
      return { type: 'tool_use', id: 'toolu_w' + i, name: 'Write', input: { file_path: path.join(dir, name), content: typeof body === 'string' ? body : '' } };
    })]);
    record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: files.map((f, i) => ({ type: 'tool_result', tool_use_id: 'toolu_w' + i, content: 'ok' })) } });
    if (/\bASK\b/.test(prompt)) {
      const r = await ask('AskUserQuestion', { questions: [{ question: 'Which mockup?', header: 'Pick', multiSelect: false, options: [{ label: 'Light', description: '' }, { label: 'Dark', description: '' }] }] });
      text('PICKED ' + JSON.stringify(r.updatedInput?.answers || r.message));
    } else text('Both directions are ready.');
    return finish('ok');
  }
  if (/\bSLOW\b/.test(prompt)) {
    say([{ type: 'tool_use', id: 'toolu_slow', name: 'Bash', input: { command: 'sleep 600', description: 'Wait a long time' } }]);
    return; // stays busy until interrupted
  }
  say([{ type: 'tool_use', id: 'toolu_read', name: 'Read', input: { file_path: path.join(cwd, 'README.md') } }]);
  text('Echo: ' + prompt);
  finish('ok');
}

let started = false;
readline.createInterface({ input: process.stdin }).on('close', () => setTimeout(() => process.exit(0), 50)).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (process.env.FAKE_CLAUDE_TRACE) log('IN ' + line.slice(0, 300));
  if (m.type === 'control_request') {
    const ok = (response = {}) => out({ type: 'control_response', response: { subtype: 'success', request_id: m.request_id, response } });
    if (m.request.subtype === 'initialize') return ok({ commands: [
      { name: 'mockup', description: 'Build standalone mockups to compare side by side (project)', argumentHint: '' },
      { name: 'teach', description: 'Teach a new skill or concept. (user)', argumentHint: '' },
      { name: 'tools:lint', description: '(tools) Lint the changed files', argumentHint: '<path>' },
      { name: 'on-' + path.basename(process.env.CLAUDE_CONFIG_DIR || 'global'), description: 'Which profile folder this was read from', argumentHint: '' },
      { name: 'code-review', description: 'Review the current diff for bugs', argumentHint: '', builtin: true },
      { name: 'compact', description: 'Free up context by summarizing the conversation so far', argumentHint: '', builtin: true },
      { name: '__internal', description: 'Not for people', argumentHint: '', builtin: true },
      { name: 'extra-usage', description: 'Renamed to /usage-credits', argumentHint: '', builtin: true },
    ], agents: [], output_style: 'default', available_output_styles: ['default'], models: [], account: {} });
    if (m.request.subtype === 'get_context_usage') return ok({ model: 'claude-test', total_tokens: 51000, raw_max_tokens: 200000, percentage: 26, categories: [
      { name: 'Messages', tokens: 30000, kind: 'used' }, { name: 'System tools', tokens: 16000, kind: 'used' }, { name: 'System prompt', tokens: 5000, kind: 'used' },
      { name: 'Free space', tokens: 116000, kind: 'free' }, { name: 'Autocompact buffer', tokens: 33000, kind: 'buffer' }], mcp_tools: [] });
    if (m.request.subtype === 'set_permission_mode') { mode = m.request.mode; log('mode ' + mode); ok(); sys('status', { status: null, permissionMode: mode }); modeChanged?.(); return; }
    if (m.request.subtype === 'stop_task') { ok(); log('stopped task ' + m.request.task_id); const f = stopTask; if (f?.length) f(m.request.task_id); else { stopTask = null; f?.(); } return; }
    if (m.request.subtype === 'interrupt') { ok(); log('interrupted'); out({ type: 'result', subtype: 'error_during_execution', is_error: true, duration_ms: 500, num_turns: 1, session_id: sessionId, result: '', usage: {}, modelUsage: {}, uuid: randomUUID() }); return setTimeout(() => process.exit(0), 20); }
    return ok();
  }
  if (m.type === 'control_response') {
    const r = m.response, resolve = waiting.get(r.request_id);
    if (resolve) { waiting.delete(r.request_id); resolve(r.response || { behavior: 'deny', message: r.error || 'error' }); }
    return;
  }
  if (m.type === 'user' && started && idle) { clearTimeout(idle); idle = null; const c = m.message.content; return turn(flat(c), c, m.uuid); }
  if (m.type === 'user' && started) { if (hear) { const h = hear; hear = null; h(m); } else inbox.push(m); return; }
  if (m.type === 'user' && !started) {
    started = true;
    out({ type: 'system', subtype: 'init', session_id: sessionId, cwd, tools: [], mcp_servers: [], model: 'claude-test', permissionMode: mode, slash_commands: [], apiKeySource: 'none', output_style: 'default', uuid: randomUUID() });
    const c = m.message.content;
    if (Array.isArray(c) && c.some(b => b.type === 'image')) log(`pictures=${c.filter(b => b.type === 'image').length} readable=${args.filter((a, i) => a.startsWith('--add-dir') ).length ? 'yes' : 'no'}`);
    turn(typeof c === 'string' ? c : c.map(b => b.text || '').join(''), c);
  }
});
