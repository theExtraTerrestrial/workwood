// The Windows window runs from a copy made by `npm run shortcut`. When the folder Workwood runs from changes some other
// way (a pull by hand, a merge), the service tells the page, which offers Restart: that makes the copy again.
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeSandbox, startService, removeSandbox } from './sandbox.mjs';
import { copyStamp } from '../service/update.mjs';

const sb = makeSandbox(), svcs = [];
after(() => { for (const s of svcs) s.stop(); if (!process.env.KEEP_SANDBOX) removeSandbox(sb); });
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function until(fn, what, ms = 8000) {
  const end = Date.now() + ms; let last;
  while (Date.now() < end) { last = await fn(); if (last) return last; await sleep(80); }
  throw new Error('timed out waiting for ' + what + ': ' + JSON.stringify(last));
}
const start = async stamp => { const s = await startService(sb, { WORKWOOD_COPY_STAMP: stamp, WORKWOOD_COPY_EVERY: '150' }); svcs.push(s); return s; };
const upd = async s => (await s.call('update/check', {})).body;

test('the fingerprint follows what the copy is made of, and only that', () => {
  const a = copyStamp(sb.app);
  assert.match(a, /^[0-9a-f]{32}$/); assert.equal(copyStamp(sb.app), a);
  fs.writeFileSync(path.join(sb.app, 'README.md'), '# app, edited\n');
  assert.equal(copyStamp(sb.app), a, 'not in the copy');
  fs.mkdirSync(path.join(sb.app, 'service', '__pycache__'), { recursive: true }); fs.writeFileSync(path.join(sb.app, 'service', '__pycache__', 'x.pyc'), 'x');
  assert.equal(copyStamp(sb.app), a, 'made by Python as it runs');
  fs.mkdirSync(path.join(sb.app, 'ui'), { recursive: true }); fs.writeFileSync(path.join(sb.app, 'ui', 'app.js'), '1');
  assert.notEqual(copyStamp(sb.app), a);
});

test('a window whose copy matches sees no update; once the folder moves on it is offered Restart, and Later holds until the next change', async () => {
  const s = await start(copyStamp(sb.app));
  await until(async () => (await upd(s)).state === 'current', 'the check at start');
  fs.writeFileSync(path.join(sb.app, 'ui', 'app.js'), '2');
  const u = await until(async () => { const x = await upd(s); return x.state === 'updated' && x; }, 'the copy to be behind');
  assert.equal(u.head, 'copy:' + copyStamp(sb.app));
  fs.writeFileSync(path.join(sb.app, 'ui', 'app.js'), '3');
  await until(async () => (await upd(s)).head === 'copy:' + copyStamp(sb.app), 'a new head for the next change, so Later shows it again');
  s.stop();
});

test('started by a window with an older copy: Restart is offered at once; without a window, never', async () => {
  const s = await start('0123456789abcdef0123456789abcdef');
  assert.equal((await upd(s)).state, 'updated');
  s.stop();
  const plain = await start('');
  await sleep(400);
  assert.notEqual((await upd(plain)).state, 'updated');
});
