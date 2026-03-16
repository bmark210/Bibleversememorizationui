import type { NextApiRequest, NextApiResponse } from "next";
import { isAdminTelegramId } from "@/lib/admins";
import {
  countFeedback,
  createFeedback,
  getFeedbackPage,
} from "@/modules/feedback/infrastructure/feedbackRepository";
import { userExists } from "@/modules/users/infrastructure/userRepository";
import { getTelegramAvatarProxyUrl } from "@/app/api/lib/telegramAvatar";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

const DEFAULT_PAGE_LIMIT = 20;
const MAX_PAGE_LIMIT = 50;
const MAX_FEEDBACK_TEXT_LENGTH = 2000;

type CreateFeedbackPayload = {
  telegramId?: string;
  text?: string;
};

function getSingleValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveRequesterTelegramId(req: NextApiRequest): string {
  const fromQuery = getSingleValue(req.query.telegramId);
  if (fromQuery) return fromQuery;

  const fromHeader = getSingleValue(req.headers["x-telegram-id"]);
  if (fromHeader) return fromHeader;

  return "";
}

function parsePositiveInteger(
  value: string | string[] | undefined,
  fallback: number,
  options?: { min?: number; max?: number }
): number {
  const numeric = Number.parseInt(getSingleValue(value), 10);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  const min = options?.min ?? 0;
  const max = options?.max ?? Number.POSITIVE_INFINITY;
  return Math.max(min, Math.min(max, Math.round(numeric)));
}

function toFeedbackResponse(feedback: Awaited<ReturnType<typeof createFeedback>>) {
  return {
    id: feedback.id,
    telegramId: feedback.telegramId,
    text: feedback.text,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
    user: {
      telegramId: feedback.user.telegramId,
      name: feedback.user.name,
      nickname: feedback.user.nickname,
      avatarUrl: getTelegramAvatarProxyUrl(feedback.user.telegramId),
    },
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "POST") {
    return handlePost(req, res);
  }

  if (req.method === "GET") {
    return handleGet(req, res);
  }

  res.setHeader("Allow", "GET, POST");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handlePost(req: NextApiRequest, res: NextApiResponse) {
  try {
    const body = (req.body ?? {}) as CreateFeedbackPayload;
    const telegramId = String(body.telegramId ?? "").trim();
    const text = typeof body.text === "string" ? body.text.trim() : "";

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    if (text.length > MAX_FEEDBACK_TEXT_LENGTH) {
      return res.status(400).json({
        error: `text must be at most ${MAX_FEEDBACK_TEXT_LENGTH} characters`,
      });
    }

    const exists = await userExists(telegramId);
    if (!exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const feedback = await createFeedback({
      telegramId,
      text,
    });

    return res.status(201).json(toFeedbackResponse(feedback));
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

async function handleGet(req: NextApiRequest, res: NextApiResponse) {
  const requesterTelegramId = resolveRequesterTelegramId(req);
  if (!isAdminTelegramId(requesterTelegramId)) {
    return res.status(403).json({ error: "Admin access required" });
  }

  try {
    const limit = parsePositiveInteger(req.query.limit, DEFAULT_PAGE_LIMIT, {
      min: 1,
      max: MAX_PAGE_LIMIT,
    });
    const startWith = parsePositiveInteger(req.query.startWith, 0, {
      min: 0,
    });

    const [items, totalCount] = await Promise.all([
      getFeedbackPage({
        startWith,
        limit,
      }),
      countFeedback(),
    ]);

    return res.status(200).json({
      items: items.map(toFeedbackResponse),
      totalCount,
      limit,
      startWith,
    });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
