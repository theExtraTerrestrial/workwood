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
log(`session account=${identity.emailAddress} config=${configDir ? path.basename(configDir) : 'global'} resume=${arg('--resume') || 'no'} model=${arg('--model') || 'default'} effort=${arg('--effort') || 'default'}`);

const out = o => process.stdout.write(JSON.stringify(o) + '\n');
// The shared history lives under ~/.claude whichever account is in use, as Claudius arranges.
const transcript = path.join(home, '.claude', 'projects', cwd.replace(/[^A-Za-z0-9]/g, '-'), sessionId + '.jsonl');
const record = o => { fs.mkdirSync(path.dirname(transcript), { recursive: true }); fs.appendFileSync(transcript, JSON.stringify({ cwd, sessionId, timestamp: new Date().toISOString(), gitBranch: 'main', isSidechain: false, ...o }) + '\n'); };
const say = content => {
  const message = { id: 'msg_' + randomUUID(), type: 'message', role: 'assistant', model: 'claude-test', content, usage: { input_tokens: 50000, output_tokens: 1000 } };
  out({ type: 'assistant', message, parent_tool_use_id: null, session_id: sessionId, uuid: randomUUID() });
  record({ type: 'assistant', uuid: randomUUID(), message });
};
const text = t => say([{ type: 'text', text: t }]);
const finish = (result, extra = {}) => {
  out({ type: 'result', subtype: 'success', is_error: false, duration_ms: 1200, duration_api_ms: 900, num_turns: 1, result, session_id: sessionId, total_cost_usd: 0,
    usage: { input_tokens: 50000, output_tokens: 1000 }, modelUsage: { 'claude-test': { contextWindow: 200000 } }, permission_denials: [], uuid: randomUUID(), ...extra });
  setTimeout(() => process.exit(extra.is_error ? 1 : 0), 20);
};

const waiting = new Map(); // request id -> resolve
const ask = (toolName, input, suggestions = []) => new Promise(resolve => {
  const toolUseId = 'toolu_' + randomUUID().slice(0, 8), requestId = randomUUID();
  say([{ type: 'tool_use', id: toolUseId, name: toolName, input }]);
  waiting.set(requestId, resolve);
  out({ type: 'control_request', request_id: requestId, request: { subtype: 'can_use_tool', tool_name: toolName, input, tool_use_id: toolUseId, permission_suggestions: suggestions } });
});

async function turn(prompt) {
  record({ type: 'session-owner', accountUuid: identity.accountUuid });
  record({ type: 'user', uuid: randomUUID(), message: { role: 'user', content: prompt } });
  if (/\bLIMIT\b/.test(prompt)) {
    out({ type: 'assistant', error: 'rate_limit', message: { id: 'm', type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'You have reached your 5-hour limit.' }] }, parent_tool_use_id: null, session_id: sessionId });
    return finish('You have reached your 5-hour limit.', { is_error: true });
  }
  if (/\bAUTH\b/.test(prompt)) {
    out({ type: 'assistant', error: 'authentication_failed', message: { id: 'm', type: 'message', role: 'assistant', model: '<synthetic>', content: [{ type: 'text', text: 'OAuth session expired and could not be refreshed' }] }, parent_tool_use_id: null, session_id: sessionId });
    return finish('Failed to authenticate', { is_error: true });
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
  if (/\bEDIT\b/.test(prompt)) {
    const r = await ask('Edit', { file_path: path.join(cwd, 'app.rb'), old_string: 'validates :name', new_string: 'validates :name, presence: true\nbefore_save :tidy' },
      [{ type: 'setMode', mode: 'acceptEdits', destination: 'session' }]);
    text(r.behavior === 'allow' ? 'EDITED ' + JSON.stringify(r.updatedPermissions || null) : 'DENIED ' + r.message);
    return finish('ok');
  }
  if (/\bPLAN\b/.test(prompt)) {
    const r = await ask('ExitPlanMode', { plan: '## Plan\n\n1. Read the parser.\n2. Split it in two.\n3. Add tests.' });
    text(r.behavior === 'allow' ? 'PLAN APPROVED' : 'PLAN REJECTED ' + r.message);
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
readline.createInterface({ input: process.stdin }).on('line', line => {
  let m; try { m = JSON.parse(line); } catch { return; }
  if (process.env.FAKE_CLAUDE_TRACE) log('IN ' + line.slice(0, 300));
  if (m.type === 'control_request') {
    const ok = (response = {}) => out({ type: 'control_response', response: { subtype: 'success', request_id: m.request_id, response } });
    if (m.request.subtype === 'initialize') return ok({ commands: [], agents: [], output_style: 'default', available_output_styles: ['default'], models: [], account: {} });
    if (m.request.subtype === 'interrupt') { ok(); log('interrupted'); out({ type: 'result', subtype: 'error_during_execution', is_error: true, duration_ms: 500, num_turns: 1, session_id: sessionId, result: '', usage: {}, modelUsage: {}, uuid: randomUUID() }); return setTimeout(() => process.exit(0), 20); }
    return ok();
  }
  if (m.type === 'control_response') {
    const r = m.response, resolve = waiting.get(r.request_id);
    if (resolve) { waiting.delete(r.request_id); resolve(r.response || { behavior: 'deny', message: r.error || 'error' }); }
    return;
  }
  if (m.type === 'user' && !started) {
    started = true;
    out({ type: 'system', subtype: 'init', session_id: sessionId, cwd, tools: [], mcp_servers: [], model: 'claude-test', permissionMode: 'default', slash_commands: [], apiKeySource: 'none', output_style: 'default', uuid: randomUUID() });
    const c = m.message.content; turn(typeof c === 'string' ? c : c.map(b => b.text || '').join(''));
  }
});
