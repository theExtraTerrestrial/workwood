// Turns Claude Code messages (from a transcript file or from a live turn) into
// the few kinds of item the conversation view draws.
import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';

const base = p => (typeof p === 'string' ? path.basename(p) : '');
const clip = (s, n = 90) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };

/** One line describing a tool call, e.g. {verb:'Editing', what:'checkout.css', group:'edit'}. */
export function describeTool(name, input = {}) {
  switch (name) {
    case 'Read': return { group: 'read', verb: 'Reading', what: base(input.file_path) };
    case 'Edit': case 'MultiEdit': case 'Write': case 'NotebookEdit':
      return { group: 'edit', verb: name === 'Write' ? 'Writing' : 'Editing', what: base(input.file_path || input.notebook_path) };
    case 'Bash': case 'PowerShell': return { group: 'run', verb: 'Running', what: clip(input.description || input.command, 70) };
    case 'Grep': case 'Glob': return { group: 'search', verb: 'Searching', what: clip(input.pattern, 50) };
    case 'WebFetch': case 'WebSearch': return { group: 'web', verb: 'Looking up', what: clip(input.query || input.url, 60) };
    case 'Agent': case 'Task': return { group: 'agent', verb: 'Running an agent', what: clip(input.description, 60) };
    case 'Monitor': return { group: 'monitor', verb: 'Watching', what: clip(input.description, 70) };
    case 'TaskStop': case 'KillShell': case 'KillBash': return { group: 'other', verb: 'Stopping a background task', what: '' };
    case 'TaskOutput': case 'BashOutput': return { group: 'other', verb: 'Checking background output', what: '' };
    case 'Skill': return { group: 'skill', verb: 'Loading skill', what: String(input.skill || '') };
    case 'AskUserQuestion': return { group: 'ask', verb: 'Asking you', what: '' };
    case 'ExitPlanMode': return { group: 'plan', verb: 'Presenting a plan', what: '' };
    case 'TodoWrite': return { group: 'todo', verb: 'Updating its task list', what: '' };
    default: return { group: 'other', verb: 'Using ' + name.replace(/^mcp__/, '').replace(/__/g, ' · '), what: '' };
  }
}

// What a finished step is called, e.g. 'Ran' for 'Running'.
const PAST = { Reading: 'Read', Editing: 'Edited', Writing: 'Wrote', Running: 'Ran', Searching: 'Searched', 'Looking up': 'Looked up', 'Running an agent': 'Ran an agent', 'Updating its task list': 'Updated its task list',
  Watching: 'Watched', 'Stopping a background task': 'Stopped a background task', 'Checking background output': 'Checked background output' };
const REPORT_CHARS = 1200, SUB_KEEP = 30, EVENTS_KEEP = 20;
// What an agent said back, without the bookkeeping Claude Code appends for the main agent.
const cleanReport = t => String(t || '').replace(/<usage>[\s\S]*?<\/usage>/g, '').replace(/^agentId:.*$/gm, '').trim();
const clipReport = t => { t = cleanReport(t); return t.length > REPORT_CHARS ? t.slice(0, REPORT_CHARS - 1) + '…' : t; };
const tag = (t, name) => { const m = new RegExp(`<${name}>([\\s\\S]*?)</${name}>`).exec(t); return m ? m[1].trim() : null; };
/** A note Claude Code hands the agent when background work moves on: a command or agent finishing, a monitor's event. */
export function parseNotification(text) {
  if (typeof text !== 'string' || !text.includes('<task-notification>')) return null;
  const n = { task: tag(text, 'task-id'), tool: tag(text, 'tool-use-id'), status: tag(text, 'status'), summary: tag(text, 'summary') || '', event: tag(text, 'event'),
    result: tag(text, 'result'), file: tag(text, 'output-file') };
  const u = tag(text, 'usage');
  if (u) { n.tokens = +(tag(u, 'subagent_tokens') || tag(u, 'total_tokens') || 0) || undefined; n.count = +(tag(u, 'tool_uses') || 0) || undefined; }
  return n.task ? n : null;
}
const TAIL_LINES = 12, TAIL_CHARS = 1500, FULL_CHARS = 512 * 1024;
const DECLINED = /^The user doesn't want to proceed|^The user (denied|did not approve)|^Permission to use .* (has been )?denied|^Permission for this tool use was denied/i;
const resultText = c => typeof c === 'string' ? c : Array.isArray(c) ? c.filter(x => x?.type === 'text').map(x => x.text).join('\n') : '';
/**
 * A step as the conversation draws it: the line describing it, plus what it took to watch it — its id, when it
 * started, and for a shell command the command itself, whether it runs in the background and its time limit.
 */
