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
let win = null, wsl = null, quitting = false, current = null, sure = false;
const native = path.join(__dirname, '..', 'native', 'service', 'server.mjs');
const envs = [...(fs.existsSync(native) ? [{ id: 'windows', label: 'Windows', detail: 'This PC' }] : []), ...(cfg.distro ? [{ id: 'wsl', label: 'WSL', detail: cfg.distro }] : [])];
const remembered = path.join(app.getPath('userData'), 'workwood-env.json');
const started = {};   // id -> promise of the service's address
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
  const size = { width: 1400, height: 900, minWidth: 900, minHeight: 600 }, place = require('./window-state.cjs')(size);
  win = new BrowserWindow({
    ...size, ...place.options, show: false,
    title: 'Workwood', backgroundColor: '#18191c', autoHideMenuBar: true, icon: path.join(__dirname, 'workwood.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.cjs'), contextIsolation: true, nodeIntegration: false, spellcheck: true },
  });
  win.once('ready-to-show', () => { if (place.maximized) win.maximize(); win.show(); });
  place.track(win);
  win.on('closed', () => { win = null; });
  // the other place, when it was started, may have background work of its own
  const elsewhere = async () => { let n = 0; for (const id of Object.keys(started)) { if (id === current) continue;
    try { const u = new URL(await started[id]); const r = await fetch(`${u.origin}/api/status`, { headers: { 'x-workwood-token': u.searchParams.get('token') }, signal: AbortSignal.timeout(3000) }); if (r.ok) n += (await r.json()).bg || 0; } catch {} } return n; };
  win.on('close', e => { if (sure) return; e.preventDefault(); elsewhere().then(more => sureToQuit(win, more)).then(ok => { if (ok && win) { sure = true; win.close(); } }); });
  // The microphone, for dictation, and nothing else.
  win.webContents.session.setPermissionRequestHandler((wc, what, done, d) => done(what === 'media' && !(d.mediaTypes || []).includes('video')));
  // Links in a conversation open in your browser, never inside the app window.
  const ours = async url => { for (const p of Object.values(started)) { try { if (url.startsWith(new URL(await p).origin)) return true; } catch {} } return false; };
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!/^http:\/\/127\.0\.0\.1:\d+\//.test(url)) { e.preventDefault(); shell.openExternal(url); } else ours(url).then(ok => { if (!ok) win?.webContents.stop(); }); });
  ipcMain.on('env:get', e => { e.returnValue = { current, list: envs }; });
  require('./page-store.cjs')();
  // Open at login: Windows starts this same program with the app folder, as the Start-menu shortcut does.
  const atLogin = { path: process.execPath, args: [`"${__dirname}"`] };
  ipcMain.on('login:get', e => { try { e.returnValue = !!app.getLoginItemSettings(atLogin).openAtLogin; } catch { e.returnValue = null; } });
  ipcMain.handle('login:set', (e, on) => { app.setLoginItemSettings({ ...atLogin, openAtLogin: !!on }); return !!app.getLoginItemSettings(atLogin).openAtLogin; });
  ipcMain.handle('folder:pick', async () => { const r = await dialog.showOpenDialog(win, { title: 'Choose a project folder', properties: ['openDirectory'] }); return r.canceled ? null : r.filePaths[0] || null; });
  // After an update (pulled in WSL): this window closes, WSL makes the Windows copy again from the updated folder
  // (it cannot while this program holds its files), then opens the window again. Its progress goes to the log.
  ipcMain.handle('app:restart', () => {
    sure = true;
    if (cfg.distro) {
      const inside = `cd '${cfg.dir.replace(/'/g, `'\\''`)}' && node shell/windows-shortcut.mjs --after-update >> ~/.cache/workwood/workwood.log 2>&1`;
      spawn('wsl.exe', ['-d', cfg.distro, '--', 'bash', '-lic', inside], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
    } else app.relaunch();
    app.quit();
  });
  ipcMain.handle('env:set', (e, id) => { if (envs.some(x => x.id === id) && id !== current) show(id); });
  // While you look at one side, ask the other (if it was started) whether an agent there is working or waiting for you.
  setInterval(async () => {
    if (!win || quitting) return;
    const out = {};
    for (const id of Object.keys(started)) {
      if (id === current) continue;
      try { const u = new URL(await started[id]); const r = await fetch(`${u.origin}/api/status`, { headers: { 'x-workwood-token': u.searchParams.get('token') }, signal: AbortSignal.timeout(3000) }); if (r.ok) out[id] = await r.json(); } catch {}
    }
    try { win?.webContents.send('env:status', out); } catch {}
  }, 4000);
  let first = envs[0]?.id; try { const want = JSON.parse(fs.readFileSync(remembered, 'utf8')).env; if (envs.some(x => x.id === want)) first = want; } catch {}
  if (!first) { dialog.showErrorBox('Workwood could not start', 'Nothing is installed to run sessions with. Run "npm run shortcut" again.'); return app.quit(); }
  await show(first);
}

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(open);
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { quitting = true; try { wsl?.stdin.end(); } catch {} setTimeout(() => { try { wsl?.kill(); } catch {} }, 1500); });
