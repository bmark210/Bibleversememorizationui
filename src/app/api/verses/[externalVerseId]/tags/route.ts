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
  { params }: { params: Promise<{ externalVerseId: string }> | { externalVerseId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const tags = await prisma.verseTag.findMany({
      where: { externalVerseId: resolvedParams.externalVerseId },
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
  } catch (error) {
    console.error("Error fetching verse tags:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ externalVerseId: string }> | { externalVerseId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
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
          externalVerseId: resolvedParams.externalVerseId,
          tagId,
        },
      },
      update: {},
      create: {
        externalVerseId: resolvedParams.externalVerseId,
        tagId,
      },
    });

    return NextResponse.json(link, { status: 201 });
  } catch (error) {
    console.error("Error creating verse tag:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ externalVerseId: string }> | { externalVerseId: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
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
          externalVerseId: resolvedParams.externalVerseId,
          tagId,
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse tag:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

