// Remembers where the window was and how big, so it opens the same way next time (kept in workwood-window.json
// with the app's own settings). A place that is no longer on any screen, say a monitor since unplugged, is not used.
const { app, screen } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

module.exports = function windowState({ width, height, minWidth = 0, minHeight = 0 }) {
  const file = path.join(app.getPath('userData'), 'workwood-window.json');
  let was = {}; try { was = JSON.parse(fs.readFileSync(file, 'utf8')) || {}; } catch {}
  const num = (...v) => v.every(Number.isFinite);
  const options = { width, height };
  if (num(was.width, was.height)) { options.width = Math.max(minWidth, Math.round(was.width)); options.height = Math.max(minHeight, Math.round(was.height)); }
  if (num(was.x, was.y)) {
    // enough of the title bar must be on a screen to take hold of
    const reachable = screen.getAllDisplays().some(({ workArea: a }) =>
      Math.min(was.x + options.width, a.x + a.width) - Math.max(was.x, a.x) >= 120 && was.y >= a.y - 10 && was.y <= a.y + a.height - 40);
    if (reachable) { options.x = Math.round(was.x); options.y = Math.round(was.y); }
  }
  return {
    options, maximized: !!was.maximized,
    /** Keeps the file up to date while the window is moved and resized. */
    track(win) {
      let timer = null;
      const save = () => { clearTimeout(timer); timer = null; if (win.isDestroyed()) return;
        // the size to return to from maximized, not the maximized size itself
        try { fs.writeFileSync(file, JSON.stringify({ ...win.getNormalBounds(), maximized: win.isMaximized() })); } catch {} };
      const soon = () => { clearTimeout(timer); timer = setTimeout(save, 400); };
      for (const ev of ['resize', 'move', 'maximize', 'unmaximize']) win.on(ev, soon);
      win.on('close', save);
    },
  };
};
