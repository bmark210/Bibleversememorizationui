import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type TelegramInitPayload = {
  telegramId?: string;
  translation?: string;
};

export async function POST(request: Request) {
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

  const payload = {
    telegramId,
    ...(translation ? { translation } : {}),
  };

  const created = await prisma.user.create({ data: payload });
  return NextResponse.json(created, { status: 201 });
}
