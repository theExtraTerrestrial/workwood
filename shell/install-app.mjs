// Puts Workwood among your apps, built from this folder on this machine (or, with --remove, takes it away).
//   npm run install-app            npm run install-app -- --remove
// macOS:          ~/Applications/Workwood.app
// Linux:          an entry in the app launcher (~/.local/share/applications/workwood.desktop)
// Windows:        the Start menu, with the window's files in %LOCALAPPDATA%\Workwood
// Windows + WSL:  run inside WSL; the Start menu, with sessions running in WSL (see windows-shortcut.mjs)
// On macOS and Linux the app runs straight from this folder, so `git pull` updates it. Keep the folder where it is.
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const remove = process.argv.includes('--remove');
const stop = msg => { console.error(msg); process.exit(1); };
const run = (file, args, opts = {}) => execFileSync(file, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts });
const dist = path.join(dir, 'node_modules', 'electron', 'dist');
const needElectron = file => { const p = path.join(dist, file); if (!fs.existsSync(p)) stop(`The window program is missing (${p}).\nRun "npm install" in ${dir} first.`); return p; };

// Inside WSL the Linux window would open through WSLg, as a Linux app: the Windows window is what belongs there.
// WSL_DISTRO_NAME alone misses WSL under sudo and in shells started without WSL's environment.
const inWsl = process.platform === 'linux' && (!!process.env.WSL_DISTRO_NAME || (() => { try { return /microsoft|wsl/i.test(fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8')); } catch { return false; } })());
if (inWsl) await import('./windows-shortcut.mjs');
else if (process.platform === 'darwin') mac();
else if (process.platform === 'win32') await windows();
else if (process.platform === 'linux') linux();
else stop(`Workwood has no installer for this system (${process.platform}). "npm start" may still work.`);

function claudeHint() {
  try { run(process.platform === 'win32' ? 'where' : 'which', ['claude']); }
  catch {
    if (process.platform === 'win32' && fs.existsSync(path.join(os.homedir(), '.local', 'bin', 'claude.exe'))) return;
    console.log('\nClaude Code was not found. Install it and sign in before starting a session:\n  https://claude.com/claude-code');
  }
}

// ── macOS ────────────────────────────────────────────────────────────────────────────────────────────────
// A copy of Electron.app under the name Workwood, with a two-line app inside that loads this folder's shell/main.cjs.
function mac() {
  const apps = path.join(os.homedir(), 'Applications'), app = path.join(apps, 'Workwood.app');
  if (remove) { fs.rmSync(app, { recursive: true, force: true }); console.log(`Removed ${app}. Your sessions and settings were not touched.`); return; }
  const src = needElectron('Electron.app');
  const step = (what, fn) => { try { return fn(); } catch (e) { stop(`Could not ${what}:\n  ${String(e.stderr || e.message).trim().split('\n').join('\n  ')}`); } };

  console.log('Making Workwood.app…');
  fs.mkdirSync(apps, { recursive: true });
  fs.rmSync(app, { recursive: true, force: true });
  step('copy the window program', () => run('ditto', [src, app]));   // ditto keeps the links inside the frameworks as links
  const contents = path.join(app, 'Contents'), res = path.join(contents, 'Resources'), plist = path.join(contents, 'Info.plist');
  for (const p of [plist, res, path.join(contents, 'MacOS', 'Electron')]) if (!fs.existsSync(p)) stop(`The copied app does not look as expected (no ${p}).`);

  // The app inside: Electron runs Resources/app before its own default app.
  const inner = path.join(res, 'app'), version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  fs.mkdirSync(inner, { recursive: true });
  fs.writeFileSync(path.join(inner, 'package.json'), JSON.stringify({ name: 'workwood', productName: 'Workwood', version, main: 'main.cjs' }));
  fs.writeFileSync(path.join(inner, 'main.cjs'), `// Written by "npm run install-app". Workwood itself lives in the folder named here.
const { app, dialog } = require('electron');
const main = ${JSON.stringify(path.join(dir, 'shell', 'main.cjs'))};
if (require('node:fs').existsSync(main)) require(main);
else app.whenReady().then(() => { dialog.showErrorBox('Workwood could not start', 'Its folder is no longer at\\n' + ${JSON.stringify(dir)} + '\\n\\nRun "npm run install-app" again from where it is now.'); app.quit(); });
`);

  // The icon, in the sizes macOS asks for.
  const big = path.join(dir, 'shell', 'icon-1024.png'), png = fs.existsSync(big) ? big : path.join(dir, 'shell', 'icon.png');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'workwood-icon-')), set = path.join(tmp, 'workwood.iconset');
  let icon = false;
  try {
    fs.mkdirSync(set);
    for (const n of [16, 32, 128, 256, 512]) for (const k of [1, 2]) run('sips', ['-z', String(n * k), String(n * k), png, '--out', path.join(set, `icon_${n}x${n}${k === 2 ? '@2x' : ''}.png`)]);
    run('iconutil', ['-c', 'icns', set, '-o', path.join(res, 'workwood.icns')]);
    icon = true;
  } catch (e) { console.log(`The icon could not be made (${String(e.stderr || e.message).trim().split('\n')[0]}); the app keeps Electron's icon.`); }
  fs.rmSync(tmp, { recursive: true, force: true });

  const put = (key, value) => step(`set ${key} in Info.plist`, () => run('plutil', ['-replace', key, '-string', value, plist]));
  put('CFBundleName', 'Workwood'); put('CFBundleDisplayName', 'Workwood'); put('CFBundleIdentifier', 'io.github.theextraterrestrial.workwood');
  put('CFBundleShortVersionString', version);
  if (icon) put('CFBundleIconFile', 'workwood.icns');
  put('NSMicrophoneUsageDescription', 'Workwood uses the microphone for dictation. The audio stays on this Mac.');
  put('NSAppleEventsUsageDescription', 'Workwood opens a session in Terminal when you ask it to.');

  // Changing the app's files breaks Electron's signature, and Apple Silicon does not start an app without a valid one.
  try { run('xattr', ['-cr', app]); } catch {}
  step('sign the app (codesign)', () => run('codesign', ['--force', '--deep', '--sign', '-', app]));
  try { run('touch', [app]); } catch {}
  console.log(`Workwood is in Applications.\n  app:    ${app}\n  runs:   ${dir}\nOpen it from Launchpad or Spotlight. It runs from this folder, so keep the folder where it is.`);
  claudeHint();
}

// ── Linux ────────────────────────────────────────────────────────────────────────────────────────────────
function linux() {
  const apps = path.join(process.env.XDG_DATA_HOME || path.join(os.homedir(), '.local', 'share'), 'applications'), file = path.join(apps, 'workwood.desktop');
  const refresh = () => { try { run('update-desktop-database', [apps]); } catch {} };
  if (remove) { fs.rmSync(file, { force: true }); refresh(); console.log(`Removed ${file}. Your sessions and settings were not touched.`); return; }
  const exe = needElectron('electron');
  const q = s => `"${s.replace(/(["`$\\])/g, '\\$1').replace(/%/g, '%%')}"`;   // quoting as the desktop-entry rules ask
  fs.mkdirSync(apps, { recursive: true });
  fs.writeFileSync(file, `[Desktop Entry]
Type=Application
Name=Workwood
Comment=An inbox for your Claude Code sessions
Exec=${q(exe)} ${q(dir)}
Path=${dir}
Icon=${path.join(dir, 'shell', 'icon.png')}
Terminal=false
Categories=Development;
StartupWMClass=workwood
`);
  refresh();
  console.log(`Workwood is in your app launcher.\n  entry:  ${file}\n  runs:   ${dir}\nIt runs from this folder, so keep the folder where it is.`);
  claudeHint();
}

