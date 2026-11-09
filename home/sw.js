// BATTLAB app shell: makes www.battlab.net installable. Network only — never caches data or firmware.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', () => {});
