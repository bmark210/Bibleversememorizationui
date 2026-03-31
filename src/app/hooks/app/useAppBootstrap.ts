"use client";

import { useEffect } from "react";
import { UsersService } from "@/api/services/UsersService";
import { toast } from "@/app/lib/toast";
import { getTelegramWebAppUser } from "@/app/lib/telegramWebApp";
import { useCurrentUserStatsStore } from "@/app/stores/currentUserStatsStore";

function normalizeAvatarUrl(value: unknown): string | null {
  const normalized = String(value ?? "").trim();
  return normalized ? normalized : null;
}

type UseAppBootstrapParams = {
  setTelegramId: (id: string | null) => void;
  setCurrentUserAvatarUrl: (url: string | null) => void;
  setIsBootstrapping: (v: boolean) => void;
  setDashboardStats: (v: null) => void;
  setDashboardLeaderboard: (v: null) => void;
  setDashboardFriendsActivity: (v: null) => void;
  setVerseListFriendsPresence: (v: null) => void;
  loadDashboardStats: (telegramId: string) => Promise<unknown>;
  loadLearningCapacity: (telegramId: string) => Promise<unknown>;
  loadDashboardLeaderboard: (telegramId: string) => Promise<unknown>;
  loadDashboardFriendsActivity: (telegramId: string) => Promise<unknown>;
  loadVerseListFriendsPresence: (telegramId: string) => Promise<unknown>;
  scheduleTrainingVersePrefetch: (telegramId: string) => void;
};

export function useAppBootstrap({
  setTelegramId,
  setCurrentUserAvatarUrl,
  setIsBootstrapping,
  setDashboardStats,
  setDashboardLeaderboard,
  setDashboardFriendsActivity,
  setVerseListFriendsPresence,
  loadDashboardStats,
  loadLearningCapacity,
  loadDashboardLeaderboard,
  loadDashboardFriendsActivity,
  loadVerseListFriendsPresence,
  scheduleTrainingVersePrefetch,
}: UseAppBootstrapParams) {
  useEffect(() => {
    let isMounted = true;

    const finishBootstrapping = () => {
      if (isMounted) {
        setIsBootstrapping(false);
      }
    };

    void (async () => {
      const telegramWebUser = getTelegramWebAppUser();
      const resolvedTelegramId =
        telegramWebUser?.id?.toString() ??
        process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
        localStorage.getItem("telegramId") ??
        undefined;

      const telegramName = [telegramWebUser?.first_name, telegramWebUser?.last_name]
        .map((part: unknown) => String(part ?? "").trim())
        .filter(Boolean)
        .join(" ")
        .trim();
      const telegramNickname = String(telegramWebUser?.username ?? "").trim();

      if (!resolvedTelegramId) {
        setDashboardStats(null);
        setDashboardLeaderboard(null);
        setDashboardFriendsActivity(null);
        setVerseListFriendsPresence(null);
        setCurrentUserAvatarUrl(null);
        useCurrentUserStatsStore.getState().clear();
        finishBootstrapping();
        return;
      }
      setTelegramId(resolvedTelegramId);
      setCurrentUserAvatarUrl(null);
      localStorage.setItem("telegramId", resolvedTelegramId);

      if (telegramWebUser?.id) {
        try {
          const initializedUser = await UsersService.upsertTelegramUser({
            telegramId: resolvedTelegramId,
            ...(telegramName ? { name: telegramName } : {}),
            ...(telegramNickname ? { nickname: telegramNickname } : {}),
            ...(telegramWebUser?.photo_url
              ? { avatarUrl: String(telegramWebUser.photo_url) }
              : {}),
          });
          setCurrentUserAvatarUrl(normalizeAvatarUrl(initializedUser.avatarUrl));
        } catch (error) {
          console.warn("Не удалось синхронизировать профиль Telegram:", error);
        }
      } else {
        try {
          const initializedUser = await UsersService.upsertUser({
            telegramId: resolvedTelegramId,
            ...(telegramName ? { name: telegramName } : {}),
            ...(telegramNickname ? { nickname: telegramNickname } : {}),
          });
          setCurrentUserAvatarUrl(normalizeAvatarUrl(initializedUser.avatarUrl));
        } catch (error) {
          console.warn("Не удалось инициализировать пользователя:", error);
        }
      }

      try {
        await Promise.all([
          loadDashboardStats(resolvedTelegramId),
          loadLearningCapacity(resolvedTelegramId),
          loadDashboardLeaderboard(resolvedTelegramId),
          loadDashboardFriendsActivity(resolvedTelegramId),
          loadVerseListFriendsPresence(resolvedTelegramId),
        ]);
      } catch (err) {
        console.error("Не удалось получить данные дашборда:", err);
        toast.error("Ошибка при подключении к базе данных", {
          description: "Стартовые данные не загрузились. Попробуйте открыть приложение ещё раз.",
          label: "Дашборд",
        });
      } finally {
        finishBootstrapping();
        scheduleTrainingVersePrefetch(resolvedTelegramId);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [
    loadVerseListFriendsPresence,
    loadDashboardFriendsActivity,
    loadDashboardLeaderboard,
    loadDashboardStats,
    loadLearningCapacity,
    scheduleTrainingVersePrefetch,
    setCurrentUserAvatarUrl,
    setDashboardFriendsActivity,
    setDashboardLeaderboard,
    setDashboardStats,
    setIsBootstrapping,
    setTelegramId,
    setVerseListFriendsPresence,
  ]);
}
