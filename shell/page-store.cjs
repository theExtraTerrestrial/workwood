// Keeps what the page saves for itself (theme, backgrounds, sidebar, Home's view…) in workwood-page.json with the app's
// own settings. The page keeps these in its browser storage, which belongs to its address, and the service takes a new
// port every time it starts: without this file each start would begin from the defaults. preload.cjs puts the saved
// values back before the page runs and sends them here again when they change.
const { app, ipcMain } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function pageStore() {
  const file = path.join(app.getPath('userData'), 'workwood-page.json');
  ipcMain.on('store:load', e => {
    try { const v = JSON.parse(fs.readFileSync(file, 'utf8')); e.returnValue = v && typeof v === 'object' ? v : null; }
    catch { e.returnValue = null; }   // none yet: the page keeps what it has
  });
  const save = all => {
    if (!all || typeof all !== 'object') return;
    try { fs.writeFileSync(file + '.tmp', JSON.stringify(all)); fs.renameSync(file + '.tmp', file); } catch {}
  };
  ipcMain.on('store:save', (e, all) => save(all));
  ipcMain.on('store:saveSync', (e, all) => { save(all); e.returnValue = true; });
};
