import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

type ModifyTagPayload = {
  tagId?: string;
  tagSlug?: string;
};

async function resolveTagId(payload: ModifyTagPayload) {
  if (payload.tagId) {
    return payload.tagId;
  }

  if (payload.tagSlug) {
    const tag = await prisma.tag.findUnique({
      where: { slug: payload.tagSlug },
      select: { id: true },
    });
    return tag?.id;
  }

  return undefined;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { externalVerseId } = req.query;
  if (!externalVerseId || Array.isArray(externalVerseId)) {
    return res.status(400).json({ error: "externalVerseId is required" });
  }

  if (req.method === "GET") {
    return handleGet(res, externalVerseId);
  }

  if (req.method === "POST") {
    return handlePost(req, res, externalVerseId);
  }

  if (req.method === "DELETE") {
    return handleDelete(req, res, externalVerseId);
  }

  res.setHeader("Allow", "GET, POST, DELETE");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleGet(res: NextApiResponse, externalVerseId: string) {
  try {
    const tags = await prisma.verseTag.findMany({
      where: { externalVerseId },
      include: { tag: true },
    });

    return res.status(200).json(
      tags.map((v) => ({
        id: v.tag.id,
        slug: v.tag.slug,
        title: v.tag.title,
        createdAt: v.tag.createdAt,
      }))
    );
  } catch (error) {
    console.error("Error fetching verse tags:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePost(req: NextApiRequest, res: NextApiResponse, externalVerseId: string) {
  try {
    const body = req.body as ModifyTagPayload;
    const tagId = await resolveTagId(body ?? {});

    if (!tagId) {
      return res.status(400).json({ error: "tagId or tagSlug is required" });
    }

    const link = await prisma.verseTag.upsert({
      where: {
        externalVerseId_tagId: {
          externalVerseId,
          tagId,
        },
      },
      update: {},
      create: {
        externalVerseId,
        tagId,
      },
    });

    return res.status(201).json(link);
  } catch (error) {
    console.error("Error creating verse tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handleDelete(req: NextApiRequest, res: NextApiResponse, externalVerseId: string) {
  try {
    const body = req.body as ModifyTagPayload;
    const tagId = await resolveTagId(body ?? {});

    if (!tagId) {
      return res.status(400).json({ error: "tagId or tagSlug is required" });
    }

    await prisma.verseTag.delete({
      where: {
        externalVerseId_tagId: {
          externalVerseId,
          tagId,
        },
      },
    });

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error("Error deleting verse tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
