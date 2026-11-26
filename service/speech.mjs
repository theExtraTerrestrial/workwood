// Read aloud: text to speech on this machine, with Kokoro-82M (ONNX, full precision) on the processor. Text never leaves it.
// Kokoro is downloaded when asked for, from Settings: the model, its tokenizer and the three voices, about 330 MB, from
// Hugging Face at a pinned revision, each file checked by hash, into ~/.cache/workwood/models beside the dictation models.
// Until it is here the speakers open Settings instead of reading.
// The model runs in one Node process (speech-worker.mjs), started on the first sentence asked for and stopped after
// two minutes without one: loaded, it holds about 0.8 GB. Each sentence is its own short clip, made at normal speed;
// the window plays it faster or slower itself, so changing speed makes nothing again.
import { spawn } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { Readable, Transform } from 'node:stream';
import { pipeline as pipe } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const MODELS_DIR = path.join(os.homedir(), '.cache', 'workwood', 'models');
const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX', REVISION = '1939ad2a8e416c0acfeecc08a694d14ef25f2231';
const HOME = path.join(MODELS_DIR, ...MODEL.split('/'));
const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'speech-worker.mjs');
const IDLE_MS = +process.env.WORKWOOD_TTS_IDLE || 2 * 60e3;
export const VOICES = ['af_bella', 'af_heart', 'af_nicole'];   // your shortlist: American, female
const TMP = path.join(os.tmpdir(), `workwood-speech-${process.pid}`);
// What Kokoro needs, at REVISION: [file, bytes, sha256].
const FILES = [
  ['config.json', 44, 'df34b4f930b23447cd4dc410fabfb42eb3f24e803e6c3f97d618fb359380a36f'],
  ['tokenizer.json', 3497, '77a02c8e164413299b4b4c403b14f8e0e1c1b727db4d46a09d6327b861060a34'],
  ['tokenizer_config.json', 113, 'be1cb066d6ef6b074b3f15e6a6dd21ac88ff3cdaedf325f0aaed686c70f75d20'],
  ['voices/af_bella.bin', 522240, 'f69d836209b78eb8c66e75e3cda491e26ea838a3674257e9d4e5703cbaf55c8b'],
  ['voices/af_heart.bin', 522240, 'd583ccff3cdca2f7fae535cb998ac07e9fcb90f09737b9a41fa2734ec44a8f0b'],
  ['voices/af_nicole.bin', 522240, 'cd2191ab31b914ed7b318416b0e4440fdf392ddad9106a060819aa600a64f59a'],
  ['onnx/model.onnx', 325532232, '8fbea51ea711f2af382e88c833d9e288c6dc82ce5e98421ea61c058ce21a34cb'],
];
const TOTAL = FILES.reduce((a, f) => a + f[1], 0);

// A stand-in for tests (WORKWOOD_TTS, a Node script speaking the same lines) counts as here, unless WORKWOOD_TTS_ABSENT
// says to start without it; getting it then takes a moment and downloads nothing.
const STANDIN = process.env.WORKWOOD_TTS;
const onDisk = () => STANDIN ? !process.env.WORKWOOD_TTS_ABSENT : FILES.every(([f, size]) => fs.statSync(path.join(HOME, f), { throwIfNoEntry: false })?.size === size);
/** state: absent | getting | present | failed; progress in percent while getting. */
export const status = { state: onDisk() ? 'present' : 'absent', progress: 0, error: null, size: Math.round(TOTAL / 1e6) + ' MB' };
/** Is Kokoro here? */
export const available = () => status.state === 'present';

