// Rewinding a session: a prompt you sent and everything after it come out of the session's history file, so the agent
// never reads them again and they stop filling its context. The file is cut, not branched: Claude Code's own rewind
// (and resuming at a message through the SDK) keeps the dropped turns in the file, dead weight nobody reads.
// What was cut is kept until your next message or handoff, for Undo, with the files it put back as they were.
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import readline from 'node:readline';

export const REWIND_ROOT = path.join(os.homedir(), '.cache', 'workwood', 'rewinds');
const keptFile = id => path.join(REWIND_ROOT, id + '.json');

// A prompt you wrote, as opposed to a tool's result, a note Claude Code added, or a subagent's messages.
export function isPrompt(m) {
  if (m?.type !== 'user' || m.isSidechain || m.isMeta || m.isCompactSummary || !m.message || m.origin?.kind === 'task-notification') return false;
  const c = m.message.content;
  return typeof c === 'string' || (Array.isArray(c) && !c.some(b => b?.type === 'tool_result'));
}

/**
 * Where the history file is cut to take out the prompt `uid` and all after it: the start of its line, or of the queue
 * lines just before it that brought it in. Also how many prompts go and which files their turns edited.
 */
export async function findCut(file, uid) {
  const rl = readline.createInterface({ input: fs.createReadStream(file, { encoding: 'utf8' }), crlfDelay: Infinity });
  let pos = 0, lead = null, at = null, turns = 0, text = '';
  const edits = new Set();
  for await (const line of rl) {
    const start = pos; pos += Buffer.byteLength(line) + 1;
    if (at == null) {
      if (line.includes('"type":"queue-operation"')) { lead ??= start; continue; }
      if (!line.includes(uid)) { lead = null; continue; }
      let m; try { m = JSON.parse(line); } catch { lead = null; continue; }
      if (m.uuid !== uid || m.type !== 'user') { lead = null; continue; }
      at = lead ?? start; turns = 1;
      const c = m.message?.content; text = typeof c === 'string' ? c : (c || []).filter(b => b?.type === 'text').map(b => b.text).join('\n');
      continue;
    }
    if (!line.includes('"type":"user"') && !line.includes('"type":"assistant"')) continue;
    let m; try { m = JSON.parse(line); } catch { continue; }
    if (isPrompt(m)) turns++;
    if (m.type === 'assistant' && !m.isSidechain) for (const b of m.message?.content || [])
      if (b?.type === 'tool_use' && /^(Edit|MultiEdit|Write|NotebookEdit)$/.test(b.name) && (b.input?.file_path || b.input?.notebook_path)) edits.add(b.input.file_path || b.input.notebook_path);
  }
  return at == null ? null : { at, turns, text, edits: [...edits] };
}

/** The files as they are now, to put back on Undo: each one's bytes, or null for one that does not exist. */
export async function snapshot(paths) {
  return Promise.all(paths.map(async p => { try { return { path: p, data: (await fsp.readFile(p)).toString('base64') }; } catch { return { path: p, data: null }; } }));
}

/** Cuts the history file at `cut.at`, keeping what was cut (and `files`, the files as they were before) for Undo. */
export async function cut(id, file, cut, info = {}) {
  const fh = await fsp.open(file, 'r+');
  try {
    const size = (await fh.stat()).size, tail = Buffer.alloc(size - cut.at);
    await fh.read(tail, 0, tail.length, cut.at);
    await fsp.mkdir(REWIND_ROOT, { recursive: true });
    await fsp.writeFile(keptFile(id), JSON.stringify({ file, at: cut.at, tail: tail.toString('base64'), when: Date.now(), ...info }));
    await fh.truncate(cut.at);
  } finally { await fh.close(); }
}

export const kept = id => { try { return JSON.parse(fs.readFileSync(keptFile(id), 'utf8')); } catch { return null; } };
export const forget = id => fsp.rm(keptFile(id), { force: true });

/**
 * Puts back what the last rewind cut, and the files it changed. Lines Claude Code added since (it writes some whenever
 * the session is opened) go, but not a new message: once the session has gone on, the rewind stays.
 */
export async function undo(id) {
  const k = kept(id);
  if (!k) throw new Error('There is nothing to undo.');
  const size = fs.statSync(k.file).size;
  if (size < k.at) throw new Error('The session has changed since the rewind.');
  if (size > k.at) {
    const fh = await fsp.open(k.file, 'r'), buf = Buffer.alloc(size - k.at);
    try { await fh.read(buf, 0, buf.length, k.at); } finally { await fh.close(); }
    if (/"type":"(user|assistant)"/.test(buf.toString('utf8'))) throw new Error('The session has gone on since the rewind.');
  }
  await fsp.truncate(k.file, k.at);
  await fsp.appendFile(k.file, Buffer.from(k.tail, 'base64'));
  for (const f of k.files || []) {
    try {
      if (f.data == null) await fsp.rm(f.path, { force: true });
      else { await fsp.mkdir(path.dirname(f.path), { recursive: true }); await fsp.writeFile(f.path, Buffer.from(f.data, 'base64')); }
    } catch {}
  }
  await forget(id);
  return k;
}
