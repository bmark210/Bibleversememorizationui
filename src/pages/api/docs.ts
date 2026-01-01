import type { NextApiRequest, NextApiResponse } from "next";
import swaggerDoc from "@/swagger/doc";

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  if (_req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  return res.status(200).json(swaggerDoc);
}
