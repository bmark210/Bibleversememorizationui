import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Translation } from "@/generated/prisma/enums";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as TelegramInitPayload;
    const { telegramId, translation } = body;

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { telegramId },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // Валидация и приведение translation к типу enum
    let validTranslation: Translation | undefined;
    if (translation) {
      if (VALID_TRANSLATIONS.includes(translation as Translation)) {
        validTranslation = translation as Translation;
      } else {
        return NextResponse.json(
          { error: `Invalid translation. Must be one of: ${VALID_TRANSLATIONS.join(", ")}` },
          { status: 400 }
        );
      }
    }

    const payload = {
      telegramId,
      ...(validTranslation ? { translation: validTranslation } : {}),
    };

    const created = await prisma.user.create({ data: payload });
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    console.error("Error in telegram route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
