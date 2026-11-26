// npm run test:stress -- "<part of a test's name>" [runs]
// Runs the tests whose names match, that many times (5 unless given), while twice as many busy loops as this computer
// has cores keep it slow: a test that only fails now and then, because something arrives later than it expects, fails
// here far more often. Window tests always start with the one that opens the window. A failing window test leaves its
// evidence in <tmp>/workwood-test-failures/<test>/ (emptied first).
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const [want, n = '5'] = process.argv.slice(2);
if (!want) { console.error('Usage: npm run test:stress -- "<part of a test\'s name>" [runs]'); process.exit(2); }
const runs = Math.max(1, parseInt(n, 10) || 5);
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const evidence = path.join(os.tmpdir(), 'workwood-test-failures');
fs.rmSync(evidence, { recursive: true, force: true });

const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const pattern = `${esc(want)}|shows the inbox by project`;
const busy = Array.from({ length: os.cpus().length * 2 }, () => spawn(process.execPath, ['-e', 'for(;;);'], { stdio: 'ignore' }));
const stop = () => { for (const b of busy) b.kill(); };
process.on('exit', stop); process.on('SIGINT', () => process.exit(130));

let failed = 0;
for (let i = 1; i <= runs; i++) {
  const r = spawnSync(process.execPath, ['--test', `--test-name-pattern=${pattern}`, 'tests/app.test.mjs', 'tests/phone.test.mjs', 'tests/copy.test.mjs'],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });
  const out = r.stdout + r.stderr, count = k => +(out.match(new RegExp(`^ℹ ${k} (\\d+)`, 'm'))?.[1] || 0);
  const bad = [...new Set(out.match(/^✖ (?!failing tests).*$/gm) || [])].filter(l => !/\.mjs \(/.test(l));
  if (bad.length || r.status) failed++;
  console.log(`run ${i}/${runs}: ${count('pass')} passed, ${count('fail')} failed` + bad.map(l => '\n  ' + l.replace(/ \(\d+(\.\d+)?ms\)$/, '')).join(''));
}
stop();
const dirs = fs.existsSync(evidence) ? fs.readdirSync(evidence) : [];
console.log(`\n${runs - failed} of ${runs} runs passed under load (${busy.length} busy loops).` + (dirs.length ? `\nEvidence: ${dirs.map(d => path.join(evidence, d)).join('\n          ')}` : ''));
process.exit(failed ? 1 : 0);
