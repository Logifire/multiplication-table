// This forces the Service Worker to activate immediately
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

// This allows the Service Worker to take control of the page immediately
self.addEventListener('activate', (event) => {
  self.clients.claim();
});

// IMPORTANT: The fetch event is required for the "Install" prompt to show up
self.addEventListener('fetch', (event) => {
  // We simply pass the request through to the network
  event.respondWith(fetch(event.request));
});