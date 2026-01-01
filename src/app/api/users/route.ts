import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type CreateUserPayload = {
  telegramId?: string;
  translation?: string;
};

// Получить пользователя по telegramId.
export async function GET(request: Request) {
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
}

export async function POST(request: Request) {
  // Создание/апдейт пользователя по telegramId (upsert).
  const body = (await request.json()) as CreateUserPayload;
  const { telegramId, translation } = body;

  if (!telegramId) {
    return NextResponse.json(
      { error: "telegramId is required" },
      { status: 400 }
    );
  }

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: {
      ...(translation ? { translation } : {}),
    },
    create: {
      telegramId,
      ...(translation ? { translation } : {}),
    },
  });

  return NextResponse.json(user, { status: 201 });
}

