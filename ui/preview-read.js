// Read aloud, inside a previewed page. Workwood adds this to a page it shows in the preview (never to the file):
// the page is a different site from the window, so this side finds what can be read, lights the sentence being read
// and offers Read section and Read aloud; the window does the speaking and holds the player.
(() => {
  if (window.__wwRead || window.parent === window) return; window.__wwRead = 1;
  const P = window.parent, BLK = 'p,li,h1,h2,h3,h4,h5,h6,td,th,dd,dt,blockquote,figcaption';
  const HEAD = /^H[1-6]$/, SKIP = 'script,style,template,noscript,svg,button,nav,select,textarea,input,[hidden],[aria-hidden="true"]';
  const ASK = /questions?\b/i, ALWAYS = /questions?\b|\bnotes?\b/i;
  const SEG = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('en', { granularity: 'sentence' }) : null;
  const say = m => P.postMessage({ ww: 'ra', ...m }, '*');
  let S = [], secs = [], reading = null, acc = '#2dd4bf', lastNow = null;

  const shown = el => !el.closest(SKIP) && el.getClientRects().length > 0;
  // a mockup's frame: the parts of a page drawn to look like an app are not words to read
  const framed = el => !!el.closest('[class*="frame"],[class*="mock"],[class*="phone"],[class*="device"],[class*="screen"],[data-read="no"]');
  const words = t => (t.match(/[\p{L}\p{N}]+/gu) || []).length;

  // Sentences from pieces of text nodes that belong together (one block), each with a Range on the page.
  function sentences(parts, first) {
    const txt = parts.map(p => p.node.data.slice(p.from, p.to)).join(''), out = [];
    for (const g of SEG ? SEG.segment(txt) : [{ index: 0, segment: txt }]) {
      let s = g.index, e = s + g.segment.length;
      while (s < e && /\s/.test(txt[s])) s++; while (e > s && /\s/.test(txt[e - 1])) e--;
      const t = txt.slice(s, e).replace(/\s+/g, ' ');
      if (!/[\p{L}\p{N}]/u.test(t)) continue;
      const r = document.createRange(); let pos = 0, set = false;
      for (const p of parts) {
        const L = p.to - p.from;
        if (!set && s <= pos + L) { r.setStart(p.node, p.from + s - pos); set = true; }
        if (set && e <= pos + L) { r.setEnd(p.node, p.from + e - pos); break; }
        pos += L;
      }
      const id = S.length; S.push({ id, say: t, first, r }); out.push(S[id]); first = false;
    }
    return out;
  }
  const textOf = (b, within) => {
    const w = document.createTreeWalker(b, NodeFilter.SHOW_TEXT, { acceptNode: t => { const p = t.parentElement; return p && p.closest(BLK) === b && !p.closest(SKIP) ? 1 : 3; } }), L = [];
    while (w.nextNode()) { const n = w.currentNode; L.push({ node: n, from: 0, to: n.data.length }); }
    return L;
  };
  const blockSents = b => sentences(textOf(b), !/^(LI|TD|TH|DD)$/.test(b.tagName));
  const blocksIn = root => [...root.querySelectorAll(BLK)].filter(b => !b.parentElement.closest(BLK) && shown(b) && !framed(b));

  // What can be read: sections marked <section data-read> if the page has any; otherwise each heading with the words
  // under it, when they are mostly words (about 20 or more) or the heading is named like Open questions or Notes.
  function scan() {
    S = []; secs = [];
    const marked = [...document.querySelectorAll('[data-read]:not([data-read="no"])')].filter(m => !m.parentElement?.closest('[data-read]:not([data-read="no"])') && shown(m));
    if (marked.length) for (const m of marked) {
      const h = m.querySelector('h1,h2,h3,h4,h5,h6'), title = (m.dataset.read || h?.textContent || 'Section').trim();
      const bs = [...m.querySelectorAll(BLK)].filter(b => !b.parentElement.closest(BLK) && shown(b));
      secs.push({ title, el: h || m, sents: bs.flatMap(blockSents) });
    }
    else {
      let cur = null; const all = [];
      for (const b of blocksIn(document.body)) {
        if (HEAD.test(b.tagName)) { cur = { title: b.textContent.trim().replace(/\s+/g, ' '), el: b, blocks: [b] }; all.push(cur); }
        else if (cur) cur.blocks.push(b);
      }
      for (const c of all) {
        const n = c.blocks.slice(1).reduce((k, b) => k + words(b.textContent), 0);
        if (n && (n >= 20 || ALWAYS.test(c.title))) secs.push({ title: c.title, el: c.el, sents: c.blocks.flatMap(blockSents) });
      }
    }
    secs = secs.filter(s => s.sents.length);
    // open questions first, then the rest in page order
    secs = [...secs.filter(s => ASK.test(s.title)), ...secs.filter(s => !ASK.test(s.title))];
    say({ t: 'secs', secs: secs.map(s => ({ title: s.title, sents: s.sents.map(x => ({ id: x.id, say: x.say, first: x.first })) })) });
  }
  const out = (s, title) => s.map(x => ({ id: x.id, say: x.say, first: x.first, sec: title }));

  // The lit sentence, the ones read before it dimmed, drawn over the page with the CSS highlight API.
  const st = document.createElement('style');
  const paintCss = () => { st.textContent = `::highlight(ww-now){background-color:color-mix(in srgb,${acc} 28%,transparent)}::highlight(ww-done){color:color-mix(in srgb,currentColor 45%,transparent)}`; };
  paintCss(); (document.head || document.documentElement).appendChild(st);
  const inView = r => { if (!r) return false; const a = r.getBoundingClientRect(); return a.bottom > 0 && a.top < innerHeight; };
  function light(m) {
    const H = window.CSS?.highlights; reading = m.reading ? new Set(m.reading) : null;
    if (!H) return; H.delete('ww-now'); H.delete('ww-done');
    if (!reading) { lastNow = null; return; }
    const now = S[m.now]?.r, done = (m.done || []).map(i => S[i]?.r).filter(Boolean);
    if (now) H.set('ww-now', new Highlight(now)); if (done.length) H.set('ww-done', new Highlight(...done));
    // follow the reading down the page while you follow it: the first sentence, or when the one before was in view
    if (now && m.now !== lastNow && (lastNow == null || inView(S[lastNow]?.r))) {
      const a = now.getBoundingClientRect();
      if (a.bottom > innerHeight - 40 || a.top < 0) scrollBy({ top: a.top - innerHeight / 3, behavior: 'smooth' });
    }
    lastNow = m.now;
  }

  // Read section, by a heading you point at; Read aloud, by text you select. Drawn in a shadow root so the page's styles
  // and Workwood's do not meet.
  const host = document.createElement('div'); host.style.cssText = 'position:absolute;left:0;top:0;width:0;height:0;z-index:2147483647';
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>
    .c{position:absolute;display:none;align-items:center;gap:5px;height:22px;padding:0 9px 0 7px;border-radius:11px;border:0;font:600 11.5px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap;box-shadow:0 2px 8px rgba(0,0,0,.18)}
    .c.on{display:flex}.c svg{width:12px;height:12px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round}
    .sec{background:var(--acc);color:#0b1214}.sel{background:#16181d;color:#fff}.c:hover{filter:brightness(1.08)}
  </style><button class="c sec" data-k="sec"></button><button class="c sel" data-k="sel"></button>`;
  const spk = '<svg viewBox="0 0 24 24"><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" stroke-linejoin="round"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/></svg>';
  const [cSec, cSel] = root.querySelectorAll('.c');
  cSec.innerHTML = spk + 'Read section'; cSel.innerHTML = spk + 'Read aloud';
  const setAcc = () => host.style.setProperty('--acc', acc); setAcc();
  const place = (c, x, y) => { c.style.left = x + scrollX + 'px'; c.style.top = y + scrollY + 'px'; c.classList.add('on'); };
  let hovSec = null, hideT;
  addEventListener('pointerover', e => {
    if (e.composedPath().includes(cSec)) { clearTimeout(hideT); return; }
    const s = secs.find(s => s.el.contains(e.target));
    if (!s || reading) { hideT = setTimeout(() => { cSec.classList.remove('on'); hovSec = null; }, 250); return; }
    clearTimeout(hideT); if (s === hovSec) return; hovSec = s;
    const r = document.createRange(); r.selectNodeContents(s.el); const a = [...r.getClientRects()].pop() || s.el.getBoundingClientRect();
    place(cSec, Math.min(a.right + 10, innerWidth - 120), a.top + a.height / 2 - 11);
  });
  cSec.addEventListener('click', e => { e.preventDefault(); if (hovSec) say({ t: 'read', title: hovSec.title, sents: out(hovSec.sents, hovSec.title) }); cSec.classList.remove('on'); hovSec = null; });

  let selR = null;
  document.addEventListener('selectionchange', () => {
    const sel = getSelection(); selR = sel.rangeCount && !sel.isCollapsed ? sel.getRangeAt(0) : null;
    if (!selR || !/[\p{L}\p{N}]/u.test(sel.toString())) { selR = null; cSel.classList.remove('on'); return; }
    const a = [...selR.getClientRects()].pop(); if (!a) return;
    place(cSel, Math.max(4, Math.min(a.right - 84, innerWidth - 100)), a.bottom + 6);
  });
  cSel.addEventListener('pointerdown', e => e.preventDefault());   // keeps the selection
  cSel.addEventListener('click', e => {
    e.preventDefault(); if (!selR) return;
    const r = selR, top = r.commonAncestorContainer.nodeType === 1 ? r.commonAncestorContainer : r.commonAncestorContainer.parentElement;
    const w = document.createTreeWalker(top, NodeFilter.SHOW_TEXT, { acceptNode: t => r.intersectsNode(t) && !t.parentElement.closest(SKIP) ? 1 : 3 });
    const groups = new Map();
    while (w.nextNode()) {
      const n = w.currentNode, b = n.parentElement.closest(BLK) || top;
      const from = n === r.startContainer ? r.startOffset : 0, to = n === r.endContainer ? r.endOffset : n.data.length;
      if (to > from) { if (!groups.has(b)) groups.set(b, []); groups.get(b).push({ node: n, from, to }); }
    }
    const got = [...groups.values()].flatMap(g => sentences(g, true));
    if (got.length) say({ t: 'read', title: 'Selection', sents: out(got, 'Selection') });
    getSelection().removeAllRanges(); cSel.classList.remove('on');
  });

  // While it reads: a click on a sentence reads from there; Esc, Space and the arrows work here as in the window.
  addEventListener('click', e => {
    if (!reading || e.target.closest?.('a,button,input,textarea,select,label') || !getSelection().isCollapsed) return;
    const p = document.caretRangeFromPoint?.(e.clientX, e.clientY); if (!p) return;
    const x = S.find(x => reading.has(x.id) && (() => { try { return x.r.isPointInRange(p.startContainer, p.startOffset); } catch { return false; } })());
    if (x) say({ t: 'go', id: x.id });
  });
  addEventListener('keydown', e => {
    if (!reading || e.ctrlKey || e.metaKey || e.altKey || e.target.closest?.('input,textarea,select,[contenteditable="true"]')) return;
    if (e.key === 'Escape' || (e.key === ' ' && !e.shiftKey) || e.key === 'ArrowLeft' || e.key === 'ArrowRight') { e.preventDefault(); say({ t: 'key', key: e.key, shift: e.shiftKey }); }
  }, true);

  addEventListener('message', e => {
    const m = e.data; if (e.source !== P || !m || m.ww !== 'ra') return;
    if (m.t === 'hello') { if (m.acc) { acc = m.acc; paintCss(); setAcc(); } scan(); }
    else if (m.t === 'light') light(m);
  });
  const start = () => { document.documentElement.appendChild(host); scan(); };
  if (document.readyState === 'complete') start(); else addEventListener('load', start);
})();
