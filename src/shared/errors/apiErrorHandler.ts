import type { NextApiResponse } from "next";
import { AppError } from "./AppError";

export function handleApiError(res: NextApiResponse, error: Error) {
  if (error instanceof AppError) {
    return res.status(error.statusCode).json({
      code: error.code,
      message: error.message,
    });
  }

  console.error("[Unhandled]", error);
  return res.status(500).json({
    code: "INTERNAL",
    message: "Internal server error",
  });
}
