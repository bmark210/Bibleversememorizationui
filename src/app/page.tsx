'use client'

import { useEffect, useState } from 'react'
import { BookOpen } from 'lucide-react'
import App from './App'
import { TelegramProvider } from './contexts/TelegramContext'

export default function Page() {
  const [mounted, setMounted] = useState(false)
  const [isAppReady, setIsAppReady] = useState(false)
  const [overlayDismissing, setOverlayDismissing] = useState(false)
  const [showBootOverlay, setShowBootOverlay] = useState(true)

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      setMounted(true)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [])

  useEffect(() => {
    if (!mounted || !isAppReady) return
    const timerId = window.setTimeout(() => {
      setOverlayDismissing(true)
    }, 300)
    return () => window.clearTimeout(timerId)
  }, [mounted, isAppReady])

  useEffect(() => {
    if (!overlayDismissing) return
    const timerId = window.setTimeout(() => {
      setShowBootOverlay(false)
    }, 350)
    return () => window.clearTimeout(timerId)
  }, [overlayDismissing])

  return (
    <div className="relative min-h-screen">
      {mounted ? (
        <TelegramProvider>
          <App onInitialContentReady={() => setIsAppReady(true)} />
        </TelegramProvider>
      ) : null}

      {showBootOverlay && (
        <div
          className={`absolute inset-0 z-50 transition-opacity duration-300 ease-out ${
            overlayDismissing ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={overlayDismissing}
        >
          <div
            className="absolute inset-0"
            style={{
              backgroundColor: '#3e3428',
              animation: 'boot-bg-fade 500ms ease-out forwards',
            }}
          />
          <div
            className={`relative min-h-screen flex items-center justify-center p-6 transition-opacity duration-250 ease-out ${
              isAppReady ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <BookOpen className="text-primary h-20 w-20" />
          </div>
        </div>
      )}
    </div>
  )
}


