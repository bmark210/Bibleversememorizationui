'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import App from './App'
import { TelegramProvider } from './contexts/TelegramContext'

export default function Page() {
  const BOOT_CONTENT_DELAY_MS = 450
  const BOOT_BG_FADE_MS = 650
  const BOOT_BG_FADE_DELAY_MS = 200
  const [mounted, setMounted] = useState(false)
  const [isAppReady, setIsAppReady] = useState(false)
  const [overlayDismissing, setOverlayDismissing] = useState(false)
  const [showBootOverlay, setShowBootOverlay] = useState(true)
  const [showAppContent, setShowAppContent] = useState(false)

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
    }, BOOT_CONTENT_DELAY_MS)
    return () => window.clearTimeout(timerId)
  }, [mounted, isAppReady, BOOT_CONTENT_DELAY_MS])

  useEffect(() => {
    if (!overlayDismissing) return
    const timerId = window.setTimeout(() => {
      setShowBootOverlay(false)
    }, 350)
    return () => window.clearTimeout(timerId)
  }, [overlayDismissing])

  useEffect(() => {
    if (showBootOverlay) return
    const frameId = window.requestAnimationFrame(() => {
      setShowAppContent(true)
    })
    return () => window.cancelAnimationFrame(frameId)
  }, [showBootOverlay])

  return (
    <div className="relative min-h-screen">
      {mounted ? (
        <div
          className={`transition-opacity duration-300 ease-out ${
            showAppContent ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden={!showAppContent}
        >
          <TelegramProvider>
            <App onInitialContentReady={() => setIsAppReady(true)} />
          </TelegramProvider>
        </div>
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
              animation: `boot-bg-fade ${BOOT_BG_FADE_MS}ms ease-out ${BOOT_BG_FADE_DELAY_MS}ms forwards`,
            }}
          />
          <div
            className={`relative min-h-screen flex items-center justify-center p-6 transition-opacity duration-250 ease-out ${
              overlayDismissing ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="w-full max-w-[220px] rounded-2xl border border-border/60 bg-background/80 px-4 py-3 shadow-lg backdrop-blur-xl">
              <div className="text-center text-sm font-semibold text-foreground">BMemory</div>
              <div className="mt-2.5 relative h-2 overflow-hidden rounded-full bg-muted/35">
                <motion.div
                  aria-hidden="true"
                  className="absolute inset-y-0 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                  initial={{ left: '-40%', width: '40%' }}
                  animate={{ left: ['-40%', '100%'] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


