// npm run test:stress -- "<part of a test's name>" [runs] [--before N]
// Runs the tests whose names contain that text, that many times (5 unless given), while twice as many busy loops as
// this computer has cores keep it slow: a test that only fails now and then, because something arrives later than it
// expects, fails here far more often. Each also brings the N tests of its kind that run just before it (1 unless given),
// since a test can fail because of what the one before it left behind; window tests start with the one that opens the window.
// A failing window test leaves its evidence in <tmp>/workwood-test-failures/<run>/<test>/, listed at the end.
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2), bi = args.indexOf('--before');
const before = bi < 0 ? 1 : Math.max(0, parseInt(args[bi + 1], 10) || 0);
if (bi >= 0) args.splice(bi, 2);
const [want, n = '5'] = args;
if (!want) { console.error('Usage: npm run test:stress -- "<part of a test\'s name>" [runs] [--before N]'); process.exit(2); }
const runs = Math.max(1, parseInt(n, 10) || 5);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const FILES = ['tests/app.test.mjs', 'tests/phone.test.mjs', 'tests/copy.test.mjs'], OPENS = 'window: shows the inbox by project';

// every test's name, in the order its file runs them
const names = file => fs.readFileSync(path.join(root, file), 'utf8').split('\n')
  .map(l => l.match(/^(?:ui|test)\((['"`])((?:\\.|(?!\1)[^\\])*)\1/)).filter(Boolean).map(m => m[2].replace(/\\(.)/g, '$1'));
const pick = new Set(); let files = [];
for (const f of FILES) {
  const all = names(f), hits = all.flatMap((t, i) => t.includes(want) ? [i] : []);
  if (!hits.length) continue;
  files.push(f);
  // the ones before a window test are window tests: they share its page as well as the service
  const kind = t => t.startsWith('window: ');
  for (const i of hits) { pick.add(all[i]); for (let k = i - 1, got = 0; k >= 0 && got < before; k--) if (kind(all[k]) === kind(all[i])) { pick.add(all[k]); got++; } }
  if (hits.some(i => kind(all[i]))) pick.add(all.find(t => t.startsWith(OPENS)));
}
if (!pick.size) { console.error(`No test's name contains "${want}".`); process.exit(2); }
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = [...pick].map(t => `^${esc(t)}$`).join('|');
console.log(`${pick.size} tests, ${runs} runs:\n` + [...pick].map(t => '  ' + t.slice(0, 110)).join('\n'));

const busy = Array.from({ length: os.cpus().length * 2 }, () => spawn(process.execPath, ['-e', 'for(;;);'], { stdio: 'ignore' }));
const stop = () => { for (const b of busy) b.kill(); };
process.on('exit', stop); process.on('SIGINT', () => process.exit(130));

const evidence = path.join(os.tmpdir(), 'workwood-test-failures'), started = Date.now();
let failed = 0;
for (let i = 1; i <= runs; i++) {
  const r = spawnSync(process.execPath, ['--test', `--test-name-pattern=${pattern}`, ...files], { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = r.stdout + r.stderr, count = k => +(out.match(new RegExp(`^ℹ ${k} (\\d+)`, 'm'))?.[1] || 0);
  const bad = [...new Set(out.match(/^✖ (?!failing tests).*$/gm) || [])].filter(l => !/\.mjs \(/.test(l));
  if (bad.length || r.status) failed++;
  console.log(`run ${i}/${runs}: ${count('pass')} passed, ${count('fail')} failed` + bad.map(l => '\n  ' + l.replace(/ \(\d+(\.\d+)?ms\)$/, '')).join(''));
}
stop();
const kept = (fs.existsSync(evidence) ? fs.readdirSync(evidence) : []).map(r => path.join(evidence, r))
  .filter(d => fs.statSync(d).mtimeMs >= started).flatMap(d => fs.readdirSync(d).map(t => path.join(d, t)));
console.log(`\n${runs - failed} of ${runs} runs passed under load (${busy.length} busy loops).` + (kept.length ? `\nEvidence: ${kept.join('\n          ')}` : ''));
process.exit(failed ? 1 : 0);
