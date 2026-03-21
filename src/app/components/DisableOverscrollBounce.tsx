'use client'

import { useEffect } from 'react'

/**
 * Prevents iOS rubber-band / overscroll bounce in Telegram WebApp.
 *
 * CSS `overscroll-behavior: none` is unreliable in iOS WKWebView.
 * This component intercepts `touchmove` events and clamps scrollable
 * containers so they never exceed their scroll boundaries.
 */
export function DisableOverscrollBounce() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    const EDGE_PX = 2

    function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
      let el = node
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el)
        const oy = style.overflowY
        if (
          (oy === 'auto' || oy === 'scroll') &&
          el.scrollHeight > el.clientHeight
        ) {
          return el
        }
        el = el.parentElement
      }
      return null
    }

    let lastY = 0

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        lastY = e.touches[0].clientY
      }

      // Clamp if already overscrolled
      const scrollable = findScrollableParent(e.target as HTMLElement | null)
      if (scrollable) {
        const maxScroll = scrollable.scrollHeight - scrollable.clientHeight
        if (scrollable.scrollTop < 0) scrollable.scrollTop = 0
        if (scrollable.scrollTop > maxScroll) scrollable.scrollTop = maxScroll
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return

      const currentY = e.touches[0].clientY
      // Instantaneous direction: positive = finger moving down (pulling content up)
      const dy = currentY - lastY
      lastY = currentY

      const target = e.target as HTMLElement | null
      const scrollable = findScrollableParent(target)

      if (!scrollable) {
        e.preventDefault()
        return
      }

      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const maxScroll = scrollHeight - clientHeight

      // Pulling down (finger moves down) while at/near top
      if (scrollTop <= EDGE_PX && dy > 0) {
        scrollable.scrollTop = 0
        e.preventDefault()
        return
      }

      // Pulling up (finger moves up) while at/near bottom
      if (scrollTop >= maxScroll - EDGE_PX && dy < 0) {
        scrollable.scrollTop = maxScroll
        e.preventDefault()
        return
      }
    }

    document.addEventListener('touchstart', handleTouchStart, { passive: true })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
    }
  }, [])

  return null
}
