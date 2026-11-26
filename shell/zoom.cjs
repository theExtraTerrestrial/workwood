// Zooms the whole window, as a browser does: Ctrl (Cmd on macOS) with + or - steps the size, with 0 goes back to
// 100%, and Ctrl with the mouse wheel (or a pinch on a touchpad) steps it too. The window has no menu, so Electron's own
// zoom keys are not there. The size is kept in workwood-zoom.json with the app's own settings, since the page's address
// (and so Chromium's own memory of its zoom) changes with each start.
const { app } = require('electron');
const fs = require('node:fs');
const path = require('node:path');

const STEPS = [0.5, 0.67, 0.75, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2];

/** The next step from `now` in direction `dir` (1 bigger, -1 smaller), or 1 for dir 0. */
function step(now, dir) {
  if (!dir) return 1;
  if (dir > 0) return STEPS.find(s => s > now + 0.001) ?? STEPS[STEPS.length - 1];
  return [...STEPS].reverse().find(s => s < now - 0.001) ?? STEPS[0];
}

/** Which way a key press zooms (1, -1, 0 for reset), or null when it is not a zoom key. */
function keyDir(input) {
  if (input.type !== 'keyDown' || input.alt || !(process.platform === 'darwin' ? input.meta : input.control)) return null;
  if (input.key === '+' || input.key === '=' || input.code === 'NumpadAdd') return 1;
  if (input.key === '-' || input.key === '_' || input.code === 'NumpadSubtract') return -1;
  if (!input.shift && (input.key === '0' || input.code === 'Numpad0')) return 0;
  return null;
}

module.exports = function zoom(win) {
  const file = path.join(app.getPath('userData'), 'workwood-zoom.json');
  let factor = 1;
  try { const f = JSON.parse(fs.readFileSync(file, 'utf8')).factor; if (STEPS.includes(f)) factor = f; } catch {}
  const wc = win.webContents;
  const apply = () => { if (!wc.isDestroyed()) wc.setZoomFactor(factor); };
  const set = dir => {
    factor = step(factor, dir); apply();
    try { fs.writeFileSync(file, JSON.stringify({ factor })); } catch {}
  };
  wc.on('did-finish-load', apply);   // each load, and each switch of place in the Windows window, starts at 100%
  wc.on('before-input-event', (e, input) => { const d = keyDir(input); if (d === null) return; e.preventDefault(); set(d); });
  // Ctrl + wheel, pinch. One notch can arrive twice; one step per 60 ms also keeps a fast scroll from racing to the end.
  let last = 0;
  wc.on('zoom-changed', (e, direction) => { const now = Date.now(); if (now - last < 60) return; last = now; set(direction === 'in' ? 1 : -1); });
  apply();
};
module.exports.step = step;
module.exports.keyDir = keyDir;
