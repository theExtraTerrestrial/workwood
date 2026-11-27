// Whether you are at this PC, for the phone's notifications (see service/presence.mjs): the page asks how long since
// the last input to the whole computer, and hears at once when the screen locks or the computer sleeps.
const { ipcMain, powerMonitor } = require('electron');
module.exports = getWin => {
  ipcMain.handle('pc:idle', () => {
    let locked = false; try { locked = powerMonitor.getSystemIdleState(1) === 'locked'; } catch {}
    return { idle: powerMonitor.getSystemIdleTime(), locked };
  });
  const tell = what => () => { const w = getWin(); if (w && !w.isDestroyed()) w.webContents.send('pc:lock', what); };
  for (const e of ['lock-screen', 'suspend']) powerMonitor.on(e, tell(true));
  for (const e of ['unlock-screen', 'resume']) powerMonitor.on(e, tell(false));
};
