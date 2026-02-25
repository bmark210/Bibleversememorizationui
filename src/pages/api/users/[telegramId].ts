import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  try {
    if (req.method === "GET") {
      const user = await prisma.user.findUnique({
        where: { telegramId },
        include: {
          verses: true,
        },
      });

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json(user);
    }

    if (req.method === "PATCH") {
      const action = (req.body as { action?: unknown } | null)?.action;
      if (action !== "incrementDailyGoalsCompleted") {
        return res.status(400).json({ error: "Unsupported action" });
      }

      const updatedRows = await prisma.$executeRaw`
        UPDATE "User"
        SET "dailyGoalsCompleted" = COALESCE("dailyGoalsCompleted", 0) + 1
        WHERE "telegramId" = ${telegramId}
      `;

      if (Number(updatedRows) < 1) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.status(200).json({ ok: true });
    }

    res.setHeader("Allow", "GET, PATCH");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    console.error("Error fetching user:", error);
    return res.status(500).json({
      error: "Internal Server Error",
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
