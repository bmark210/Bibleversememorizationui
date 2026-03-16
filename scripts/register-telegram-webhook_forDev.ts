import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());

const botToken = String(process.env.TELEGRAM_BOT_TOKEN_FOR_DEV ?? "").trim();
const webhookSecret = String(process.env.TELEGRAM_WEBHOOK_SECRET ?? "").trim();
const appUrl = String(process.env.NEXT_PUBLIC_APP_URL_FOR_DEV ?? "").trim();

if (!botToken) {
  throw new Error("TELEGRAM_BOT_TOKEN_FOR_DEV is required");
}

if (!webhookSecret) {
  throw new Error("TELEGRAM_WEBHOOK_SECRET_FOR_DEV is required");
}

if (!appUrl) {
  throw new Error("NEXT_PUBLIC_APP_URL_FOR_DEV is required");
}

const normalizedAppUrl = appUrl.replace(/\/+$/, "");
const webhookUrl = `${normalizedAppUrl}/api/telegram/webhook`;

async function main() {
  const response = await fetch(`https://api.telegram.org/bot${botToken}/setWebhook`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: webhookUrl,
      secret_token: webhookSecret,
      allowed_updates: ["message"],
      drop_pending_updates: false,
    }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { ok?: boolean; description?: string; result?: unknown }
    | null;

  if (!response.ok || !payload?.ok) {
    throw new Error(
      payload?.description ??
        `Telegram setWebhook failed with status ${response.status}`
    );
  }

  console.log("Webhook registered:", webhookUrl);
}

void main();
