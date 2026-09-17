// Tripwire's service worker exists so the app is installable. It deliberately
// has no fetch handler: signatures, chains and tracking are live data and must
// always use the browser's normal network path rather than a service-worker
// cache or pass-through fetch.
self.addEventListener("install", function() { self.skipWaiting(); });
self.addEventListener("activate", function(e) { e.waitUntil(self.clients.claim()); });
