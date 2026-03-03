import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  try {
    if (req.method === "GET") {
      const fallbackName = `Участник #${telegramId.slice(-4) || telegramId}`;

      // Upsert: create the user if they don't exist yet (first open / direct API call)
      const user = await prisma.user.upsert({
        where: { telegramId },
        update: {},
        create: { telegramId, name: fallbackName },
        include: { verses: true },
      });

      return res.status(200).json(user);
    }

    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
