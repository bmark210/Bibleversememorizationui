import type { domain_UserDashboardStats } from "@/api/models/domain_UserDashboardStats";
import { UsersService } from "@/api/services/UsersService";

/** Поля, которые ожидает UI; `masteredVerses` выводим из `masteredCount` API. */
export type UserDashboardStats = domain_UserDashboardStats & {
  masteredVerses?: number;
};

export const EMPTY_USER_DASHBOARD_STATS: UserDashboardStats = {
  dailyStreak: 0,
  dueReviewVerses: 0,
  learningVerses: 0,
  masteredVerses: 0,
  masteredCount: 0,
  reviewVerses: 0,
  stoppedVerses: 0,
  versesCount: 0,
  waitingReviewVerses: 0,
  xp: 0,
};

function mapDashboardStats(
  raw: domain_UserDashboardStats
): UserDashboardStats {
  const withOptional = raw as domain_UserDashboardStats & {
    masteredVerses?: number;
  };
  const mastered = Math.max(
    0,
    Math.round(
      withOptional.masteredVerses ??
        raw.masteredCount ??
        EMPTY_USER_DASHBOARD_STATS.masteredVerses ??
        0
    )
  );
  return {
    ...raw,
    masteredVerses: mastered,
  };
}

export async function fetchUserDashboardStats(
  telegramId: string
): Promise<UserDashboardStats> {
  const raw = await UsersService.getUserStats(telegramId);
  return mapDashboardStats(raw);
}
