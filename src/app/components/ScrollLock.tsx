"use client"

import { useEffect } from "react"

export default function ScrollLock() {
  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    let touchStartY = 0

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

    const isScrollable = (element: HTMLElement) => {
      const style = window.getComputedStyle(element)
      const overflowY = style.overflowY
      return (
        (overflowY === "auto" || overflowY === "scroll" || overflowY === "overlay") &&
        element.scrollHeight > element.clientHeight
      )
    }

    const findScrollableParent = (target: EventTarget | null) => {
      let node = target as HTMLElement | null
      while (node && node !== document.body && node !== document.documentElement) {
        if (isScrollable(node)) return node
        node = node.parentElement
      }
      return null
    }

    const onTouchStart = (event: Event) => {
      if (event instanceof TouchEvent) {
        if (event.touches.length > 1) {
          event.preventDefault()
          return
        }
        touchStartY = event.touches[0]?.clientY ?? 0
      }
    }

    const onTouchMove = (event: Event) => {
      if (event instanceof TouchEvent) {
        const scrollable = findScrollableParent(event.target)
        if (!scrollable) {
          event.preventDefault()
          return
        }

        const currentY = event.touches[0]?.clientY ?? 0
        const deltaY = touchStartY - currentY
        const atTop = scrollable.scrollTop <= 0
        const atBottom =
          scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight

        if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
          event.preventDefault()
        }
      }
    }

    const onWheel = (event: Event) => {
      if (event instanceof WheelEvent) {
        const scrollable = findScrollableParent(event.target)
        if (!scrollable) {
          event.preventDefault()
          return
        }

        const atTop = scrollable.scrollTop <= 0
        const atBottom =
          scrollable.scrollTop + scrollable.clientHeight >= scrollable.scrollHeight
        const deltaY = event.deltaY

        if ((deltaY < 0 && atTop) || (deltaY > 0 && atBottom)) {
          event.preventDefault()
        }
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
