const PRODUCTION_GO_API_DEFAULT =
  "https://bible-memory-db-production.up.railway.app";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

function isSameOriginApiExplicitlyEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_USE_SAME_ORIGIN_API?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes";
}

/**
 * Возвращает базовый URL внешнего Go API.
 *
 * Правило:
 * - если задан непустой `NEXT_PUBLIC_API_BASE_URL`, используем его;
 * - если явно включён `NEXT_PUBLIC_USE_SAME_ORIGIN_API=true`, возвращаем "";
 * - в production по умолчанию всегда используем внешний Railway backend;
 * - в development по умолчанию оставляем относительный `/api/...`.
 *
 * Это защищает production-сборку от случайного пустого `NEXT_PUBLIC_API_BASE_URL`,
 * из-за которого Netlify начал бы слать запросы на сам себя.
 */
export function getPublicApiBaseUrl(): string {
  const raw = process.env.NEXT_PUBLIC_API_BASE_URL;
  if (typeof raw === "string" && raw.trim()) {
    return normalizeBaseUrl(raw.trim());
  }

  if (isSameOriginApiExplicitlyEnabled()) {
    return "";
  }

  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_GO_API_DEFAULT;
  }

  return "";
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const base = getPublicApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  if (!base) return p;
  return `${base}${p}`;
}

export { PRODUCTION_GO_API_DEFAULT };
