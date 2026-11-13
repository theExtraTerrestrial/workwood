// Makes a folder you can carry to a Windows PC that has no WSL (and no Node): dist/Workwood-windows-x64.zip.
// On that PC: unzip it, then double-click "Install Workwood.cmd". Sessions there run on Windows itself,
// with the Claude Code installed on that PC.
//   npm run package
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { electronVersion, electronZip, stageNative, writeApp } from './windows-parts.mjs';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(dir, 'dist'), top = path.join(dist, 'Workwood-windows-x64'), inner = path.join(top, 'Workwood');
fs.rmSync(top, { recursive: true, force: true }); fs.mkdirSync(inner, { recursive: true });

const zip = electronZip();
console.log('Unpacking the window program…');
execFileSync('unzip', ['-q', '-o', zip, '-d', path.join(inner, 'electron-' + electronVersion)]);
console.log('Preparing the Windows copy of the service…');
const stage = stageNative(dir);
fs.renameSync(stage, path.join(inner, 'native'));
writeApp(path.join(inner, 'app'), dir, { distro: null, dir: null });
const parts = path.join(dir, 'shell', 'windows', 'package');
fs.copyFileSync(path.join(parts, 'install.ps1'), path.join(inner, 'install.ps1'));
for (const f of ['Install Workwood.cmd', 'Remove Workwood.cmd']) fs.copyFileSync(path.join(parts, f), path.join(top, f));

console.log('Zipping…');
const out = top + '.zip'; fs.rmSync(out, { force: true });
execFileSync('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1], "zip", sys.argv[2], sys.argv[3])', top, dist, path.basename(top)]);
fs.rmSync(top, { recursive: true, force: true });
console.log(`Done: ${out} (${Math.round(fs.statSync(out).size / 1e6)} MB)\nOn the other PC: unzip it and double-click "Install Workwood.cmd".`);