function stepOf(d, b, ts) {
  d.id = b.id; d.start = ts ? Date.parse(ts) : Date.now();
  d.past = d.verb.startsWith('Using ') ? 'Used ' + d.verb.slice(6) : PAST[d.verb] || d.verb;
  const input = b.input || {};
  if (input.run_in_background) d.bg = true;
  if (d.group === 'monitor') { d.bg = true; d.cmd = input.command || input.ws?.url || ''; if (input.timeout_ms > 0) d.limit = input.timeout_ms; }
  if (d.group === 'agent' && input.subagent_type) d.kind = String(input.subagent_type);
  if (d.group === 'run' && typeof input.command === 'string') {
    d.cmd = input.command.length > 20000 ? input.command.slice(0, 20000) + '\n…' : input.command;
    if (!input.description) d.what = '';           // the command itself says it, right under the heading
    if (input.run_in_background) d.bg = true;
    if (input.timeout > 0) d.limit = input.timeout;
  }
  return d;
}

// Files worth showing rather than describing: what the conversation offers as preview cards.
const KINDS = { html: 'page', htm: 'page', svg: 'image', png: 'image', jpg: 'image', jpeg: 'image', gif: 'image', webp: 'image', avif: 'image',
  mp4: 'video', webm: 'video', mov: 'video', m4v: 'video', pdf: 'pdf' };
export const previewKind = p => KINDS[path.extname(String(p)).slice(1).toLowerCase()] || null;

