// Reads answers aloud for Workwood: Kokoro-82M (ONNX, full precision) on the processor, in its own process.
// Run by service/speech.mjs with the models folder as its argument. One JSON request per line on stdin:
// {"id": 1, "text": "...", "voice": "af_bella", "out": "/tmp/.../1.wav"}; one JSON line back per request
// when its clip is written: {"id": 1} or {"id": 1, "error": "..."}. The first line out is {"ready": true},
// or {"failed": "..."} if the model cannot load.
//
// Text to phonemes and the voice's style vector follow kokoro-js 1.2.1 (Apache-2.0, by Xenova:
// github.com/hexgrad/kokoro, kokoro.js), on the transformers.js Workwood already uses. eSpeak NG comes with phonemizer.
import fs from 'node:fs';
import path from 'node:path';
import readline from 'node:readline';

export const MODEL = 'onnx-community/Kokoro-82M-v1.0-ONNX';
const RATE = 24000;

// ---------- text to phonemes (after kokoro-js) ----------
function splitNum(s) {
  if (s.includes('.')) return s;
  if (s.includes(':')) { const [h, m] = s.split(':').map(Number); return m === 0 ? `${h} o'clock` : m < 10 ? `${h} oh ${m}` : `${h} ${m}`; }
  const y = parseInt(s.slice(0, 4), 10);
  if (y < 1100 || y % 1000 < 10) return s;
  const left = s.slice(0, 2), right = parseInt(s.slice(2, 4), 10), suf = s.endsWith('s') ? 's' : '';
  if (y % 1000 >= 100 && y % 1000 <= 999) { if (right === 0) return `${left} hundred${suf}`; if (right < 10) return `${left} oh ${right}${suf}`; }
  return `${left} ${right}${suf}`;
}
function money(s) {
  const unit = s[0] === '$' ? 'dollar' : 'pound';
  if (isNaN(Number(s.slice(1)))) return `${s.slice(1)} ${unit}s`;
  if (!s.includes('.')) return `${s.slice(1)} ${unit}${s.slice(1) === '1' ? '' : 's'}`;
  const [b, c] = s.slice(1).split('.'), cents = parseInt(c.padEnd(2, '0'), 10);
  return `${b} ${unit}${b === '1' ? '' : 's'} and ${cents} ${s[0] === '$' ? (cents === 1 ? 'cent' : 'cents') : (cents === 1 ? 'penny' : 'pence')}`;
}
const point = s => { const [a, b] = s.split('.'); return `${a} point ${b.split('').join(' ')}`; };
const normalize = t => t.replace(/[‘’]/g, "'").replace(/«/g, '“').replace(/»/g, '”').replace(/[“”]/g, '"').replace(/\(/g, '«').replace(/\)/g, '»')
  .replace(/[^\S \n]/g, ' ').replace(/  +/, ' ').replace(/(?<=\n) +(?=\n)/g, '')
  .replace(/\bD[Rr]\.(?= [A-Z])/g, 'Doctor').replace(/\b(?:Mr\.|MR\.(?= [A-Z]))/g, 'Mister').replace(/\b(?:Ms\.|MS\.(?= [A-Z]))/g, 'Miss')
  .replace(/\b(?:Mrs\.|MRS\.(?= [A-Z]))/g, 'Mrs').replace(/\betc\.(?! [A-Z])/gi, 'etc').replace(/\b(y)eah?\b/gi, "$1e'a")
  .replace(/\d*\.\d+|\b\d{4}s?\b|(?<!:)\b(?:[1-9]|1[0-2]):[0-5]\d\b(?!:)/g, splitNum).replace(/(?<=\d),(?=\d)/g, '')
  .replace(/[$£]\d+(?:\.\d+)?(?: hundred| thousand| (?:[bm]|tr)illion)*\b|[$£]\d+\.\d\d?\b/gi, money).replace(/\d*\.\d+/g, point)
  .replace(/(?<=\d)-(?=\d)/g, ' to ').replace(/(?<=\d)S/g, ' S').replace(/(?<=[BCDFGHJ-NP-TV-Z])'?s\b/g, "'S").replace(/(?<=X')S\b/g, 's')
  .replace(/(?:[A-Za-z]\.){2,} [a-z]/g, m => m.replace(/\./g, '-')).replace(/(?<=[A-Z])\.(?=[A-Z])/gi, '-').trim();
const PUNCT = /(\s*[;:,.!?¡¿—…"«»“”(){}[\]]+\s*)+/g;   // kept as they are; only the words between go to eSpeak

async function phonemes(text, phonemize) {
  text = normalize(text);
  const parts = []; let at = 0;
  for (const m of text.matchAll(PUNCT)) {
    if (at < m.index) parts.push([false, text.slice(at, m.index)]);
    if (m[0]) parts.push([true, m[0]]);
    at = m.index + m[0].length;
  }
  if (at < text.length) parts.push([false, text.slice(at)]);
  const said = (await Promise.all(parts.map(async ([p, t]) => p ? t : (await phonemize(t, 'en-us')).join(' ')))).join('');
  return said.replace(/kəkˈoːɹoʊ/g, 'kˈoʊkəɹoʊ').replace(/kəkˈɔːɹəʊ/g, 'kˈəʊkəɹəʊ').replace(/ʲ/g, 'j').replace(/r/g, 'ɹ').replace(/x/g, 'k')
    .replace(/ɬ/g, 'l').replace(/(?<=[a-zɹː])(?=hˈʌndɹɪd)/g, ' ').replace(/ z(?=[;:,.!?¡¿—…"«»“” ]|$)/g, 'z')
    .replace(/(?<=nˈaɪn)ti(?!ː)/g, 'di').trim();
}

/** 16-bit PCM WAV, mono. */
function wav(samples) {
  const b = Buffer.alloc(44 + samples.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + samples.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(RATE, 24); b.writeUInt32LE(RATE * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(samples.length * 2, 40);
  for (let i = 0; i < samples.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), 44 + i * 2);
  return b;
}

async function load(dir) {
  const { StyleTextToSpeech2Model, AutoTokenizer, Tensor, env } = await import('@huggingface/transformers');
  const { phonemize } = await import('phonemizer');
  Object.assign(env, { localModelPath: dir, allowLocalModels: true, allowRemoteModels: false, useFSCache: false });
  const [model, tokenizer] = await Promise.all([StyleTextToSpeech2Model.from_pretrained(MODEL, { dtype: 'fp32', device: 'cpu' }), AutoTokenizer.from_pretrained(MODEL)]);
  const voices = new Map();
  const voice = v => voices.get(v) || voices.set(v, new Float32Array(new Uint8Array(fs.readFileSync(path.join(dir, MODEL, 'voices', v + '.bin'))).buffer)).get(v);
  return async (text, v) => {
    const { input_ids } = tokenizer(await phonemes(text, phonemize), { truncation: true });
    const at = 256 * Math.min(Math.max(input_ids.dims.at(-1) - 2, 0), 509);
    const { waveform } = await model({ input_ids, style: new Tensor('float32', voice(v).slice(at, at + 256), [1, 256]), speed: new Tensor('float32', [1], [1]) });
    return wav(waveform.data);
  };
}

const say = m => process.stdout.write(JSON.stringify(m) + '\n');
if (process.argv[1] && import.meta.url.endsWith(path.basename(process.argv[1]))) {
  let make;
  try { make = await load(process.argv[2]); say({ ready: true }); }
  catch (e) { say({ failed: String(e?.message || e).split('\n')[0] }); process.exit(1); }
  let line = Promise.resolve();   // one at a time, in order
  readline.createInterface({ input: process.stdin }).on('line', l => {
    let m; try { m = JSON.parse(l); } catch { return; }
    line = line.then(async () => {
      try { fs.writeFileSync(m.out, await make(m.text, m.voice)); say({ id: m.id }); }
      catch (e) { say({ id: m.id, error: String(e?.message || e).split('\n')[0] }); }
    });
  }).on('close', () => line.then(() => process.exit(0)));
}
