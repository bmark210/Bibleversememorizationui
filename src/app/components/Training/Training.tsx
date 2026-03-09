"use client";

import { useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft } from "lucide-react";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { TrainingHub } from "./hub/TrainingHub";
import { AnchorSession } from "./anchor/AnchorSession";
import type {
  TrainingProps,
  TrainingView,
  TrainingMode,
  TrainingOrder,
} from "./types";
import { TRAINING_MODE_LABELS } from "./types";
import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";

function pickVersesForModes(
  modes: TrainingMode[],
  allVerses: Verse[]
): Verse[] {
  if (modes.includes("anchor")) return allVerses;

  const statuses = new Set<string>();
  if (modes.includes("learning")) statuses.add("LEARNING");
  if (modes.includes("review")) statuses.add("REVIEW");

  if (statuses.size === 0) return [];
  return allVerses.filter((v) => statuses.has(normalizeDisplayVerseStatus(v.status)));
}

export function Training({
  allVerses,
  dashboardStats,
  telegramId,
  selectionVerses,
  onVersePatched: _onVersePatched,
  onRequestVerseSelection,
  onVerseMutationCommitted: _onVerseMutationCommitted,
}: TrainingProps) {
  const [view, setView] = useState<TrainingView>({ mode: "hub" });
  const [selectedModes, setSelectedModes] = useState<TrainingMode[]>(["learning"]);
  const [selectedOrder, setSelectedOrder] = useState<TrainingOrder>("updatedAt");

  const goToHub = useCallback(() => setView({ mode: "hub" }), []);

  const handleStart = useCallback(() => {
    // If only "anchor" is selected, go directly to anchor session
    if (selectedModes.length === 1 && selectedModes[0] === "anchor") {
      setView({ mode: "anchor" });
      return;
    }
    const verses = pickVersesForModes(selectedModes, allVerses);
    if (verses.length === 0) return;
    setView({
      mode: "verse-session",
      verses,
      trainingModes: selectedModes,
      order: selectedOrder,
    });
  }, [selectedModes, selectedOrder, allVerses]);

  const handleStartSelection = useCallback(() => {
    if (!selectionVerses || selectionVerses.length === 0) return;
    setView({
      mode: "verse-session",
      verses: selectionVerses,
      trainingModes: selectedModes,
      order: selectedOrder,
    });
  }, [selectionVerses, selectedModes, selectedOrder]);

  // Telegram back: go back to hub from any sub-view
  useTelegramBackButton({
    enabled: view.mode !== "hub",
    onBack: goToHub,
    priority: 50,
  });

  const isSubView = view.mode !== "hub";

  const sessionLabel =
    view.mode === "verse-session"
      ? view.trainingModes.map((m) => TRAINING_MODE_LABELS[m]).join(" + ")
      : "";

  return (
    <div className="h-full">
      {/* Sub-view top bar */}
      <AnimatePresence>
        {isSubView && (
          <motion.div
            key="sub-header"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="sticky top-0 z-10 flex items-center gap-2 bg-card/90 backdrop-blur-lg border-b border-border/50 px-4 py-2.5"
          >
            <button
              type="button"
              onClick={goToHub}
              className="flex items-center gap-1 text-sm text-foreground/70 hover:text-foreground transition-colors rounded-lg px-1 py-0.5 -mx-1"
            >
              <ChevronLeft className="w-4 h-4" />
              Тренировка
            </button>
            {view.mode === "verse-session" && (
              <span className="text-sm text-foreground/40 truncate">
                / {sessionLabel}
              </span>
            )}
            {view.mode === "anchor" && (
              <span className="text-sm text-foreground/40">/ Якоря</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <AnimatePresence mode="wait">
        {view.mode === "hub" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TrainingHub
              allVerses={allVerses}
              dashboardStats={dashboardStats}
              selectionVerses={selectionVerses}
              selectedModes={selectedModes}
              selectedOrder={selectedOrder}
              onModesChange={setSelectedModes}
              onOrderChange={setSelectedOrder}
              onStart={handleStart}
              onStartSelection={handleStartSelection}
              onRequestVerseSelection={onRequestVerseSelection}
            />
          </motion.div>
        )}

        {view.mode === "anchor" && (
          <motion.div
            key="anchor"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <AnchorSession telegramId={telegramId} />
          </motion.div>
        )}

        {view.mode === "verse-session" && (
          <motion.div
            key="verse-session"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="p-4 sm:p-6 lg:p-8 max-w-2xl mx-auto"
          >
            {/* Verse Training Session placeholder — Step 4 */}
            <div className="rounded-2xl border border-border/60 bg-muted/30 p-6 text-center space-y-2">
              <p className="font-semibold text-foreground/80">{sessionLabel}</p>
              <p className="text-sm text-foreground/50">
                {view.verses.length > 0
                  ? `${view.verses.length} стихов готово к тренировке`
                  : "Нет стихов в этом режиме"}
              </p>
              <p className="text-xs text-foreground/35 mt-3">
                Verse Training Session — следующий шаг реализации
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
