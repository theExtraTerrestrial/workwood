// The Workwood window. Starts the service inside this process and shows its page.
const { app, BrowserWindow, shell, Menu, dialog } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

if (!app.requestSingleInstanceLock()) app.quit();
let win = null;

// Opened from the Dock or the app launcher, the window does not get the PATH your terminal has, so `claude`, `node`
// and `code` may not be found. Ask your login shell for its PATH once (4 seconds at most), and add the usual places.
function shellPath() {
  if (process.platform === 'win32' || process.stdin.isTTY) return;
  const os = require('node:os'), fs = require('node:fs'), sep = path.delimiter, have = (process.env.PATH || '').split(sep).filter(Boolean);
  let fromShell = [];
  try {
    const sh = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/bash');
    const out = require('node:child_process').execFileSync(sh, ['-ilc', 'echo __WORKWOOD__; env; echo __WORKWOOD__'],
      { encoding: 'utf8', timeout: 4000, stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, DISABLE_AUTO_UPDATE: 'true' } });
    const m = /^PATH=(.+)$/m.exec(out.split('__WORKWOOD__')[1] || '');
    if (m) fromShell = m[1].split(sep).filter(Boolean);
  } catch {}
  const home = os.homedir(), usual = [path.join(home, '.local', 'bin'), path.join(home, '.claude', 'local'), '/opt/homebrew/bin', '/usr/local/bin'].filter(p => fs.existsSync(p));
  process.env.PATH = [...new Set([...fromShell, ...have, ...usual])].join(sep);
}
shellPath();
// Quitting ends the background work sessions left running (a dev server, a monitor, an agent): ask first.
async function sureToQuit(win, more = 0) {
  let list = [];
  try { list = (await win.webContents.executeJavaScript('window.wwBackground ? window.wwBackground() : []')) || []; } catch {}
  const n = list.reduce((a, s) => a + s.n, 0) + more;
  if (!n) return true;
  const r = await dialog.showMessageBox(win, { type: 'warning', buttons: ['Quit and stop them', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true,
    title: 'Workwood', message: `${n} task${n > 1 ? 's are' : ' is'} still running in the background`,
    detail: [...list.map(s => `${s.title}: ${s.n} running`), more ? `${more} more in the other place` : ''].filter(Boolean).join('\n') + '\n\nQuitting stops them.' });
  return r.response === 0;
}

async function open() {
  require('electron').ipcMain.on('env:get', e => { e.returnValue = null; });   // one place only here; the Windows window has two
  require('electron').ipcMain.on('login:get', e => { e.returnValue = null; });   // not offered in the Linux window
  require('electron').ipcMain.handle('folder:pick', async () => { const r = await require('electron').dialog.showOpenDialog(win, { title: 'Choose a project folder', properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0] || null; });
  const { start } = await import(pathToFileURL(path.join(__dirname, '..', 'service', 'server.mjs')).href);
  const { address } = await start();
  // macOS keeps its menu bar: without one there is no Cmd+C, Cmd+V or Cmd+Q.
  Menu.setApplicationMenu(process.platform === 'darwin' ? Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'windowMenu' }]) : null);
  const size = { width: 1400, height: 900, minWidth: 900, minHeight: 600 }, place = require('./window-state.cjs')(size);
  win = new BrowserWindow({
    ...size, ...place.options,
    title: 'Workwood', backgroundColor: '#18191c', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  if (place.maximized) win.maximize();
  place.track(win);
  // The microphone, for dictation, and nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, what, done, d) => {
    if (!(what === 'media' && !(d.mediaTypes || []).includes('video'))) return done(false);
    if (process.platform !== 'darwin') return done(true);
    require('electron').systemPreferences.askForMediaAccess('microphone').then(done, () => done(false));   // macOS asks you once
  });
  // Links in a conversation open in your browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(new URL(address).origin)) { e.preventDefault(); shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
  let sure = false;
  win.on('close', e => { if (sure) return; e.preventDefault(); sureToQuit(win).then(ok => { if (ok && win) { sure = true; win.close(); } }); });
  await win.loadURL(address);
  // For checking the window without looking at it: WORKWOOD_SHOT=<file.png> saves a picture of it after a few seconds.
  if (process.env.WORKWOOD_SHOT_EARLY) setTimeout(async () => { require('node:fs').writeFileSync(process.env.WORKWOOD_SHOT_EARLY, (await win.webContents.capturePage()).toPNG()); }, 250);
  if (process.env.WORKWOOD_SHOT) setTimeout(async () => { require('node:fs').writeFileSync(process.env.WORKWOOD_SHOT, (await win.webContents.capturePage()).toPNG()); }, 6000);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open).catch(e => { console.error(e); app.exit(1); });
app.on('window-all-closed', () => app.quit());
