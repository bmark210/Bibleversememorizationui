import { ExternalApiError } from "@/shared/errors/AppError";
import { err, ok, type Result } from "@/shared/types/Result";

export const HELLOAO_API_BASE_URL = "https://bible.helloao.org/api";

const TIMEOUT_MS = 5000;
const MAX_RETRIES = 2;

export type HelloaoAvailableTranslationsPayload = {
  translations?: HelloaoTranslationInfo[];
};

export type HelloaoBooksPayload = {
  books?: HelloaoBookInfo[];
};

export type HelloaoChapterContentItem = {
  type?: string;
  number?: number | string;
  content?: unknown;
};

export type HelloaoChapterPayload = {
  chapter?: {
    number?: number;
    content?: HelloaoChapterContentItem[];
  };
};

export type HelloaoCompleteBook = {
  order?: number;
  chapters?: Array<{
    chapter?: {
      number?: number;
      content?: HelloaoChapterContentItem[];
    };
  }>;
};

export type HelloaoCompletePayload = {
  books?: HelloaoCompleteBook[];
};

export interface HelloaoTranslationInfo {
  id: string;
  name: string;
  shortName?: string;
  englishName?: string;
  language?: string;
  textDirection?: "rtl" | "ltr";
  [key: string]: unknown;
}

export interface HelloaoBookInfo {
  id: string;
  order: number;
  name: string;
  numberOfChapters: number;
  [key: string]: unknown;
}

type FetchHelloaoJsonParams = {
  url: string;
  resourceLabel: string;
  signal?: AbortSignal;
};

function isAbortError(error: unknown): error is DOMException {
  return error instanceof DOMException && error.name === "AbortError";
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return "request failed";
}

function linkAbortSignal(
  sourceSignal: AbortSignal | undefined,
  targetController: AbortController
): () => void {
  if (!sourceSignal) {
    return () => undefined;
  }

  if (sourceSignal.aborted) {
    targetController.abort();
    return () => undefined;
  }

  const handleAbort = () => {
    targetController.abort();
  };

  sourceSignal.addEventListener("abort", handleAbort, { once: true });

  return () => {
    sourceSignal.removeEventListener("abort", handleAbort);
  };
}

async function fetchHelloaoJsonOnce<T>({
  url,
  resourceLabel,
  signal,
}: FetchHelloaoJsonParams): Promise<Result<T, ExternalApiError>> {
  const controller = new AbortController();
  const unlinkAbort = linkAbortSignal(signal, controller);
  let didTimeout = false;

  const timeoutId = setTimeout(() => {
    didTimeout = true;
    controller.abort();
  }, TIMEOUT_MS);

  try {
    const response = await fetch(url, { signal: controller.signal });

    if (!response.ok) {
      return err(
        new ExternalApiError(
          `HelloAO unavailable: ${resourceLabel} (HTTP ${response.status})`
        )
      );
    }

    const payload = (await response.json()) as T;
    return ok(payload);
  } catch (error) {
    if (signal?.aborted && isAbortError(error)) {
      throw error;
    }

    const reason = didTimeout
      ? `timed out after ${TIMEOUT_MS}ms`
      : getErrorMessage(error);

    return err(
      new ExternalApiError(`HelloAO unavailable: ${resourceLabel} (${reason})`)
    );
  } finally {
    clearTimeout(timeoutId);
    unlinkAbort();
  }
}

export async function fetchHelloaoJson<T>(
  params: FetchHelloaoJsonParams
): Promise<Result<T, ExternalApiError>> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetchHelloaoJsonOnce<T>(params);
    if (response.success || attempt === MAX_RETRIES) {
      return response;
    }
  }

  return err(new ExternalApiError(`HelloAO unavailable: ${params.resourceLabel}`));
}
