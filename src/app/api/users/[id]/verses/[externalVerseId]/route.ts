import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateVersePayload = {
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

// PATCH/DELETE прогресса по конкретному стиху. В этом маршруте params.id — это telegramId.
async function getUserIdByTelegramId(telegramId: string) {
  const user = await prisma.user.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  return user?.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; externalVerseId: string } }
) {
  const userId = await getUserIdByTelegramId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body = (await request.json()) as UpdateVersePayload;

  const verse = await prisma.userVerse.update({
    where: {
      userId_externalVerseId: {
        userId,
        externalVerseId: params.externalVerseId,
      },
    },
    data: {
      ...(body.masteryLevel !== undefined
        ? { masteryLevel: body.masteryLevel }
        : {}),
      ...(body.repetitions !== undefined
        ? { repetitions: body.repetitions }
        : {}),
      ...(body.lastReviewedAt
        ? { lastReviewedAt: new Date(body.lastReviewedAt) }
        : {}),
      ...(body.nextReviewAt
        ? { nextReviewAt: new Date(body.nextReviewAt) }
        : {}),
    },
  });

  return NextResponse.json(verse);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; externalVerseId: string } }
) {
  const userId = await getUserIdByTelegramId(params.id);
  if (!userId) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.userVerse.delete({
    where: {
      userId_externalVerseId: {
        userId,
        externalVerseId: params.externalVerseId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

