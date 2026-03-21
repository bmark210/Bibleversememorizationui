'use client'

import { useEffect } from 'react'

/**
 * Prevents iOS rubber-band / overscroll bounce in Telegram WebApp.
 *
 * CSS `overscroll-behavior: none` is unreliable in iOS WKWebView.
 * This component intercepts `touchmove` events and blocks them when the
 * nearest scrollable ancestor has reached its scroll boundary.
 */
export function DisableOverscrollBounce() {
  useEffect(() => {
    if (typeof window === 'undefined') return

    /** Walk up the DOM and find the first scrollable ancestor. */
    function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
      let el = node
      while (el && el !== document.documentElement) {
        const style = window.getComputedStyle(el)
        const overflowY = style.overflowY
        if (
          (overflowY === 'auto' || overflowY === 'scroll') &&
          el.scrollHeight > el.clientHeight
        ) {
          return el
        }
        el = el.parentElement
      }
      return null
    }

    let startY = 0

    function handleTouchStart(e: TouchEvent) {
      if (e.touches.length === 1) {
        startY = e.touches[0].clientY
      }
    }

    function handleTouchMove(e: TouchEvent) {
      if (e.touches.length !== 1) return

      const target = e.target as HTMLElement | null
      const scrollable = findScrollableParent(target)

      // No scrollable ancestor — block all vertical movement
      if (!scrollable) {
        e.preventDefault()
        return
      }

      const deltaY = e.touches[0].clientY - startY
      const { scrollTop, scrollHeight, clientHeight } = scrollable
      const atTop = scrollTop <= 0 && deltaY > 0
      const atBottom = scrollTop + clientHeight >= scrollHeight && deltaY < 0

      if (atTop || atBottom) {
        e.preventDefault()
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