// What a page calls itself: its <title>, or else its first heading. A question about mockups is matched to them by it too.
const titles = new Map();   // path -> { v, title }
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', mdash: '—', ndash: '–', middot: '·' };
function pageTitle(file, v) {
  const had = titles.get(file); if (had?.v === v) return had.title;
  let title = '';
  try {
    const fd = fs.openSync(file, 'r'), buf = Buffer.alloc(32768);
    try { title = buf.toString('utf8', 0, fs.readSync(fd, buf, 0, buf.length, 0)); } finally { fs.closeSync(fd); }
    const m = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(title) || /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(title);
    title = m ? m[1].replace(/<[^>]*>/g, ' ').replace(/&(#\d+|[a-z]+);/gi, (e, n) => n[0] === '#' ? String.fromCodePoint(+n.slice(1)) : ENT[n.toLowerCase()] ?? e).replace(/\s+/g, ' ').trim().slice(0, 160) : '';
  } catch { title = ''; }
  if (titles.size > 2000) titles.clear();
  titles.set(file, { v, title });
  return title;
}
/** How a previewable file is described to the window. */
export function fileEntry(file, st, ts) {
  const kind = previewKind(file), v = Math.round(st.mtimeMs), title = kind === 'page' ? pageTitle(file, v) : '';
  return { path: file, name: path.basename(file), kind, v, ts, ...(title ? { title } : {}) };
}

// Files a shell command names that could be shown: a script that writes a page, a screenshot, a recording.
// Whether the command really made or changed them is decided afterwards, from when the file was last written.
const NAMED = new RegExp(`(?:[A-Za-z]:[\\\\/]|~[\\\\/]|[\\\\/])?[\\w.@+\\\\/-]*[\\w-]\\.(?:${Object.keys(KINDS).join('|')})(?![\\w.-])`, 'gi');
// A command's own `cd`s, and the folder an earlier command left the shell in, are where its relative names may point.
const LEAD = 20000;   // how long before it is reported a command may already have been running
function namedFiles(command, bases) {
  if (!bases.length || typeof command !== 'string') return { files: [], dir: null };
  const home = p => p.replace(/^~(?=$|[\\/])/, os.homedir());
  // Simple variables set in the command itself (S=/tmp/shots; tool $S/a.png) are filled in first.
  let text = command.slice(0, 20000);
  for (const m of [...text.matchAll(/(?:^|[\s;&(])([A-Za-z_]\w*)=(?:"([^"$\n]*)"|'([^'\n]*)'|([^\s;&|$"'()]+))/g)].slice(0, 8)) {
    const value = m[2] ?? m[3] ?? m[4];
    text = text.replace(new RegExp('\\$(?:' + m[1] + '\\b|\\{' + m[1] + '\\})', 'g'), () => value);
  }
  let dir = null;
  for (const m of text.matchAll(/(?:^|&&|;|\n)\s*cd\s+(?:"([^"\n]+)"|'([^'\n]+)'|([^\s;&|]+))/g)) {
    const to = home(m[1] || m[2] || m[3]);
    dir = path.resolve(dir || bases[0], to);
  }
  const from = [...new Set([dir, ...bases].filter(Boolean))], out = new Set();
  for (const m of text.match(NAMED) || []) {
    if (out.size >= 24) break;
    const name = home(m);
    if (path.isAbsolute(name)) out.add(path.resolve(name)); else for (const b of from) out.add(path.resolve(b, name));
  }
  return { files: [...out], dir };
}

// Text the user never typed: command wrappers, reminders, hook output.
// "/name the rest", as typed, or the wrapper Claude Code saves it in.
function slash(t) {
  const saved = /<command-name>\/?([^<\s]+)<\/command-name>/.exec(t);
  if (saved) return /<local-command-stdout>/.test(t) ? null : { skill: saved[1], text: (/<command-args>([\s\S]*?)<\/command-args>/.exec(t)?.[1] || '').trim() };
  const typed = /^\/([\w-]+(?::[\w-]+)?)(?:\s+([\s\S]*))?$/.exec(t.trim());
  return typed ? { skill: typed[1], text: (typed[2] || '').trim() } : null;
}
const isNoise = t => /^\s*(<|Caveat:|\[Request interrupted|This session is being continued)/.test(t);

/**
 * Feed messages in order; collects items:
 *   {kind:'user', text} {kind:'assistant', text} {kind:'tools', tools:[{verb,what,group}]}
 *   {kind:'skill', name} {kind:'note', text} {kind:'done', ms, ts}
 *   {kind:'work', files:[{path,name,kind,v,ts}]}   previewable files written since the last one
 */
// How much a model can hold. Sizes a finished turn reported win; otherwise the model's name tells, and as a
// last resort a conversation already longer than 200k must be on the large window.
const learned = new Map();
export function learnWindow(model, size) { if (model && size > 0) learned.set(model, size); }
export function windowFor(model, used = 0) {
  if (learned.has(model)) return Math.max(learned.get(model), used > 200000 ? 1000000 : 0);
  return /\[1m\]/i.test(model || '') || /^claude-(fable|mythos)-/.test(model || '') || used > 200000 ? 1000000 : 200000;
}

// A picture in a message you wrote is kept once, named by what is in it, so the window can show it again later
// without the transcript's base64 travelling with every read. Served by /api/picture/<id>.
export const PICTURE_ROOT = path.join(os.homedir(), '.cache', 'workwood', 'pictures');
const PICTURE_EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp' };
const PICTURE_NAME = /\.(png|jpe?g|gif|webp)$/i;
export const PICTURE_ID = /^[0-9a-f]{32}\.(png|jpg|gif|webp)$/;
function keepPicture(part) {
  const src = part.source, ext = PICTURE_EXT[src?.media_type];
  if (src?.type !== 'base64' || !ext || !src.data) return null;
  const id = createHash('sha256').update(src.data).digest('hex').slice(0, 32) + '.' + ext, file = path.join(PICTURE_ROOT, id);
  try { if (!fs.existsSync(file)) { fs.mkdirSync(PICTURE_ROOT, { recursive: true }); fs.writeFileSync(file, Buffer.from(src.data, 'base64')); } } catch { return null; }
  return { id };
}

export class Builder {
  constructor(seq = 0, cwd = null, { keepOutput = false } = {}) {
    this.items = []; this.context = null; this.lastTool = null; this.seq = seq; this.fresh = new Map(); this.groups = []; this.cwd = cwd; this.named = [];
    this.cmdFrom = null;                        // when the turn's first command started
    this.steps = new Map();                     // tool_use id -> the step and the item it is drawn in
    this.asks = new Map();                      // tool_use id -> the questions of a card, until it is answered
    this.output = keepOutput ? new Map() : null; // a live turn keeps whole outputs, for "Show all output"
  }
  /**
   * Tool results arrived (a user message's content): each finishes its step with a time, how it ended and the
   * end of what it printed. `meta` carries what a transcript line adds: toolUseResult and toolDenialKind.
   * Returns the items whose steps changed.
   */
  results(content, ts, meta = {}) {
    if (!Array.isArray(content)) return [];
    const changed = new Set(), at = ts ? Date.parse(ts) : Date.now();
    for (const r of content) {
      if (r?.type !== 'tool_result') continue;
      if (this.asks.has(r.tool_use_id)) {   // the card answered: what you picked or wrote stays in the thread, as yours
        const qs = this.asks.get(r.tool_use_id); this.asks.delete(r.tool_use_id);
        const it = answersOf(qs, r, meta.result);
        if (it) changed.add(this.push({ kind: 'answers', ...it, ...(ts ? { ts } : {}) }));
        continue;
      }
      const hit = this.steps.get(r.tool_use_id);
      if (!hit) continue;
      const { step } = hit, text = resultText(r.content), extra = meta.result && typeof meta.result === 'object' ? meta.result : {};
      delete step.wait;
      if (step.stopped) step.state = 'stop';       // you stopped it: whatever it exited with
      else if (r.is_error) {
        const first = text.split('\n')[0];
        if (/^(user-rejected|permission-rule|automode-blocked)$/.test(meta.denial || '') || DECLINED.test(text)) step.state = 'no';
        else if (meta.denial === 'interrupted' || /^\[Request interrupted|^\[Tool call interrupted|stopped the turn/i.test(text)) step.state = 'stop';
        else { step.state = 'bad'; const code = /^Exit code (\d+)/.exec(first); if (code) step.code = +code[1]; else if (/timed out/i.test(first)) step.why = 'timed out'; }
      } else if (step.bg || extra.backgroundTaskId || extra.isAsync || /^Command running in background|^Monitor started|^Async agent launched/i.test(text)) {
        step.state = 'bg'; step.bg = true;
        step.task ??= extra.backgroundTaskId || extra.taskId || extra.agentId || /(?:with ID:|\(task|agentId:)\s*([\w-]+)/.exec(text)?.[1];
        const out = extra.outputFile || /Output is being written to: (\S+?\.output)\b/.exec(text)?.[1];
        if (out) step.file = out;
      } else step.state = 'ok';
      if (step.group === 'agent' && step.state !== 'bg' && step.state !== 'no') {
        if (text) step.report = clipReport(text);
        if (extra.totalTokens) step.tokens = extra.totalTokens;
        if (extra.totalToolUseCount) step.count = extra.totalToolUseCount;
      }
      if (step.state !== 'bg') step.end = at;
      if (step.group === 'run' && step.state !== 'no' && step.state !== 'bg') this.keepOutput(r.tool_use_id, step, text.replace(/^Exit code \d+\n?/, ''));
      changed.add(hit.item);
    }
    return [...changed];
  }
  keepOutput(id, step, text) {
    text = text.replace(/\s+$/, '');
    if (!text) { delete step.out; return; }
    const lines = text.split('\n');
    let tail = lines.slice(-TAIL_LINES).join('\n');
    if (tail.length > TAIL_CHARS) tail = '…' + tail.slice(-TAIL_CHARS);
    step.out = tail; step.lines = lines.length; step.cut = tail !== text;
    if (step.cut && this.output) this.output.set(id, text.length > FULL_CHARS ? text.slice(-FULL_CHARS) : text);
  }
  /** A step's whole output, when this turn kept it. */
  outputOf(id) { const h = this.steps.get(id); return this.output?.get(id) ?? (h?.step.out && !h.step.cut ? h.step.out : null); }
  /** Steps an agent took for the step `parentId`: kept inside it, the newest few, with a count of all. */
  sub(message, parentId, ts) {
    const h = this.steps.get(parentId);
    if (!h) return [];
    const p = h.step;
    for (const b of message?.content || []) {
      if (b.type === 'text' && b.text.trim()) p.said = clip(b.text, 160);
      if (b.type !== 'tool_use') continue;
      const d = stepOf(describeTool(b.name, b.input), b, ts);
      (p.sub ||= []).push(d); p.subN = (p.subN || 0) + 1;
      if (p.sub.length > SUB_KEEP) p.sub.shift();
      if (b.id) this.steps.set(b.id, { item: h.item, step: d });
    }
    return [h.item];
  }
  /**
   * Background work moved on (see parseNotification): a note in the conversation, and the step that started it
   * brought up to date — ended, with its report or its newest event.
   */
  notify(n, ts) {
    const at = ts ? Date.parse(ts) : Date.now(), out = [];
    const hit = (n.tool && this.steps.get(n.tool)) || [...this.steps.values()].find(h => h.step.task === n.task);
    const st = hit?.step, ended = n.status && !n.event;
    const code = /exit code (\d+)/i.exec(n.summary)?.[1];
    const bad = n.status === 'failed' || (code != null && +code !== 0);
    if (st) {
      st.task ??= n.task;
      if (n.event) { (st.events ||= []).push({ t: at, x: clip(n.event, 300) }); st.nEvents = (st.nEvents || 0) + 1; if (st.events.length > EVENTS_KEEP) st.events.shift(); }
      if (ended && !st.end) {
        st.end = at; st.state = bad ? 'bad' : /killed|stopped/.test(n.status) ? 'stop' : 'ok';
        if (code != null) st.code = +code;
      }
      if (n.result) st.report = clipReport(n.result);
      if (n.tokens) st.tokens = n.tokens;
      if (n.count) st.count = n.count;
      out.push(hit.item);
    }
    this.closeText();
    const note = { kind: 'bg', task: n.task, tool: n.tool || null, of: st?.group || null, name: st?.what || null, status: n.status || null, ts: ts || new Date(at).toISOString() };
    if (n.event) note.event = clip(n.event, 300); else note.text = clip(n.summary, 200);
    if (bad) note.bad = true;
    return [this.push(note), ...out];
  }
  /** The turn is over: steps still waiting for a result never got one. Those left in the background keep going. */
  endOpen(background = false) {
    const changed = new Set(), now = Date.now();
    for (const { item, step } of this.steps.values()) if (!step.state || background && step.state === 'bg' && !step.end) { step.state = 'stop'; step.end = now; delete step.wait; changed.add(item); }
    return [...changed];
  }
  /** Something about a step changed outside its result (a permission answered, a task begun or ended). */
  touchStep(id, change) { const h = this.steps.get(id); if (!h) return []; change(h.step); return [h.item]; }
  // Every item gets a number so the view can update one in place (text and tool lists grow during a turn).
  push(it) { it.n = this.seq++; this.items.push(it); return it; }
  user(content, ts) {
    const parts = typeof content === 'string' ? [{ type: 'text', text: content }] : (content || []);
    const out = [], images = parts.filter(p => p.type === 'image').map(keepPicture).filter(Boolean);
    let mine = null;
    const say = (text, skill) => {
      const m = /(?:^|\n+)Attached files:\n((?:- .+\n?)+)$/.exec(text), it = { kind: 'user', text: m ? text.slice(0, m.index) : text, ts };
      if (skill) it.skill = skill;
      if (m) it.files = m[1].trim().split('\n').map(l => path.basename(l.slice(2)));
      out.push(...this.flushWork()); out.push(mine = this.push(it)); this.turn = it;
    };
    for (const p of parts) {
      if (p.type !== 'text' || !p.text) continue;
      const n = parseNotification(p.text);
      if (n) { out.push(...this.notify(n, ts)); continue; }
      if (/^\[Request interrupted/.test(p.text)) out.push(this.push({ kind: 'note', text: 'Interrupted' }));
      else {
        const s = slash(p.text);
        if (s) say(s.text, s.skill);
        else if (!isNoise(p.text)) say(p.text);
      }
    }
    // Pictures show as themselves. One that was also attached by its path is shown once, as a picture with its name
    // (in the order they were attached); a picture too large to go in the message stays a name only.
    if (images.length && !mine) say('');
    if (images.length) {
      const named = (mine.files || []).filter(f => PICTURE_NAME.test(f));
      if (named.length && named.length <= images.length) {
        mine.files = mine.files.filter(f => !PICTURE_NAME.test(f));
        if (!mine.files.length) delete mine.files;
        if (named.length === images.length) images.forEach((p, i) => { p.name = named[i]; });
      }
      mine.pics = images;
    }
    return out;
  }
  /** `cwd`: where Claude Code's shell was when the message was saved, which a transcript line records. */
  assistant(message, ts, effort, cwd) {
    const out = [];
    if (ts) this.lastTs = ts;
    if (cwd) this.shellDir = cwd;   // better than following cd's: the shell may have moved in a command we never saw
    if (message.model === '<synthetic>') return out;
    if (message.model) this.model = message.model;   // what the session last ran on, shown and reused for the next message
    if (effort) this.effort = effort;
    for (const b of message.content || []) {
      if (b.type === 'text' && b.text.trim()) {
        const last = this.items[this.items.length - 1];
        if (last && last.kind === 'assistant' && last.open) { last.text += '\n\n' + b.text; out.push(last); }
        else out.push(this.push({ kind: 'assistant', text: b.text, open: true }));
      } else if (b.type === 'tool_use') {
        const d = describeTool(b.name, b.input);
        this.lastTool = d;
        const file = d.group === 'edit' && b.input?.file_path;
        if (file && path.isAbsolute(file) && previewKind(file)) this.fresh.set(file, this.lastTs || new Date().toISOString());
        // A picture or page the agent opens to look at, that a command of this turn wrote: made by a script that built
        // its path (a screenshot), so no command named it.
        if (b.name === 'Read' && path.isAbsolute(b.input?.file_path || '') && previewKind(b.input.file_path) && this.cmdFrom != null)
          this.named.push({ files: [b.input.file_path], from: this.cmdFrom, to: null, ts: this.lastTs || new Date().toISOString() });
        if (b.name === 'Bash' || b.name === 'PowerShell') {
          this.ran(ts);
          const { files, dir } = namedFiles(b.input?.command, [this.shellDir, this.cwd].filter(Boolean));
          if (dir) this.shellDir = dir;   // the shell stays where the last command left it
          // Claude Code may start a command before it reports it (while the rest of the message is still being written).
          if (files.length) this.named.push({ files, from: (ts ? Date.parse(ts) : Date.now()) - LEAD, to: null, ts: this.lastTs || new Date().toISOString() });
        }
        if (d.group === 'skill') { out.push(this.push({ kind: 'skill', name: d.what })); continue; }
        if (d.group === 'ask' || d.group === 'plan') {         // shown as a card, not as a step; the turn remembers it stopped for you
          if (this.turn) { this.turn.asked = (this.turn.asked || 0) + 1; out.push(this.turn); }
          if (b.name === 'AskUserQuestion' && b.id) this.asks.set(b.id, Array.isArray(b.input?.questions) ? b.input.questions : []);
          continue;
        }
        let last = this.items[this.items.length - 1];
        if (!last || last.kind !== 'tools') last = this.push({ kind: 'tools', tools: [] });
        last.tools.push(stepOf(d, b, ts)); out.push(last);
        if (b.id) this.steps.set(b.id, { item: last, step: d });
      }
    }
    const u = message.usage;
    if (u) {
      const used = (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0) + (u.output_tokens || 0);
      if (used) this.context = { used, window: windowFor(message.model, used) };
    }
    return out;
  }
  /** A command started at `ts` (a reader that skips the command itself still reports when it ran). */
  ran(ts) { if (this.cmdFrom == null) this.cmdFrom = (ts ? Date.parse(ts) : Date.now()) - LEAD; }
  /**
   * Tool results arrived at `ts`. A file a command named counts when it was written from that command's start up to
   * the turn's latest result: a later command may write it again without naming it (rerunning the script that makes it).
   */
  toolsDone(ts) { const at = (ts ? Date.parse(ts) : Date.now()) + 2000; for (const n of this.named) n.to = Math.max(n.to ?? 0, at); }
  closeText() { const last = this.items[this.items.length - 1]; if (last && last.kind === 'assistant') last.open = false; }
  /** A file the agent points at without having written it this turn (a question's option names it): offered with the rest. */
  offer(file) { if (path.isAbsolute(file) && previewKind(file) && !this.fresh.has(file)) this.fresh.set(file, this.lastTs || new Date().toISOString()); }
  /** Previewable files written since the last call become one item, shown as cards. Files that are gone are left out. */
  flushWork() {
    const files = [];
    for (const [file, ts] of this.fresh) {
      try { const st = fs.statSync(file); if (st.isFile()) files.push(fileEntry(file, st, ts)); } catch {}
    }
    this.fresh.clear();
    // What commands made: a named file counts when it was last written while its command ran.
    for (const n of this.named) for (const file of n.files) {
      if (files.some(f => f.path === file)) continue;
      try { const st = fs.statSync(file); if (st.isFile() && st.mtimeMs >= n.from && st.mtimeMs <= (n.to ?? Infinity)) files.push(fileEntry(file, st, n.ts)); } catch {}
    }
    this.named = []; this.cmdFrom = null;
    if (!files.length) return [];
    this.closeText(); this.groups.push(files);
    return [this.push({ kind: 'work', files })];
  }
  /** Everything previewable from the session: newest turn first, each file once. */
  work() {
    const seen = new Set(), out = [];
    for (let i = this.groups.length - 1; i >= 0; i--) for (const f of this.groups[i]) if (!seen.has(f.path)) { seen.add(f.path); out.push(f); }
    return out;
  }
  done(ms, ts) { const w = this.flushWork(); this.closeText(); return [...w, this.push({ kind: 'done', ms, ts })]; }
}

const TAIL = 6 * 1024 * 1024;

// What a long session made before the part that is read: only previewable files are looked for there, once, and
// remembered per file. Each later read continues from where the last one stopped.
const SHOWABLE = new RegExp(`\\.(?:${Object.keys(KINDS).join('|')})(?![\\w.-])`, 'i');
const early = new Map();   // transcript -> { upto, cwd, groups: newest first, [{path, ts}] }
function earlyWork(file, upto, cwd) {
  let had = early.get(file);
  if (had && had.cwd !== cwd) had = null;
  if (had && had.upto >= upto) return had.done;
  const from = had?.upto || 0, groups = had ? had.groups : [];
  const next = { upto: from, cwd, groups };
  next.done = (async () => {
    if (had) await had.done;
    const b = new Builder(0, cwd);
    const input = fs.createReadStream(file, { start: from }), rl = readline.createInterface({ input, crlfDelay: Infinity });
    let at = from;
    for await (const line of rl) {
      at += Buffer.byteLength(line) + 1;
      // Only messages that name a previewable file are parsed; the rest give the times commands ended and turns closed.
      if (line.includes('"type":"assistant"') && line.includes('"tool_use"') && SHOWABLE.test(line)) {
        let m; try { m = JSON.parse(line); } catch { m = null; }
        if (m?.message && !m.isSidechain && !m.isMeta && !m.error) b.assistant(m.message, m.timestamp, null, m.cwd);
      } else if (line.includes('"type":"assistant"') && /"name":"(?:Bash|PowerShell)"/.test(line) && !line.includes('"isSidechain":true')) {
        b.ran(/"timestamp":"([^"]+)"/.exec(line)?.[1]);   // a command that names nothing to show may still make what a later Read opens
      } else if (line.includes('"type":"user"')) {
        if (!line.includes('"isSidechain":true') && line.includes('"tool_result"')) b.toolsDone(/"timestamp":"([^"]+)"/.exec(line)?.[1]);
      } else if (line.includes('"turn_duration"')) b.flushWork();
      if (at > upto) break;   // the line the tail read starts inside is finished here
    }
    rl.close(); input.destroy();
    b.flushWork();
    for (const g of b.groups) groups.unshift(g.map(f => ({ path: f.path, ts: f.ts })));
    next.upto = at;
  })().catch(e => { console.error('[workwood] early previews:', String(e.message).split('\n')[0]); early.delete(file); });
  early.set(file, next);
  return next.done;
}
/** Files from the early part of a long session that are still there, newest first. */
function earlyFiles(file) {
  const out = [];
  for (const g of early.get(file)?.groups || []) for (const { path: p, ts } of g) {
    try { const st = fs.statSync(p); if (st.isFile()) out.push(fileEntry(p, st, ts)); } catch {}
  }
  return out;
}

/** Reads the whole output of one step from a transcript: what the tool result for `id` said. */
export async function outputFromTranscript(file, id) {
  if (!file || !fs.existsSync(file) || !/^[\w-]+$/.test(id)) return null;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let found = null;
  for await (const line of rl) {
    if (!line.includes(id) || !line.includes('"tool_result"')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    for (const r of m.message?.content || []) if (r?.type === 'tool_result' && r.tool_use_id === id) found = resultText(r.content).replace(/^Exit code \d+\n?/, '');
    if (found != null) { rl.close(); break; }
  }
  return found == null ? null : found.length > FULL_CHARS ? found.slice(-FULL_CHARS) : found;
}

// How Claude Code names what stopped a turn, as the stop it is for you: signed out, a limit, or anything else.
export const ERRORS = {
  authentication_failed: 'auth', billing_error: 'limit', rate_limit: 'limit',
  invalid_request: 'error', server_error: 'error', unknown: 'error', max_output_tokens: 'error',
};

// What a question card was answered with, from its tool result: each question with its answer, or the words you
// wrote instead of answering. Claude Code keeps the answers in the result (and its text says them as "question"="answer").
// Declined or cancelled with nothing said: nothing to show.
function answersOf(questions, r, result) {
  const text = resultText(r.content);
  if (r.is_error) { const said = /and said: ([\s\S]+)$/.exec(text)?.[1]?.trim(); return said ? { said } : null; }
  const given = result && typeof result.answers === 'object' && result.answers ? result.answers : {};
  if (!Object.keys(given).length) for (const [, q, a] of text.matchAll(/"((?:[^"\\]|\\.)*)"="((?:[^"\\]|\\.)*)"/g)) given[q] = a;
  const qs = questions.length ? questions : (result?.questions || []);
  const list = qs.map(q => ({ q: q.question, head: q.header || null, a: given[q.question] })).filter(x => x.a);
  for (const [q, a] of Object.entries(given)) if (!list.some(x => x.q === q) && a) list.push({ q, head: null, a: String(a) });
  return list.length ? { answers: list.map(x => ({ ...x, a: String(x.a) })) } : null;
}

// A slash command Claude Code ran by itself that failed — a /compact cut off by a limit, say — as the stop it is, with
// the command to run again to go on (not "continue": the command never ran). Streamed as a user message, saved as a system one.
export function failedCommand(m) {
  const t = m?.type === 'system' && m.subtype === 'local_command' ? m.content : m?.type === 'user' && typeof m.message?.content === 'string' ? m.message.content : null;
  const err = typeof t === 'string' ? /<local-command-stderr>([\s\S]*?)<\/local-command-stderr>/.exec(t)?.[1]?.trim() : null;
  if (!err) return null;
  const limit = /\blimit\b|rate.?limit|\b429\b/i.test(err) && !/context limit|size limit/i.test(err);
  const cmd = m.commandRun?.command || (/compact/i.test(err) ? 'compact' : null);
  return { reason: limit ? 'limit' : 'error', text: err, ...(cmd ? { redo: `/${cmd}${m.commandRun?.args ? ' ' + m.commandRun.args : ''}` } : {}) };
}

const textOfError = msg => (msg?.content || []).filter(b => b.type === 'text').map(b => b.text).join(' ').split('\n')[0] || 'something went wrong';

/** Reads a transcript file into items. Returns only the newest `limit` items. */
export async function readTranscript(file, limit = 400, cwd = null) {
  const b = new Builder(0, cwd);
  if (!fs.existsSync(file)) return { items: [], context: null, total: 0, work: [] };
  // Very long sessions are read from the end only, so opening one stays quick.
  const size = fs.statSync(file).size, start = size > TAIL ? size - TAIL : 0;
  const head = start > 0 ? earlyWork(file, start, cwd) : null;
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8', start }), crlfDelay: Infinity });
  let skip = start > 0; // the first line of a tail read is cut in half (the early part reads it whole)
  let mode = null;      // Claude Code saves the permission mode with each message you write
  for await (const line of rl) {
    if (skip) { skip = false; continue; }
    // Most lines are bookkeeping and can be large; only parse the three kinds we draw.
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"') && !line.includes('"turn_duration"') && !line.includes('"local_command"')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (m.isSidechain || m.isMeta) continue;
    if (m.type === 'user' && typeof m.permissionMode === 'string') mode = m.permissionMode;
    if (m.type === 'user' && m.message) { b.closeText(); if (Array.isArray(m.message.content) && m.message.content.some(c => c?.type === 'tool_result')) b.toolsDone(m.timestamp); b.results(m.message.content, m.timestamp, { result: m.toolUseResult, denial: m.toolDenialKind }); b.user(m.message.content, m.timestamp); }
    // A turn Claude Code could not run (signed out, a limit, an API error) is saved as an answer of its own: it reads back as the stop it was.
    else if (m.type === 'assistant' && m.error && m.isApiErrorMessage) { b.closeText(); b.flushWork(); b.push({ kind: 'note', stop: ERRORS[m.error] || 'error', ts: m.timestamp, ...(ERRORS[m.error] === 'auth' || ERRORS[m.error] === 'limit' ? {} : { text: textOfError(m.message) }) }); }
    else if (m.type === 'assistant' && m.message) b.assistant(m.message, m.timestamp, typeof m.effort === 'string' ? m.effort : null, m.cwd);
    else if (m.type === 'system' && m.subtype === 'turn_duration') b.done(m.durationMs, m.timestamp);
    else if (m.type === 'system' && m.subtype === 'local_command') { const f = failedCommand(m); if (f) { b.closeText(); b.flushWork(); b.push({ kind: 'note', stop: f.reason, ts: m.timestamp, ...(f.redo ? { redo: f.redo } : {}), ...(f.reason === 'error' ? { text: f.text } : {}) }); } }
  }
  b.flushWork();
  let work = b.work();
  if (head) {
    await head;
    const seen = new Set(work.map(f => f.path));
    work = work.concat(earlyFiles(file).filter(f => !seen.has(f.path) && seen.add(f.path)));
  }
  const items = b.items.slice(-limit).map(({ open, ...it }) => it);
  return { items, context: b.context, total: b.items.length, cut: start > 0 || b.items.length > limit, work, model: b.model || null, effort: b.effort || null, mode };
}
