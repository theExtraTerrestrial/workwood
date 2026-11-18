// Puts Workwood in the Windows Start menu as a native Windows window (or, with --remove, takes it away).
// The window program is Electron for Windows, downloaded once into %LOCALAPPDATA%\Workwood; the service that
// runs your sessions stays here in WSL and is started and stopped by the window.
//   npm run shortcut            npm run shortcut -- --remove
// --after-update is how the window restarts after an update: it waits for the window to close, makes the copy
// again (only the service and page when the dependencies are unchanged), then opens the window again.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { electronVersion as version, electronZip, stageNative, writeApp } from './windows-parts.mjs';

const distro = process.env.WSL_DISTRO_NAME;
if (!distro) { console.error('This is for Windows with WSL. Run it inside your WSL distribution.'); process.exit(1); }
const win = (file, args) => execFileSync(file, args, { cwd: '/mnt/c', encoding: 'utf8' }).replace(/\r/g, '').trim();
const ps = script => win('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]);
const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = path.join(ps('[Environment]::GetFolderPath("LocalApplicationData")'), 'Workwood').replace(/\//g, '\\');
const link = path.join(ps('[Environment]::GetFolderPath("Programs")'), 'Workwood.lnk').replace(/\//g, '\\');
const here = p => execFileSync('wslpath', ['-u', p], { encoding: 'utf8' }).trim();
const H = here(home);

if (process.argv.includes('--remove')) {
  fs.rmSync(here(link), { force: true }); fs.rmSync(H, { recursive: true, force: true });
  console.log('Removed Workwood from the Start menu and from ' + home); process.exit(0);
}
const afterUpdate = process.argv.includes('--after-update');
const exe = `${home}\\electron-${version}\\electron.exe`;
if (afterUpdate) {
  console.log(`${new Date().toISOString()} Updating the Windows copy in ${home}`);
  // The closing window still holds its files (and the service's native parts) for a moment.
  const mine = `Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${home.replace(/'/g, "''")}\\*' }`;
  for (let i = 0; i < 30 && ps(`@(${mine}).Count`) !== '0'; i++) await new Promise(r => setTimeout(r, 1000));
  process.on('exit', code => {   // open the window again, updated or not; the log says what went wrong
    try { ps(`Start-Process -FilePath '${exe.replace(/'/g, "''")}' -ArgumentList '"${home.replace(/'/g, "''")}\\app"' -WorkingDirectory '${home.replace(/'/g, "''")}'`); } catch (e) { console.error(e.message); }
    if (code) console.error('The Windows copy was not fully updated. Run "npm run shortcut" in WSL to make it again.');
  });
}
const runtime = path.join(H, 'electron-' + version);
if (!fs.existsSync(path.join(runtime, 'electron.exe'))) {
  const zip = electronZip();
  for (const old of fs.existsSync(H) ? fs.readdirSync(H).filter(n => n.startsWith('electron-')) : []) fs.rmSync(path.join(H, old), { recursive: true, force: true });
  fs.mkdirSync(runtime, { recursive: true });
  execFileSync('unzip', ['-q', '-o', zip, '-d', runtime]);
}
// The Windows copy of the service: this project's service and page, with the Windows builds of what they need.
// Built here, then unpacked on the Windows side in one go (copying thousands of small files across is slow).
const lockSum = createHash('sha256').update(fs.readFileSync(path.join(dir, 'package-lock.json'))).digest('hex');
const lockFile = path.join(H, 'native', '.package-lock.sha256');
const sameDeps = fs.existsSync(path.join(H, 'native', 'node_modules')) && fs.existsSync(lockFile) && fs.readFileSync(lockFile, 'utf8') === lockSum;
if (!process.argv.includes('--window-only') && sameDeps) {
  // The dependencies are as before: only the service and the page change, a few files.
  for (const d of ['service', 'ui']) { fs.rmSync(path.join(H, 'native', d), { recursive: true, force: true }); fs.cpSync(path.join(dir, d), path.join(H, 'native', d), { recursive: true }); }
  fs.copyFileSync(path.join(dir, 'package.json'), path.join(H, 'native', 'package.json'));
} else if (!process.argv.includes('--window-only')) {
  console.log('Preparing the Windows copy of the service…');
  const stage = stageNative(dir);
  const tar = path.join(H, 'native.tar');
  fs.mkdirSync(H, { recursive: true });
  execFileSync('tar', ['-cf', tar, '-C', stage, '.']);
  fs.rmSync(path.join(H, 'native'), { recursive: true, force: true }); fs.mkdirSync(path.join(H, 'native'));
  win("tar.exe", ["-xf", home + "\\native.tar", "-C", home + "\\native"]);
  fs.rmSync(tar, { force: true }); fs.rmSync(stage, { recursive: true, force: true });
  fs.writeFileSync(lockFile, lockSum);
  // The speech model, if it is already here, so Windows does not download it again.
  const model = path.join(os.homedir(), '.cache', 'workwood', 'models'), winHome = here(ps('[Environment]::GetFolderPath("UserProfile")'));
  if (fs.existsSync(model) && !fs.existsSync(path.join(winHome, '.cache', 'workwood', 'models'))) fs.cpSync(model, path.join(winHome, '.cache', 'workwood', 'models'), { recursive: true });
}
const appDir = path.join(H, 'app');
fs.rmSync(path.join(H, 'Workwood.vbs'), { force: true });
fs.mkdirSync(path.join(os.homedir(), '.cache', 'workwood'), { recursive: true });
writeApp(appDir, dir, { distro, dir });
const q = s => `'${s.replace(/'/g, "''")}'`;
ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)});$s.TargetPath=${q(exe)};$s.Arguments=${q(`"${home}\\app"`)};$s.IconLocation=${q(`${home}\\app\\workwood.ico`)};$s.Description='Workwood';$s.WorkingDirectory=${q(home)};$s.Save()`);
console.log(`Workwood is in the Start menu.\n  shortcut: ${link}\n  window:   ${home}\n  log:      ~/.cache/workwood/workwood.log (in WSL)`);
