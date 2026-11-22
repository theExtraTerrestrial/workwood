// Dictation: speech to text on this machine, with a Whisper model run by onnxruntime. Audio never leaves it.
// Two models. The standard one (Whisper Small, about 250 MB) runs on the processor and is downloaded on first use.
// The better one (Whisper Large v3 Turbo) runs on an NVIDIA graphics card: it is downloaded only when you ask, with
// the CUDA libraries onnxruntime needs, which come from NVIDIA's own packages on PyPI (pinned, checked by hash).
// Models live in ~/.cache/workwood/models, the CUDA libraries in ~/.cache/workwood/cuda.
// The model runs in a child process (voice-worker.mjs) so the CUDA libraries can be on its library path.
import { fork, execFile } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { once } from 'node:events';
import { pipeline as pipe } from 'node:stream/promises';
import { fileURLToPath } from 'node:url';

const CACHE = path.join(os.homedir(), '.cache', 'workwood');
const MODELS_DIR = path.join(CACHE, 'models'), CUDA_DIR = path.join(CACHE, 'cuda');
const WORKER = path.join(path.dirname(fileURLToPath(import.meta.url)), 'voice-worker.mjs');
export const MODELS = {
  small: { id: process.env.WORKWOOD_STT_MODEL || 'onnx-community/whisper-small', dtype: 'q8', device: 'cpu', name: 'Whisper Small' },
  turbo: { id: 'onnx-community/whisper-large-v3-turbo', dtype: 'fp16', device: 'cuda', name: 'Whisper Large v3 Turbo',
    files: ['encoder_model_fp16.onnx', 'decoder_model_merged_fp16.onnx'] },
};
// What onnxruntime-node 1.30's CUDA provider links against (CUDA 13, cuDNN 9). Change these with onnxruntime.
const CUDA_PKGS = [['nvidia-cuda-runtime', '13.5.37'], ['nvidia-cublas', '13.10.1.6'], ['nvidia-curand', '10.4.5.25'], ['nvidia-cudnn-cu13', '9.28.1.4']];
const CUDA_LIBS = /^lib(cudart|cublas|cublasLt|curand|cudnn(_\w+)?)\.so\.\d+$/;
const LIB_SHARE = 0.4;   // of the whole download: the libraries are about 1.0 GB, the model 1.6 GB

// better: the GPU model. gpu: the card's name, or null if there is none to use; state: absent | getting | present | failed
export const status = { state: 'idle', progress: 0, error: null, model: MODELS.small.name, device: 'cpu', fallback: null,
  better: { gpu: null, state: 'absent', progress: 0, error: null, size: '2.7 GB' } };
const B = status.better;
let want = 'small', cur = null, spare = null, queue = Promise.resolve(), busy = 0;
const firstLine = e => String(e?.message || e).split('\n')[0];
const turboOnDisk = () => fs.existsSync(path.join(CUDA_DIR, 'ready.json'))
  && MODELS.turbo.files.every(f => fs.existsSync(path.join(MODELS_DIR, ...MODELS.turbo.id.split('/'), 'onnx', f)));
let have = turboOnDisk();
if (have) B.state = 'present';
const wantKind = () => want === 'turbo' && have ? 'turbo' : 'small';

/** The NVIDIA card here, by name, or null. Only Linux on x64 (WSL included): the only place onnxruntime-node has CUDA. */
const gpu = ('WORKWOOD_GPU' in process.env ? Promise.resolve(process.env.WORKWOOD_GPU || null)
  : process.platform !== 'linux' || process.arch !== 'x64' ? Promise.resolve(null)
  : new Promise(ok => execFile('nvidia-smi', ['--query-gpu=name', '--format=csv,noheader'], { timeout: 8000 }, (e, out) => ok(e ? null : out.split('\n')[0].trim() || null))))
  .then(name => (B.gpu = name));

