import type { NextApiRequest, NextApiResponse } from "next";
import { upsertUserWithVerseLinksByTelegramId } from "@/modules/users/infrastructure/userRepository";
import { handleApiError } from "@/shared/errors/apiErrorHandler";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { telegramId } = req.query;
  if (!telegramId || Array.isArray(telegramId)) {
    return res.status(400).json({ error: "telegramId is required" });
  }

  try {
    if (req.method === "GET") {
      const fallbackName = `Участник #${telegramId.slice(-4) || telegramId}`;

      // Upsert: create the user if they don't exist yet (first open / direct API call)
      const user = await upsertUserWithVerseLinksByTelegramId({
        telegramId,
        update: {},
        create: {
          name: fallbackName,
        },
      });

      return res.status(200).json(user);
    }

    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  } catch (error) {
    return handleApiError(
      res,
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
