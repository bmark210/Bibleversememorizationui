'use client'

import { useEffect } from 'react'

const NON_PASSIVE_EVENT_OPTIONS = { passive: false } as const

export function DisableViewportZoom() {
  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    if (!('ongesturestart' in window)) {
      return
    }

    const preventGestureZoom = (event: Event) => {
      event.preventDefault()
    }

    document.addEventListener('gesturestart', preventGestureZoom, NON_PASSIVE_EVENT_OPTIONS)
    document.addEventListener('gesturechange', preventGestureZoom, NON_PASSIVE_EVENT_OPTIONS)
    document.addEventListener('gestureend', preventGestureZoom, NON_PASSIVE_EVENT_OPTIONS)

    return () => {
      document.removeEventListener('gesturestart', preventGestureZoom)
      document.removeEventListener('gesturechange', preventGestureZoom)
      document.removeEventListener('gestureend', preventGestureZoom)
    }
  }, [])

  return null
}
