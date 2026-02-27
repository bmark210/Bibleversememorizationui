import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { Translation } from "@/generated/prisma";

type TelegramInitPayload = {
  telegramId?: string;
  translation?: string;
};

const VALID_TRANSLATIONS: Translation[] = [
  Translation.NRT,
  Translation.SYNOD,
  Translation.RBS2,
  Translation.BTI,
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Инициализирует пользователя при входе из Telegram, позволяет указать перевод.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as TelegramInitPayload;
    const { telegramId, translation } = body ?? {};

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existing) {
      return res.status(200).json(existing);
    }

    let validTranslation: Translation | undefined;
    if (translation) {
      if (VALID_TRANSLATIONS.includes(translation as Translation)) {
        validTranslation = translation as Translation;
      } else {
        return res.status(400).json({
          error: `Invalid translation. Must be one of: ${VALID_TRANSLATIONS.join(", ")}`,
        });
      }
    }

    const payload = {
      telegramId,
      ...(validTranslation ? { translation: validTranslation } : {}),
    };

    const created = await prisma.user.create({ data: payload });
    return res.status(201).json(created);
  } catch (error) {
    console.error("Error in telegram route:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
