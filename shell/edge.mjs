// Runs the Workwood service and shows it in a Microsoft Edge app window on Windows
// (a plain window with no tabs or address bar). Used from WSL until the Electron
// window's system library is installed. Keep this terminal open; Ctrl+C quits.
import { spawn } from 'node:child_process';
import { start } from '../service/server.mjs';

const { address } = await start();
console.log('Workwood is running. Close this terminal or press Ctrl+C to quit.');
console.log('If no window appears, open this link:', address);
spawn('cmd.exe', ['/c', 'start', '', 'msedge', `--app=${address}`, '--window-size=1400,900'], { cwd: '/mnt/c', stdio: 'ignore', detached: true })
  .on('error', () => console.log('Could not start Microsoft Edge from here.')).unref();
