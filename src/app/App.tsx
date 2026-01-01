"use client";

import React, { useEffect, useRef, useState } from "react";
import { Layout } from "./components/Layout";
import { Dashboard } from "./components/Dashboard";
import { TrainingSession } from "./components/TrainingSession";
import { VerseList } from "./components/VerseList";
import { Collections } from "./components/Collections";
import { Statistics } from "./components/Statistics";
import { Settings } from "./components/Settings";
import { AddVerseDialog } from "./components/AddVerseDialog";
import { toast } from "sonner";
import { Toaster } from "./components/ui/sonner";
import { UsersService } from "@/api/services/UsersService";
import type { ApiError } from "@/api/core/ApiError";
import {
  mockVerses,
  mockCollections,
  mockStats,
  getVersesForToday,
} from "./data/mockData";
import { UserVerse } from "@/generated/prisma/client";
import { UserVersesService } from "@/api/services/UserVersesService";

type Page =
  | "dashboard"
  | "verses"
  | "collections"
  | "stats"
  | "settings"
  | "training";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [isTraining, setIsTraining] = useState(false);
  const [showAddVerseDialog, setShowAddVerseDialog] = useState(false);
  const [apiUnavailable, setApiUnavailable] = useState(false);
  const initUserRef = useRef(false);

  const todayVerses = getVersesForToday();

  // Инициализация пользователя в окружении Telegram (idempotent).
  useEffect(() => {
    if (initUserRef.current) return; // guard от повторного вызова в StrictMode
    initUserRef.current = true;

    const telegramId =
      typeof window !== "undefined"
        ? (
            window as any
          )?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
          process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
          localStorage.getItem("telegramId") ??
          undefined
        : undefined;

    if (!telegramId) return;
    localStorage.setItem("telegramId", telegramId);

    (async () => {
      try {
        if (apiUnavailable) return;
        await UsersService.getApiUsers(telegramId);
      } catch (err) {
        const status = (err as ApiError)?.status;
        const code = (err as ApiError)?.body?.code as string | undefined;
        if (status === 503 || code === "DB_UNAVAILABLE") {
          setApiUnavailable(true);
          toast.warning("База данных недоступна", {
            description:
              "Продолжаем в демо-режиме. Проверьте DATABASE_URL и права доступа в Postgres.",
          });
          return;
        }
        if (status === 404) {
          try {
            await UsersService.postApiUsers({ telegramId });
          } catch (createErr) {
            console.error(
              "Не удалось создать пользователя (telegramId):",
              createErr
            );
          }
        } else {
          console.error("Не удалось получить пользователя (telegramId):", err);
        }
      }
    })();
  }, [apiUnavailable]);

  const handleNavigate = (page: string) => {
    setCurrentPage(page as Page);
    setIsTraining(false);
  };

  const handleStartTraining = () => {
    if (todayVerses.length === 0) {
      toast.info("На сегодня стихов не запланировано", {
        description: "Отлично! Вы всё успели.",
      });
      return;
    }
    setIsTraining(true);
  };

  const handleCompleteTraining = () => {
    setIsTraining(false);
    setCurrentPage("dashboard");
    toast.success("Тренировка завершена!", {
      description: "Отличная работа! Ваш прогресс сохранён.",
    });
  };

  const handleExitTraining = () => {
    setIsTraining(false);
    setCurrentPage("dashboard");
  };

  const handleAddVerse = () => {
    setShowAddVerseDialog(true);
  };

  const handleVerseAdded = async (verse: {
    externalVerseId: string;
    reference: string;
    tags: string[];
  }) => {
    const telegramId = localStorage.getItem("telegramId") ?? "";

    try {
      if (apiUnavailable) {
        toast.info("Демо-режим", {
          description:
            "Стих не сохранён в базе данных, потому что база недоступна.",
        });
        return verse;
      }
      await UserVersesService.postApiUsersVerses(telegramId, {
        externalVerseId: verse.externalVerseId,
        masteryLevel: 0,
        repetitions: 0,
        lastReviewedAt: new Date().toISOString(),
        nextReviewAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      });
      toast.success("Стих успешно добавлен", {
        description: `${verse.reference} добавлен в ваш список стихов.`,
      });
    } catch (err) {

      const errorMessage = (err as ApiError)?.body?.error as string;
      console.error("Не удалось добавить стих:", errorMessage);
      toast.error(errorMessage ??"Не удалось добавить стих");
    }

    return verse;
  };

  const handleStartTrainingFromVerse = (verseId: string) => {
    const verse = mockVerses.find((v) => v.id === verseId);
    if (verse) {
      setIsTraining(true);
    }
  };

  const handleSelectCollection = (collectionId: string) => {
    toast.info("Коллекция выбрана", {
      description: "Здесь будут показаны стихи из выбранной коллекции.",
    });
  };

  const handleCreateCollection = () => {
    toast.info("Создать коллекцию", {
      description: "Здесь откроется диалог для создания новой коллекции.",
    });
  };

  // Training mode - full screen
  if (isTraining) {
    return (
      <>
        <TrainingSession
          verses={todayVerses.length > 0 ? todayVerses : mockVerses.slice(0, 3)}
          allVerses={mockVerses}
          onComplete={handleCompleteTraining}
          onExit={handleExitTraining}
        />
        <Toaster />
      </>
    );
  }

  // Regular app layout
  return (
    <>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        <p className="text-sm text-muted-foreground">
          {"telegramId: " +
            (localStorage.getItem("telegramId") ?? "No telegramId")}
        </p>
        {currentPage === "dashboard" && (
          <Dashboard
            todayVerses={todayVerses}
            onStartTraining={handleStartTraining}
            onAddVerse={handleAddVerse}
            onViewAll={() => setCurrentPage("verses")}
          />
        )}

        {currentPage === "verses" && (
          <VerseList
            verses={mockVerses}
            onAddVerse={handleAddVerse}
            onStartTraining={handleStartTrainingFromVerse}
          />
        )}

        {currentPage === "collections" && (
          <Collections
            collections={mockCollections}
            onCreateCollection={handleCreateCollection}
            onSelectCollection={handleSelectCollection}
          />
        )}

        {currentPage === "stats" && <Statistics stats={mockStats} />}

        {currentPage === "settings" && <Settings />}
      </Layout>

      <AddVerseDialog
        open={showAddVerseDialog}
        onClose={() => setShowAddVerseDialog(false)}
        onAdd={handleVerseAdded}
      />

      <Toaster />
    </>
  );
}
