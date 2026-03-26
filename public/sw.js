const CACHE_NAME = 'jbbc-fund-tracker-v1'
const OFFLINE_URL = '/offline'
const APP_SHELL = ['/', '/offline', '/manifest.webmanifest']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event

  if (request.method !== 'GET') return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const networkResponse = await fetch(request)
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, networkResponse.clone())
          return networkResponse
        } catch {
          const cachedPage = await caches.match(request)
          if (cachedPage) return cachedPage

          const offlinePage = await caches.match(OFFLINE_URL)
          if (offlinePage) return offlinePage

          return new Response('Offline', {
            status: 503,
            statusText: 'Offline'
          })
        }
      })()
    )
    return
  }

  event.respondWith(
    (async () => {
      const cachedResponse = await caches.match(request)

      const networkResponsePromise = fetch(request)
        .then(async (networkResponse) => {
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, networkResponse.clone())
          return networkResponse
        })
        .catch(() => cachedResponse)

      return cachedResponse || networkResponsePromise
    })()
  )
})
