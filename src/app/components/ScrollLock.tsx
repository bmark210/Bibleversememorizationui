"use client"

import { useEffect } from "react"

export default function ScrollLock() {
  useEffect(() => {
    const webApp = (window as any)?.Telegram?.WebApp
    let blockMultiTouch = false

    if (webApp?.disableVerticalSwipes) {
      webApp.disableVerticalSwipes()
    }

    const onTouchStart = (event: Event) => {
      if (event instanceof TouchEvent) {
        blockMultiTouch = event.touches.length > 1

        if (blockMultiTouch) {
          event.preventDefault()
        }
      }
    }

    const onTouchMove = (event: Event) => {
      if (event instanceof TouchEvent) {
        // Разрешаем обычный вертикальный скролл внутри .app-scroll.
        // Блокируем только мультитач/пинч, чтобы не конфликтовать с виртуализированным списком.
        if (event.touches.length > 1 || blockMultiTouch) {
          event.preventDefault()
        }
      }
    }

    const onTouchEnd = (event: Event) => {
      if (event instanceof TouchEvent) {
        if (event.touches.length < 2) {
          blockMultiTouch = false
        }
      }
    }

    const options: AddEventListenerOptions = { passive: false }

    document.addEventListener("touchstart", onTouchStart, options)
    document.addEventListener("touchmove", onTouchMove, options)
    document.addEventListener("touchend", onTouchEnd, options)
    document.addEventListener("touchcancel", onTouchEnd, options)

    return () => {
      if (webApp?.enableVerticalSwipes) {
        webApp.enableVerticalSwipes()
      }
      document.removeEventListener("touchstart", onTouchStart, options)
      document.removeEventListener("touchmove", onTouchMove, options)
      document.removeEventListener("touchend", onTouchEnd, options)
      document.removeEventListener("touchcancel", onTouchEnd, options)
    }
  }, [])

  return null
}