function spawnEngine(kind) {
  const m = MODELS[kind], env = { ...process.env };
  if (m.device === 'cuda') env.LD_LIBRARY_PATH = [CUDA_DIR, process.env.LD_LIBRARY_PATH].filter(Boolean).join(':');
  const child = fork(WORKER, [], { env, serialization: 'advanced', stdio: ['ignore', 'ignore', 'pipe', 'ipc'] });
  let said = ''; child.stderr.on('data', d => { said = (said + d).slice(-2000); });
  const jobs = new Map(); let n = 0;
  const e = { kind, child, onProgress: null, dead: false,
    run: (audio, language) => new Promise((ok, no) => { const job = ++n; jobs.set(job, { ok, no }); child.send({ job, audio, language }); }),
    stop: () => { e.dead = true; child.kill(); } };
  e.ready = new Promise((ok, no) => {
    child.on('message', msg => {
      if (msg.progress) e.onProgress?.(msg.progress);
      if (msg.ready) ok();
      if (msg.failed) no(new Error(msg.failed));
      if (msg.job) { const j = jobs.get(msg.job); jobs.delete(msg.job); if (msg.error) j?.no(new Error(msg.error)); else j?.ok(msg.text); }
    });
    child.on('exit', code => {
      e.dead = true;
      const err = new Error(said.trim().split('\n').pop() || `The speech engine stopped (${code ?? 'killed'}).`);
      no(err); for (const j of jobs.values()) j.no(err); jobs.clear();
    });
  });
  e.ready.catch(() => {});
  child.send({ load: { id: m.id, dtype: m.dtype, device: m.device, cacheDir: MODELS_DIR } });
  return e;
}

/** Make `e` the engine dictation uses, and let the status follow it. A GPU model that cannot load gives way to the standard one. */
function use(e) {
  cur = e;
  Object.assign(status, { state: 'loading', progress: 0, error: null, model: MODELS[e.kind].name, device: MODELS[e.kind].device });
  e.onProgress = p => { status.progress = Math.round(100 * p.got / p.all); };
  e.ready.then(() => { if (cur === e) status.state = 'ready'; }, err => {
    if (cur !== e) return;
    if (e.kind === 'turbo') { status.fallback = 'The graphics card could not be used: ' + firstLine(err); use(spawnEngine('small')); return; }
    cur = null; Object.assign(status, { state: 'failed', error: firstLine(err) });
  });
  e.child.on('exit', () => { if (cur === e && status.state === 'ready') { cur = null; status.state = 'idle'; } });
  return e;
}
export function warm() { return cur && !cur.dead ? cur : use(spawnEngine(wantKind())); }
async function engine() {
  for (;;) {
    const e = warm();
    try { await e.ready; return e; } catch (err) { if (cur && cur !== e) continue; throw err; }   // gave way to another: wait for that one
  }
}

/** Which model dictation should use: 'small' or 'turbo' (only once it is here). The one in use goes when its work is done. */
export function choose(kind) {
  want = kind === 'turbo' ? 'turbo' : 'small'; status.fallback = null;
  const k = wantKind();
  if (cur?.kind === k && !cur.dead) return;
  const old = cur;
  if (k === 'turbo' && spare && !spare.dead) { use(spare); spare = null; }
  else if (old) use(spawnEngine(k));
  if (old) queue.finally(() => old.stop());
}

/** At start-up: have the model in memory before the first press, but never download it unasked. */
export async function warmIfPresent(kind) {
  want = kind === 'turbo' ? 'turbo' : 'small';
  await gpu;
  if (process.env.WORKWOOD_STT || wantKind() === 'turbo' || fs.existsSync(path.join(MODELS_DIR, ...MODELS.small.id.split('/')))) warm();
}
export const isBusy = () => busy > 0;
/** 16 kHz mono samples in, text out. One at a time. */
export function transcribe(audio, language = process.env.WORKWOOD_STT_LANGUAGE || 'english') {   // any language Whisper knows, by name
  busy++;
  const job = queue.then(async () => String(await (await engine()).run(audio, language) || '').replace(/\[[A-Z_ ]+\]|\([a-z ]+\)/g, '').replace(/\s+/g, ' ').trim());
  queue = job.catch(() => {}).finally(() => { busy--; });
  return job;
}

/** Get the GPU model: the CUDA libraries, then the model, which is loaded on the card once to prove it works. Resolves true when it is here. */
export async function getBetter() {
  await gpu;
  if (!B.gpu) throw new Error('There is no NVIDIA graphics card here to run it.');
  if (B.state === 'getting') return false;
  if (have && B.state === 'present') return true;
  Object.assign(B, { state: 'getting', progress: 0, error: null });
  const at = p => { B.progress = Math.max(B.progress, Math.min(99, Math.round(100 * p))); };
  try {
    if (!process.env.WORKWOOD_STT) await fetchCuda(p => at(LIB_SHARE * p));
    const e = spawnEngine('turbo');
    e.onProgress = p => at(LIB_SHARE + (1 - LIB_SHARE) * p.got / p.all);
    await e.ready;
    spare?.stop(); spare = e; have = true;
    Object.assign(B, { state: 'present', progress: 100 });
    return true;
  } catch (err) {
    Object.assign(B, { state: 'failed', error: firstLine(err) });
    return false;
  }
}

