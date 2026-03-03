import type { NextApiRequest, NextApiResponse } from "next";

type DryRunProxyResponse = {
  ok: boolean;
  status: number;
  payload?: unknown;
  error?: string;
};

function getSingleHeaderValue(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? "";
  return value ?? "";
}

function resolveOrigin(req: NextApiRequest): string {
  const forwardedProto = getSingleHeaderValue(req.headers["x-forwarded-proto"]);
  const proto = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
  const host =
    getSingleHeaderValue(req.headers["x-forwarded-host"]) ||
    getSingleHeaderValue(req.headers.host);

  if (host) return `${proto}://${host}`;

  const appUrl = String(process.env.NEXT_PUBLIC_APP_URL ?? "").trim();
  if (appUrl) return appUrl.replace(/\/+$/, "");

  return "http://localhost:3000";
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<DryRunProxyResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({
      ok: false,
      status: 405,
      error: "Method Not Allowed",
    });
  }

  const cronSecret = String(process.env.CRON_SECRET ?? "").trim();
  if (!cronSecret) {
    return res.status(500).json({
      ok: false,
      status: 500,
      error: "CRON_SECRET is not configured",
    });
  }

  try {
    const origin = resolveOrigin(req);
    const dryRunUrl = `${origin}/api/cron/telegram-reminders?dryRun=1`;

    const response = await fetch(dryRunUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${cronSecret}`,
      },
    });

    const payload = (await response.json().catch(() => null)) as unknown;
    return res.status(response.status).json({
      ok: response.ok,
      status: response.status,
      payload,
    });
  } catch (error) {
    console.error("Failed to run cron dry-run proxy:", error);
    return res.status(500).json({
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
}
