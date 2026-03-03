export type UserNotificationSettings = {
  telegramId: string;
  reminderEnabled: boolean;
  weeklyGoal: number;
  botConnected: boolean;
  botStartLink: string | null;
  openAppUrl: string;
  reminderSchedule: string;
};

export type UpdateUserNotificationSettingsPayload = {
  reminderEnabled?: boolean;
  weeklyGoal?: number;
};

function toSafeString(value: unknown, fallback = "") {
  if (typeof value !== "string") return fallback;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : fallback;
}

function toSafeBoolean(value: unknown, fallback = false) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function toSafeInteger(value: unknown, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.round(numeric);
}

function toNullableString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

export function normalizeUserNotificationSettings(value: unknown): UserNotificationSettings {
  const data = (value ?? {}) as Partial<UserNotificationSettings>;

  return {
    telegramId: toSafeString(data.telegramId),
    reminderEnabled: toSafeBoolean(data.reminderEnabled, false),
    weeklyGoal: Math.max(1, Math.min(500, toSafeInteger(data.weeklyGoal, 5))),
    botConnected: toSafeBoolean(data.botConnected, false),
    botStartLink: toNullableString(data.botStartLink),
    openAppUrl: toSafeString(data.openAppUrl),
    reminderSchedule: toSafeString(data.reminderSchedule, "Ежедневно в 20:00 UTC"),
  };
}

export async function fetchUserNotificationSettings(
  telegramId: string
): Promise<UserNotificationSettings> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/notifications`
  );
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      payload?.error ||
        `Failed to fetch notification settings: ${response.status}`
    );
  }

  const payload = await response.json();
  return normalizeUserNotificationSettings(payload);
}

export async function updateUserNotificationSettings(
  telegramId: string,
  payload: UpdateUserNotificationSettingsPayload
): Promise<UserNotificationSettings> {
  const response = await fetch(
    `/api/users/${encodeURIComponent(telegramId)}/notifications`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const errorPayload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(
      errorPayload?.error ||
        `Failed to update notification settings: ${response.status}`
    );
  }

  const data = await response.json();
  return normalizeUserNotificationSettings(data);
}
