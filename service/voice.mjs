// Dictation: speech to text on this machine, with a Whisper model run by onnxruntime. Audio never leaves it.
// The model (about 250 MB) is downloaded once, on first use, and kept in ~/.cache/workwood/models.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const MODEL = process.env.WORKWOOD_STT_MODEL || 'onnx-community/whisper-small';
export const status = { state: 'idle', progress: 0, error: null };   // idle | loading | ready | failed
let engine = null, queue = Promise.resolve(), busy = 0;

async function load() {
  if (process.env.WORKWOOD_STT) return (await import(pathToFileURL(process.env.WORKWOOD_STT).href)).default;   // a stand-in, for tests
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = path.join(os.homedir(), '.cache', 'workwood', 'models');
  const sizes = new Map();
  const asr = await pipeline('automatic-speech-recognition', MODEL, { dtype: 'q8', progress_callback: p => {
    if (p.status !== 'progress' || !p.total) return;
    sizes.set(p.file, [p.loaded, p.total]);
    let got = 0, all = 0; for (const [a, b] of sizes.values()) { got += a; all += b; }
    status.progress = Math.round(100 * got / all);
  } });
  const fixed = process.env.WORKWOOD_STT_LANGUAGE || 'english';   // any language Whisper knows, by name
  return async (audio, language = fixed) => (await asr(audio, { chunk_length_s: 30, stride_length_s: 5, language, task: 'transcribe' })).text;
}
export function warm() {
  if (!engine) {
    status.state = 'loading'; status.error = null;
    engine = load().then(e => { status.state = 'ready'; return e; }, e => { engine = null; status.state = 'failed'; status.error = String(e.message).split('\n')[0]; throw e; });
    engine.catch(() => {});
  }
  return engine;
}
/** At start-up: have the model in memory before the first press, but never download it unasked. */
export function warmIfPresent() {
  if (process.env.WORKWOOD_STT || fs.existsSync(path.join(os.homedir(), '.cache', 'workwood', 'models', ...MODEL.split('/')))) warm();
}
export const isBusy = () => busy > 0;
/** 16 kHz mono samples in, text out. One at a time. */
export function transcribe(audio, language) {
  busy++;
  const job = queue.then(async () => { const run = await warm(); return String(await run(audio, language) || '').replace(/\[[A-Z_ ]+\]|\([a-z ]+\)/g, '').replace(/\s+/g, ' ').trim(); });
  queue = job.catch(() => {}).finally(() => { busy--; });
  return job;
}
