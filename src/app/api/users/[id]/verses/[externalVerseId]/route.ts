import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type UpdateVersePayload = {
  masteryLevel?: number;
  repetitions?: number;
  lastReviewedAt?: string;
  nextReviewAt?: string;
};

// PATCH/DELETE прогресса по конкретному стиху. В этом маршруте params.id — это telegramId.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; externalVerseId: string }> | { id: string; externalVerseId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const telegramId = resolvedParams.id;
    const externalVerseId = resolvedParams.externalVerseId;

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = (await request.json()) as UpdateVersePayload;

    const verse = await prisma.userVerse.update({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
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
  } catch (error) {
    console.error("Error updating verse:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; externalVerseId: string }> | { id: string; externalVerseId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const telegramId = resolvedParams.id;
    const externalVerseId = resolvedParams.externalVerseId;

    const user = await prisma.user.findUnique({
      where: { telegramId },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.userVerse.delete({
      where: {
        telegramId_externalVerseId: {
          telegramId,
          externalVerseId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

