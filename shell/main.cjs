// The Workwood window. Starts the service inside this process and shows its page.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

if (!app.requestSingleInstanceLock()) app.quit();
let win = null;

async function open() {
  require('electron').ipcMain.on('env:get', e => { e.returnValue = null; });   // one place only here; the Windows window has two
  require('electron').ipcMain.handle('folder:pick', async () => { const r = await require('electron').dialog.showOpenDialog(win, { title: 'Choose a project folder', properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0] || null; });
  const { start } = await import(pathToFileURL(path.join(__dirname, '..', 'service', 'server.mjs')).href);
  const { address } = await start();
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 900, minHeight: 600,
    title: 'Workwood', backgroundColor: '#18191c', icon: path.join(__dirname, 'icon.png'), autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  // The microphone, for dictation, and nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, what, done, d) => done(what === 'media' && !(d.mediaTypes || []).includes('video')));
  // Links in a conversation open in your browser, never inside the app window.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith(new URL(address).origin)) { e.preventDefault(); shell.openExternal(url); } });
  win.on('closed', () => { win = null; });
  await win.loadURL(address);
  // For checking the window without looking at it: WORKWOOD_SHOT=<file.png> saves a picture of it after a few seconds.
  if (process.env.WORKWOOD_SHOT_EARLY) setTimeout(async () => { require('node:fs').writeFileSync(process.env.WORKWOOD_SHOT_EARLY, (await win.webContents.capturePage()).toPNG()); }, 250);
  if (process.env.WORKWOOD_SHOT) setTimeout(async () => { require('node:fs').writeFileSync(process.env.WORKWOOD_SHOT, (await win.webContents.capturePage()).toPNG()); }, 6000);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open).catch(e => { console.error(e); app.exit(1); });
app.on('window-all-closed', () => app.quit());
