// Live turns. Each message you send starts one Agent SDK query that resumes the
// session, streams what the agent does, and pauses whenever it needs you.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { randomUUID } from 'node:crypto';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { Builder, ERRORS, describeTool, learnWindow, parseNotification, previewKind } from './transcript.mjs';
import { lastCwd } from './sources.mjs';

export const runs = new Map(); // sessionId -> run
let liveSeq = 1_000_000;        // live items are numbered above anything read from a file

// When the last background task has ended, how long the session stays open for the turn it may wake the agent for.
const GRACE = +process.env.WORKWOOD_BG_GRACE || 8000;
const sleep = ms => new Promise(r => setTimeout(() => r(null), ms));

// Told to every session Workwood runs, after Claude Code's own instructions: how to ask so the window can show what you made.
export const SHOW_NOTE = 'This session runs in Workwood, a window that shows the pages and pictures you make next to the conversation. '
  + 'When you ask the user to choose between files you made (mockups, pages, images), set each option\'s `preview` to the path of its file '
  + 'and nothing else, so each option shows as that file to pick from.';
// A question option whose preview is the path of a file that can be shown: that file, absolute.
export function previewPath(preview, cwd) {
  let p = typeof preview === 'string' ? preview.trim().replace(/^`+|`+$/g, '').replace(/^file:\/\//, '') : '';
  if (!p || /\n/.test(p) || !previewKind(p)) return null;
  if (p === '~' || p.startsWith('~/')) p = path.join(os.homedir(), p.slice(1));
  p = path.resolve(cwd || '/', p);
  try { return fs.statSync(p).isFile() ? p : null; } catch { return null; }
}


export function publicRun(r) {
  if (!r) return null;
  return {
    status: r.status, activity: r.activity, startedAt: r.startedAt, profile: r.profile, context: r.context,
    pending: r.pending && { id: r.pending.id, kind: r.pending.kind, toolName: r.pending.toolName, input: r.pending.input, choices: r.pending.choices },
    stopped: r.stopped, model: r.builder.model || null, effort: r.effort || null, mode: r.mode || null,
    bg: [...(r.bg?.values() || [])].map(({ file, size, ...t }) => t), lingering: !!r.lingering,
    queued: (r.held || []).map(h => ({ id: h.id, text: h.text, files: (h.attachments || []).map(a => a.name) })),
  };
}

/**
 * Starts a turn. Resolves with the session id as soon as the session exists
 * (immediately for an existing session, after start-up for a new one).
 */
export function startTurn({ sessionId, cwd, profile, env, text, content = text, model, effort, mode, claude, emit, readable = [], held = [], transcript = null }) {
  const existing = sessionId && runs.get(sessionId);
  // The session is still open for its background work: the message goes to the same Claude Code, as a new turn.
  if (existing?.lingering && existing.q) {
    if (model && model !== existing.builder.model) existing.q.setModel?.(model).catch(() => {});
    if (mode && mode !== existing.mode) { existing.mode = mode; existing.q.setPermissionMode?.(mode).catch(() => {}); }
    existing.resume(content);
    return Promise.resolve(sessionId);
  }
  if (existing && existing.status !== 'idle' && existing.status !== 'stopped') throw new Error('This session is still working.');

  const run = { sessionId: sessionId || null, cwd, profile, status: 'working', activity: 'Starting', startedAt: Date.now(),
    pending: null, stopped: null, model: model || existing?.model || null, effort: effort || existing?.effort || null, mode: mode || existing?.mode || null, context: existing?.context || null, q: null, builder: new Builder(liveSeq, cwd, { keepOutput: true }), tasks: new Map(),
    bg: new Map(), known: new Map(), lingering: false, turnOver: false };
  liveSeq += 100_000;
  if (sessionId) runs.set(sessionId, run);

  const say = (type, data = {}) => { if (run.sessionId) emit(type, { sessionId: run.sessionId, ...data }); };
  const sayState = () => say('run', { run: publicRun(run) });
  run.notify = sayState;
  const sayItems = items => { for (const it of items) { const { open, ...rest } = it; say('item', { item: rest }); } };
  const turnOver = () => { if (!run.turnOver) { run.turnOver = true; emit('turn-end', { sessionId: run.sessionId }); } };
  // A new turn in the same open session: one you wrote, or one Claude Code started because background work moved on.
  const wakeUp = async activity => {
    run.lingering = false; run.status = 'working'; run.startedAt = Date.now(); run.activity = activity; run.turnOver = false;
    await readNotes(); sayState();
  };
  run.resume = more => { wakeUp('Reading your message'); run.add(more); };

  /* ---- background work: what still runs after its step returned ---- */
  const kindOf = (t, st) => st?.group === 'monitor' ? 'monitor' : /agent/.test(t.task_type || '') || st?.group === 'agent' ? 'agent' : 'shell';
  const outFile = (id, st) => st?.file && path.basename(st.file) === id + '.output' ? st.file
    : run.taskDir ? path.join(run.taskDir, id + '.output') : null;
  function addBg(id) {
    const t = run.known.get(id) || {}, st = t.tool ? run.builder.steps.get(t.tool)?.step : null, had = run.bg.get(id);
    if (st?.file) run.taskDir ||= path.dirname(st.file);
    const e = { id, tool: t.tool || null, kind: kindOf(t, st), name: st?.what || t.description || 'Background task', cmd: st?.cmd || null,
      start: st?.start || had?.start || Date.now(), limit: st?.limit || null, sub: t.subagent_type || st?.kind || null,
      last: had?.last || null, events: had?.events || 0, tokens: had?.tokens || null, steps: had?.steps || null, fresh: had?.fresh || false };
    e.file = e.kind === 'agent' ? null : outFile(id, st);
    run.bg.set(id, e);
  }
  // where a task's output goes is known only once its step has returned; asked again until it is
  run.bgFile = e => {
    if (e.file || e.kind === 'agent') return e.file;
    const st = e.tool && run.builder.steps.get(e.tool)?.step;
    if (st?.file) run.taskDir ||= path.dirname(st.file);
    return (e.file = outFile(e.id, st));
  };
  function endBg(id) { const e = run.bg.get(id); if (!e) return; run.bg.delete(id); if (!run.bg.size) run.onQuiet?.(); }
  // Claude Code tells the agent about background work in notes it saves in the transcript (a monitor's events
  // reach the agent only that way); the conversation reads them from there as they are written.
  let tailAt = null, tailBuf = '', reading = null;
  const transcriptFile = () => run.sessionId && transcript ? transcript(run.sessionId) : null;
  try { const f = sessionId && transcript?.(sessionId); tailAt = f && fs.existsSync(f) ? fs.statSync(f).size : 0; } catch { tailAt = 0; }
  // A resumed session's shell starts where it was left, which may be a worktree: relative names in commands are read from there.
  if (sessionId && transcript) { const f = transcript(sessionId); if (f) lastCwd(f, null).then(d => { if (d && !run.builder.shellDir) run.builder.shellDir = d; }); }
  function readNotes() { return reading ||= (async () => {
    const file = transcriptFile(); if (!file) return;
    let size; try { size = (await fsp.stat(file)).size; } catch { return; }
    if (size < tailAt) tailAt = 0;
    if (size === tailAt) return;
    const fh = await fsp.open(file, 'r');
    try { const buf = Buffer.alloc(Math.min(size - tailAt, 4 << 20)); await fh.read(buf, 0, buf.length, tailAt); tailAt += buf.length; tailBuf += buf.toString('utf8'); }
    finally { await fh.close(); }
    const lines = tailBuf.split('\n'); tailBuf = lines.pop();
    let changed = false;
    for (const line of lines) {
      if (!line.includes('<task-notification>') || !line.includes('"type":"user"')) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      const c = m.message?.content, text = typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b.type === 'text').map(b => b.text).join('\n') : '';
      const n = parseNotification(text); if (!n) continue;
      sayItems(run.builder.notify(n, m.timestamp));
      const e = run.bg.get(n.task);
      if (e && n.event) { e.events++; e.last = n.event; e.fresh = true; changed = true; }
    }
    if (changed) sayState();
  })().finally(() => { reading = null; }); }
  // The end of what each background command has printed, for its line in the tray.
  async function readTails() {
    let changed = false;
    for (const e of run.bg.values()) {
      if (e.kind !== 'shell' || !run.bgFile(e)) continue;
      try {
        const st = await fsp.stat(e.file); if (st.size === e.size) continue; e.size = st.size;
        const fh = await fsp.open(e.file, 'r'), n = Math.min(st.size, 2048), buf = Buffer.alloc(n);
        try { await fh.read(buf, 0, n, st.size - n); } finally { await fh.close(); }
        const last = buf.toString('utf8').split('\n').map(l => l.trim()).filter(Boolean).pop() || null;
        if (last !== e.last) { e.last = last && last.slice(0, 300); changed = true; }
      } catch {}
    }
    if (changed) sayState();
  }
  run.timer = setInterval(() => { if (run.bg.size || run.status === 'working') { readNotes().catch(() => {}); readTails(); } }, 1000);

  // The agent wants to use a tool or ask something: park the turn until the card is answered.
  const canUseTool = (toolName, input, { signal, suggestions, toolUseID }) => new Promise(resolve => {
    const kind = toolName === 'AskUserQuestion' ? (Array.isArray(input?.questions) && input.questions.every(q => q.question && Array.isArray(q.options)) ? 'question' : 'unknown')
      : toolName === 'ExitPlanMode' ? 'plan' : 'permission';
    const choices = kind === 'permission' ? permissionChoices(suggestions) : [];
    const finish = result => {
      if (run.pending?.id !== id) return; run.pending = null; run.status = 'working';
      // its clock starts once you let it run, not while it waited for you
      if (toolUseID) sayItems(run.builder.touchStep(toolUseID, st => { delete st.wait; if (result.behavior === 'allow') st.start = Date.now(); }));
      sayState(); resolve(result);
    };
    const id = randomUUID();
    run.pending = { id, kind, toolName, input, choices, suggestions: suggestions || [], finish };
    run.status = 'waiting'; run.activity = describeTool(toolName, input).verb;
    // files its options point at are offered with what it made, even ones it did not write this turn
    // (only from the project or the folders it may read: a page is served with its neighbours)
    if (kind === 'question') {
      const inside = f => [cwd, ...readable].some(d => d && !path.relative(d, f).startsWith('..') && !path.isAbsolute(path.relative(d, f)));
      for (const q of input.questions) for (const o of q.options) { const f = previewPath(o?.preview, cwd); if (f && inside(f)) run.builder.offer(f); }
    }
    if (kind !== 'permission') sayItems(run.builder.flushWork()); // what it made so far is usually what the question is about
    else if (toolUseID) sayItems(run.builder.touchStep(toolUseID, st => { st.wait = true; }));
    sayState();
    signal?.addEventListener('abort', () => finish({ behavior: 'deny', message: 'Cancelled.' }));
  });

  // The input stays open for the whole turn: the agent can ask questions, and you can write to it while it works.
  // Claude Code folds such a message into the running turn between steps, or runs it as a turn of its own right after.
  let endTurn, ended = false; run.finished = new Promise(r => { endTurn = () => { ended = true; wake?.(); r(); }; });
  const inbox = []; let wake = null;
  run.sent = new Set();
  // What you write while it works waits here, where you can still take it back or change it, until the agent
  // finishes the step it is on; then Claude Code gets it, and reads it before its next step (or right after the turn).
  run.held = held.length ? held : existing?.held || [];   // left over from a turn you stopped: they still go
  const handOver = () => { const h = run.held.splice(0); for (const m of h) run.add(m.content); return h.length; };
  run.add = more => {
    const uuid = randomUUID(); run.sent.add(uuid);
    inbox.push({ type: 'user', message: { role: 'user', content: more }, parent_tool_use_id: null, uuid, priority: 'next' });
    wake?.();
    sayItems(run.builder.user(more, new Date().toISOString())); sayState();
  };
  async function* prompt() {
    yield { type: 'user', message: { role: 'user', content }, parent_tool_use_id: null };
    while (!ended) {
      if (inbox.length) { yield inbox.shift(); continue; }
      await new Promise(r => { wake = r; }); wake = null;
    }
  }

  const started = new Promise((resolve, reject) => {
    (async () => {
      try {
        run.q = query({ prompt: prompt(), options: {
          cwd, env, resume: sessionId || undefined, canUseTool, additionalDirectories: readable,
          model: model || undefined, effort: effort || undefined,
          // what you picked; otherwise your own Claude Code setting decides
          permissionMode: run.mode || process.env.WORKWOOD_PERMISSION_MODE || undefined,
          ...(run.mode === 'bypassPermissions' ? { allowDangerouslySkipPermissions: true } : {}),
          pathToClaudeCodeExecutable: claude,
          systemPrompt: { type: 'preset', preset: 'claude_code', append: SHOW_NOTE },
          settingSources: ['user', 'project', 'local'],
          stderr: d => { if (process.env.WORKWOOD_DEBUG) process.stderr.write(d); },
        } });
        const stream = run.q[Symbol.asyncIterator]();
        let follows = false;   // a result said another turn follows: wait for it, but not for ever
        for (;;) {
          const next = stream.next(); next.catch(() => {});
          let got;
          if (follows) got = await Promise.race([next, sleep(60000)]);
          else if (run.lingering) {
            // the turn is over but work goes on in the background: wait for the next turn, or for it all to end
            got = await Promise.race([next, new Promise(r => { run.onQuiet = () => r('quiet'); if (!run.bg.size) r('quiet'); })]);
            run.onQuiet = null;
            if (got === 'quiet') got = await Promise.race([next, sleep(GRACE)]);
          } else got = await next;
          if (!got || got.done) break;
          follows = false;
          const m = got.value;
          if (run.lingering && !m.parent_tool_use_id && (m.type === 'assistant' || m.type === 'user' || (m.type === 'system' && m.subtype === 'init'))) await wakeUp('Background update');
          if (m.session_id && !run.sessionId) {
            run.sessionId = m.session_id; runs.set(run.sessionId, run);
            resolve(run.sessionId);
            sayItems(run.builder.user(content, new Date().toISOString()));
            sayState();
          }
          // Claude Code says which mode it is in when a turn starts and whenever the mode changes (a plan approved, edits allowed)
          if (m.type === 'system' && (m.subtype === 'init' || m.subtype === 'status') && m.permissionMode && m.permissionMode !== run.mode) { run.mode = m.permissionMode; sayState(); }
          if (m.type === 'assistant' && !m.parent_tool_use_id) {
            if (m.error) { run.stopped = { reason: ERRORS[m.error] || 'error', text: textOf(m.message) }; continue; }
            sayItems(run.builder.assistant(m.message));
            if (run.builder.context) run.context = run.builder.context;
            const blocks = m.message.content || [];
            const tool = [...blocks].reverse().find(b => b.type === 'tool_use');
            if (tool) { const d = describeTool(tool.name, tool.input); run.activity = d.what ? `${d.verb} ${d.what}` : d.verb; }
            else if (blocks.some(b => b.type === 'text')) run.activity = 'Writing';
            if (run.status === 'working') sayState();
          } else if (m.type === 'assistant') {
            sayItems(run.builder.sub(m.message, m.parent_tool_use_id));            // an agent's own steps, inside its step
          } else if (m.type === 'user' && m.parent_tool_use_id) {
            sayItems(run.builder.results(m.message?.content, null, { result: m.tool_use_result }));
          } else if (m.type === 'system' && m.subtype === 'task_started') {
            // a command or agent Claude Code runs as a task can be stopped on its own
            run.known.set(m.task_id, { tool: m.tool_use_id || null, description: m.description, task_type: m.task_type, subagent_type: m.subagent_type });
            if (m.tool_use_id) { run.tasks.set(m.tool_use_id, m.task_id); sayItems(run.builder.touchStep(m.tool_use_id, st => { st.task = m.task_id; if (m.is_backgrounded) st.bg = true; })); }
            if (m.is_backgrounded || run.bg.has(m.task_id)) { addBg(m.task_id); sayState(); }
          } else if (m.type === 'system' && m.subtype === 'task_updated') {
            if (m.patch?.is_backgrounded && run.known.has(m.task_id)) { addBg(m.task_id); sayState(); }
          } else if (m.type === 'system' && m.subtype === 'background_tasks_changed') {
            // the whole set of what runs in the background, whenever it changes
            const now = new Set((m.tasks || []).map(t => t.task_id));
            for (const t of m.tasks || []) { if (!run.known.has(t.task_id)) run.known.set(t.task_id, { tool: null, description: t.description, task_type: t.task_type, subagent_type: t.subagent_type }); if (!run.bg.has(t.task_id)) addBg(t.task_id); }
            for (const id of [...run.bg.keys()]) if (!now.has(id)) endBg(id);
            sayState();
          } else if (m.type === 'system' && m.subtype === 'task_progress') {
            const e = run.bg.get(m.task_id), u = m.usage || {};
            if (e) { e.tokens = u.total_tokens || e.tokens; e.steps = u.tool_uses ?? e.steps; e.last = m.description || e.last; sayState(); }
            if (m.tool_use_id) sayItems(run.builder.touchStep(m.tool_use_id, st => { st.tokens = u.total_tokens; st.count = u.tool_uses; st.doing = m.description; }));
          } else if (m.type === 'system' && m.subtype === 'task_notification') {
            if (m.tool_use_id) {
              run.tasks.delete(m.tool_use_id);
              // a command left running in the background has finished: its step ends now
              sayItems(run.builder.touchStep(m.tool_use_id, st => { delete st.task; if (m.status === 'stopped') st.stopped = true;
                if (m.usage?.total_tokens) { st.tokens = m.usage.total_tokens; st.count = m.usage.tool_uses; }
                if (st.state === 'bg' && !st.end) { st.end = Date.now(); const code = /exit code (\d+)/i.exec(m.summary || '')?.[1];
                  st.state = m.status === 'failed' || (code != null && +code !== 0) ? 'bad' : m.status === 'completed' ? 'ok' : 'stop'; if (code != null) st.code = +code; } }));
            }
            const e = run.bg.get(m.task_id), code = /exit code (\d+)/i.exec(m.summary || '')?.[1];
            // a background failure needs you even after the turn: the session shows as unread
            if (e && (m.status === 'failed' || (code != null && +code !== 0))) emit('bg-failed', { sessionId: run.sessionId });
            endBg(m.task_id); readNotes().catch(() => {}); sayState();
          } else if (m.type === 'user' && !m.parent_tool_use_id) {
            run.builder.closeText(); run.builder.toolsDone();
            sayItems(run.builder.results(m.message?.content, null, { result: m.tool_use_result }));
            handOver();
            if (run.status === 'working') { run.activity = 'Thinking'; sayState(); }
          } else if (m.type === 'result') {
            // Resuming a session with work left over from a closed Claude Code, it reports that work first, with a result
            // of its own that ran no turn. Your message has not been answered yet: that result does not end the turn.
            if (m.origin?.kind === 'task-notification' && !m.num_turns) continue;
            for (const [name, u] of Object.entries(m.modelUsage || {})) learnWindow(name, u.contextWindow);
            const win = Object.values(m.modelUsage || {}).map(u => u.contextWindow).filter(Boolean).sort((a, b) => b - a)[0];
            if (win && run.context) run.context = { ...run.context, window: win };
            // What the context holds now, as Claude Code counts it: after /compact the last reply's size is no longer it.
            const exact = await Promise.race([run.q.getContextUsage().catch(() => null), sleep(3000).then(() => null)]);
            if (exact?.rawMaxTokens) { learnWindow(exact.model, exact.rawMaxTokens); run.context = { used: exact.totalTokens, window: exact.rawMaxTokens }; }
            if (m.is_error && !run.stopped) run.stopped = { reason: /limit/i.test(m.result || '') ? 'limit' : 'error', text: m.result || 'The turn ended with an error.' };
            sayItems(run.stopped ? run.builder.flushWork() : run.builder.done(m.duration_ms, new Date().toISOString()));
            for (const u of m.user_message_uuids || []) run.sent.delete(u);
            // What you wrote meanwhile and the agent has not read yet runs as a turn of its own, straight away.
            const given = run.stopped || run.interrupted ? 0 : handOver();
            // The queue count leaves out a message Claude Code has already taken off its queue to run next (as it has after
            // /compact): one handed over that no result has answered yet still has a turn coming.
            const more = given || Math.max(m.queued_turn_count ?? 0, run.sent.size, inbox.length);
            if (run.stopped || run.interrupted) break;
            if (more > 0) { follows = true; run.activity = 'Reading your message'; sayState(); continue; }
            if (!run.bg.size) break;
            // work left running in the background keeps the session open; the turn itself is over
            run.lingering = true; run.status = 'idle'; run.activity = null; run.endedAt = Date.now();
            sayState(); turnOver();
          }
        }
      } catch (e) {
        if (!run.stopped && !run.interrupted) run.stopped = { reason: /auth|login/i.test(e.message) ? 'auth' : 'error', text: String(e.message).split('\n')[0] };
        if (!run.sessionId) reject(new Error(run.stopped?.text || e.message));
      } finally {
        endTurn(); clearInterval(run.timer); await readNotes().catch(() => {});
        run.pending = null; run.q = null; run.endedAt = Date.now(); run.lingering = false; run.bg.clear();
        // Only a limit or a lost sign-in holds the session for you to act on; any other error ends the turn, with a note saying what went wrong.
        run.status = run.stopped && run.stopped.reason !== 'error' ? 'stopped' : 'idle';
        run.activity = null;
        sayItems(run.builder.flushWork());
        sayItems(run.builder.endOpen(true));   // what still ran in the background ends with the session
        if (run.interrupted) sayItems([run.builder.push({ kind: 'note', text: 'Interrupted' })]);
        else if (run.stopped) sayItems([run.builder.push({ kind: 'note', stop: run.stopped.reason, profile: run.profile, ts: new Date().toISOString(), ...(run.stopped.reason === 'error' && run.stopped.text ? { text: run.stopped.text } : {}) })]);
        sayState();
        turnOver();
        // "Send now": the step was cut short for a waiting message, which starts the next turn straight away.
        if (run.sendNow && run.held.length && run.sessionId && runs.get(run.sessionId) === run) {
          const [first, ...rest] = run.held; run.held = [];
          try { startTurn({ sessionId: run.sessionId, cwd, profile, env, text: first.text, content: first.content, model, effort: run.effort, mode: run.mode, claude, emit, readable, held: rest, transcript }); }
          catch { run.held = [first, ...rest]; sayState(); }
        }
      }
    })();
    if (sessionId) {
      resolve(sessionId);
      sayItems(run.builder.user(content, new Date().toISOString()));
      sayState();
    }
  });
  return started;
}

