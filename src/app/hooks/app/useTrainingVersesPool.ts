"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { fetchAllUserVerses } from "@/api/services/userVersesPagination";
import type { AppRootPage } from "@/app/domain/appPages";
import {
  type AppVerseApiRecord,
  mapUserVerseToAppVerse,
  pickTrainingDashboardVerses,
  type Verse,
} from "@/app/domain/verse";
import { cancelIdleTask, scheduleIdleTask, type IdleTaskHandle } from "@/app/lib/idleTask";

export function useTrainingVersesPool(telegramId: string | null, currentPage: AppRootPage) {
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [hasLoadedTrainingVerses, setHasLoadedTrainingVerses] = useState(false);
  const [isTrainingVersesLoading, setIsTrainingVersesLoading] = useState(false);

  const trainingVersesRequestIdRef = useRef(0);
  const trainingVersesPromiseRef = useRef<Promise<Array<Verse>> | null>(null);
  const trainingVersesPrefetchHandleRef = useRef<IdleTaskHandle | null>(null);
  const trainingVersesFetchFailedRef = useRef(false);

  useEffect(() => {
    trainingVersesFetchFailedRef.current = false;
  }, [telegramId]);

  useEffect(() => {
    return () => {
      cancelIdleTask(trainingVersesPrefetchHandleRef.current);
    };
  }, []);

  useEffect(() => {
    if (!hasLoadedTrainingVerses) return;
    cancelIdleTask(trainingVersesPrefetchHandleRef.current);
  }, [hasLoadedTrainingVerses]);

  const loadAllUserVerses = useCallback(async (telegramIdValue: string) => {
    try {
      const response = await fetchAllUserVerses({ telegramId: telegramIdValue });
      const allVerses = response as Array<AppVerseApiRecord>;
      return allVerses;
    } catch (err) {
      console.error("Не удалось получить стихи пользователя:", err);
      throw err;
    }
  }, []);

  const loadTrainingVersesForDashboard = useCallback(
    async (telegramIdValue: string) => {
      if (!telegramIdValue) return [];
      if (trainingVersesPromiseRef.current) {
        return trainingVersesPromiseRef.current;
      }

      const requestId = ++trainingVersesRequestIdRef.current;
      setIsTrainingVersesLoading(true);

      const requestPromise = loadAllUserVerses(telegramIdValue)
        .then((allVerses) => {
          const trainingPool = pickTrainingDashboardVerses(
            allVerses.map((verse) => mapUserVerseToAppVerse(verse))
          );

          if (trainingVersesRequestIdRef.current === requestId) {
            trainingVersesFetchFailedRef.current = false;
            setVerses(trainingPool);
            setHasLoadedTrainingVerses(true);
          }

          return trainingPool;
        })
        .catch((err) => {
          if (trainingVersesRequestIdRef.current === requestId) {
            trainingVersesFetchFailedRef.current = true;
            setVerses([]);
            setHasLoadedTrainingVerses(false);
          }
          throw err;
        })
        .finally(() => {
          if (trainingVersesPromiseRef.current === requestPromise) {
            trainingVersesPromiseRef.current = null;
          }
          if (trainingVersesRequestIdRef.current === requestId) {
            setIsTrainingVersesLoading(false);
          }
        });

      trainingVersesPromiseRef.current = requestPromise;
      return requestPromise;
    },
    [loadAllUserVerses]
  );

  const ensureTrainingVersesLoaded = useCallback(
    async (telegramIdValue?: string | null) => {
      const resolvedTelegramId =
        telegramIdValue?.trim() ??
        telegramId?.trim() ??
        (typeof window !== "undefined" ? window.localStorage.getItem("telegramId") ?? "" : "");

      if (!resolvedTelegramId) {
        return verses;
      }

      if (trainingVersesPromiseRef.current) {
        return trainingVersesPromiseRef.current;
      }

      if (hasLoadedTrainingVerses) {
        return verses;
      }

      trainingVersesFetchFailedRef.current = false;
      return loadTrainingVersesForDashboard(resolvedTelegramId);
    },
    [hasLoadedTrainingVerses, loadTrainingVersesForDashboard, telegramId, verses]
  );

  const scheduleTrainingVersePrefetch = useCallback(
    (telegramIdValue: string) => {
      if (trainingVersesFetchFailedRef.current) {
        return;
      }
      cancelIdleTask(trainingVersesPrefetchHandleRef.current);
      trainingVersesPrefetchHandleRef.current = scheduleIdleTask(() => {
        if (
          hasLoadedTrainingVerses ||
          trainingVersesPromiseRef.current ||
          trainingVersesFetchFailedRef.current
        ) {
          return;
        }

        void loadTrainingVersesForDashboard(telegramIdValue).catch((error) => {
          console.warn("Не удалось предзагрузить стихи для тренировки:", error);
        });
      });
    },
    [hasLoadedTrainingVerses, loadTrainingVersesForDashboard]
  );

  useEffect(() => {
    if (!telegramId) return;
    if (currentPage !== "training") return;
    if (hasLoadedTrainingVerses || trainingVersesPromiseRef.current) return;

    trainingVersesFetchFailedRef.current = false;
    void loadTrainingVersesForDashboard(telegramId);
  }, [currentPage, hasLoadedTrainingVerses, loadTrainingVersesForDashboard, telegramId]);

  return {
    verses,
    setVerses,
    hasLoadedTrainingVerses,
    isTrainingVersesLoading,
    loadTrainingVersesForDashboard,
    ensureTrainingVersesLoaded,
    scheduleTrainingVersePrefetch,
    trainingVersesPromiseRef,
    trainingVersesFetchFailedRef,
  };
}
