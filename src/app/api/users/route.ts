import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Translation } from "@/generated/prisma/enums";

type CreateUserPayload = {
  telegramId?: string;
  translation?: string;
};

// Поддерживаемые коды переводов (enum из Prisma).
const ALLOWED_TRANSLATIONS: Translation[] = Object.values(Translation);
function normalizeTranslation(val?: string): Translation | undefined {
  if (!val) return undefined;
  return ALLOWED_TRANSLATIONS.includes(val as Translation)
    ? (val as Translation)
    : undefined;
}

// Получить пользователя по telegramId.
export async function GET(request: Request) {
  try {
    // Работаем только через telegramId; id/username не используются.
    const { searchParams } = new URL(request.url);
    const telegramId = searchParams.get("telegramId");

    if (!telegramId) {
      return NextResponse.json(
        { error: "Provide telegramId to fetch user" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { telegramId },
      include: {
        verses: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error fetching user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    // Создание/апдейт пользователя по telegramId (upsert).
    const body = (await request.json()) as CreateUserPayload;
    const { telegramId, translation } = body;
    const translationValue = normalizeTranslation(translation);

    if (!telegramId) {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
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

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Error creating/updating user:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

