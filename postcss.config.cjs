/**
 * PostCSS Configuration (Next.js)
 *
 * Tailwind CSS v4 — `@tailwindcss/postcss`.
 * Локальный плагин — `postcss.fix-oklch.cjs` (Telegram WebView / oklch fallbacks).
 *
 * Next (webpack) принимает плагины только как строки (имя пакета или путь).
 * Относительный `./postcss.fix-oklch.cjs` в dev с Turbopack резолвится из `.next` и ломается;
 * `path.resolve(process.cwd(), ...)` даёт абсолютный путь в рантайме и проходит и webpack, и Turbopack.
 */
// const path = require("path");

// const oklchFixPluginPath = path.resolve(process.cwd(), "postcss.fix-oklch.cjs");

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
    // [oklchFixPluginPath]: {},
  },
};
