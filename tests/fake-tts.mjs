// Stands in for Kokoro (service/speech-worker.mjs), speaking its protocol: a JSON request a line, a JSON line back once
// the clip is written. The clip is silence, a fifth of a second a sentence (twenty with "slowly" in it), so tests need no model and make no sound.
import fs from 'node:fs';
import readline from 'node:readline';

function wav(seconds, rate = 8000) {
  const n = Math.round(seconds * rate), b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVE', 8); b.write('fmt ', 12); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  return b;
}
console.log(JSON.stringify({ ready: true }));
readline.createInterface({ input: process.stdin }).on('line', line => {
  const m = JSON.parse(line);
  if (process.env.FAKE_CLAUDE_LOG) fs.appendFileSync(process.env.FAKE_CLAUDE_LOG, `speak ${m.voice} ${m.text}\n`);
  fs.writeFileSync(m.out, wav(/slowly/.test(m.text) ? 20 : 0.2));   // a sentence with "slowly" in it lasts long enough to look at
  console.log(JSON.stringify({ id: m.id }));
});
