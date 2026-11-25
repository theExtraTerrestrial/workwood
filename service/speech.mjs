// Read aloud: text to speech on this machine, with Kokoro-82M (ONNX) on the processor. Text never leaves it.
// Kokoro is not Workwood's to install: it lives in ~/.local/share/kokoro-tts (a venv with kokoro-onnx, the model and
// the voices), set up by hand. Without that folder nothing here runs and the speaker buttons don't show.
// The model runs in one Python process (speech-worker.py), started on the first sentence asked for and stopped after
// two minutes without one: loaded, it holds about 0.8 GB. Each sentence is its own short clip, made at normal speed;
// the window plays it faster or slower itself, so changing speed makes nothing again.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline';
import { fileURLToPath } from 'node:url';

const KOKORO = process.env.WORKWOOD_KOKORO || path.join(os.homedir(), '.local', 'share', 'kokoro-tts');
const PY = path.join(KOKORO, 'venv', 'bin', 'python');
const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'speech-worker.py');
const IDLE_MS = +process.env.WORKWOOD_TTS_IDLE || 2 * 60e3;
export const VOICES = ['af_bella', 'af_heart', 'af_nicole'];   // your shortlist: American, female
const TMP = path.join(os.tmpdir(), `workwood-speech-${process.pid}`);

/** Is Kokoro here? A stand-in for tests (WORKWOOD_TTS, a Node script speaking the same lines) counts. */
export const available = () => !!process.env.WORKWOOD_TTS
  || [PY, path.join(KOKORO, 'kokoro-v1.0.onnx'), path.join(KOKORO, 'voices-v1.0.bin')].every(f => fs.existsSync(f));

let cur = null, n = 0, idleT = null;
function start() {
  fs.mkdirSync(TMP, { recursive: true });
  const child = process.env.WORKWOOD_TTS ? spawn(process.execPath, [process.env.WORKWOOD_TTS], { stdio: ['pipe', 'pipe', 'pipe'] })
    : spawn(PY, ['-I', WORKER, KOKORO], { stdio: ['pipe', 'pipe', 'pipe'] });
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
