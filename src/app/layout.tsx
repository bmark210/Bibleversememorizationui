import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'
import { Inter, Literata } from 'next/font/google'

import { DisableViewportZoom } from './components/DisableViewportZoom'
import './globals.css'

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-inter',
})

const literata = Literata({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-literata',
})

export const metadata: Metadata = {
  title: 'Заучивание библейских стихов',
  description: 'Приложение для заучивания и повторения библейских стихов',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="ru"
      className={`${inter.variable} ${literata.variable}`}
    >
      <head>
      <meta name="color-scheme" content="light dark" />
      {/* Plain <script> (not next/script) — beforeInteractive Script in <head> caused
          a server/client hydration mismatch that broke react-virtuoso layout on Android. */}
      <script src="https://telegram.org/js/telegram-web-app.js"></script>
      {/* Применяем сохранённую тему ДО загрузки React. Если пользователь ещё не выбирал тему, берём Telegram/WebApp theme. */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){try{
  var stored=localStorage.getItem('theme');
  var telegramTheme=window.Telegram&&window.Telegram.WebApp&&(window.Telegram.WebApp.colorScheme==='dark'||window.Telegram.WebApp.colorScheme==='light')
    ? window.Telegram.WebApp.colorScheme
    : null;
  var theme=(stored==='light'||stored==='dark')?stored:(telegramTheme||'light');
  var root=document.documentElement;
  root.setAttribute('data-theme',theme);
  root.setAttribute('data-app-booting','true');
  root.classList.remove('light','dark');
  root.classList.add(theme);
  root.style.colorScheme=theme;
}catch(e){}}());
      `}} />
      </head>
      <body className="text-foreground">
        <DisableViewportZoom />
        <div className="app-scroll">
          {children}
        </div>
      </body>
    </html>
  )
}


