'use client'

import '@/app/lib/apiClientInit'
import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
import App from './App'
import { TelegramProvider } from './contexts/TelegramContext'
import { BookOpen } from 'lucide-react'
import { getTelegramWebApp } from './lib/telegramWebApp'

const TelegramDevPanel =
  process.env.NODE_ENV === 'development'
    ? dynamic(
        () => import('./components/dev/TelegramDevPanel').then((module) => module.TelegramDevPanel),
        { ssr: false }
      )
    : function EmptyTelegramDevPanel() {
        return null
      }

const TELEGRAM_BOT_URL = 'https://t.me/bible_memory_bot'
const TELEGRAM_BOT_PREVIEW_IMAGE_URL =
  'https://i.pinimg.com/1200x/48/6d/10/486d103eecd526147782d71318fb620e.jpg'
const ALLOW_BROWSER_RUNTIME =
  process.env.NODE_ENV === 'development' ||
  process.env.NEXT_PUBLIC_ALLOW_BROWSER_RUNTIME === '1'

const APP_VERSION_DISPLAY = '3.1'

function AppVersionCorner() {
  return (
    <p
      className="pointer-events-none fixed z-[100] select-none rounded-md bg-background/35 px-2 py-1 text-[11px] tabular-nums text-foreground/80 backdrop-blur-sm"
      style={{
        top: 'max(1rem, env(safe-area-inset-top, 0px))',
        right: 'max(1rem, env(safe-area-inset-right, 0px))',
      }}
      aria-label={`Версия ${APP_VERSION_DISPLAY}`}
    >
      v{APP_VERSION_DISPLAY}
    </p>
  )
}

export default function Page() {
  const BOOT_CONTENT_DELAY_MS = 450
  const BOOT_BG_FADE_MS = 650
  const BOOT_BG_FADE_DELAY_MS = 200
  const [mounted, setMounted] = useState(false)
  const [isTelegramWebApp, setIsTelegramWebApp] = useState<boolean | null>(null)
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
    if (typeof window === 'undefined') return
    const hasTelegramWebApp = Boolean(getTelegramWebApp())
    setIsTelegramWebApp(hasTelegramWebApp)
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

  if (!ALLOW_BROWSER_RUNTIME && isTelegramWebApp === null) {
    return (
      <div className="relative min-h-screen bg-[#3e3428]">
        <AppVersionCorner />
      </div>
    )
  }

  if (!ALLOW_BROWSER_RUNTIME && isTelegramWebApp === false) {
    return (
      <div className="relative min-h-screen bg-[#3e3428] px-5 py-8 text-[#f8f4ec] sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
          <div className="w-full overflow-hidden rounded-3xl border border-[#f8f4ec]/20 bg-black/20 shadow-2xl backdrop-blur-sm">
            <img
              src={TELEGRAM_BOT_PREVIEW_IMAGE_URL}
              alt="Bible Memory bot preview"
              className="h-72 w-full object-cover"
            />
            <div className="space-y-4 p-5">
              <h1 className="text-xl font-semibold">Откройте приложение в Telegram</h1>
              <p className="text-sm text-[#f8f4ec]/85">
                Браузерная версия отключена. Перейдите в Telegram-бота, чтобы продолжить.
              </p>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-full items-center justify-center rounded-xl bg-[#f8f4ec] px-4 py-2.5 text-sm font-semibold text-[#2c251d] transition hover:bg-white"
              >
                Перейти в @bible_memory_bot
              </a>
            </div>
          </div>
        </div>
      </div>
    )
  }

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
          <TelegramDevPanel />
        </div>
      ) : null}

      {showBootOverlay && (
        <div
        className={`absolute inset-0 z-50 transition-opacity duration-300 ease-out ${
          overlayDismissing ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          aria-hidden={overlayDismissing}
          >
          <AppVersionCorner />
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
            <div className="w-full max-w-[220px] rounded-2xl border border-border/70 bg-gradient-to-r from-background via-background to-amber-500/5 px-4 py-3 shadow-lg backdrop-blur-xl">
              <div className="flex flex-col items-center gap-3">
                <BookOpen className="h-10 w-10 stroke-[1.8px] text-primary" />
                <h1 className="text-xl font-semibold text-primary">Bible Memory</h1>
              </div>
              <div className="relative mt-2.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  aria-hidden="true"
                  className="boot-progress-indicator absolute inset-y-0 rounded-full bg-primary/80 shadow-[0_0_10px_rgba(0,0,0,0.08)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

