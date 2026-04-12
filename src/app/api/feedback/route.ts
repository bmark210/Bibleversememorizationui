import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FEEDBACK_EMAIL,
  FEEDBACK_FORMSUBMIT_FORM_ID,
  FEEDBACK_SUBJECT,
  MAX_FEEDBACK_LENGTH,
} from "@/app/lib/feedbackConfig";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FORMSUBMIT_ENDPOINT = `https://formsubmit.co/ajax/${FEEDBACK_FORMSUBMIT_FORM_ID}`;
const FEEDBACK_REQUEST_TIMEOUT_MS = 10_000;

const feedbackSchema = z.object({
  message: z.string().trim().min(1).max(MAX_FEEDBACK_LENGTH),
  telegramId: z.string().trim().max(64).nullish(),
  firstName: z.string().trim().max(120).nullish(),
  lastName: z.string().trim().max(120).nullish(),
  username: z.string().trim().max(120).nullish(),
});

function normalizeOptional(value?: string | null) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function buildSenderName(input: z.infer<typeof feedbackSchema>) {
  const displayName = [input.firstName, input.lastName]
    .map((value) => normalizeOptional(value))
    .filter(Boolean)
    .join(" ")
    .trim();

  if (displayName) {
    return displayName;
  }

  const username = normalizeOptional(input.username)?.replace(/^@+/, "");
  if (username) {
    return `@${username}`;
  }

  const telegramId = normalizeOptional(input.telegramId);
  if (telegramId) {
    return `Telegram ID ${telegramId}`;
  }

  return "Пользователь Bible Memory";
}

function buildFormSubmitPayload(input: z.infer<typeof feedbackSchema>) {
  const params = new URLSearchParams();
  const displayName = [input.firstName, input.lastName]
    .map((value) => normalizeOptional(value))
    .filter(Boolean)
    .join(" ")
    .trim();
  const username = normalizeOptional(input.username)?.replace(/^@+/, "");
  const telegramId = normalizeOptional(input.telegramId);

  params.set("name", buildSenderName(input));
  params.set("message", input.message);
  params.set("telegram_name", displayName || "Не указано");
  params.set("telegram_username", username ? `@${username}` : "Не указан");
  params.set("telegram_id", telegramId ?? "Не указан");
  params.set("source", "Bible Memory Telegram WebApp");
  params.set("submitted_at", new Date().toISOString());
  params.set("_subject", FEEDBACK_SUBJECT);
  params.set("_template", "table");
  params.set("_captcha", "false");
  params.set("_honey", "");

  return params;
}

function resolveRequestOrigin(request: Request) {
  const requestUrl = new URL(request.url);
  const originHeader = request.headers.get("origin")?.trim();
  const refererHeader = request.headers.get("referer")?.trim();

  const refererOrigin = refererHeader
    ? (() => {
        try {
          return new URL(refererHeader).origin;
        } catch {
          return null;
        }
      })()
    : null;

  return originHeader || refererOrigin || requestUrl.origin;
}

export async function POST(request: Request) {
  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Некорректный JSON в запросе." },
      { status: 400 },
    );
  }

  const parsed = feedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { message: "Проверьте текст сообщения и повторите попытку." },
      { status: 400 },
    );
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    FEEDBACK_REQUEST_TIMEOUT_MS,
  );
  const requestOrigin = resolveRequestOrigin(request);

  try {
    const response = await fetch(FORMSUBMIT_ENDPOINT, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: requestOrigin,
        Referer: `${requestOrigin}/`,
      },
      body: buildFormSubmitPayload(parsed.data).toString(),
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error("Feedback provider rejected request", {
        status: response.status,
        body: responseBody,
      });

      return NextResponse.json(
        {
          message:
            "Сервис отправки временно недоступен. Попробуйте ещё раз чуть позже.",
        },
        { status: 502 },
      );
    }

    const result = (await response.json().catch(() => null)) as
      | { success?: boolean | string; message?: string }
      | null;
    const isSuccess =
      result?.success === true || result?.success === "true";

    if (!isSuccess) {
      const providerMessage = String(result?.message ?? "").trim();
      const requiresActivation = providerMessage
        .toLowerCase()
        .includes("activation");

      return NextResponse.json(
        {
          message: requiresActivation
            ? "Почтовый адрес ещё не активирован в FormSubmit. На почту уже отправлено письмо с ссылкой Activate Form. Откройте его и активируйте форму."
            : providerMessage ||
              "Сервис отправки не подтвердил доставку. Попробуйте ещё раз.",
        },
        { status: requiresActivation ? 424 : 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Сообщение отправлено.",
      recipient: FEEDBACK_EMAIL,
    });
  } catch (error) {
    const isAbortError =
      error instanceof Error && error.name === "AbortError";

    console.error("Feedback request failed", error);

    return NextResponse.json(
      {
        message: isAbortError
          ? "Сервис отправки не ответил вовремя. Попробуйте ещё раз."
          : "Не удалось отправить сообщение. Попробуйте ещё раз.",
      },
      { status: isAbortError ? 504 : 500 },
    );
  } finally {
    clearTimeout(timeoutId);
  }
}
