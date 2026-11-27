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
import { electronVersion as version, electronZip, stageNative, writeApp, wslDistro } from './windows-parts.mjs';

const distro = wslDistro();
if (!distro) { console.error('This is for Windows with WSL, run inside your WSL distribution. On Linux or macOS, "npm run install-app" adds Workwood to your apps.'); process.exit(1); }
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
const running = `Get-Process electron -ErrorAction SilentlyContinue | Where-Object { $_.Path -like '${home.replace(/'/g, "''")}\\*' }`;   // this window's processes
const exe = `${home}\\electron-${version}\\electron.exe`;
if (afterUpdate) {
  console.log(`${new Date().toISOString()} Updating the Windows copy in ${home}`);
  // The closing window still holds its files (and the service's native parts) for a moment.
  for (let i = 0; i < 30 && ps(`@(${running}).Count`) !== '0'; i++) await new Promise(r => setTimeout(r, 1000));
  process.on('exit', code => {   // open the window again, updated or not; the log says what went wrong
    try { ps(`Start-Process -FilePath '${exe.replace(/'/g, "''")}' -ArgumentList '"${home.replace(/'/g, "''")}\\app"' -WorkingDirectory '${home.replace(/'/g, "''")}'`); } catch (e) { console.error(e.message); }
    if (code) console.error('The Windows copy was not fully updated. Run "npm run shortcut" in WSL to make it again.');
  });
}
// Windows keeps the files of a running program: with the window open, the copy cannot be made again.
if (!afterUpdate && ps(`@(${running}).Count`) !== '0') {
  console.error('The Workwood window is open, and Windows keeps its files while it runs. Close it, then run "npm run shortcut" again.');
  process.exit(1);
}
const runtime = path.join(H, 'electron-' + version);
if (!fs.existsSync(path.join(runtime, 'electron.exe'))) {
  const zip = electronZip();
  // An older Electron still in use (or held by Windows for a moment) is left for a later run to take away.
  for (const old of fs.existsSync(H) ? fs.readdirSync(H).filter(n => n.startsWith('electron-')) : []) {
    try { fs.rmSync(path.join(H, old), { recursive: true, force: true }); } catch { console.log(`Could not remove ${old} yet (still in use); a later run takes it away.`); }
  }
  fs.mkdirSync(runtime, { recursive: true });
  execFileSync('unzip', ['-q', '-o', zip, '-d', runtime]);
}
// Pinned to the taskbar, Windows may start electron.exe with nothing after it, which shows Electron's own start
// page. Electron opens resources\app before that page, so a small app there starts Workwood all the same.
const stub = path.join(runtime, 'resources', 'app');
fs.mkdirSync(stub, { recursive: true });
fs.writeFileSync(path.join(stub, 'package.json'), JSON.stringify({ name: 'workwood', productName: 'Workwood', main: 'main.cjs' }));
fs.writeFileSync(path.join(stub, 'main.cjs'), "// Written by \"npm run shortcut\": starts Workwood when electron.exe is opened on its own.\nrequire(require('node:path').join(__dirname, '..', '..', '..', 'app', 'main.cjs'));\n");
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
// An earlier install that missed WSL left a Linux launcher entry, which WSLg shows in the Start menu too.
const linuxEntry = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'applications', 'workwood.desktop');
if (fs.existsSync(linuxEntry)) { fs.rmSync(linuxEntry, { force: true }); console.log('Removed the Linux launcher entry, so the Start menu has only the Windows window.'); }
const q = s => `'${s.replace(/'/g, "''")}'`;
ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)});$s.TargetPath=${q(exe)};$s.Arguments=${q(`"${home}\\app"`)};$s.IconLocation=${q(`${home}\\app\\workwood.ico`)};$s.Description='Workwood';$s.WorkingDirectory=${q(home)};$s.Save()`);
console.log(`Workwood is in the Start menu.\n  shortcut: ${link}\n  window:   ${home}\n  log:      ~/.cache/workwood/workwood.log (in WSL)`);
