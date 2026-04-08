import { NEXT_PUBLIC_API_BASE_URL as DEFAULT_PUBLIC_API_BASE_URL } from "../../environment";

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith("//")) {
    return `https:${trimmed}`;
  }

  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(trimmed)) {
    return `http://${trimmed}`;
  }

  if (/^[a-z0-9.-]+(?::\d+)?$/i.test(trimmed)) {
    return `https://${trimmed}`;
  }

  return trimmed;
}

function getCandidateBaseUrl(): string {
  const override = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  if (override) {
    return override;
  }

  return DEFAULT_PUBLIC_API_BASE_URL;
}

function normalizeOrigin(value: string): string {
  return value.replace(/\/+$/, "");
}

function getConfiguredWebAppOrigin(): string | null {
  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeOrigin(window.location.origin);
  }

  const explicitAppUrl =
    process.env.APP_URL?.trim() ||
    process.env.URL?.trim() ||
    process.env.DEPLOY_URL?.trim() ||
    (process.env.VERCEL_URL?.trim()
      ? `https://${process.env.VERCEL_URL.trim()}`
      : "");

  if (!explicitAppUrl) {
    return null;
  }

  try {
    return normalizeOrigin(new URL(explicitAppUrl).origin);
  } catch {
    return null;
  }
}

function validateExternalApiBaseUrl(baseUrl: string): string | null {
  if (!baseUrl) {
    return "NEXT_PUBLIC_API_BASE_URL is not configured.";
  }

  let apiUrl: URL;
  try {
    apiUrl = new URL(baseUrl);
  } catch {
    return "NEXT_PUBLIC_API_BASE_URL must be an absolute URL.";
  }

  if (!/^https?:$/i.test(apiUrl.protocol)) {
    return "NEXT_PUBLIC_API_BASE_URL must use http:// or https://.";
  }

  const appOrigin = getConfiguredWebAppOrigin();
  if (appOrigin && normalizeOrigin(apiUrl.origin) === appOrigin) {
    return "NEXT_PUBLIC_API_BASE_URL must point to the external backend service, not the frontend app URL.";
  }

  return null;
}

export function tryGetPublicApiBaseUrl(): string | null {
  const normalized = normalizeBaseUrl(getCandidateBaseUrl());
  const validationError = validateExternalApiBaseUrl(normalized);
  if (validationError) {
    return null;
  }

  return normalized;
}

/**
 * Возвращает базовый URL внешнего Go API.
 * Приоритет:
 * 1. `NEXT_PUBLIC_API_BASE_URL`
 * 2. локальный fallback из `environment/dev.ts`
 *
 * Важно:
 * - same-origin fallback здесь запрещён
 * - frontend должен ходить только во внешний backend URL
 */
export function getPublicApiBaseUrl(): string {
  const baseUrl = tryGetPublicApiBaseUrl();
  if (baseUrl) {
    return baseUrl;
  }

  const normalized = normalizeBaseUrl(getCandidateBaseUrl());
  const validationError =
    validateExternalApiBaseUrl(normalized) ??
    "NEXT_PUBLIC_API_BASE_URL is not configured.";

  throw new Error(validationError);
}

/** Абсолютный URL к эндпоинту API; path должен начинаться с `/`. */
export function publicApiUrl(path: string): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${getPublicApiBaseUrl()}${p}`;
}
