import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Translation } from "@/generated/prisma/enums";

type CreateUserPayload = {
  telegramId?: string;
  translation?: string;
};

const ALLOWED_TRANSLATIONS: Translation[] = Object.values(Translation);
const normalizeTranslation = (value?: string): Translation | undefined => {
  if (!value) return undefined;
  return ALLOWED_TRANSLATIONS.includes(value as Translation)
    ? (value as Translation)
    : undefined;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Создаём или обновляем пользователя по telegramId.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as CreateUserPayload;
    const { telegramId, translation } = body ?? {};
    const translationValue = normalizeTranslation(translation);

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    const user = await prisma.user.upsert({
      where: { telegramId },
      update: {
        ...(translationValue ? { translation: translationValue } : {}),
      },
      create: {
        telegramId,
        ...(translationValue ? { translation: translationValue } : {}),
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
