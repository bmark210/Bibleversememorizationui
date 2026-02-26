'use client'

import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { BookOpen } from 'lucide-react'
import App from './App'
import { TelegramProvider } from './contexts/TelegramContext'

export default function Page() {
  const BOOT_CONTENT_DELAY_MS = 450
  const BOOT_BG_FADE_MS = 650
  const BOOT_BG_FADE_DELAY_MS = 180
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
            <div className="flex flex-col items-center gap-6 max-w-[280px]">
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                className="relative"
              >
                {/* <div className="rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/20">
                  <BookOpen className="h-9 w-9 text-primary" strokeWidth={1.5} />
                </div> */}
                <motion.div
                  className="absolute -inset-1.5 rounded-2xl bg-primary/5"
                  animate={{ scale: [1, 1.18, 1], opacity: [0.4, 0, 0.4] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>

              <motion.div
                className="flex flex-col items-center gap-1"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.12, ease: 'easeOut' }}
              >
                <h2 className="text-xl font-semibold tracking-tight text-foreground">BMemory</h2>
                {/* <p className="text-[0.7rem] text-muted-foreground">Слово Твоё в сердце моём</p> */}
              </motion.div>

              {/* <motion.blockquote
                className="text-center px-2"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.3, ease: 'easeOut' }}
              >
                <p className="text-[0.8rem] leading-relaxed italic text-foreground/80">
                  «В сердце моём сокрыл я слово Твоё, чтобы не грешить пред Тобою»
                </p>
                <cite className="mt-1.5 block text-[0.68rem] not-italic text-muted-foreground">
                  Псалом 118:11
                </cite>
              </motion.blockquote> */}

              <motion.div
                className="w-32"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 }}
              >
                <div className="relative h-1.5 overflow-hidden rounded-full bg-muted/30">
                  <motion.div
                    aria-hidden="true"
                    className="absolute inset-y-0 rounded-full bg-primary/70"
                    initial={{ left: '-40%', width: '40%' }}
                    animate={{ left: ['-40%', '100%'] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: [0.4, 0, 0.2, 1] }}
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


