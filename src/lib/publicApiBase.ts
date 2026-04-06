import { NEXT_PUBLIC_API_BASE_URL as DEFAULT_PUBLIC_API_BASE_URL } from "../../environment";

function normalizeBaseUrl(value: string): string {
  return value.replace(/\/+$/, "");
}

/**
 * Возвращает базовый URL внешнего Go API.
 * По умолчанию URL берётся из `environment/dev.ts` или `environment/prod.ts`.
 * Для локальной разработки его можно переопределить через `NEXT_PUBLIC_API_BASE_URL`.
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
