// Workwood's service worker on the phone: it only shows the notifications the PC sends (encrypted end to end) and opens
// the session a tap is about. Nothing is cached: without the PC on the same Wi-Fi there is nothing to show.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('push', e => {
  let m = {}; try { m = e.data ? e.data.json() : {}; } catch { m = { title: 'Workwood', body: e.data?.text() || '' }; }
  const actions = m.kind === 'stopped' && m.auto ? [{ action: 'stay', title: 'Wait' }, { action: 'go', title: `Continue on ${m.auto}` }] : [];
  e.waitUntil(self.registration.showNotification(m.title || 'Workwood', {
    body: m.body || '', tag: m.tag || undefined, renotify: !!m.tag, icon: '/icon-192.png', badge: '/icon-192.png',
    data: { session: m.session || null }, actions,
  }));
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  const session = e.notification.data?.session || null, act = e.action || null;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const win = all[0];
    if (win) { win.postMessage({ ww: 'open', session, act }); return win.focus(); }
    const hash = session ? '#s=' + encodeURIComponent(session) + (act ? '&do=' + act : '') : '';
    return self.clients.openWindow('/' + hash);
  })());
});