const textOf = message => (message?.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').trim();

// Extra buttons for a permission card, taken from what Claude Code itself suggests.
function permissionChoices(suggestions = []) {
  const out = [];
  suggestions.forEach((s, i) => {
    if (s.type === 'addRules' && s.behavior === 'allow' && s.rules?.length) {
      const rule = s.rules.map(r => r.ruleContent ? `${r.toolName}(${r.ruleContent})` : r.toolName).join(', ');
      out.push({ id: `session:${i}`, label: 'Allow this session', code: rule });
      out.push({ id: `project:${i}`, label: 'Always allow in this project', code: rule });
    } else if (s.type === 'setMode' && s.mode === 'acceptEdits') {
      out.push({ id: `session:${i}`, label: 'Allow all edits this session' });
    }
  });
  return out;
}

/**
 * Changes the permission mode. A turn that is running takes it from its next step; a card already waiting
 * stays until you answer it. Either way the session's next turns start in it.
 */
export async function setMode(sessionId, mode) {
  const run = runs.get(sessionId);
  if (!run) return false;
  run.mode = mode;
  if (run.q) await run.q.setPermissionMode(mode);
  run.notify?.();
  return true;
}

/** Answers the card a turn is waiting on. */
export function answer(sessionId, { requestId, action, choice, answers, text }) {
  const run = runs.get(sessionId), p = run?.pending;
  if (!p || p.id !== requestId) throw new Error('That question is no longer waiting.');
  const said = (text || '').trim();
  if (p.kind === 'question' && action === 'answer') {
    return p.finish({ behavior: 'allow', updatedInput: { ...p.input, answers: answers || {} } });
  }
  if (action === 'allow') {
    let updatedPermissions;
    if (p.kind === 'plan' && choice === 'plan:ask') updatedPermissions = [{ type: 'setMode', mode: 'default', destination: 'session' }];   // approve, but ask before each edit
    else if (choice) {
      const [where, i] = choice.split(':'); const s = p.suggestions[+i];
      if (s) updatedPermissions = [{ ...s, destination: where === 'project' ? 'localSettings' : 'session' }];
    }
    const to = updatedPermissions?.find(u => u.type === 'setMode')?.mode;
    if (to) run.mode = to;   // the picker follows at once; Claude Code confirms it with its next status
    return p.finish({ behavior: 'allow', updatedInput: p.input, ...(updatedPermissions ? { updatedPermissions } : {}) });
  }
  // Declined, or answered in the user's own words.
  const message = said ? `The user did not approve this and said: ${said}` : p.kind === 'permission' ? 'The user denied this.' : 'The user declined to answer.';
  p.finish({ behavior: 'deny', message });
}

/**
 * The slash commands and skills a session in this folder would have, as Claude Code itself reports them at
 * start-up. Nothing is sent to the agent and no session is created.
 */
export async function listCommands({ cwd, env, claude }) {
  let release; const held = new Promise(r => { release = r; });
  const q = query({ prompt: (async function* () { await held; })(), options: { cwd, env, pathToClaudeCodeExecutable: claude,
    settingSources: ['user', 'project', 'local'], stderr: () => {} } });
  let timer;
  try { return await Promise.race([q.supportedCommands(), new Promise((_, no) => { timer = setTimeout(() => no(new Error('Claude Code did not answer.')), 20000); })]); }
  finally { clearTimeout(timer); release(); try { q.close?.(); } catch {} }
}

/** Queues a message while the agent works; it goes to the agent when the step it is on ends. */
export function addToTurn(sessionId, msg) {
  const run = runs.get(sessionId);
  if (!run?.q || run.status !== 'working') throw new Error('This session is not working right now.');
  const id = randomUUID();
  run.held.push({ id, ...msg }); run.notify?.();
  return id;
}

/** Takes queued messages back, to edit them; those the agent already has stay with it. No ids: all of them. */
export function unqueue(sessionId, ids) {
  const run = runs.get(sessionId);
  if (!run?.held?.length) return [];
  const out = run.held.filter(h => !ids || ids.includes(h.id));
  run.held = run.held.filter(h => !out.includes(h)); run.notify?.();
  return out.map(h => ({ id: h.id, text: h.text, attachments: h.attachments || [] }));
}

/** Sends a queued message right away: the step the agent is on is cut short and the message starts the next turn. */
export async function sendNow(sessionId, id) {
  const run = runs.get(sessionId), i = run?.held?.findIndex(h => h.id === id) ?? -1;
  if (i < 0) throw new Error('That message is no longer waiting.');
  if (!run.q) throw new Error('This session is not working right now.');
  run.held.unshift(...run.held.splice(i, 1));
  run.sendNow = true; run.notify?.();
  await stop(sessionId);
}

/**
 * What fills a session's context, as Claude Code itself counts it. Asked of the running turn when there is one;
 * otherwise the session is opened without sending anything, asked, and closed again.
 */
const learn = u => { learnWindow(u?.model, u?.rawMaxTokens); return u; };
export async function contextOf({ sessionId, cwd, env, claude }) {
  const live = runs.get(sessionId)?.q;
  const within = p => { let t; return Promise.race([p, new Promise((_, no) => { t = setTimeout(() => no(new Error('Claude Code did not answer.')), 20000); })]).finally(() => clearTimeout(t)); };
  if (live) return within(live.getContextUsage()).then(learn);
  let release; const held = new Promise(r => { release = r; });
  const q = query({ prompt: (async function* () { await held; })(), options: { cwd, env, resume: sessionId, pathToClaudeCodeExecutable: claude,
    settingSources: ['user', 'project', 'local'], stderr: () => {} } });
  try { return learn(await within(q.getContextUsage())); }
  finally { release(); try { q.close?.(); } catch {} }
}

/** Stops one command the agent is running, leaving the turn to carry on. */
export async function stopStep(sessionId, toolUseId) {
  const run = runs.get(sessionId), task = run?.tasks?.get(toolUseId) || (run?.bg?.has(toolUseId) ? toolUseId : null);
  if (!run?.q || !task) throw new Error('That command is no longer running.');
  await run.q.stopTask(task);
}

/** The end of what a background task has printed so far (its output file), up to `max` bytes. */
export async function taskOutput(sessionId, id, max = 64 * 1024) {
  const run = runs.get(sessionId), e = run?.bg && ([...run.bg.values()].find(t => t.id === id || t.tool === id));
  if (!e || !run.bgFile(e)) return null;
  try {
    const st = await fsp.stat(e.file), n = Math.min(st.size, max), buf = Buffer.alloc(n), fh = await fsp.open(e.file, 'r');
    try { await fh.read(buf, 0, n, st.size - n); } finally { await fh.close(); }
    let text = buf.toString('utf8'); if (n < st.size) text = text.slice(text.indexOf('\n') + 1);
    return { text, size: st.size, cut: n < st.size };
  } catch { return { text: '', size: 0, cut: false }; }
}

/** The whole output of a step from the turn in memory, when it kept it. */
export const liveOutput = (sessionId, toolUseId) => runs.get(sessionId)?.builder.outputOf(toolUseId) ?? null;

export async function stop(sessionId) {
  const run = runs.get(sessionId);
  if (!run?.q) return;
  run.interrupted = true;
  if (run.pending) run.pending.finish({ behavior: 'deny', message: 'The user stopped the turn.', interrupt: true });
  try { await run.q.interrupt(); } catch {}
}
