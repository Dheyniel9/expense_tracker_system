'use client'

import { useEffect } from 'react'

export default function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator)) return
    const isLocalhost =
      window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

    if (process.env.NODE_ENV !== 'production' || isLocalhost) {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => Promise.all(registrations.map((registration) => registration.unregister())))
        .catch(() => undefined)

      if ('caches' in window) {
        caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
          .catch(() => undefined)
      }

      return
    }

    const registerServiceWorker = async () => {
      try {
        await navigator.serviceWorker.register('/sw.js', {
          scope: '/',
          updateViaCache: 'none'
        })
      } catch (error) {
        console.error('Service worker registration failed:', error)
      }
    }

    registerServiceWorker()
  }, [])

  return null
}