// ── Windows, without WSL ─────────────────────────────────────────────────────────────────────────────────
// %LOCALAPPDATA%\Workwood gets the window's own files (app\) and a link to this folder (native\), which is where
// the window looks for the service. The window program is the Electron that "npm install" put in this folder.
async function windows() {
  const ps = script => run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script]).replace(/\r/g, '').trim();
  const home = path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'Workwood');
  const link = path.join(ps('[Environment]::GetFolderPath("Programs")'), 'Workwood.lnk');
  const native = path.join(home, 'native'), appDir = path.join(home, 'app');
  // native\ may be a link to this folder (made here) or a real copy (made from WSL). A link is only ever unlinked.
  const dropNative = () => {
    let st; try { st = fs.lstatSync(native); } catch { return; }
    if (st.isSymbolicLink()) { try { fs.unlinkSync(native); } catch { fs.rmdirSync(native); } }
    else fs.rmSync(native, { recursive: true, force: true });
  };
  if (remove) {
    dropNative(); fs.rmSync(link, { force: true }); fs.rmSync(home, { recursive: true, force: true });
    console.log(`Removed Workwood from the Start menu and from ${home}. Your sessions and settings were not touched.`); return;
  }
  const exe = needElectron('electron.exe');
  if (!fs.existsSync(path.join(dir, 'node_modules', 'node-pty'))) stop(`Run "npm install" in ${dir} first.`);
  const { writeApp } = await import('./windows-parts.mjs');
  fs.mkdirSync(home, { recursive: true });
  // A PC that also has the WSL side set up keeps knowing where it is.
  let config = { distro: null, dir: null };
  try { const kept = JSON.parse(fs.readFileSync(path.join(appDir, 'config.json'), 'utf8')); if (kept && kept.distro) config = { distro: kept.distro, dir: kept.dir }; } catch {}
  writeApp(appDir, dir, config);
  dropNative();
  fs.symlinkSync(dir, native, 'junction');   // a folder link; needs no special rights
  const q = s => `'${s.replace(/'/g, "''")}'`;
  ps(`$s=(New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)});$s.TargetPath=${q(exe)};$s.Arguments=${q(`"${appDir}"`)};$s.IconLocation=${q(path.join(appDir, 'workwood.ico'))};$s.Description='Workwood';$s.WorkingDirectory=${q(home)};$s.Save()`);
  console.log(`Workwood is in the Start menu.\n  shortcut: ${link}\n  window:   ${home}\n  runs:     ${dir}\nIt runs from this folder, so keep the folder where it is. Run this again after pulling changes.`);
  claudeHint();
}
