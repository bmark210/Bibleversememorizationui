import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type ModifyTagPayload = {
  tagId?: string;
  tagSlug?: string;
};

async function resolveTagId(payload: ModifyTagPayload) {
  if (payload.tagId) return payload.tagId;
  if (payload.tagSlug) {
    const tag = await prisma.tag.findUnique({
      where: { slug: payload.tagSlug },
      select: { id: true },
    });
    return tag?.id;
  }
  return undefined;
}

export async function GET(
  _request: Request,
  { params }: { params: { externalVerseId: string } }
) {
  const tags = await prisma.verseTag.findMany({
    where: { externalVerseId: params.externalVerseId },
    include: { tag: true },
  });

  return NextResponse.json(
    tags.map((v) => ({
      id: v.tag.id,
      slug: v.tag.slug,
      title: v.tag.title,
      createdAt: v.tag.createdAt,
    }))
  );
}

export async function POST(
  request: Request,
  { params }: { params: { externalVerseId: string } }
) {
  const body = (await request.json()) as ModifyTagPayload;
  const tagId = await resolveTagId(body);

  if (!tagId) {
    return NextResponse.json(
      { error: "tagId or tagSlug is required" },
      { status: 400 }
    );
  }

  const link = await prisma.verseTag.upsert({
    where: {
      externalVerseId_tagId: {
        externalVerseId: params.externalVerseId,
        tagId,
      },
    },
    update: {},
    create: {
      externalVerseId: params.externalVerseId,
      tagId,
    },
  });

  return NextResponse.json(link, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { externalVerseId: string } }
) {
  const body = (await request.json()) as ModifyTagPayload;
  const tagId = await resolveTagId(body);

  if (!tagId) {
    return NextResponse.json(
      { error: "tagId or tagSlug is required" },
      { status: 400 }
    );
  }

  await prisma.verseTag.delete({
    where: {
      externalVerseId_tagId: {
        externalVerseId: params.externalVerseId,
        tagId,
      },
    },
  });

  return NextResponse.json({ ok: true });
}

