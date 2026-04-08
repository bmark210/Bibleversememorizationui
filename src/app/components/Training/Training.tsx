"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTelegramBackButton } from "@/app/hooks/useTelegramBackButton";
import { useTextBoxes } from "@/app/hooks/texts/useTextBoxes";
import { useTextBoxVerses } from "@/app/hooks/texts/useTextBoxVerses";
import { AnchorSession } from "./anchor/AnchorSession";
import { FlashcardSessionRoot } from "./flashcard/FlashcardSession.lazy";
import { TrainingBoxHub } from "./TrainingBoxHub";
import { TrainingBoxPicker } from "./TrainingBoxPicker";
import { TrainingSession } from "./session/TrainingSession";
import { pickVersesForCoreModes } from "./coreTrainingAvailability";
import {
  readTrainingHubPreferences,
  writeTrainingHubPreferences,
} from "./trainingHubPreferences";
import { getVerseTrainingLaunchMode } from "@/shared/verseRules";
import type {
  AnchorModeGroup,
  AnchorSubScenario,
  CoreTrainingMode,
  FlashcardMode,
  TrainingProps,
  TrainingScenario,
  TrainingView,
} from "./types";
import { ALL_ANCHOR_MODE_GROUPS } from "./types";

const CORE_SESSION_MODES: CoreTrainingMode[] = ["learning", "review"];

