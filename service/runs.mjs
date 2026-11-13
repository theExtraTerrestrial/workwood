// Live turns. Each message you send starts one Agent SDK query that resumes the
// session, streams what the agent does, and pauses whenever it needs you.
import { query } from '@anthropic-ai/claude-agent-sdk';
import { randomUUID } from 'node:crypto';
import { Builder, describeTool, learnWindow } from './transcript.mjs';

export const runs = new Map(); // sessionId -> run
let liveSeq = 1_000_000;        // live items are numbered above anything read from a file

const ERRORS = {
  authentication_failed: 'auth', billing_error: 'limit', rate_limit: 'limit',
  invalid_request: 'error', server_error: 'error', unknown: 'error', max_output_tokens: 'error',
};

export function publicRun(r) {
  if (!r) return null;
  return {
    status: r.status, activity: r.activity, startedAt: r.startedAt, profile: r.profile, context: r.context,
    pending: r.pending && { id: r.pending.id, kind: r.pending.kind, toolName: r.pending.toolName, input: r.pending.input, choices: r.pending.choices },
    stopped: r.stopped, model: r.builder.model || null, effort: r.effort || null,
  };
}

/**
 * Starts a turn. Resolves with the session id as soon as the session exists
 * (immediately for an existing session, after start-up for a new one).
 */
export function startTurn({ sessionId, cwd, profile, env, text, model, effort, claude, emit }) {
  const existing = sessionId && runs.get(sessionId);
  if (existing && existing.status !== 'idle' && existing.status !== 'stopped') throw new Error('This session is still working.');

  const run = { sessionId: sessionId || null, cwd, profile, status: 'working', activity: 'Starting', startedAt: Date.now(),
    pending: null, stopped: null, effort: effort || existing?.effort || null, context: existing?.context || null, q: null, builder: new Builder(liveSeq) };
  liveSeq += 100_000;
  if (sessionId) runs.set(sessionId, run);

  const say = (type, data = {}) => { if (run.sessionId) emit(type, { sessionId: run.sessionId, ...data }); };
  const sayState = () => say('run', { run: publicRun(run) });
  const sayItems = items => { for (const it of items) { const { open, ...rest } = it; say('item', { item: rest }); } };

  // The agent wants to use a tool or ask something: park the turn until the card is answered.
  const canUseTool = (toolName, input, { signal, suggestions }) => new Promise(resolve => {
    const kind = toolName === 'AskUserQuestion' ? (Array.isArray(input?.questions) && input.questions.every(q => q.question && Array.isArray(q.options)) ? 'question' : 'unknown')
      : toolName === 'ExitPlanMode' ? 'plan' : 'permission';
    const choices = kind === 'permission' ? permissionChoices(suggestions) : [];
    const finish = result => { if (run.pending?.id !== id) return; run.pending = null; run.status = 'working'; sayState(); resolve(result); };
    const id = randomUUID();
    run.pending = { id, kind, toolName, input, choices, suggestions: suggestions || [], finish };
    run.status = 'waiting'; run.activity = describeTool(toolName, input).verb;
    if (kind !== 'permission') sayItems(run.builder.flushWork()); // what it made so far is usually what the question is about
    sayState();
    signal?.addEventListener('abort', () => finish({ behavior: 'deny', message: 'Cancelled.' }));
  });

  async function* prompt() {
    yield { type: 'user', message: { role: 'user', content: text }, parent_tool_use_id: null };
    await run.finished; // keep the input open so the agent can ask questions during the turn
  }
  let endTurn; run.finished = new Promise(r => { endTurn = r; });

  const started = new Promise((resolve, reject) => {
    (async () => {
      try {
        run.q = query({ prompt: prompt(), options: {
          cwd, env, resume: sessionId || undefined, canUseTool,
          model: model || undefined, effort: effort || undefined,
          permissionMode: process.env.WORKWOOD_PERMISSION_MODE || undefined, // normally your own Claude Code setting decides
          pathToClaudeCodeExecutable: claude,
          systemPrompt: { type: 'preset', preset: 'claude_code' },
          settingSources: ['user', 'project', 'local'],
          stderr: d => { if (process.env.WORKWOOD_DEBUG) process.stderr.write(d); },
        } });
        for await (const m of run.q) {
          if (m.session_id && !run.sessionId) {
            run.sessionId = m.session_id; runs.set(run.sessionId, run);
            resolve(run.sessionId);
            sayItems(run.builder.user(text, new Date().toISOString()));
            sayState();
          }
          if (m.type === 'assistant' && !m.parent_tool_use_id) {
            if (m.error) { run.stopped = { reason: ERRORS[m.error] || 'error', text: textOf(m.message) }; continue; }
            sayItems(run.builder.assistant(m.message));
            if (run.builder.context) run.context = run.builder.context;
            const blocks = m.message.content || [];
            const tool = [...blocks].reverse().find(b => b.type === 'tool_use');
            if (tool) { const d = describeTool(tool.name, tool.input); run.activity = d.what ? `${d.verb} ${d.what}` : d.verb; }
            else if (blocks.some(b => b.type === 'text')) run.activity = 'Writing';
            if (run.status === 'working') sayState();
          } else if (m.type === 'user' && !m.parent_tool_use_id) {
            run.builder.closeText();
            if (run.status === 'working') { run.activity = 'Thinking'; sayState(); }
          } else if (m.type === 'result') {
            for (const [name, u] of Object.entries(m.modelUsage || {})) learnWindow(name, u.contextWindow);
            const win = Object.values(m.modelUsage || {}).map(u => u.contextWindow).filter(Boolean).sort((a, b) => b - a)[0];
            if (win && run.context) run.context = { ...run.context, window: win };
            if (m.is_error && !run.stopped) run.stopped = { reason: /limit/i.test(m.result || '') ? 'limit' : 'error', text: m.result || 'The turn ended with an error.' };
            sayItems(run.stopped ? run.builder.flushWork() : run.builder.done(m.duration_ms, new Date().toISOString()));
            break;
          }
        }
      } catch (e) {
        if (!run.stopped && !run.interrupted) run.stopped = { reason: /auth|login/i.test(e.message) ? 'auth' : 'error', text: String(e.message).split('\n')[0] };
        if (!run.sessionId) reject(new Error(run.stopped?.text || e.message));
      } finally {
        endTurn();
        run.pending = null; run.q = null;
        run.status = run.stopped ? 'stopped' : 'idle';
        run.activity = null;
        sayItems(run.builder.flushWork());
        if (run.interrupted) sayItems([run.builder.push({ kind: 'note', text: 'Interrupted' })]);
        sayState();
        emit('turn-end', { sessionId: run.sessionId });
      }
    })();
    if (sessionId) {
      resolve(sessionId);
      sayItems(run.builder.user(text, new Date().toISOString()));
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
    if (choice) {
      const [where, i] = choice.split(':'); const s = p.suggestions[+i];
      if (s) updatedPermissions = [{ ...s, destination: where === 'project' ? 'localSettings' : 'session' }];
    }
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

export async function stop(sessionId) {
  const run = runs.get(sessionId);
  if (!run?.q) return;
  run.interrupted = true;
  if (run.pending) run.pending.finish({ behavior: 'deny', message: 'The user stopped the turn.', interrupt: true });
  try { await run.q.interrupt(); } catch {}
}
