// Puts Workwood in the Windows Start menu as a native Windows window (or, with --remove, takes it away).
// The window program is Electron for Windows, downloaded once into %LOCALAPPDATA%\Workwood; the service that
// runs your sessions stays here in WSL and is started and stopped by the window.
//   npm run shortcut            npm run shortcut -- --remove
import { execFileSync } from 'node:child_process';
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
const runtime = path.join(H, 'electron-' + version);
if (!fs.existsSync(path.join(runtime, 'electron.exe'))) {
  const zip = electronZip();
  for (const old of fs.existsSync(H) ? fs.readdirSync(H).filter(n => n.startsWith('electron-')) : []) fs.rmSync(path.join(H, old), { recursive: true, force: true });
  fs.mkdirSync(runtime, { recursive: true });
  execFileSync('unzip', ['-q', '-o', zip, '-d', runtime]);
}
// The Windows copy of the service: this project's service and page, with the Windows builds of what they need.
// Built here, then unpacked on the Windows side in one go (copying thousands of small files across is slow).
if (!process.argv.includes('--window-only')) {
  console.log('Preparing the Windows copy of the service…');
  const stage = stageNative(dir);
  const tar = path.join(H, 'native.tar');
  fs.mkdirSync(H, { recursive: true });
  execFileSync('tar', ['-cf', tar, '-C', stage, '.']);
  fs.rmSync(path.join(H, 'native'), { recursive: true, force: true }); fs.mkdirSync(path.join(H, 'native'));
  win("tar.exe", ["-xf", home + "\\native.tar", "-C", home + "\\native"]);
  fs.rmSync(tar, { force: true }); fs.rmSync(stage, { recursive: true, force: true });
  // The speech model, if it is already here, so Windows does not download it again.
  const model = path.join(os.homedir(), '.cache', 'workwood', 'models'), winHome = here(ps('[Environment]::GetFolderPath("UserProfile")'));
  if (fs.existsSync(model) && !fs.existsSync(path.join(winHome, '.cache', 'workwood', 'models'))) fs.cpSync(model, path.join(winHome, '.cache', 'workwood', 'models'), { recursive: true });
}
const appDir = path.join(H, 'app');
fs.rmSync(path.join(H, 'Workwood.vbs'), { force: true });
fs.mkdirSync(path.join(os.homedir(), '.cache', 'workwood'), { recursive: true });
writeApp(appDir, dir, { distro, dir });
const q = s => `'${s.replace(/'/g, "''")}'`, exe = `${home}\\electron-${version}\\electron.exe`;
ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)});$s.TargetPath=${q(exe)};$s.Arguments=${q(`"${home}\\app"`)};$s.IconLocation=${q(`${home}\\app\\workwood.ico`)};$s.Description='Workwood';$s.WorkingDirectory=${q(home)};$s.Save()`);
console.log(`Workwood is in the Start menu.\n  shortcut: ${link}\n  window:   ${home}\n  log:      ~/.cache/workwood/workwood.log (in WSL)`);
