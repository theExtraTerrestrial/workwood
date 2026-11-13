// The Workwood window on Windows. The window is a native Windows one; the service that runs your sessions is
// started inside WSL and ends when this window closes. `npm run shortcut` copies this folder to Windows.
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const { spawn } = require('node:child_process');
const path = require('node:path');
const cfg = require('./config.json');   // { distro, dir } written by the installer

if (!app.requestSingleInstanceLock()) app.quit();
app.setAppUserModelId('Workwood');
let win = null, service = null, quitting = false;

function startService() {
  return new Promise((resolve, reject) => {
    // A login shell, so node is found the same way as in your terminal. The service ends when its input closes.
    const inside = `cd '${cfg.dir.replace(/'/g, `'\\''`)}' && WORKWOOD_PARENT=1 exec node service/server.mjs 2>> ~/.cache/workwood/workwood.log`;
    service = spawn('wsl.exe', ['-d', cfg.distro, '--', 'bash', '-lic', inside], { windowsHide: true, stdio: ['pipe', 'pipe', 'ignore'] });
    let out = '';
    const timer = setTimeout(() => reject(new Error('The Workwood service in WSL did not start within a minute.')), 60000);
    service.stdout.on('data', d => { out += d; const m = /Open: (http:\/\/127\.0\.0\.1:\d+\/\?token=\S+)/.exec(out); if (m) { clearTimeout(timer); resolve(m[1]); } });
    service.on('error', e => { clearTimeout(timer); reject(e); });
    service.on('exit', () => { clearTimeout(timer); reject(new Error('The Workwood service in WSL stopped.')); if (!quitting) app.quit(); });
  });
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
  let address;
  try { address = await startService(); }
  catch (e) { dialog.showErrorBox('Workwood could not start', `${e.message}\n\nSee ~/.cache/workwood/workwood.log in WSL.`); return app.quit(); }
  // The microphone, for dictation, and nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, what, done, d) => done(what === 'media' && !(d.mediaTypes || []).includes('video')));
  // Links in a conversation open in your browser, never inside the app window.
  const origin = new URL(address).origin;
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(origin)) { e.preventDefault(); shell.openExternal(url); } });
  // Windows needs a moment before it can reach a port that WSL has only just opened: keep trying for a while.
  for (let i = 0; ; i++) {
    try { await win.loadURL(address); break; }
    catch (e) {
      if (!win || quitting) return;
      if (i >= 60) { dialog.showErrorBox('Workwood could not start', `The window could not reach the service in WSL (${e.code || e.message}).\n\nSee ~/.cache/workwood/workwood.log in WSL.`); return app.quit(); }
      await new Promise(r => setTimeout(r, 500));
    }
  }
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { quitting = true; try { service?.stdin.end(); } catch {} setTimeout(() => { try { service?.kill(); } catch {} }, 1500); });
