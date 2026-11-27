// Links in replies: what a GitHub pull request or issue is now, whether a port on this PC answers, and lanes that let a
// paired phone open a server running here.
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import { execFile } from 'node:child_process';

// ---- GitHub: open, draft, merged or closed, asked of `gh` ----
export const GH = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/(pull|issues)\/(\d+)$/;
const ghCache = new Map();   // url -> { at, v, wait }
const GH_LIFE = 5 * 60_000, GH_FRESH = 15_000;
let ghBusy = 0;
const ghQueue = [];
const ghRun = args => new Promise(ok => {
  const go = () => { ghBusy++; execFile(process.env.WORKWOOD_GH || 'gh', args, { timeout: 15_000, maxBuffer: 1 << 20 }, (err, out) => { ghBusy--; ghQueue.shift()?.(); ok(err ? null : out); }); };
  if (ghBusy < 4) go(); else ghQueue.push(go);
});
async function ghLook(url) {
  const [, owner, repo, kind, n] = GH.exec(url);
  const out = await ghRun(['api', `repos/${owner}/${repo}/${kind === 'pull' ? 'pulls' : 'issues'}/${n}`]);
  if (out == null) return { kind: kind === 'pull' ? 'pr' : 'issue', state: null };
  try {
    const j = JSON.parse(out);
    const state = j.merged_at ? 'merged' : j.state === 'closed' ? 'closed' : j.draft ? 'draft' : 'open';
    return { kind: kind === 'pull' ? 'pr' : 'issue', state, title: String(j.title || '').slice(0, 200), ...(j.state_reason === 'not_planned' ? { reason: 'not planned' } : {}) };
  } catch { return { kind: kind === 'pull' ? 'pr' : 'issue', state: null }; }
}
/** Each pull request's or issue's state, from a cache of a few minutes; `fresh` asks again unless it was just asked. */
export async function ghStates(urls, fresh = false) {
  const out = {};
  await Promise.all([...new Set(urls)].filter(u => GH.test(u)).slice(0, 40).map(async u => {
    let c = ghCache.get(u);
    if (!c || (!c.wait && performance.now() - c.at > (fresh ? GH_FRESH : GH_LIFE))) {
      const wait = ghLook(u).then(v => { ghCache.set(u, { at: performance.now(), v }); return v; });
      ghCache.set(u, c = { ...c, wait });
    }
    out[u] = c.wait ? await c.wait : c.v;
  }));
  return out;
}

// ---- ports on this PC ----
const answers = (port, host) => new Promise(ok => {
  const s = net.connect({ port, host });
  const end = r => { s.destroy(); ok(r); };
  s.setTimeout(600, () => end(false)); s.once('connect', () => end(true)); s.once('error', () => end(false));
});
/** Whether something listens on each port here, on IPv4 or IPv6. */
export async function portsLive(ports) {
  const out = {};
  await Promise.all([...new Set(ports)].filter(p => Number.isInteger(p) && p > 0 && p < 65536).slice(0, 40)
    .map(async p => { out[p] = await answers(p, '127.0.0.1') || await answers(p, '::1'); }));
  return out;
}

// ---- lanes: a server on this PC, opened from a paired phone ----
// A dev server listens on localhost, which the phone cannot reach (and inside WSL not even the PC's address leads to it).
// Each lane is a port of Workwood's own, on the home network, with the phone's certificate; it lets in only a paired
// phone (by the key the phone keeps as a cookie, which its browser sends to every port of the PC) and passes each request
// on to the server as if it came from localhost, websockets too.
export const LANES = 20;
export function makeLanes({ base, innerBase, host, cert, allowed }) {
  const lanes = [];   // { i, dev, outer, inner, server, used }
  const ctx = { cert: null };
  const strip = (h, dev) => {
    const o = { ...h, host: `localhost:${dev}` };
    if (o.origin) o.origin = `http://localhost:${dev}`;
    if (o.referer) o.referer = o.referer.replace(/^https:\/\/[^/]+/, `http://localhost:${dev}`);
    if (o.cookie) { o.cookie = o.cookie.split(/;\s*/).filter(c => !/^ww=/.test(c)).join('; '); if (!o.cookie) delete o.cookie; }
    return o;
  };
  const page = (res, code, title, text) => {
    res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Workwood</title><style>body{font:16px/1.5 system-ui,sans-serif;background:#18191c;color:#e8e6e3;margin:0;padding:48px 24px}h1{font-size:21px;margin:0 0 8px}p{color:#9a9894;margin:0}</style><h1>${title}</h1><p>${text}</p>`);
  };
  function open(dev) {
    let l = lanes.find(x => x.dev === dev);
    if (l) { l.used = performance.now(); return l; }
    let i = lanes.length;
    if (i >= LANES) { l = lanes.reduce((a, b) => (a.used < b.used ? a : b)); try { l.server.close(); l.server.closeAllConnections?.(); } catch {} i = l.i; lanes.splice(lanes.indexOf(l), 1); }
    const lane = { i, dev, outer: base + i, inner: innerBase + i, used: performance.now(), ok: false };
    const server = lane.server = https.createServer(ctx.cert || {});
    server.on('request', (req, res) => {
      if (!allowed(req)) return page(res, 401, 'This browser is not paired', 'Open Workwood in this browser once, then open the link again.');
      lane.used = performance.now();
      const up = http.request({ host: 'localhost', port: dev, method: req.method, path: req.url, headers: strip(req.headers, dev), autoSelectFamily: true }, r => {
        const h = { ...r.headers };
        if (h.location) h.location = h.location.replace(new RegExp(`^https?://(?:localhost|127\\.0\\.0\\.1|\\[::1\\])(?::${dev})(?=/|$)`), `https://${req.headers.host}`);
        res.writeHead(r.statusCode, h); r.pipe(res);
      });
      up.on('error', () => { if (!res.headersSent) page(res, 502, `Nothing answers on :${dev}`, `No server is running on port ${dev} on the PC now.`); else res.destroy(); });
      req.pipe(up);
    });
    server.on('upgrade', (req, sock, head) => {
      sock.on('error', () => {});
      if (!allowed(req)) return sock.destroy();
      const s = net.connect({ host: 'localhost', port: dev, autoSelectFamily: true }, () => {
        const h = strip(req.headers, dev);
        s.write(`${req.method} ${req.url} HTTP/1.1\r\n` + Object.entries(h).map(([k, v]) => `${k}: ${v}`).join('\r\n') + '\r\n\r\n');
        if (head?.length) s.write(head);
        s.pipe(sock).pipe(s);
      });
      const end = () => { s.destroy(); sock.destroy(); };
      s.on('error', end); s.on('close', end); sock.on('close', end);
    });
    server.on('error', e => { lane.error = e.code === 'EADDRINUSE' ? `Port ${lane.inner} is taken by another program.` : e.message; });
    server.listen(lane.inner, host, () => { lane.ok = true; });
    lanes.push(lane);
    return lane;
  }
  return {
    open,
    /** The new certificate, when the PC's address changed. */
    setCert(c) { ctx.cert = { cert: c.cert, key: c.key }; for (const l of lanes) try { l.server.setSecureContext(ctx.cert); } catch {} },
    list: () => lanes.map(l => [l.outer, l.inner]),
    closeAll() { for (const l of lanes) try { l.server.close(); l.server.closeAllConnections?.(); } catch {} lanes.length = 0; },
  };
}