function getInitialSubsetFilter(modes: CoreTrainingMode[]) {
  if (modes.length === 1) {
    return modes[0];
  }
  return "catalog" as const;
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
  telegramId,
  boxScope,
  directLaunch,
  onDirectLaunchExit,
  onBoxScopeChange,
  onVersePatched,
  onVerseMutationCommitted,
  onSessionFullscreenChange,
}: TrainingProps) {
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
  const [selectedAnchorSubScenario, setSelectedAnchorSubScenario] =
    useState<AnchorSubScenario>("interactive");
  const [selectedFlashcardMode, setSelectedFlashcardMode] =
    useState<FlashcardMode>("reference");
  const [view, setView] = useState<TrainingView | null>(null);
  const directLaunchKeyRef = useRef<string | null>(null);

  const {
    boxes,
    isLoading: isLoadingBoxes,
    error: boxesError,
  } = useTextBoxes(telegramId);
  const activeScope = directLaunch?.scope ?? boxScope ?? null;
  const { verses: boxVerseItems, isLoading: isLoadingBoxVerses } =
    useTextBoxVerses(telegramId, activeScope?.boxId ?? null);
  const allVerses = useMemo(
    () => boxVerseItems.map((item) => item.verse),
    [boxVerseItems],
  );

  useEffect(() => {
    writeTrainingHubPreferences({
      scenario: selectedScenario,
      coreModes: selectedModes,
      anchorModes: selectedAnchorModes,
    });
  }, [selectedAnchorModes, selectedModes, selectedScenario]);

  useEffect(() => {
    if (directLaunch?.scope) {
      onBoxScopeChange?.(directLaunch.scope);
    }
  }, [directLaunch?.scope, onBoxScopeChange]);

  useEffect(() => {
    if (!activeScope) {
      setView(null);
      return;
    }

    setView((current) => {
      if (!current || current.mode === "hub") {
        return { mode: "hub", scope: activeScope };
      }
      return current;
    });
  }, [activeScope]);

  const goToHub = useCallback(() => {
    if (!activeScope) {
      setView(null);
      return;
    }
    setView({ mode: "hub", scope: activeScope });
  }, [activeScope]);

  useEffect(() => {
    if (!directLaunch || !activeScope || isLoadingBoxVerses) {
      return;
    }

    const launchKey = `${activeScope.boxId}:${directLaunch.verse.externalVerseId}:${directLaunch.preferredMode ?? "auto"}`;
    if (directLaunchKeyRef.current === launchKey) {
      return;
    }
    directLaunchKeyRef.current = launchKey;

    const mode =
      directLaunch.preferredMode ??
      getVerseTrainingLaunchMode(directLaunch.verse);
    if (!mode) {
      goToHub();
      return;
    }

    if (mode === "anchor") {
      setView({
        mode: "anchor",
        anchorModes: [...ALL_ANCHOR_MODE_GROUPS],
        scope: activeScope,
      });
      return;
    }

    const eligibleVerses = pickVersesForCoreModes(
      CORE_SESSION_MODES,
      allVerses,
    );
    const otherVerses = eligibleVerses.filter(
      (verse) => verse.externalVerseId !== directLaunch.verse.externalVerseId,
    );
    const targetVerse =
      allVerses.find(
        (verse) => verse.externalVerseId === directLaunch.verse.externalVerseId,
      ) ?? directLaunch.verse;

    setView({
      mode: "verse-session",
      verses: [targetVerse, ...otherVerses],
      trainingModes: CORE_SESSION_MODES,
      order: "bible",
      scope: activeScope,
      initialVerseExternalId: targetVerse.externalVerseId,
    });
  }, [activeScope, allVerses, directLaunch, goToHub, isLoadingBoxVerses]);

  useEffect(() => {
    if (!directLaunch) {
      directLaunchKeyRef.current = null;
    }
  }, [directLaunch]);

  const handleExitSession = useCallback(() => {
    if (directLaunch) {
      onDirectLaunchExit?.(directLaunch);
      if (
        (directLaunch.returnTarget ?? { kind: "training-hub" as const })
          .kind === "text-box"
      ) {
        return;
      }
    }
    goToHub();
  }, [directLaunch, goToHub, onDirectLaunchExit]);

  const handleStart = useCallback(() => {
    if (!activeScope) return;

    if (selectedScenario === "anchor") {
      setView({
        mode: "anchor",
        anchorModes: selectedAnchorModes,
        scope: activeScope,
      });
      return;
    }

    const selectedVerses = pickVersesForCoreModes(selectedModes, allVerses);
    if (selectedVerses.length === 0) return;

    setView({
      mode: "verse-session",
      verses: pickVersesForCoreModes(CORE_SESSION_MODES, allVerses),
      trainingModes: selectedModes,
      order: "bible",
      scope: activeScope,
    });
  }, [
    activeScope,
    allVerses,
    selectedAnchorModes,
    selectedModes,
    selectedScenario,
  ]);

  const handleStartFlashcard = useCallback(() => {
    if (!activeScope) return;
    setView({
      mode: "flashcard",
      flashcardMode: selectedFlashcardMode,
      scope: activeScope,
    });
  }, [activeScope, selectedFlashcardMode]);

  useTelegramBackButton({
    enabled: view?.mode === "verse-session",
    onBack: handleExitSession,
    priority: 50,
  });

  useEffect(() => {
    onSessionFullscreenChange?.(view !== null && view.mode !== "hub");
    return () => onSessionFullscreenChange?.(false);
  }, [onSessionFullscreenChange, view]);

  if (!telegramId) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-text-secondary">
        Требуется авторизация.
      </div>
    );
  }

  if (!activeScope) {
    return (
      <TrainingBoxPicker
        boxes={boxes}
        isLoading={isLoadingBoxes}
        error={boxesError}
        onSelect={(scope) => onBoxScopeChange?.(scope)}
      />
    );
  }

  if (view?.mode === "anchor") {
    return (
      <AnchorSession
        telegramId={telegramId}
        boxId={view.scope.boxId}
        sourceVerses={allVerses}
        anchorModes={view.anchorModes}
        onSessionCommitted={onVerseMutationCommitted}
        onClose={handleExitSession}
      />
    );
  }

  if (view?.mode === "flashcard") {
    return (
      <FlashcardSessionRoot
        telegramId={telegramId}
        boxId={view.scope.boxId}
        flashcardMode={view.flashcardMode}
        onSessionCommitted={onVerseMutationCommitted}
        onClose={handleExitSession}
      />
    );
  }

  if (view?.mode === "verse-session") {
    return (
      <TrainingSession
        verses={view.verses}
        initialSubsetFilter={getInitialSubsetFilter(view.trainingModes)}
        initialOrder={view.order}
        initialVerseExternalId={view.initialVerseExternalId}
        onClose={handleExitSession}
        onVersePatched={onVersePatched}
        onMutationCommitted={onVerseMutationCommitted}
      />
    );
  }

  return (
    <TrainingBoxHub
      scope={activeScope}
      verses={allVerses}
      selectedScenario={selectedScenario}
      selectedModes={selectedModes}
      selectedAnchorModes={selectedAnchorModes}
      selectedAnchorSubScenario={selectedAnchorSubScenario}
      selectedFlashcardMode={selectedFlashcardMode}
      onScenarioChange={setSelectedScenario}
      onModesChange={setSelectedModes}
      onAnchorModesChange={setSelectedAnchorModes}
      onAnchorSubScenarioChange={setSelectedAnchorSubScenario}
      onFlashcardModeChange={setSelectedFlashcardMode}
      onStart={handleStart}
      onStartFlashcard={handleStartFlashcard}
      onRequestScopeChange={() => {
        onBoxScopeChange?.(null);
        setView(null);
      }}
    />
  );
}
