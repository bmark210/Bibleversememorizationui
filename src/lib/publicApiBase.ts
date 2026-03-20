const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

/**
 * Базовый URL Go API (Railway). Без завершающего слэша.
 *
 * Основной источник: `NEXT_PUBLIC_API_BASE_URL`.
 * Дополнительная защита: в production helper сам подставляет Railway fallback,
 * даже если клиентский env в конкретной сборке оказался пустым.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const resolved =
    raw ||
    (process.env.NODE_ENV === "production" ? PRODUCTION_GO_API_DEFAULT : "");
  if (!resolved) return "";
  return resolved.replace(/\/+$/, "");
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}
