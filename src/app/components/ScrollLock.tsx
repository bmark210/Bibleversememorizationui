"use client"

import { useEffect } from "react"

export default function ScrollLock() {
  useEffect(() => {
    const webApp = (window as any)?.Telegram?.WebApp
    let blockMultiTouch = false
    let touchStartY = 0

    if (webApp?.disableVerticalSwipes) {
      webApp.disableVerticalSwipes()
    }

    // Блокировка overscroll на body/html
    const preventBodyScroll = (event: Event) => {
      if (event.target === document.body || event.target === document.documentElement) {
        event.preventDefault()
      }
    }

    const onTouchStart = (event: Event) => {
      if (event instanceof TouchEvent) {
        blockMultiTouch = event.touches.length > 1
        touchStartY = event.touches[0]?.clientY ?? 0
        
        if (blockMultiTouch) {
          event.preventDefault()
        }
      }
    }

    const onTouchMove = (event: Event) => {
      if (event instanceof TouchEvent) {
        // Блокировка мультитача
        if (event.touches.length > 1 || blockMultiTouch) {
          event.preventDefault()
          return
        }

        // Блокировка overscroll на границах
        const target = event.target as HTMLElement
        const scrollContainer = target.closest('.app-scroll')
        
        if (!scrollContainer) {
          event.preventDefault()
          return
        }

        const currentY = event.touches[0]?.clientY ?? 0
        const deltaY = touchStartY - currentY
        const scrollTop = scrollContainer.scrollTop
        const scrollHeight = scrollContainer.scrollHeight
        const clientHeight = scrollContainer.clientHeight

        // Добавляем небольшой порог (1px) для надежности
        const isAtTop = scrollTop <= 1
        const isAtBottom = scrollTop + clientHeight >= scrollHeight - 1

        // Проверяем направление: отрицательный deltaY = свайп вниз (scrollTop уменьшается)
        const isScrollingUp = deltaY < 0
        const isScrollingDown = deltaY > 0

        // Блокируем если на границе И пытаемся уйти за неё
        if ((isAtTop && isScrollingUp) || (isAtBottom && isScrollingDown)) {
          event.preventDefault()
          return
        }

        // Обновляем touchStartY для следующего кадра (предотвращает накопление инерции)
        touchStartY = currentY
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
    
    // Блокировка скролла на body/html
    document.body.addEventListener("touchmove", preventBodyScroll, options)
    document.documentElement.addEventListener("touchmove", preventBodyScroll, options)

    return () => {
      if (webApp?.enableVerticalSwipes) {
        webApp.enableVerticalSwipes()
      }
      document.removeEventListener("touchstart", onTouchStart, options)
      document.removeEventListener("touchmove", onTouchMove, options)
      document.removeEventListener("touchend", onTouchEnd, options)
      document.removeEventListener("touchcancel", onTouchEnd, options)
      document.body.removeEventListener("touchmove", preventBodyScroll, options)
      document.documentElement.removeEventListener("touchmove", preventBodyScroll, options)
    }
  }, [])

  return null
}
