/**
 * Базовый URL Go API (Railway). Без завершающего слэша.
 *
 * Пустая строка → относительные пути `/api/...` (тот же хост, что и UI).
 * На Netlify в production для таких запросов срабатывает rewrite на Railway в `next.config.mjs`
 * (без CORS между браузером и Railway).
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
