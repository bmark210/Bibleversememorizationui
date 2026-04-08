import { NEXT_PUBLIC_API_BASE_URL as DEFAULT_PUBLIC_API_BASE_URL } from "../../environment";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Возвращает базовый URL внешнего Go API.
 * Приоритет:
 * 1. `NEXT_PUBLIC_API_BASE_URL`
 * 2. локальный fallback из `environment/dev.ts`
 * 3. пустая строка -> same-origin `/api`
 *
 * На hosted preview/prod сборках API base должен задаваться явно через
 * `NEXT_PUBLIC_API_BASE_URL`, иначе запросы пойдут в same-origin.
 */
export function getPublicApiBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (override) {
    return normalizeBaseUrl(override);
  }

  return normalizeBaseUrl(DEFAULT_PUBLIC_API_BASE_URL);
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicApiBaseUrl()}${p}`;
}
