const CACHE_NAME = 'jbbc-fund-tracker-v5'
const OFFLINE_URL = '/offline'
const APP_SHELL = ['/', '/offline', '/manifest.webmanifest']

const isHttpRequest = (requestUrl) => {
  try {
    const parsed = new URL(requestUrl)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

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
  if (!isHttpRequest(request.url)) return

  const url = new URL(request.url)
  const isSameOrigin = url.origin === self.location.origin

  if (request.method !== 'GET') return
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return
  if (request.destination === '') return

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request)
        } catch {
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

  if (!isSameOrigin) return
  if (url.pathname.startsWith('/_next/')) return

  const cacheableDestinations = ['script', 'style', 'image', 'font', 'manifest']
  if (!cacheableDestinations.includes(request.destination)) return

  event.respondWith(
    (async () => {
      try {
        const networkResponse = await fetch(request)
        const requestUrl = request.url
        const responseUrl = networkResponse.url

        if (
          requestUrl.startsWith('http') &&
          responseUrl &&
          responseUrl.startsWith('http') &&
          networkResponse.status === 200
        ) {
          const cache = await caches.open(CACHE_NAME)
          try {
            await cache.put(request, networkResponse.clone())
          } catch (err) {
            console.log('Cache put failed:', err)
          }
        }
        return networkResponse
      } catch {
        const cachedResponse = await caches.match(request)
        if (cachedResponse) return cachedResponse

        return new Response('Offline', {
          status: 503,
          statusText: 'Offline'
        })
      }
    })()
  )
})
