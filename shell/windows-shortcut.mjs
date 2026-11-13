// Puts Workwood in the Windows Start menu as a native Windows window (or, with --remove, takes it away).
// The window program is Electron for Windows, downloaded once into %LOCALAPPDATA%\Workwood; the service that
// runs your sessions stays here in WSL and is started and stopped by the window.
//   npm run shortcut            npm run shortcut -- --remove
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

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
const version = createRequire(import.meta.url)('electron/package.json').version;
const runtime = path.join(H, 'electron-' + version);
if (!fs.existsSync(path.join(runtime, 'electron.exe'))) {
  const zip = path.join(os.tmpdir(), `electron-v${version}-win32-x64.zip`);
  console.log(`Getting the Windows window program (Electron ${version}), one time…`);
  execFileSync('curl', ['-fL', '--progress-bar', '-o', zip, `https://github.com/electron/electron/releases/download/v${version}/electron-v${version}-win32-x64.zip`], { stdio: 'inherit' });
  for (const old of fs.existsSync(H) ? fs.readdirSync(H).filter(n => n.startsWith('electron-')) : []) fs.rmSync(path.join(H, old), { recursive: true, force: true });
  fs.mkdirSync(runtime, { recursive: true });
  execFileSync('unzip', ['-q', '-o', zip, '-d', runtime]); fs.rmSync(zip, { force: true });
}
// The Windows copy of the service: this project's service and page, with the Windows builds of what they need.
// Built here, then unpacked on the Windows side in one go (copying thousands of small files across is slow).
if (!process.argv.includes('--window-only')) {
  console.log('Preparing the Windows copy of the service…');
  const stage = fs.mkdtempSync(path.join(os.tmpdir(), 'workwood-win-'));
  for (const f of ['package.json', 'package-lock.json']) fs.copyFileSync(path.join(dir, f), path.join(stage, f));
  execFileSync('npm', ['install', '--omit=dev', '--os=win32', '--cpu=x64', '--ignore-scripts', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: stage, stdio: 'inherit' });
  const nm = path.join(stage, 'node_modules');
  // Left out: the Claude Code that ships with the SDK (yours is used), and builds for other systems.
  for (const d of fs.readdirSync(path.join(nm, '@anthropic-ai')).filter(n => /^claude-agent-sdk-/.test(n))) fs.rmSync(path.join(nm, '@anthropic-ai', d), { recursive: true, force: true });
  for (const napi of fs.readdirSync(path.join(nm, 'onnxruntime-node', 'bin'))) for (const sys of ['darwin', 'linux']) fs.rmSync(path.join(nm, 'onnxruntime-node', 'bin', napi, sys), { recursive: true, force: true });
  for (const d of fs.readdirSync(path.join(nm, 'node-pty', 'prebuilds')).filter(n => !n.startsWith('win32-x64'))) fs.rmSync(path.join(nm, 'node-pty', 'prebuilds', d), { recursive: true, force: true });
  fs.cpSync(path.join(dir, 'service'), path.join(stage, 'service'), { recursive: true });
  fs.cpSync(path.join(dir, 'ui'), path.join(stage, 'ui'), { recursive: true });
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
fs.mkdirSync(appDir, { recursive: true }); fs.mkdirSync(path.join(os.homedir(), '.cache', 'workwood'), { recursive: true });
fs.copyFileSync(path.join(dir, 'shell', 'windows', 'main.cjs'), path.join(appDir, 'main.cjs'));
fs.copyFileSync(path.join(dir, 'shell', 'preload.cjs'), path.join(appDir, 'preload.cjs'));
fs.copyFileSync(path.join(dir, 'shell', 'icon.ico'), path.join(appDir, 'workwood.ico'));
fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name: 'workwood', productName: 'Workwood', version: '0.1.0', main: 'main.cjs' }));
fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify({ distro, dir }));
const q = s => `'${s.replace(/'/g, "''")}'`, exe = `${home}\\electron-${version}\\electron.exe`;
ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)});$s.TargetPath=${q(exe)};$s.Arguments=${q(`"${home}\\app"`)};$s.IconLocation=${q(`${home}\\app\\workwood.ico`)};$s.Description='Workwood';$s.WorkingDirectory=${q(home)};$s.Save()`);
console.log(`Workwood is in the Start menu.\n  shortcut: ${link}\n  window:   ${home}\n  log:      ~/.cache/workwood/workwood.log (in WSL)`);
