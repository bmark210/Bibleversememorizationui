import type { NextApiRequest, NextApiResponse } from "next";
import { Translation } from "@/generated/prisma";
import {
  upsertUserByTelegramId,
} from "@/modules/users/infrastructure/userRepository";
import { resolveTelegramAvatarUrl } from "@/app/api/lib/telegramAvatar";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type TelegramInitPayload = {
  telegramId?: string;
  translation?: string;
  name?: string | null;
  nickname?: string | null;
  avatarUrl?: string | null;
};

const VALID_TRANSLATIONS: Translation[] = [
  Translation.NRT,
  Translation.SYNOD,
  Translation.RBS2,
  Translation.BTI,
];

const TRANSLATION_ALIASES: Record<string, Translation> = {
  RUS_SYN: Translation.SYNOD,
};

function normalizeTranslationInput(value?: string): Translation | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  const aliasValue = TRANSLATION_ALIASES[normalized.toUpperCase()];
  if (aliasValue) return aliasValue;
  if (VALID_TRANSLATIONS.includes(normalized as Translation)) {
    return normalized as Translation;
  }
  return undefined;
}

function normalizeOptionalString(value?: string): string | undefined {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Инициализирует пользователя при входе из Telegram, позволяет указать перевод.
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    const body = req.body as TelegramInitPayload;
    const { telegramId, translation, name, nickname, avatarUrl } = body ?? {};

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    let validTranslation: Translation | undefined;
    if (translation) {
      const normalizedTranslation = normalizeTranslationInput(translation);
      if (normalizedTranslation) {
        validTranslation = normalizedTranslation;
      } else {
        return res.status(400).json({
          error: `Invalid translation. Must be one of: ${VALID_TRANSLATIONS.join(", ")}, RUS_SYN`,
        });
      }
    }

    const nameValue = normalizeOptionalString(name);
    const nicknameValue = normalizeOptionalString(nickname);
    const avatarUrlValue = await resolveTelegramAvatarUrl(telegramId, avatarUrl);

    const user = await upsertUserByTelegramId({
      telegramId,
      update: {
        ...(validTranslation ? { translation: validTranslation } : {}),
        ...(nameValue ? { name: nameValue } : {}),
        ...(nicknameValue ? { nickname: nicknameValue } : {}),
        avatarUrl: avatarUrlValue,
      },
      create: {
        ...(validTranslation ? { translation: validTranslation } : {}),
        ...(nameValue ? { name: nameValue } : {}),
        ...(nicknameValue ? { nickname: nicknameValue } : {}),
        avatarUrl: avatarUrlValue,
      },
    });
    return res.status(200).json(user);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
