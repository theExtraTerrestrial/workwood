// What both Windows installers are made of: the window program (Electron for Windows), the window's own files,
// and a Windows copy of the service. Used by windows-shortcut.mjs (this PC, from WSL) and windows-package.mjs
// (a folder to carry to a PC that has no WSL).
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { copyStamp } from '../service/update.mjs';

/** The WSL distribution this runs in, or null outside WSL. WSL_DISTRO_NAME is missing under sudo and in some
 *  shells started without WSL's environment, so the kernel and wslpath are asked too. */
export function wslDistro() {
  if (process.env.WSL_DISTRO_NAME) return process.env.WSL_DISTRO_NAME;
  if (process.platform !== 'linux') return null;
  let kernel = ''; try { kernel = fs.readFileSync('/proc/sys/kernel/osrelease', 'utf8'); } catch {}
  if (!/microsoft|wsl/i.test(kernel)) return null;
  try { const m = /^\\\\[^\\]+\\([^\\]+)/.exec(execFileSync('wslpath', ['-w', '/'], { encoding: 'utf8' }).trim()); if (m) return m[1]; } catch {}
  return null;
}

export const electronVersion = createRequire(import.meta.url)('electron/package.json').version;

/** The Electron for Windows download, kept in ~/.cache/workwood so it is fetched once per version. */
export function electronZip() {
  const keep = path.join(os.homedir(), '.cache', 'workwood'), zip = path.join(keep, `electron-v${electronVersion}-win32-x64.zip`);
  if (fs.existsSync(zip)) return zip;
  fs.mkdirSync(keep, { recursive: true });
  for (const old of fs.readdirSync(keep).filter(n => /^electron-v.*\.zip(\.part)?$/.test(n))) fs.rmSync(path.join(keep, old), { force: true });
  console.log(`Getting the Windows window program (Electron ${electronVersion}), one time…`);
  execFileSync('curl', ['-fL', '--progress-bar', '-o', zip + '.part', `https://github.com/electron/electron/releases/download/v${electronVersion}/electron-v${electronVersion}-win32-x64.zip`], { stdio: 'inherit' });
  fs.renameSync(zip + '.part', zip);
  return zip;
}

/** Builds the Windows copy of the service in a new temporary folder and returns that folder. */
export function stageNative(dir) {
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
  return stage;
}

/** The window's own files. `config` says where the WSL side is: { distro, dir }, both null on a PC without WSL. */
export function writeApp(appDir, dir, config) {
  fs.mkdirSync(appDir, { recursive: true });
  fs.copyFileSync(path.join(dir, 'shell', 'windows', 'main.cjs'), path.join(appDir, 'main.cjs'));
  fs.copyFileSync(path.join(dir, 'shell', 'preload.cjs'), path.join(appDir, 'preload.cjs'));
  fs.copyFileSync(path.join(dir, 'shell', 'window-state.cjs'), path.join(appDir, 'window-state.cjs'));
  fs.copyFileSync(path.join(dir, 'shell', 'page-store.cjs'), path.join(appDir, 'page-store.cjs'));
  fs.copyFileSync(path.join(dir, 'shell', 'zoom.cjs'), path.join(appDir, 'zoom.cjs'));
  fs.copyFileSync(path.join(dir, 'shell', 'icon.ico'), path.join(appDir, 'workwood.ico'));
  const version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version;
  fs.writeFileSync(path.join(appDir, 'package.json'), JSON.stringify({ name: 'workwood', productName: 'Workwood', version, main: 'main.cjs' }));
  // What the copy is made from, so the service can tell when this folder has moved on (see service/update.mjs).
  fs.writeFileSync(path.join(appDir, 'config.json'), JSON.stringify({ ...config, stamp: copyStamp(dir) }));
}
