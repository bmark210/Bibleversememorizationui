"use client"

import { useEffect } from "react"

export default function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body

    const prev = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      htmlHeight: html.style.height,
      bodyHeight: body.style.height,
    }

    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    html.style.height = "100%"
    body.style.height = "100%"

    const preventDefault = (event: Event) => {
      event.preventDefault()
    }

    const onTouchStart = (event: Event) => {
      if (event instanceof TouchEvent && event.touches.length > 1) {
        event.preventDefault()
      }
    }

    const onTouchMove = (event: Event) => {
      if (event instanceof TouchEvent) {
        event.preventDefault()
      }
    }

    const onWheel = (event: Event) => {
      if (event instanceof WheelEvent) {
        event.preventDefault()
      }
    }

    const onKeyDown = (event: KeyboardEvent) => {
      const blockedKeys = [
        "ArrowUp",
        "ArrowDown",
        "PageUp",
        "PageDown",
        "Home",
        "End",
        " ",
      ]
      if (blockedKeys.includes(event.key)) {
        event.preventDefault()
      }
    }

    const options: AddEventListenerOptions = { passive: false }

    document.addEventListener("touchstart", onTouchStart, options)
    document.addEventListener("touchmove", onTouchMove, options)
    window.addEventListener("wheel", onWheel, options)
    document.addEventListener("gesturestart", preventDefault, options)
    document.addEventListener("gesturechange", preventDefault, options)
    document.addEventListener("gestureend", preventDefault, options)
    document.addEventListener("keydown", onKeyDown, options)

    return () => {
      document.removeEventListener("touchstart", onTouchStart, options)
      document.removeEventListener("touchmove", onTouchMove, options)
      window.removeEventListener("wheel", onWheel, options)
      document.removeEventListener("gesturestart", preventDefault, options)
      document.removeEventListener("gesturechange", preventDefault, options)
      document.removeEventListener("gestureend", preventDefault, options)
      document.removeEventListener("keydown", onKeyDown, options)

      html.style.overflow = prev.htmlOverflow
      body.style.overflow = prev.bodyOverflow
      html.style.height = prev.htmlHeight
      body.style.height = prev.bodyHeight
    }
  }, [])

  return null
}