/** Download Kokoro. Resolves true once it is here, false if it could not be got (the status says why). */
let getting = null;
export function get() {
  if (available()) return Promise.resolve(true);
  return getting ||= (async () => {
    Object.assign(status, { state: 'getting', progress: 0, error: null });
    try {
      if (STANDIN) await new Promise(ok => setTimeout(ok, +process.env.WORKWOOD_TTS_GET_MS || 300));
      else await fetchAll(got => { status.progress = Math.min(99, Math.floor(100 * got / TOTAL)); });
      Object.assign(status, { state: 'present', progress: 100 });
      return true;
    } catch (e) {
      Object.assign(status, { state: 'failed', error: String(e?.message || e).split('\n')[0] });
      return false;
    } finally { getting = null; }
  })();
}
async function fetchAll(progress) {
  let done = 0;
  for (const [f, size, sha] of FILES) {
    const to = path.join(HOME, f);
    if (fs.statSync(to, { throwIfNoEntry: false })?.size === size) { done += size; progress(done); continue; }
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const r = await fetch(`https://huggingface.co/${MODEL}/resolve/${REVISION}/${f}`);
    if (!r.ok) throw new Error(`Could not download Kokoro (${r.status} for ${f}).`);
    const hash = crypto.createHash('sha256'), part = to + '.part';
    let got = 0;
    await pipe(Readable.fromWeb(r.body), new Transform({ transform(c, _, next) { hash.update(c); got += c.length; progress(done + got); next(null, c); } }), fs.createWriteStream(part));
    if (got !== size || hash.digest('hex') !== sha) { fs.rmSync(part, { force: true }); throw new Error(`Kokoro's ${f} did not match what was expected. Try again.`); }
    fs.renameSync(part, to);
    done += size;
  }
}

let cur = null, n = 0, idleT = null;
function start() {
  fs.mkdirSync(TMP, { recursive: true });
  const child = spawn(process.execPath, STANDIN ? [STANDIN] : [WORKER, MODELS_DIR], { stdio: ['pipe', 'pipe', 'pipe'] });
  let said = ''; child.stderr.on('data', d => { said = (said + d).slice(-2000); });
  const jobs = new Map();
  const w = { child, jobs, dead: false };
  w.ready = new Promise((ok, no) => {
    readline.createInterface({ input: child.stdout }).on('line', line => {
      let m; try { m = JSON.parse(line); } catch { return; }
      if (m.ready) ok();
      if (m.failed) no(new Error(m.failed));
      if (m.id) { const j = jobs.get(m.id); jobs.delete(m.id); if (!j) return; if (m.error) j.no(new Error(m.error)); else j.ok(); }
    });
    child.on('exit', code => {
      w.dead = true; if (cur === w) cur = null;
      const err = new Error(said.trim().split('\n').pop() || `The voice stopped (${code ?? 'killed'}).`);
      no(err); for (const j of jobs.values()) j.no(err); jobs.clear();
    });
    child.on('error', no);
  });
  w.ready.catch(() => {});
  return w;
}
function idleSoon() {
  clearTimeout(idleT);
  idleT = setTimeout(() => { if (cur?.jobs.size) return idleSoon(); cur?.child.kill(); cur = null; }, IDLE_MS);
  idleT.unref();
}

/** One sentence in, a WAV clip out. Sentences are made one at a time, in the order asked for. */
let queue = Promise.resolve();
export function speak(text, voice) {
  text = String(text || '').replace(/\s+/g, ' ').trim().slice(0, 2000);
  if (!VOICES.includes(voice)) voice = VOICES[0];
  idleSoon();
  const job = queue.then(async () => {
    if (!text) throw new Error('Nothing to read.');
    if (!cur || cur.dead) cur = start();
    const w = cur; await w.ready;
    const id = ++n, out = path.join(TMP, id + '.wav');
    await new Promise((ok, no) => { w.jobs.set(id, { ok, no }); w.child.stdin.write(JSON.stringify({ id, text, voice, out }) + '\n'); });
    try { return await fs.promises.readFile(out); } finally { fs.promises.rm(out, { force: true }); }
  });
  queue = job.catch(() => {}).finally(idleSoon);
  return job;
}
export function stop() { cur?.child.kill(); cur = null; fs.rmSync(TMP, { recursive: true, force: true }); }
