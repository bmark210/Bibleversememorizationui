import type { NextApiRequest, NextApiResponse } from "next";
import { Translation } from "@/generated/prisma";
import { upsertUserByTelegramId } from "@/modules/users/infrastructure/userRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

type CreateUserPayload = {
  telegramId?: string;
  translation?: string;
  name?: string;
  nickname?: string;
  avatarUrl?: string;
};

const ALLOWED_TRANSLATIONS: Translation[] = Object.values(Translation);
const TRANSLATION_ALIASES: Record<string, Translation> = {
  RUS_SYN: Translation.SYNOD,
};

const normalizeTranslation = (value?: string): Translation | undefined => {
  const normalized = value?.trim();
  if (!normalized) return undefined;
  const aliasValue = TRANSLATION_ALIASES[normalized.toUpperCase()];
  if (aliasValue) return aliasValue;
  return ALLOWED_TRANSLATIONS.includes(normalized as Translation)
    ? (normalized as Translation)
    : undefined;
};

const normalizeOptionalString = (value?: string): string | undefined => {
  const normalized = value?.trim();
  return normalized ? normalized : undefined;
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
    const { telegramId, translation, name, nickname, avatarUrl } = body ?? {};
    const translationValue = normalizeTranslation(translation);
    const nameValue = normalizeOptionalString(name);
    const nicknameValue = normalizeOptionalString(nickname);
    const avatarUrlValue = normalizeOptionalString(avatarUrl);

    if (!telegramId) {
      return res.status(400).json({ error: "telegramId is required" });
    }

    const user = await upsertUserByTelegramId({
      telegramId,
      update: {
        ...(translationValue ? { translation: translationValue } : {}),
        ...(nameValue ? { name: nameValue } : {}),
        ...(nicknameValue ? { nickname: nicknameValue } : {}),
        ...(avatarUrlValue ? { avatarUrl: avatarUrlValue } : {}),
      },
      create: {
        ...(translationValue ? { translation: translationValue } : {}),
        ...(nameValue ? { name: nameValue } : {}),
        ...(nicknameValue ? { nickname: nicknameValue } : {}),
        ...(avatarUrlValue ? { avatarUrl: avatarUrlValue } : {}),
      },
    });

    return res.status(201).json(user);
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
