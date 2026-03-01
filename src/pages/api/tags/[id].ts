import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { id } = req.query;
  if (!id || Array.isArray(id)) {
    return res.status(400).json({ error: "Tag ID is required" });
  }

  if (req.method === "DELETE") {
    return handleDelete(res, id);
  }

  if (req.method === "PATCH") {
    return handlePatch(req, res, id);
  }

  res.setHeader("Allow", "DELETE, PATCH");
  return res.status(405).json({ error: "Method Not Allowed" });
}

async function handleDelete(res: NextApiResponse, id: string) {
  try {
    // VerseTag records cascade via Prisma — the relation will be cleaned up.
    await prisma.tag.delete({ where: { id } });
    return res.status(200).json({ ok: true });
  } catch (error) {
    const isNotFound =
      error instanceof Error && error.message.includes("Record to delete does not exist");
    if (isNotFound) {
      return res.status(404).json({ error: "Tag not found" });
    }
    console.error("Error deleting tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}

async function handlePatch(req: NextApiRequest, res: NextApiResponse, id: string) {
  try {
    const { title } = (req.body ?? {}) as { title?: string };
    if (!title?.trim()) {
      return res.status(400).json({ error: "title is required" });
    }
    const updated = await prisma.tag.update({
      where: { id },
      data: { title: title.trim() },
    });
    return res.status(200).json(updated);
  } catch (error) {
    console.error("Error updating tag:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
