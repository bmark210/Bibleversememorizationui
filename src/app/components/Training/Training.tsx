"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
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
  TrainingScenario,
  AnchorModeGroup,
} from "./types";
import { ALL_ANCHOR_MODE_GROUPS } from "./types";
import {
  readTrainingHubPreferences,
  writeTrainingHubPreferences,
} from "./trainingHubPreferences";
import type { Verse } from "@/app/domain/verse";
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

function computeInitialHubSelections(): {
  scenario: TrainingScenario;
  coreModes: CoreTrainingMode[];
  anchorModes: AnchorModeGroup[];
} {
  const prefs = readTrainingHubPreferences();
  return {
    scenario: prefs?.scenario ?? "core",
    coreModes: prefs?.coreModes ?? CORE_SESSION_MODES,
    anchorModes: prefs?.anchorModes ?? [...ALL_ANCHOR_MODE_GROUPS],
  };
}

export function Training({
  allVerses,
  isLoadingVerses = false,
  dashboardStats,
  telegramId,
  selectionVerses,
  directLaunch,
  onDirectLaunchExit,
  onVersePatched,
  onVerseMutationCommitted,
  onSessionFullscreenChange,
}: TrainingProps) {
  const [view, setView] = useState<TrainingView>({ mode: "hub" });

  const initialHub = useMemo(() => computeInitialHubSelections(), []);

  const [selectedScenario, setSelectedScenario] = useState<TrainingScenario>(
    initialHub.scenario,
  );
  const [selectedModes, setSelectedModes] = useState<CoreTrainingMode[]>(
    initialHub.coreModes,
  );
  const [selectedAnchorModes, setSelectedAnchorModes] = useState<
    AnchorModeGroup[]
  >(initialHub.anchorModes);
  const directLaunchConsumedRef = useRef(false);

  useEffect(() => {
    writeTrainingHubPreferences({
      scenario: selectedScenario,
      coreModes: selectedModes,
      anchorModes: selectedAnchorModes,
    });
  }, [selectedScenario, selectedModes, selectedAnchorModes]);

  // ── Direct launch: skip Hub when a verse is passed directly ─────────────────
  useEffect(() => {
    if (!directLaunch || directLaunchConsumedRef.current) return;
    directLaunchConsumedRef.current = true;

    const mode = directLaunch.preferredMode ?? autoModeForVerse(directLaunch.verse);

    if (mode === "anchor") {
      setView({ mode: "anchor", anchorModes: [...ALL_ANCHOR_MODE_GROUPS] });
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
        trainingModes: CORE_SESSION_MODES,
        order: "updatedAt",
        initialVerseExternalId: directLaunch.verse.externalVerseId,
      });
    }
  }, [directLaunch, allVerses]);

  // Reset consumed ref when directLaunch changes to a new value
  useEffect(() => {
    if (!directLaunch) {
      directLaunchConsumedRef.current = false;
    }
  }, [directLaunch]);

  const goToHub = useCallback(() => {
    setView({ mode: "hub" });
  }, []);

  const handleExitSession = useCallback(() => {
    if (directLaunch && directLaunchConsumedRef.current) {
      const returnTarget = directLaunch.returnTarget ?? {
        kind: "training-hub" as const,
      };

      onDirectLaunchExit?.(directLaunch);
      // For verse-list return targets, parent navigation must handle exit flow.
      if (returnTarget.kind === "verse-list") {
        return;
      }
    }

    goToHub();
  }, [directLaunch, goToHub, onDirectLaunchExit]);

  const handleStart = useCallback(() => {
    if (selectedScenario === "anchor") {
      setView({ mode: "anchor", anchorModes: selectedAnchorModes });
      return;
    }
    const selectedVerses = pickVersesForCoreModes(selectedModes, allVerses);
    if (selectedVerses.length === 0) return;
    const verses = pickVersesForCoreModes(CORE_SESSION_MODES, allVerses);
    setView({
      mode: "verse-session",
      verses,
      trainingModes: selectedModes,
      order: "updatedAt",
    });
  }, [allVerses, selectedAnchorModes, selectedModes, selectedScenario]);

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
      order: "updatedAt",
    });
  }, [selectionVerses, selectedModes, selectedScenario]);

  // Telegram back for core training only. Anchor mode handles back internally.
  useTelegramBackButton({
    enabled: view.mode === "verse-session",
    onBack: handleExitSession,
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
      <AnimatePresence mode="wait">
        {view.mode === "hub" && (
          <motion.div
            key="hub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="h-full overflow-hidden"
          >
            <TrainingHub
              allVerses={allVerses}
              dashboardStats={dashboardStats}
              selectionVerses={selectionVerses}
              selectedScenario={selectedScenario}
              selectedModes={selectedModes}
              selectedAnchorModes={selectedAnchorModes}
              onScenarioChange={setSelectedScenario}
              onModesChange={setSelectedModes}
              onAnchorModesChange={setSelectedAnchorModes}
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
              anchorModes={view.anchorModes}
              onSessionCommitted={onVerseMutationCommitted}
              onClose={handleExitSession}
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
              initialVerseExternalId={view.initialVerseExternalId}
              onClose={handleExitSession}
              onVersePatched={onVersePatched}
              onMutationCommitted={onVerseMutationCommitted}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