async function fetchCuda(progress) {
  const done = path.join(CUDA_DIR, 'ready.json');
  if (fs.existsSync(done)) return progress(1);
  fs.mkdirSync(CUDA_DIR, { recursive: true });
  const wheels = await Promise.all(CUDA_PKGS.map(async ([name, version]) => {
    const r = await fetch(`https://pypi.org/pypi/${name}/${version}/json`);
    if (!r.ok) throw new Error(`PyPI did not answer for ${name} ${version} (${r.status}).`);
    const w = (await r.json()).urls.find(u => /manylinux.*x86_64\.whl$/.test(u.filename));
    if (!w) throw new Error(`PyPI has no Linux build of ${name} ${version}.`);
    return w;
  }));
  const total = wheels.reduce((n, w) => n + w.size, 0); let got = 0;
  for (const w of wheels) {
    const file = path.join(CUDA_DIR, '.download.whl'), r = await fetch(w.url);
    if (!r.ok) throw new Error(`Could not download ${w.filename} (${r.status}).`);
    const hash = crypto.createHash('sha256'), out = fs.createWriteStream(file);
    for await (const c of r.body) { hash.update(c); got += c.length; progress(got / total); if (!out.write(c)) await once(out, 'drain'); }
    out.end(); await once(out, 'finish');
    if (hash.digest('hex') !== w.digests.sha256) throw new Error(`${w.filename} did not match its published hash.`);
    await unzipLibs(file, CUDA_DIR);
    fs.rmSync(file);
  }
  fs.writeFileSync(done, JSON.stringify({ packages: Object.fromEntries(CUDA_PKGS) }, null, 1));
}

/** Take the CUDA libraries out of a wheel (a zip file), streaming, so a 500 MB library never sits in memory. */
async function unzipLibs(file, dir) {
  const fh = await fs.promises.open(file);
  try {
    const { size } = await fh.stat(), read = async (pos, len) => { const b = Buffer.alloc(len); await fh.read(b, 0, len, pos); return b; };
    const tail = await read(Math.max(0, size - 65557), Math.min(size, 65557)), at = tail.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
    if (at < 0) throw new Error('A CUDA package was not a zip file.');
    let count = tail.readUInt16LE(at + 10), cdSize = tail.readUInt32LE(at + 12), cdAt = tail.readUInt32LE(at + 16);
    if (cdAt === 0xffffffff || count === 0xffff) {   // zip64
      const z = await read(Number(tail.readBigUInt64LE(at - 20 + 8)), 56);
      count = Number(z.readBigUInt64LE(32)); cdSize = Number(z.readBigUInt64LE(40)); cdAt = Number(z.readBigUInt64LE(48));
    }
    const cd = await read(cdAt, cdSize);
    for (let p = 0, i = 0; i < count; i++) {
      const method = cd.readUInt16LE(p + 10), nl = cd.readUInt16LE(p + 28), xl = cd.readUInt16LE(p + 30), cl = cd.readUInt16LE(p + 32);
      let comp = cd.readUInt32LE(p + 20), local = cd.readUInt32LE(p + 42);
      const name = cd.toString('utf8', p + 46, p + 46 + nl), extra = cd.subarray(p + 46 + nl, p + 46 + nl + xl);
      if (comp === 0xffffffff || local === 0xffffffff) {   // their real values are in the zip64 extra field, in order
        for (let x = 0; x < extra.length; x += 4 + extra.readUInt16LE(x + 2)) if (extra.readUInt16LE(x) === 1) {
          let q = x + 4;
          if (cd.readUInt32LE(p + 24) === 0xffffffff) q += 8;
          if (comp === 0xffffffff) { comp = Number(extra.readBigUInt64LE(q)); q += 8; }
          if (local === 0xffffffff) local = Number(extra.readBigUInt64LE(q));
        }
      }
      p += 46 + nl + xl + cl;
      const base = path.posix.basename(name);
      if (!name.includes('/lib/') || !CUDA_LIBS.test(base)) continue;
      const lh = await read(local, 30), start = local + 30 + lh.readUInt16LE(26) + lh.readUInt16LE(28), part = path.join(dir, base + '.part');
      const src = fs.createReadStream(null, { fd: fh.fd, autoClose: false, start, end: start + comp - 1 });
      await (method === 8 ? pipe(src, zlib.createInflateRaw(), fs.createWriteStream(part)) : pipe(src, fs.createWriteStream(part)));
      fs.renameSync(part, path.join(dir, base));
    }
  } finally { await fh.close(); }
}
