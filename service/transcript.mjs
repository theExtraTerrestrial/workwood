// Turns Claude Code messages (from a transcript file or from a live turn) into
// the few kinds of item the conversation view draws.
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';

const base = p => (typeof p === 'string' ? path.basename(p) : '');
const clip = (s, n = 90) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/** One line describing a tool call, e.g. {verb:'Editing', what:'checkout.css', group:'edit'}. */
export function describeTool(name, input = {}) {
  switch (name) {
    case 'Read': return { group: 'read', verb: 'Reading', what: base(input.file_path) };
    case 'Edit': case 'MultiEdit': case 'Write': case 'NotebookEdit':
      return { group: 'edit', verb: name === 'Write' ? 'Writing' : 'Editing', what: base(input.file_path || input.notebook_path) };
    case 'Bash': return { group: 'run', verb: 'Running', what: clip(input.description || input.command, 70) };
    case 'Grep': case 'Glob': return { group: 'search', verb: 'Searching', what: clip(input.pattern, 50) };
    case 'WebFetch': case 'WebSearch': return { group: 'web', verb: 'Looking up', what: clip(input.query || input.url, 60) };
    case 'Agent': case 'Task': return { group: 'agent', verb: 'Running an agent', what: clip(input.description, 60) };
    case 'Skill': return { group: 'skill', verb: 'Loading skill', what: String(input.skill || '') };
    case 'AskUserQuestion': return { group: 'ask', verb: 'Asking you', what: '' };
    case 'ExitPlanMode': return { group: 'plan', verb: 'Presenting a plan', what: '' };
    case 'TodoWrite': return { group: 'todo', verb: 'Updating its task list', what: '' };
    default: return { group: 'other', verb: 'Using ' + name.replace(/^mcp__/, '').replace(/__/g, ' · '), what: '' };
  }
}

// Text the user never typed: command wrappers, reminders, hook output.
const isNoise = t => /^\s*(<|Caveat:|\[Request interrupted|This session is being continued)/.test(t);

/**
 * Feed messages in order; collects items:
 *   {kind:'user', text} {kind:'assistant', text} {kind:'tools', tools:[{verb,what,group}]}
 *   {kind:'skill', name} {kind:'note', text} {kind:'done', ms, ts}
 */
export class Builder {
  constructor(seq = 0) { this.items = []; this.context = null; this.lastTool = null; this.seq = seq; }
  // Every item gets a number so the view can update one in place (text and tool lists grow during a turn).
  push(it) { it.n = this.seq++; this.items.push(it); return it; }
  user(content, ts) {
    const parts = typeof content === 'string' ? [{ type: 'text', text: content }] : (content || []);
    const out = [];
    for (const p of parts) {
      if (p.type !== 'text' || !p.text) continue;
      if (/^\[Request interrupted/.test(p.text)) out.push(this.push({ kind: 'note', text: 'Interrupted' }));
      else if (!isNoise(p.text)) out.push(this.push({ kind: 'user', text: p.text, ts }));
    }
    return out;
  }
  assistant(message) {
    const out = [];
    if (message.model === '<synthetic>') return out;
    for (const b of message.content || []) {
      if (b.type === 'text' && b.text.trim()) {
        const last = this.items[this.items.length - 1];
        if (last && last.kind === 'assistant' && last.open) { last.text += '\n\n' + b.text; out.push(last); }
        else out.push(this.push({ kind: 'assistant', text: b.text, open: true }));
      } else if (b.type === 'tool_use') {
        const d = describeTool(b.name, b.input);
        this.lastTool = d;
        if (d.group === 'skill') { out.push(this.push({ kind: 'skill', name: d.what })); continue; }
        if (d.group === 'ask' || d.group === 'plan') continue; // shown as a card, not as a step
        let last = this.items[this.items.length - 1];
        if (!last || last.kind !== 'tools') last = this.push({ kind: 'tools', tools: [] });
        last.tools.push(d); out.push(last);
      }
    }
    const u = message.usage;
    if (u) {
      const used = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
      if (used) this.context = { used, window: Math.max(this.context?.window || 0, used > 200000 ? 1000000 : 200000) };
    }
    return out;
  }
  closeText() { const last = this.items[this.items.length - 1]; if (last && last.kind === 'assistant') last.open = false; }
  done(ms, ts) { this.closeText(); return this.push({ kind: 'done', ms, ts }); }
}

const TAIL = 6 * 1024 * 1024;

/** Reads a transcript file into items. Returns only the newest `limit` items. */
export async function readTranscript(file, limit = 400) {
  const b = new Builder();
  if (!fs.existsSync(file)) return { items: [], context: null, total: 0 };
  // Very long sessions are read from the end only, so opening one stays quick.
  const size = fs.statSync(file).size, start = size > TAIL ? size - TAIL : 0;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8', start }), crlfDelay: Infinity });
  let skip = start > 0; // the first line of a tail read is cut in half
  for await (const line of rl) {
    if (skip) { skip = false; continue; }
    // Most lines are bookkeeping and can be large; only parse the three kinds we draw.
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"') && !line.includes('"turn_duration"')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.isSidechain || m.isMeta) continue;
    if (m.type === 'user' && m.message) { b.closeText(); b.user(m.message.content, m.timestamp); }
    else if (m.type === 'assistant' && m.message) b.assistant(m.message);
    else if (m.type === 'system' && m.subtype === 'turn_duration') b.done(m.durationMs, m.timestamp);
  }
  const items = b.items.slice(-limit).map(({ open, ...it }) => it);
  return { items, context: b.context, total: b.items.length, cut: start > 0 || b.items.length > limit };
}
