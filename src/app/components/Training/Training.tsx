"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { TrainingHub } from "./hub/TrainingHub";
import { AnchorSession } from "./anchor/AnchorSession";
import { TrainingSession } from "./session/TrainingSession";
import type { TrainingSubsetSelectValue } from "@/app/components/verse-gallery/TrainingSubsetSelect";
import type {
  TrainingProps,
  TrainingView,
  TrainingMode,
  CoreTrainingMode,
  TrainingOrder,
  TrainingScenario,
  AnchorTrainingTrack,
} from "./types";
import type { Verse } from "@/app/App";
import { normalizeDisplayVerseStatus } from "@/app/types/verseStatus";
import { pickVersesForCoreModes } from "./coreTrainingAvailability";

const CORE_SESSION_MODES: CoreTrainingMode[] = ["learning", "review"];

/** Pick the training mode that best matches a verse's current status */
function autoModeForVerse(verse: Verse): TrainingMode {
  const status = normalizeDisplayVerseStatus(verse.status);
  if (status === "REVIEW") return "review";
  if (status === "MASTERED") return "anchor";
  return "learning";
}

function getInitialSubsetFilter(
  modes: CoreTrainingMode[]
): TrainingSubsetSelectValue {
  if (modes.length === 1) {
    return modes[0];
  }
  return "catalog";
}

export function Training({
  allVerses,
  isLoadingVerses = false,
  dashboardStats,
  telegramId,
  selectionVerses,
  directLaunch,
  onDirectLaunchConsumed,
  onVersePatched,
  onVerseMutationCommitted,
  onSessionFullscreenChange,
}: TrainingProps) {
  const [view, setView] = useState<TrainingView>({ mode: "hub" });
  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario>("core");
  const [selectedModes, setSelectedModes] =
    useState<CoreTrainingMode[]>(CORE_SESSION_MODES);
  const [selectedOrder, setSelectedOrder] = useState<TrainingOrder>("updatedAt");
  const [selectedAnchorTrack, setSelectedAnchorTrack] =
    useState<AnchorTrainingTrack>("mixed");
  const [selectedBookId, setSelectedBookId] = useState<number | undefined>(undefined);
  const directLaunchConsumedRef = useRef(false);

  // ── Direct launch: skip Hub when a verse is passed directly ─────────────────
  useEffect(() => {
    if (!directLaunch || directLaunchConsumedRef.current) return;
    directLaunchConsumedRef.current = true;

    const mode = autoModeForVerse(directLaunch.verse);

    if (mode === "anchor") {
      setView({ mode: "anchor", track: selectedAnchorTrack });
    } else {
      // Build a verse list: put the target verse first, then add other eligible verses
      const targetKey = `${directLaunch.verse.externalVerseId}`;
      const eligibleVerses = pickVersesForCoreModes(CORE_SESSION_MODES, allVerses);
      const otherVerses = eligibleVerses.filter(
        (v) => v.externalVerseId !== targetKey,
      );
      const sessionVerses = [directLaunch.verse, ...otherVerses];

      setView({
        mode: "verse-session",
        verses: sessionVerses,
        trainingModes: [mode],
        order: "updatedAt",
      });
    }
  }, [directLaunch, allVerses, selectedAnchorTrack]);

  // Reset consumed ref when directLaunch changes to a new value
  useEffect(() => {
    if (!directLaunch) {
      directLaunchConsumedRef.current = false;
    }
  }, [directLaunch]);

  const goToHub = useCallback(() => {
    setView({ mode: "hub" });
    // If this was a direct launch session, notify parent so it clears directLaunch state
    onDirectLaunchConsumed?.();
  }, [onDirectLaunchConsumed]);

  const handleStart = useCallback(() => {
    if (selectedScenario === "anchor") {
      setView({ mode: "anchor", track: selectedAnchorTrack, bookId: selectedBookId });
      return;
    }
    const selectedVerses = pickVersesForCoreModes(selectedModes, allVerses);
    if (selectedVerses.length === 0) return;
    const verses = pickVersesForCoreModes(CORE_SESSION_MODES, allVerses);
    setView({
      mode: "verse-session",
      verses,
      trainingModes: selectedModes,
      order: selectedOrder,
    });
  }, [allVerses, selectedAnchorTrack, selectedBookId, selectedModes, selectedOrder, selectedScenario]);

  const handleStartSelection = useCallback(() => {
    if (selectedScenario !== "core") return;
    if (!selectionVerses || selectionVerses.length === 0) return;
    const selectedVerses = pickVersesForCoreModes(selectedModes, selectionVerses);
    if (selectedVerses.length === 0) return;
    const verses = pickVersesForCoreModes(CORE_SESSION_MODES, selectionVerses);
    setView({
      mode: "verse-session",
      verses,
      trainingModes: selectedModes,
      order: selectedOrder,
    });
  }, [selectionVerses, selectedModes, selectedOrder, selectedScenario]);

  // Telegram back for core training only. Anchor mode handles back internally.
  useTelegramBackButton({
    enabled: view.mode === "verse-session",
    onBack: goToHub,
    priority: 50,
  });

  useEffect(() => {
    onSessionFullscreenChange?.(view.mode !== "hub");

    return () => {
      onSessionFullscreenChange?.(false);
    };
  }, [onSessionFullscreenChange, view.mode]);

  if (view.mode === "hub" && isLoadingVerses && allVerses.length === 0) {
    return <div className="min-h-[60vh]" />;
  }

  return (
    <div className="h-full">
      {/* Main content */}
      <AnimatePresence mode="wait">
        {view.mode === "hub" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full"
          >
            <TrainingHub
              allVerses={allVerses}
              dashboardStats={dashboardStats}
              telegramId={telegramId}
              selectionVerses={selectionVerses}
              selectedScenario={selectedScenario}
              selectedModes={selectedModes}
              selectedOrder={selectedOrder}
              selectedAnchorTrack={selectedAnchorTrack}
              selectedBookId={selectedBookId}
              onScenarioChange={setSelectedScenario}
              onModesChange={setSelectedModes}
              onOrderChange={setSelectedOrder}
              onAnchorTrackChange={setSelectedAnchorTrack}
              onBookIdChange={setSelectedBookId}
              onStart={handleStart}
              onStartSelection={handleStartSelection}
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
            <AnchorSession
              telegramId={telegramId}
              initialTrack={view.track}
              bookId={view.bookId}
              onSessionCommitted={onVerseMutationCommitted}
              onClose={goToHub}
            />
          </motion.div>
        )}

        {view.mode === "verse-session" && (
          <motion.div
            key="verse-session"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
          >
            <TrainingSession
              verses={view.verses}
              initialSubsetFilter={getInitialSubsetFilter(view.trainingModes)}
              initialOrder={view.order}
              onClose={goToHub}
              onVersePatched={onVersePatched}
              onMutationCommitted={onVerseMutationCommitted}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
