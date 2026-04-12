import { NextResponse } from "next/server";
import { z } from "zod";
import {
  FEEDBACK_ATTACHMENT_FIELD,
  FEEDBACK_EMAIL,
  FEEDBACK_FORMSUBMIT_FORM_ID,
  FEEDBACK_MAX_ATTACHMENT_BYTES,
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

type FeedbackInput = z.infer<typeof feedbackSchema> & {
  attachment: File | null;
};

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

function buildFormSubmitPayload(input: FeedbackInput) {
  const params = new FormData();
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

  if (input.attachment) {
    params.append(
      FEEDBACK_ATTACHMENT_FIELD,
      input.attachment,
      input.attachment.name,
    );
  }

  return params;
}

function parseFormField(
  formData: FormData,
  fieldName: keyof z.infer<typeof feedbackSchema>,
) {
  const value = formData.get(fieldName);
  return typeof value === "string" ? value : undefined;
}

function validateAttachment(attachment: File | null) {
  if (!attachment) {
    return null;
  }

  if (!attachment.type.startsWith("image/")) {
    return "Можно прикрепить только одну фотографию.";
  }

  if (attachment.size > FEEDBACK_MAX_ATTACHMENT_BYTES) {
    return "Фотография слишком большая. Максимум 10 MB.";
  }

  return null;
}

async function parseFeedbackRequest(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return {
        error: NextResponse.json(
          { message: "Не удалось прочитать форму." },
          { status: 400 },
        ),
      };
    }

    const attachmentValue = formData.get(FEEDBACK_ATTACHMENT_FIELD);
    const attachment =
      attachmentValue instanceof File && attachmentValue.size > 0
        ? attachmentValue
        : null;

    const attachmentError = validateAttachment(attachment);
    if (attachmentError) {
      return {
        error: NextResponse.json(
          { message: attachmentError },
          { status: 400 },
        ),
      };
    }

    const parsed = feedbackSchema.safeParse({
      message: parseFormField(formData, "message"),
      telegramId: parseFormField(formData, "telegramId"),
      firstName: parseFormField(formData, "firstName"),
      lastName: parseFormField(formData, "lastName"),
      username: parseFormField(formData, "username"),
    });

    if (!parsed.success) {
      return {
        error: NextResponse.json(
          { message: "Проверьте текст сообщения и повторите попытку." },
          { status: 400 },
        ),
      };
    }

    return {
      data: {
        ...parsed.data,
        attachment,
      } satisfies FeedbackInput,
    };
  }

  let payload: unknown;

  try {
    payload = await request.json();
  } catch {
    return {
      error: NextResponse.json(
        { message: "Некорректный JSON в запросе." },
        { status: 400 },
      ),
    };
  }

  const parsed = feedbackSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      error: NextResponse.json(
        { message: "Проверьте текст сообщения и повторите попытку." },
        { status: 400 },
      ),
    };
  }

  return {
    data: {
      ...parsed.data,
      attachment: null,
    } satisfies FeedbackInput,
  };
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
  const parsedRequest = await parseFeedbackRequest(request);
  if (parsedRequest.error) {
    return parsedRequest.error;
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
        Origin: requestOrigin,
        Referer: `${requestOrigin}/`,
      },
      body: buildFormSubmitPayload(parsedRequest.data),
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
