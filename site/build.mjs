// Puts the website together in _site/: the page (site/index.html) and, under app/, the app's own page from ui/
// with the scripted stand-in for the service (site/demo.js) loaded before it. Nothing in ui/ is changed, so the
// window on the page is always the app as it is.     npm run site
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), out = path.join(root, '_site'), app = path.join(out, 'app');
const lib = createRequire(import.meta.url);
const VENDOR = { 'xterm.js': '@xterm/xterm/lib/xterm.js', 'xterm.css': '@xterm/xterm/css/xterm.css', 'addon-fit.js': '@xterm/addon-fit/lib/addon-fit.js' };   // as in service/server.mjs

fs.rmSync(out, { recursive: true, force: true }); fs.mkdirSync(path.join(app, 'vendor'), { recursive: true });
for (const f of ['index.html', 'icon.svg']) if (fs.existsSync(path.join(root, 'site', f))) fs.copyFileSync(path.join(root, 'site', f), path.join(out, f));
fs.copyFileSync(path.join(root, 'shell', 'icon.svg'), path.join(out, 'icon.svg'));
for (const f of ['app.js', 'app.css']) fs.copyFileSync(path.join(root, 'ui', f), path.join(app, f));
for (const [name, from] of Object.entries(VENDOR)) fs.copyFileSync(lib.resolve(from), path.join(app, 'vendor', name));
fs.copyFileSync(path.join(root, 'site', 'demo.js'), path.join(app, 'demo.js'));
const page = fs.readFileSync(path.join(root, 'ui', 'index.html'), 'utf8');
if (!page.includes('__TOKEN__') || !page.includes('<script src="vendor/xterm.js">')) throw new Error('ui/index.html no longer looks the way site/build.mjs expects.');
fs.writeFileSync(path.join(app, 'index.html'), page.replace('__TOKEN__', 'demo').replace('<script src="vendor/xterm.js">', '<script src="demo.js"></script>\n<script src="vendor/xterm.js">'));
// Files the agents "made" in the story: the window asks for them as <preview>/<session>/<path on disk>.
const made = { checkout: ['shop/mockups/compact.html', 'shop/mockups/tall.html'] };
for (const [id, files] of Object.entries(made)) for (const f of files) {
  const to = path.join(app, 'demo-files', id, 'home', 'you', 'workspace', f);
  fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(path.join(root, 'site', 'demo-files', f), to);
}
// the features grid's pictures (npm run shots makes them)
fs.cpSync(path.join(root, 'site', 'shots'), path.join(out, 'shots'), { recursive: true });
fs.writeFileSync(path.join(out, '.nojekyll'), '');
console.log('Built ' + out);
