// The speech model runs here, in its own process, so the graphics card's libraries can be on its library path
// (the dynamic linker reads LD_LIBRARY_PATH only when a process starts). One model per process.
import { pathToFileURL } from 'node:url';

let run = null;
const say = m => process.send?.(m);

async function load({ id, dtype, device, cacheDir }) {
  if (process.env.WORKWOOD_STT) return (await import(pathToFileURL(process.env.WORKWOOD_STT).href)).default;   // a stand-in, for tests
  const { pipeline, env } = await import('@huggingface/transformers');
  env.cacheDir = cacheDir;
  const sizes = new Map();
  const asr = await pipeline('automatic-speech-recognition', id, { dtype, device, progress_callback: p => {
    if (p.status !== 'progress' || !p.total) return;
    sizes.set(p.file, [p.loaded, p.total]);
    let got = 0, all = 0; for (const [a, b] of sizes.values()) { got += a; all += b; }
    say({ progress: { got, all } });
  } });
  return async (audio, language) => (await asr(audio, { chunk_length_s: 30, stride_length_s: 5, language, task: 'transcribe' })).text;
}

process.on('message', async m => {
  if (m.load) {
    try { run = await load(m.load); say({ ready: true }); }
    catch (e) { say({ failed: String(e?.message || e).split('\n')[0] }); }
  }
  if (m.job) {
    try { say({ job: m.job, text: String(await run(m.audio, m.language) || '') }); }
    catch (e) { say({ job: m.job, error: String(e?.message || e).split('\n')[0] }); }
  }
});
process.on('disconnect', () => process.exit(0));
