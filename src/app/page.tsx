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
      <div className="relative min-h-screen bg-bg-app">
        <AppVersionCorner />
      </div>
    )
  }

  if (!ALLOW_BROWSER_RUNTIME && isTelegramWebApp === false) {
    return (
      <div className="relative min-h-screen bg-bg-app px-5 py-8 text-text-primary sm:px-6">
        <div className="mx-auto flex min-h-[calc(100vh-4rem)] w-full max-w-md items-center">
          <div className="w-full overflow-hidden rounded-[2rem] border border-border-subtle bg-bg-overlay shadow-[var(--shadow-floating)] backdrop-blur-2xl">
            <img
              src={TELEGRAM_BOT_PREVIEW_IMAGE_URL}
              alt="Bible Memory bot preview"
              className="h-72 w-full object-cover"
            />
            <div className="space-y-4 p-5">
              <h1 className="[font-family:var(--font-heading)] text-2xl font-semibold tracking-tight text-brand-primary">Откройте приложение в Telegram</h1>
              <p className="text-sm leading-relaxed text-text-secondary">
                Браузерная версия отключена. Перейдите в Telegram-бота, чтобы продолжить.
              </p>
              <a
                href={TELEGRAM_BOT_URL}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex w-full items-center justify-center rounded-2xl border border-brand-primary bg-brand-primary px-4 py-3 text-sm font-semibold text-brand-primary-foreground transition hover:bg-brand-primary-hover"
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
            className="absolute inset-0 bg-bg-app"
            style={{
              animation: `boot-bg-fade ${BOOT_BG_FADE_MS}ms ease-out ${BOOT_BG_FADE_DELAY_MS}ms forwards`,
            }}
          />
          <div
            className={`relative min-h-screen flex items-center justify-center p-6 transition-opacity duration-250 ease-out ${
              overlayDismissing ? 'opacity-0' : 'opacity-100'
            }`}
          >
            <div className="w-full max-w-[260px] rounded-[2rem] border border-border-subtle bg-bg-overlay px-5 py-4 shadow-[var(--shadow-floating)] backdrop-blur-2xl">
              <div className="flex flex-col items-center gap-3">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.35rem] border border-brand-primary/20 bg-status-mastered-soft">
                  <BookOpen className="h-7 w-7 stroke-[1.8px] text-brand-primary" />
                </div>
                <div className="space-y-1 text-center">
                  <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                    Sacred Memory
                  </div>
                  <h1 className="[font-family:var(--font-heading)] text-2xl font-semibold tracking-tight text-brand-primary">
                    Bible Memory
                  </h1>
                </div>
              </div>
              <div className="relative mt-4 h-2 overflow-hidden rounded-full bg-bg-subtle">
                <div
                  aria-hidden="true"
                  className="boot-progress-indicator absolute inset-y-0 rounded-full bg-brand-primary shadow-[var(--shadow-soft)]"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

