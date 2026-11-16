// Lets the page ask where an attached file lives on disk, so a file that is already there is named, not copied;
// and, in the Windows window, which place sessions run in (Windows or WSL) and to switch between them.
const { contextBridge, webUtils, ipcRenderer } = require('electron');
let env = null; try { env = ipcRenderer.sendSync('env:get'); } catch {}
let login = null; try { login = ipcRenderer.sendSync('login:get'); } catch {}   // null where the window cannot arrange it
contextBridge.exposeInMainWorld('workwood', {
  pathFor: file => { try { return webUtils.getPathForFile(file) || ''; } catch { return ''; } },
  env: env && env.list ? env : null,
  pickFolder: () => ipcRenderer.invoke('folder:pick'),
  login: typeof login === 'boolean' ? { on: login, set: on => ipcRenderer.invoke('login:set', !!on) } : null,
  setEnv: id => ipcRenderer.invoke('env:set', id),
  onEnvStatus: fn => ipcRenderer.on('env:status', (e, s) => fn(s)),
});
