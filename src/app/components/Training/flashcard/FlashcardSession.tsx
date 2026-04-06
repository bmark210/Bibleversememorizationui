"use client";

import { useState, useCallback, useEffect } from "react";
import { X, Eye, Check, Zap, BookOpen, Link2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import { useTelegramSafeArea } from "@/app/hooks/useTelegramSafeArea";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { toast } from "@/app/lib/toast";
import { triggerHaptic } from "@/app/lib/haptics";
import type { FlashcardMode } from "../types";
import {
  fetchFlashcardVerses,
  submitFlashcardSession,
  type FlashcardResult,
  type FlashcardVerseItem,
} from "./services/flashcardApi";

const FLASHCARD_POOL_LIMIT = 20;

type CardStatus = "hidden" | "revealed" | "answered";

type SessionCard = {
  externalVerseId: string;
  text: string;
  reference: string;
  status: CardStatus;
  remembered: boolean | null;
};

type SessionPhase = "loading" | "playing" | "summary" | "error";

export type FlashcardSessionProps = {
  telegramId: string | null;
  flashcardMode: FlashcardMode;
  onClose: () => void;
  onSessionCommitted?: () => void;
};

function mapVerseItem(v: FlashcardVerseItem): SessionCard | null {
  const externalVerseId =
    v.verse?.externalVerseId ?? (v as { externalVerseId?: string }).externalVerseId;
  if (!externalVerseId || !v.text || !v.reference) return null;
  return {
    externalVerseId,
    text: v.text,
    reference: v.reference,
    status: "hidden",
    remembered: null,
  };
}

export function FlashcardSession({
  telegramId,
  flashcardMode,
  onClose,
  onSessionCommitted,
}: FlashcardSessionProps) {
  const { contentSafeAreaInset } = useTelegramSafeArea();

  const [phase, setPhase] = useState<SessionPhase>("loading");
  const [cards, setCards] = useState<SessionCard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [xpAwarded, setXpAwarded] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useTelegramBackButton({ enabled: true, onBack: onClose, priority: 60 });

  useEffect(() => {
    if (!telegramId) return;
    (async () => {
      try {
        const response = await fetchFlashcardVerses({
          telegramId,
          limit: FLASHCARD_POOL_LIMIT,
        });

        if (!response.verses || response.verses.length === 0) {
          setErrorMessage("Нет стихов для карточек. Добавьте хотя бы один стих.");
          setPhase("error");
          return;
        }

        const sessionCards = response.verses
          .map(mapVerseItem)
          .filter((c): c is SessionCard => c !== null);

        if (sessionCards.length === 0) {
          setErrorMessage("Не удалось загрузить тексты стихов.");
          setPhase("error");
          return;
        }

        setCards(sessionCards);
        setCurrentIndex(0);
        setPhase("playing");
      } catch {
        setErrorMessage("Не удалось загрузить карточки.");
        setPhase("error");
      }
    })();
  }, [telegramId]);

  const currentCard = cards[currentIndex];

  const handleReveal = useCallback(() => {
    triggerHaptic("light");
    setCards((prev) =>
      prev.map((card, i) =>
        i === currentIndex ? { ...card, status: "revealed" } : card,
      ),
    );
  }, [currentIndex]);

  const handleAnswer = useCallback(
    async (remembered: boolean) => {
      triggerHaptic(remembered ? "medium" : "light");

      const updatedCards = cards.map((card, i) =>
        i === currentIndex
          ? { ...card, status: "answered" as const, remembered }
          : card,
      );
      setCards(updatedCards);

      const isLast = currentIndex === updatedCards.length - 1;

      if (isLast) {
        const results: FlashcardResult[] = updatedCards.map((card) => ({
          externalVerseId: card.externalVerseId,
          mode: flashcardMode,
          remembered: card.remembered ?? false,
        }));

        try {
          const response = await submitFlashcardSession({
            telegramId: telegramId ?? "",
            results,
          });
          setXpAwarded(response.xpAwarded ?? 0);
          onSessionCommitted?.();
        } catch {
          toast.error("Не удалось сохранить результаты", {
            description: "Проверьте соединение.",
            label: "Карточки",
          });
        }

        setPhase("summary");
      } else {
        setCurrentIndex((i) => i + 1);
      }
    },
    [cards, currentIndex, flashcardMode, telegramId, onSessionCommitted],
  );

  const getCardSides = (card: SessionCard) => {
    if (flashcardMode === "reference") {
      return {
        visibleLabel: "Стих",
        visibleContent: card.text,
        hiddenLabel: "Ссылка",
        hiddenContent: card.reference,
        VisibleIcon: BookOpen,
        HiddenIcon: Link2,
      };
    }
    return {
      visibleLabel: "Ссылка",
      visibleContent: card.reference,
      hiddenLabel: "Стих",
      hiddenContent: card.text,
      VisibleIcon: Link2,
      HiddenIcon: BookOpen,
    };
  };

  const rememberedCount = cards.filter((c) => c.remembered === true).length;
  const progress =
    cards.length > 0 ? ((currentIndex + 1) / cards.length) * 100 : 0;

  const paddingTop = contentSafeAreaInset.top + 8;
  const paddingBottom = contentSafeAreaInset.bottom + 16;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-bg-base"
      style={{ paddingTop, paddingBottom }}
    >
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between px-4 pb-2">
        <button
          type="button"
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-border-subtle bg-bg-surface text-text-secondary transition-colors hover:bg-bg-elevated"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary">
            Карточки · {flashcardMode === "reference" ? "Ссылка" : "Стих"}
          </p>
          {phase === "playing" && cards.length > 0 && (
            <p className="text-xs text-text-muted">
              {currentIndex + 1} / {cards.length}
            </p>
          )}
        </div>

        <div className="h-9 w-9" />
      </div>

      {/* Progress bar */}
      {phase === "playing" && (
        <div className="shrink-0 px-4 pb-3">
          <div className="h-1 overflow-hidden rounded-full bg-bg-surface">
            <div
              className="h-full rounded-full bg-brand-primary transition-all duration-300 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {/* Loading */}
        {phase === "loading" && (
          <div className="flex h-full items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-text-secondary">{errorMessage}</p>
            <Button onClick={onClose} variant="outline" className="rounded-2xl">
              Закрыть
            </Button>
          </div>
        )}

        {/* Playing */}
        {phase === "playing" && currentCard && (() => {
          const { visibleLabel, visibleContent, hiddenLabel, hiddenContent } =
            getCardSides(currentCard);

          return (
            <div className="py-2">
              {/* Card */}
              <div className="overflow-hidden rounded-[1.8rem] border border-border-subtle bg-bg-elevated shadow-[var(--shadow-soft)]">
                {/* Visible side */}
                <div className="p-5">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                    {visibleLabel}
                  </p>
                  <p className="text-[15px] leading-relaxed text-text-primary">
                    {visibleContent}
                  </p>
                </div>

                {/* Divider */}
                <div className="mx-5 h-px bg-border-subtle" />

                {/* Hidden side */}
                <div className="p-5">
                  <p className="mb-2.5 text-[10px] font-semibold uppercase tracking-[0.15em] text-text-muted">
                    {hiddenLabel}
                  </p>

                  {currentCard.status === "hidden" ? (
                    <button
                      type="button"
                      onClick={handleReveal}
                      className={cn(
                        "flex w-full items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-3.5",
                        "border-border-subtle bg-bg-surface text-sm text-text-muted",
                        "transition-all duration-150 hover:border-brand-primary/30 hover:bg-bg-elevated hover:text-text-secondary",
                        "active:scale-[0.98]",
                      )}
                    >
                      <Eye className="h-4 w-4 shrink-0" />
                      Нажмите, чтобы открыть
                    </button>
                  ) : (
                    <p className="text-[15px] leading-relaxed text-text-primary">
                      {hiddenContent}
                    </p>
                  )}
                </div>
              </div>

              {/* Answer buttons */}
              {currentCard.status === "revealed" && (
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handleAnswer(false)}
                    className={cn(
                      "flex h-12 items-center justify-center gap-1.5 rounded-2xl border px-4",
                      "border-status-learning/30 bg-status-learning-soft text-status-learning",
                      "text-sm font-medium transition-all duration-150 active:scale-[0.97]",
                    )}
                  >
                    Не вспомнил
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAnswer(true)}
                    className={cn(
                      "flex h-12 items-center justify-center gap-1.5 rounded-2xl border px-4",
                      "border-status-mastered/30 bg-status-mastered-soft text-status-mastered",
                      "text-sm font-medium transition-all duration-150 active:scale-[0.97]",
                    )}
                  >
                    <Check className="h-4 w-4" />
                    Вспомнил
                  </button>
                </div>
              )}

              {/* Hint */}
              {currentCard.status === "hidden" && (
                <p className="mt-3 text-center text-[11px] text-text-muted">
                  Сначала вспомните, потом откройте
                </p>
              )}
            </div>
          );
        })()}

        {/* Summary */}
        {phase === "summary" && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-8 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-status-mastered/30 bg-status-mastered-soft">
              <Check className="h-8 w-8 text-status-mastered" />
            </div>

            <div className="space-y-1">
              <p className="text-xl font-semibold text-text-primary">Готово!</p>
              <p className="text-sm text-text-secondary">
                Вспомнил {rememberedCount} из {cards.length}
              </p>
            </div>

            {xpAwarded > 0 && (
              <div className="flex items-center gap-2 rounded-2xl border border-brand-primary/20 bg-brand-primary/10 px-5 py-2.5">
                <Zap className="h-4 w-4 text-brand-primary" />
                <span className="text-sm font-semibold text-brand-primary">
                  +{xpAwarded} XP
                </span>
              </div>
            )}

            {/* Mini stats */}
            <div className="flex gap-6 rounded-[1.4rem] border border-border-subtle bg-bg-elevated px-6 py-4">
              <div className="text-center">
                <p className="text-lg font-bold text-status-mastered">
                  {rememberedCount}
                </p>
                <p className="text-xs text-text-muted">Вспомнил</p>
              </div>
              <div className="w-px bg-border-subtle" />
              <div className="text-center">
                <p className="text-lg font-bold text-status-learning">
                  {cards.length - rememberedCount}
                </p>
                <p className="text-xs text-text-muted">Не вспомнил</p>
              </div>
              <div className="w-px bg-border-subtle" />
              <div className="text-center">
                <p className="text-lg font-bold text-text-primary">
                  {cards.length > 0
                    ? Math.round((rememberedCount / cards.length) * 100)
                    : 0}%
                </p>
                <p className="text-xs text-text-muted">Результат</p>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              haptic="medium"
              onClick={onClose}
              className="h-12 rounded-2xl border border-brand-primary/20 bg-brand-primary/10 px-8 text-brand-primary shadow-none hover:bg-brand-primary/15"
            >
              Завершить
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
