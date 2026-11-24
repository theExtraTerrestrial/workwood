// Lets the page ask where an attached file lives on disk, so a file that is already there is named, not copied;
// and, in the Windows window, which place sessions run in (Windows or WSL) and to switch between them.
const { contextBridge, webUtils, ipcRenderer } = require('electron');
let env = null; try { env = ipcRenderer.sendSync('env:get'); } catch {}
let login = null; try { login = ipcRenderer.sendSync('login:get'); } catch {}   // null where the window cannot arrange it

// What the page saves for itself outlives a new port (see page-store.cjs): put it back before the page runs, then send
// it along whenever it changes and once more as the page goes.
(() => {
  let ls; try { ls = window.localStorage; } catch { return; }
  const all = () => { const o = {}; for (let i = 0; i < ls.length; i++) { const k = ls.key(i); o[k] = ls.getItem(k); } return o; };
  let saved = null; try { saved = ipcRenderer.sendSync('store:load'); } catch { return; }
  if (saved) { ls.clear(); for (const [k, v] of Object.entries(saved)) if (typeof v === 'string') try { ls.setItem(k, v); } catch {} }
  let last = saved ? JSON.stringify(all()) : '';   // with no file yet, the first look sends what the page has
  const check = sync => { const now = all(), s = JSON.stringify(now); if (s === last) return; last = s;
    try { sync ? ipcRenderer.sendSync('store:saveSync', now) : ipcRenderer.send('store:save', now); } catch {} };
  setInterval(() => check(false), 2000);
  window.addEventListener('pagehide', () => check(true));
  window.addEventListener('beforeunload', () => check(true));
})();
contextBridge.exposeInMainWorld('workwood', {
  pathFor: file => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  env: env && env.list ? env : null,
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  restart: () => ipcRenderer.invoke('app:restart'),
  login: typeof login === 'boolean' ? { on: login, set: on => ipcRenderer.invoke('login:set', !!on) } : null,
  setEnv: id => ipcRenderer.invoke('env:set', id),
  onEnvStatus: fn => ipcRenderer.on('env:status', (e, s) => fn(s)),
});
