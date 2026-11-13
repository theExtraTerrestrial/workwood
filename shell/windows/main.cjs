// The Workwood window on Windows. It can show two places where your sessions run:
//   Windows  - a service inside this program, using the Windows Claude Code and your Windows folders;
//   WSL      - a service started inside your WSL distribution, ended when this window closes.
// `npm run shortcut` (run in WSL) copies this folder and the Windows copy of the service next to it.
const { app, BrowserWindow, shell, Menu, dialog, ipcMain } = require('electron');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const cfg = require('./config.json');   // { distro, dir } written by the installer; both null without WSL

if (!app.requestSingleInstanceLock()) app.quit();
app.setAppUserModelId('Workwood');
let win = null, wsl = null, quitting = false, current = null;
const native = path.join(__dirname, '..', 'native', 'service', 'server.mjs');
const envs = [...(fs.existsSync(native) ? [{ id: 'windows', label: 'Windows' }] : []), ...(cfg.distro ? [{ id: 'wsl', label: 'WSL' }] : [])];
const remembered = path.join(app.getPath('userData'), 'workwood-env.json');
const started = {};   // id -> promise of the service's address

function startWsl() {
  return new Promise((resolve, reject) => {
    // A login shell, so node is found the same way as in your terminal. The service ends when its input closes.
    const inside = `cd '${cfg.dir.replace(/'/g, `'\\''`)}' && WORKWOOD_PARENT=1 exec node service/server.mjs 2>> ~/.cache/workwood/workwood.log`;
    wsl = spawn('wsl.exe', ['-d', cfg.distro, '--', 'bash', '-lic', inside], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => reject(new Error('The Workwood service in WSL did not start within a minute.')), 60000);
    wsl.stdout.on('data', d => { out += d; const m = /Open: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/.exec(out); if (m) { clearTimeout(timer); resolve(m[1]); } });
    wsl.on('error', e => { clearTimeout(timer); reject(e); });
    wsl.on('exit', () => { clearTimeout(timer); delete started.wsl; reject(new Error('The Workwood service in WSL stopped.')); if (!quitting && current === 'wsl') app.quit(); });
  });
}
async function startWindows() {
  const { start } = await import(pathToFileURL(native).href);
  return (await start()).address;
}
const address = id => started[id] || (started[id] = (id === 'wsl' ? startWsl() : startWindows()).catch(e => { delete started[id]; throw e; }));

async function show(id) {
  let url;
  try { url = await address(id); }
  catch (e) { dialog.showErrorBox('Workwood could not start', `${e.message}${id === 'wsl' ? '\n\nSee ~/.cache/workwood/workwood.log in WSL.' : ''}`); if (!current) app.quit(); return; }
  current = id;
  try { fs.writeFileSync(remembered, JSON.stringify({ env: id })); } catch {}
  // Windows needs a moment before it can reach a port that WSL has only just opened: keep trying for a while.
  for (let i = 0; ; i++) {
    try { await win.loadURL(url); break; }
    catch (e) {
      if (!win || quitting) return;
      if (i >= 60) { dialog.showErrorBox('Workwood could not start', `The window could not reach the service (${e.code || e.message}).`); return app.quit(); }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

async function open() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600, show: false,
    title: 'Workwood', backgroundColor: '#18191c', autoHideMenuBar: true, icon: path.join(__dirname, 'workwood.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  win.once('ready-to-show', () => win.show());
  win.on('closed', () => { win = null; });
  // The microphone, for dictation, and nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, what, done, d) => done(what === 'media' && !(d.mediaTypes || []).includes('video')));
  // Links in a conversation open in your browser, never inside the app window.
  const ours = async url => { for (const p of Object.values(started)) { try { if (url.startsWith(new URL(await p).origin)) return true; } catch {} } return false; };
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) { e.preventDefault(); shell.openExternal(url); } else ours(url).then(ok => { if (!ok) win?.webContents.stop(); }); });
  ipcMain.on('env:get', e => { e.returnValue = { current, list: envs }; });
  ipcMain.handle('env:set', (e, id) => { if (envs.some(x => x.id === id) && id !== current) show(id); });
  let first = envs[0]?.id; try { const want = JSON.parse(fs.readFileSync(remembered, 'utf8')).env; if (envs.some(x => x.id === want)) first = want; } catch {}
  if (!first) { dialog.showErrorBox('Workwood could not start', 'Nothing is installed to run sessions with. Run "npm run shortcut" again.'); return app.quit(); }
  await show(first);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { quitting = true; try { wsl?.stdin.end(); } catch {} setTimeout(() => { try { wsl?.kill(); } catch {} }, 1500); });
