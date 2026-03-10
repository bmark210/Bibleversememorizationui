/**
 * PostCSS Configuration (Next.js)
 *
 * Tailwind CSS v4 интегрируется через PostCSS-плагин `@tailwindcss/postcss`.
 *
 * postcss-fix-oklch: Tailwind v4 генерирует color-mix(in oklch, ...) для ВСЕХ
 * opacity-модификаторов (bg-primary/10, from-amber-500/15 и т.д.).
 * Это не поддерживается в Safari iOS < 16.2 и Android WebView < Chrome 111,
 * из-за чего все полупрозрачные цвета в Telegram WebView выглядят сломанными.
 *
 * Решение: переписываем fallback-декларации Tailwind, которые стоят перед `@supports`,
 * чтобы старые браузеры получали rgba(...), а современные продолжали использовать color-mix(...).
 * Требует --color-{name}-rgb переменных в CSS (определены в tailwind.css и theme.css).
 */
export default {
  plugins: {
    '@tailwindcss/postcss': {},
    './postcss.fix-oklch.cjs': true,
  },
};
