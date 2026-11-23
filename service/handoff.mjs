// Handoffs: going on in a new session without losing the old one. A session is read from its history file into
// the facts no model may drop (every message you wrote, your answers, the files changed, the commands that failed)
// and a digest for a model to judge (where it is, what was decided, what was tried, what is open). The new session
// gets both, and a `recall` tool that searches the earlier sessions of the thread word for word.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';
import { query, createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';

export const HANDOFF_ROOT = path.join(os.homedir(), '.cache', 'workwood', 'handoffs');
export const MODELS = ['auto', 'haiku', 'sonnet', 'opus'];
export const EFFORTS = ['low', 'medium', 'high'];
export const OFFERS = [100000, 200000, 300000, 400000, 600000];
export const RECALL = 'mcp__workwood__recall';
// What the new session is told, as its first message, when you handed off without saying anything.
export const FIRST = 'Continue from the handoff in your instructions. In two or three short lines, say where things stand and what comes next; then wait for me.';

const clip = (s, n) => { s = String(s ?? ''); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const one = s => String(s ?? '').replace(/\s+/g, ' ').trim();
const textOf = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(b => b?.type === 'text' && b.text).map(b => b.text).join('\n') : '';
// Text in a user line that nobody typed: reminders, command wrappers, background notes, hook output.
const typed = t => {
  if (!t || !t.trim()) return null;
  if (t.includes('<task-notification>') || /^\s*(Caveat:|\[Request interrupted|This session is being continued)/.test(t)) return null;
  const cmd = /<command-name>\/?([^<\s]+)<\/command-name>/.exec(t);
  if (cmd) return /<local-command-stdout>/.test(t) ? null : ('/' + cmd[1] + ' ' + (/<command-args>([\s\S]*?)<\/command-args>/.exec(t)?.[1] || '')).trim();
  if (/^\s*</.test(t)) return null;
  return t.replace(/(?:^|\n+)Attached files:\n(?:- .+\n?)+$/, '').trim() || null;
};
// A message that turns the agent around: worth a bigger model to follow.
const CORRECTION = /^(no\b|nope|not\b|don'?t|do not|stop|instead|actually|wrong|revert|undo|that'?s not|wait\b|rather\b)/i;

/**
 * One pass over a session's history. `facts`: what goes to the new session word for word. `digest`: the session as
 * lines a model can read, without the bulk of what tools printed. `stats`: how much went on, for picking a model.
 */
export async function collect(file, cwd = null) {
  const facts = { messages: [], answers: [], files: [], failed: [] }, lines = [], files = new Set();
  const asks = new Map(), cmds = new Map();
  const stats = { messages: 0, failed: 0, corrections: 0, chars: 0 };
  if (!file || !fs.existsSync(file)) return { facts, digest: '', stats };
  const rel = p => { if (!p) return ''; const r = cwd ? path.relative(cwd, p) : p; return r && !r.startsWith('..') ? r : p; };
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.isSidechain || m.isMeta || !m.message) continue;
    const ts = m.timestamp || null, c = m.message.content;
    if (m.type === 'user') {
      if (Array.isArray(c) && c.some(b => b?.type === 'tool_result')) {
        for (const r of c) {
          if (r?.type !== 'tool_result') continue;
          if (asks.has(r.tool_use_id)) {
            const qs = asks.get(r.tool_use_id), given = m.toolUseResult?.answers;
            if (given && typeof given === 'object') for (const [q, a] of Object.entries(given)) { facts.answers.push({ ts, q, a: String(a) }); lines.push(`You answered "${one(q)}": ${one(a)}`); }
            else if (r.is_error) { const said = /and said: ([\s\S]+)$/.exec(textOf(r.content))?.[1]?.trim(); if (said) { facts.answers.push({ ts, q: qs.map(x => x.question).join(' / '), a: said }); lines.push(`You answered instead: ${one(said)}`); } }
            continue;
          }
          const cmd = cmds.get(r.tool_use_id);
          if (r.is_error && cmd != null) {
            const err = textOf(r.content).replace(/^Exit code \d+\n?/, '').trim();
            if (/^The user (doesn't want|denied|did not approve)|^\[Request interrupted/i.test(err)) continue;
            stats.failed++; facts.failed.push({ ts, cmd: clip(one(cmd), 300), err: clip(err.split('\n').filter(Boolean).slice(-6).join('\n'), 600) });
            lines.push(`Failed: ${clip(one(cmd), 300)}\n  ${clip(err.split('\n').filter(Boolean).slice(-4).join(' / '), 500)}`);
          }
        }
        continue;
      }
      const said = typed(textOf(c));
      if (!said) continue;
      stats.messages++; if (CORRECTION.test(said)) stats.corrections++;
      facts.messages.push({ ts, text: said });
      lines.push(`You: ${said}`);
    } else {
      if (m.error || m.message.model === '<synthetic>') continue;
      for (const b of c || []) {
        if (b.type === 'text' && b.text?.trim()) lines.push(`Agent: ${clip(b.text.trim(), 4000)}`);
        else if (b.type === 'tool_use') {
          const i = b.input || {};
          if (b.name === 'AskUserQuestion') { asks.set(b.id, Array.isArray(i.questions) ? i.questions : []); lines.push(`Agent asked: ${(i.questions || []).map(q => one(q.question)).join(' / ')}`); }
          else if (b.name === 'ExitPlanMode') lines.push(`Agent proposed a plan: ${clip(one(i.plan), 1500)}`);
          else if (/^(Edit|MultiEdit|Write|NotebookEdit)$/.test(b.name)) { const f = rel(i.file_path || i.notebook_path); if (f) { files.add(f); lines.push(`${b.name === 'Write' ? 'Wrote' : 'Edited'} ${f}`); } }
          else if (b.name === 'Bash' || b.name === 'PowerShell') { cmds.set(b.id, i.command || ''); lines.push(`Ran: ${clip(one(i.description ? `${i.description} (${i.command})` : i.command), 300)}`); }
          else if (b.name === RECALL) lines.push(`Looked back for: ${one(i.query)}`);
          else if (b.name === 'Agent' || b.name === 'Task') lines.push(`Ran an agent: ${one(i.description)}`);
        }
      }
    }
  }
  facts.files = [...files];
  const digest = lines.join('\n');
  stats.chars = digest.length;
  return { facts, digest, stats };
}

/** The model a handoff is written by: the one picked, or for Auto, by how much went on (not by length alone). */
export function pickModel(pref, stats) {
  if (pref && pref !== 'auto') return pref;
  if (stats.messages >= 40 || stats.failed >= 15 || stats.corrections >= 8) return 'opus';
  if (stats.messages <= 6 && stats.failed <= 2 && stats.corrections <= 1 && stats.chars < 60000) return 'haiku';
  return 'sonnet';
}

// How much of the digest a model is given: well inside its window, with room for the answer.
const ROOM = { haiku: 360000, sonnet: 560000, opus: 560000 };
export function trimDigest(digest, model) {
  const max = ROOM[model] || ROOM.sonnet;
  if (digest.length <= max) return digest;
  const head = Math.floor(max * 0.2), tail = max - head;
  const left = digest.slice(head, digest.length - tail).split('\n').length;
  return digest.slice(0, head) + `\n[… ${left} lines of the middle left out; the user's own messages are all given separately …]\n` + digest.slice(-tail);
}

const WRITER = `You write handoffs between two sessions of the same piece of software work. The next session starts with nothing but your handoff, a list of what the user wrote, and a tool to search the old session word for word.
Read the session and write exactly these four sections, as terse bullet points, nothing before or after them:
## Where it is
What state the work is in now, and what the agent was doing last.
## Decided
Decisions that still stand. When a decision was changed later, give only the final one and say it replaced an earlier one. Include preferences and constraints the user stated, even once.
## Tried
What was tried and did not work, and why it failed; what worked instead. This keeps the next session from repeating mistakes.
## Open
What is left to do or still undecided, including questions waiting for the user.
Name files, commands and exact values where they matter. Leave out what does not help the next session continue.`;

/** Runs the writer: one turn, no tools, saved nowhere. Resolves with the four sections. */
export async function writeSections({ digest, previous, model, effort, cwd, env, claude, timeout = 6 * 60_000 }) {
  const prompt = (previous ? `The session below itself started from this handoff:\n<previous-handoff>\n${previous}\n</previous-handoff>\n\n` : '')
    + `The session:\n<session>\n${trimDigest(digest, model) || '(nothing happened in it yet)'}\n</session>\n\nWrite the handoff.`;
  const q = query({ prompt, options: { cwd, env, model, ...(effort ? { effort } : {}), maxTurns: 1, tools: [], persistSession: false, settingSources: [],
    systemPrompt: WRITER, pathToClaudeCodeExecutable: claude, stderr: d => { if (process.env.WORKWOOD_DEBUG) process.stderr.write(d); } } });
  let timer, text = '', err = null;
  const done = (async () => {
    for await (const m of q) {
      if (m.type === 'assistant' && !m.parent_tool_use_id) {
        if (m.error) err = textOf(m.message?.content) || m.error;
        else text += textOf(m.message?.content);
      } else if (m.type === 'result' && m.is_error && !err) err = m.result || 'The handoff could not be written.';
    }
  })();
  try { await Promise.race([done, new Promise((_, no) => { timer = setTimeout(() => no(new Error('Writing the handoff took too long.')), timeout); })]); }
  finally { clearTimeout(timer); try { q.close?.(); } catch {} }
  if (err && !text.trim()) throw new Error(String(err).split('\n')[0]);
  if (!text.trim()) throw new Error('The handoff came back empty.');
  return text.trim();
}

const when = ts => { const d = new Date(ts); return isNaN(d) ? '' : d.toISOString().slice(0, 16).replace('T', ' '); };
const MSG_CHARS = 3000, MSGS_CHARS = 60000;
/** The facts, as the part of the handoff written without a model. */
export function factsText(facts) {
  const out = [];
  // every message, word for word; a pasted wall of text is cut, and past the total the oldest give way
  let msgs = facts.messages.map(m => `- ${when(m.ts) ? when(m.ts) + ' — ' : ''}${m.text.length > MSG_CHARS ? m.text.slice(0, MSG_CHARS) + ' … [cut; recall finds the rest]' : m.text}`);
  let total = msgs.reduce((n, s) => n + s.length, 0), dropped = 0;
  while (total > MSGS_CHARS && msgs.length > 1) { total -= msgs[0].length; msgs.shift(); dropped++; }
  if (msgs.length) out.push('## Your messages, word for word\n' + (dropped ? `(${dropped} earlier ones left out for length; recall finds them)\n` : '') + msgs.join('\n'));
  if (facts.answers.length) out.push('## Your answers\n' + facts.answers.map(a => `- ${one(a.q)}: ${one(a.a)}`).join('\n'));
  if (facts.files.length) out.push('## Files changed\n' + facts.files.slice(0, 200).map(f => `- ${f}`).join('\n'));
  if (facts.failed.length) out.push('## Commands that failed\n' + facts.failed.slice(-30).map(f => `- \`${f.cmd}\`\n  ${f.err.replace(/\n/g, '\n  ')}`).join('\n'));
  return out.join('\n\n');
}

/** What the new session is told, after Claude Code's own instructions, on every turn. */
export const noteFor = (h, n) => `This session continues ${n > 2 ? `${n - 1} earlier sessions` : 'an earlier session'} of the same work, a thread. `
  + `Below is the handoff written when the last one was handed off. The earlier sessions are kept: search them word for word with the recall tool `
  + `(${RECALL}) before retrying something that may have been tried, when you are not sure what was decided or why, or when the user refers to something from before.\n\n`
  + `<handoff>\n${h.sections}\n\n${h.facts}\n</handoff>`;

/* ---------- where handoffs are kept: one file per new session ---------- */
const fileFor = id => path.join(HANDOFF_ROOT, id + '.json');
export function readHandoff(id) { try { return JSON.parse(fs.readFileSync(fileFor(id), 'utf8')); } catch { return null; } }
export async function saveHandoff(id, h) { await fsp.mkdir(HANDOFF_ROOT, { recursive: true }); await fsp.writeFile(fileFor(id), JSON.stringify(h)); }
/** The first line of what a handoff says about where things stood: what the session it was written from was about. */
export const topicOf = h => one((/## Where it is\s*\n([\s\S]*?)(?:\n##|$)/.exec(h?.sections || '')?.[1] || '').split('\n').map(l => l.replace(/^[-*•\s]+/, '')).find(Boolean) || '').slice(0, 140) || null;

/** How many messages you wrote in a session: counted once per size of its history file. */
const counts = new Map();
export async function countMessages(file) {
  let size; try { size = (await fsp.stat(file)).size; } catch { return 0; }
  const had = counts.get(file); if (had?.size === size) return had.n;
  let n = 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  for await (const line of rl) {
    if (!line.includes('"type":"user"') || line.includes('"tool_result"') || line.includes('"isMeta":true') || line.includes('"isSidechain":true')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (typed(textOf(m.message?.content))) n++;
  }
  counts.set(file, { size, n });
  return n;
}

/* ---------- recall: the earlier sessions, searched word for word ---------- */
const WORD = /[\p{L}\p{N}_.:/-]{2,}/gu;
/**
 * Searches the given transcripts (newest session first) for the words of `q`: what you wrote, what the agent said,
 * the commands it ran and the errors they ended with. At most `max` excerpts, short, with who said them and when.
 */
export async function search(sessions, q, { max = 5, chars = 6000 } = {}) {
  const terms = [...new Set((String(q).toLowerCase().match(WORD) || []))].slice(0, 12), phrase = one(q).toLowerCase();
  if (!terms.length) return { hits: [], text: 'Give some words to look for.' };
  const hits = [];
  for (const [si, s] of sessions.entries()) {
    if (!s.file || !fs.existsSync(s.file)) continue;
    const cmds = new Map();
    const rl = readline.createInterface({ input: fs.createReadStream(s.file, { encoding: 'utf8' }), crlfDelay: Infinity });
    for await (const line of rl) {
      if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) continue;
      const low = line.toLowerCase();
      if (!terms.some(t => low.includes(t)) && !line.includes('"tool_use"')) continue;
      let m; try { m = JSON.parse(line); } catch { continue; }
      if (m.isSidechain || m.isMeta || !m.message) continue;
      const c = m.message.content, found = [];
      if (m.type === 'user') {
        if (Array.isArray(c) && c.some(b => b?.type === 'tool_result')) {
          for (const r of c) if (r?.type === 'tool_result' && r.is_error && cmds.has(r.tool_use_id)) found.push(['command failed', `${cmds.get(r.tool_use_id)}\n${textOf(r.content)}`]);
        } else { const t = typed(textOf(c)); if (t) found.push(['you', t]); }
      } else if (!m.error) for (const b of c || []) {
        if (b.type === 'text' && b.text) found.push(['agent', b.text]);
        else if (b.type === 'tool_use' && (b.name === 'Bash' || b.name === 'PowerShell')) { cmds.set(b.id, b.input?.command || ''); found.push(['agent ran', b.input?.command || '']); }
      }
      for (const [who, text] of found) {
        const lt = text.toLowerCase(), got = terms.filter(t => lt.includes(t));
        if (!got.length) continue;
        const score = got.length / terms.length + (phrase.length > 3 && lt.includes(phrase) ? 1 : 0);
        hits.push({ session: s, si, who, ts: m.timestamp || null, text, at: lt.indexOf(got[0]), score });
      }
    }
  }
  // the best matches; among equals, the newest session and then the latest moment in it
  hits.sort((a, b) => b.score - a.score || a.si - b.si || String(b.ts).localeCompare(String(a.ts)));
  const top = hits.filter(h => h.score >= Math.min(1, (hits[0]?.score || 0))).slice(0, max);
  const per = Math.max(300, Math.floor(chars / Math.max(1, top.length)) - 80);
  const ex = h => { const t = h.text.replace(/\s+/g, ' ').trim(), a = Math.max(0, h.at - Math.floor(per / 3)); return (a > 0 ? '…' : '') + t.slice(a, a + per) + (a + per < t.length ? '…' : ''); };
  const text = top.length
    ? `${top.length} of ${hits.length} match${hits.length === 1 ? '' : 'es'} in the earlier sessions of this thread:\n\n` + top.map(h => `[${h.session.label}${h.ts ? ' · ' + when(h.ts) : ''} · ${h.who}]\n${ex(h)}`).join('\n\n')
    : `Nothing in the earlier sessions of this thread mentions ${terms.map(t => `"${t}"`).join(', ')}.`;
  return { hits: top, total: hits.length, text };
}

/** The recall tool for a session that continues others. `earlier()` gives the sessions to search, newest first. */
export const recallServer = earlier => createSdkMcpServer({ name: 'workwood', version: '1.0.0', alwaysLoad: true, tools: [
  tool('recall', 'Search the earlier sessions of this thread word for word: what the user wrote, what the agent said, the commands it ran and how they failed. '
    + 'This session continues them; your instructions hold the handoff that summarises them. Use it before retrying something that may already have been tried, '
    + 'when you are not sure what was decided or why, or when the user refers to something from before. Returns a few short quoted excerpts with who said them and when.',
  { query: z.string().describe('Words to look for: names, error text, file names, the subject of a decision.') },
  async ({ query: q }) => ({ content: [{ type: 'text', text: (await search(await earlier(), q)).text }] }),
  { annotations: { readOnlyHint: true } }),
] });
