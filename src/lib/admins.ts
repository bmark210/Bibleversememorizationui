import { ADMIN_TELEGRAM_IDS as DEFAULT_ADMIN_TELEGRAM_IDS } from "@root/admins";

function parseAdminIds(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getEnvAdminIds(): string[] {
  const runtimeValue =
    process.env.ADMIN_TELEGRAM_IDS ??
    process.env.NEXT_PUBLIC_ADMIN_TELEGRAM_IDS;
  return parseAdminIds(runtimeValue);
}

export function getAdminTelegramIds(): Set<string> {
  return new Set<string>([
    ...DEFAULT_ADMIN_TELEGRAM_IDS.map((id) => String(id)),
    ...getEnvAdminIds(),
  ]);
}

export function isAdminTelegramId(telegramId: string | null | undefined): boolean {
  if (!telegramId) return false;
  return getAdminTelegramIds().has(String(telegramId).trim());
}
