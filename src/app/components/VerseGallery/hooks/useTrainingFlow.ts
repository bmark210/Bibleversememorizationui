import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  type RefObject,
} from "react";
import { VerseStatus } from "@/generated/prisma";
import type { Verse } from "@/app/App";
import type { VersePatchEvent } from "@/app/types/verseSync";
import type {
  TrainingContactToastPayload,
  TrainingCompletionToastCardPayload,
} from "@/app/components/verse-gallery/TrainingCompletionToastCard";
import {
  type TrainingModeRendererHandle,
} from "@/app/components/training-session/TrainingModeRenderer";
import { computeDisplayStatus } from "@/modules/training/application/computeDisplayStatus";
import { computeProgressDelta } from "@/modules/training/application/computeProgressDelta";
import {
  MODE_SHIFT_BY_RATING,
} from "../constants";
import {
  haptic,
  normalizeVerseStatus,
  normalizeRawMasteryLevel,
  getVerseIdentity,
  toTrainingVerseState,
  isTrainingEligibleVerse,
  isTrainingReviewVerse,
  matchesTrainingSubsetFilter,
  chooseModeId,
  getModeByShiftInProgressOrder,
  getTrainingContactToastPayload,
  getTrainingMilestonePopupPayload,
  getTrainingLearningStartPopupPayload,
  sortByCreatedAtDesc,
  parseDate,
} from "../utils";
import {
  fetchTrainingVerseSnapshot,
  persistTrainingVerseProgress,
} from "../trainingApi";
import {
  normalizePersistedTrainingVerseState,
  useVerseSync,
} from "./useVerseSync";
import type {
  PanelMode,
  ModeId,
  Rating,
  TrainingSubsetFilter,
  TrainingVerseState,
  VersePreviewOverride,
} from "../types";

type QuickForgetConfirmStage = "learning" | "review";

type Params = {
  verses: Verse[];
  previewActiveVerse: Verse | null;
  activeIndex: number;
  autoStartInTraining: boolean;
  closeTrainingGoesToPreview: boolean;
  onClose: () => void;
  onVersePatched?: (event: VersePatchEvent) => void;
  // from useGalleryAux
  isActionPending: boolean;
  setIsActionPending: (value: boolean) => void;
  setPreviewOverride: (verse: Verse, patch: VersePreviewOverride) => void;
  showFeedback: (message: string, type?: "success" | "error" | "info") => void;
  showTrainingContactToast: (payload: TrainingContactToastPayload) => void;
  showTrainingMilestonePopup: (payload: TrainingCompletionToastCardPayload) => Promise<void>;
  // from usePreviewNavigation
  setNavActiveIndex: (index: number) => void;
  setNavDirection?: (dir: number) => void;
  onRequestMoreTrainingVerses?: () => Promise<Verse[]>;
};

function useEventCallback<Args extends unknown[], Result>(
  fn: (...args: Args) => Result
): (...args: Args) => Result {
  const fnRef = useRef(fn);

  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  return useCallback((...args: Args) => fnRef.current(...args), []);
}

const LEARNING_QUICK_FORGET_CONFIRM_SEEN_STORAGE_KEY =
  "bible-memory.training.quick-forget.learning-confirm.seen.v1";
const LEARNING_STAGE_INTRO_POPUP_LEGACY_SEEN_STORAGE_KEY_PREFIX =
  "bible-memory.training.learning-intro-popup.seen.v1";
const LEARNING_STAGE_INTRO_POPUP_SEEN_STORAGE_KEY =
  "bible-memory.training.learning-intro-popup.seen.v2";
const LEARNING_STAGE_INTRO_POPUP_SEEN_MAX_ENTRIES = 256;

type LearningStageIntroPopupSeenMap = Record<string, number>;
let learningStageIntroPopupLegacyMigrated = false;

function isLearningStageIntroPopupCandidate(params: {
  status: string;
  rawMasteryLevel: number;
  repetitions: number;
  lastReviewedAt: Date | null;
}): boolean {
  return (
    params.status === VerseStatus.LEARNING &&
    params.rawMasteryLevel === 0 &&
    params.repetitions === 0 &&
    !params.lastReviewedAt
  );
}

function normalizeLearningStageIntroPopupSeenMap(
  raw: unknown
): LearningStageIntroPopupSeenMap {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const source = raw as Record<string, unknown>;
  const normalized: LearningStageIntroPopupSeenMap = {};
  for (const [key, value] of Object.entries(source)) {
    if (!key) continue;
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) continue;
    normalized[key] = Math.round(stamp);
  }
  return normalized;
}

function trimLearningStageIntroPopupSeenMap(
  map: LearningStageIntroPopupSeenMap
): LearningStageIntroPopupSeenMap {
  const entries = Object.entries(map);
  if (entries.length <= LEARNING_STAGE_INTRO_POPUP_SEEN_MAX_ENTRIES) return map;
  const trimmed: LearningStageIntroPopupSeenMap = {};
  const sorted = [...entries].sort((a, b) => b[1] - a[1]);
  for (const [key, stamp] of sorted.slice(0, LEARNING_STAGE_INTRO_POPUP_SEEN_MAX_ENTRIES)) {
    trimmed[key] = stamp;
  }
  return trimmed;
}

function readLearningStageIntroPopupSeenMapFromStorage(
  storage: Storage
): LearningStageIntroPopupSeenMap {
  const raw = storage.getItem(LEARNING_STAGE_INTRO_POPUP_SEEN_STORAGE_KEY);
  if (!raw) return {};
  try {
    return normalizeLearningStageIntroPopupSeenMap(JSON.parse(raw));
  } catch {
    return {};
  }
}

function writeLearningStageIntroPopupSeenMapToStorage(
  storage: Storage,
  map: LearningStageIntroPopupSeenMap
) {
  const trimmed = trimLearningStageIntroPopupSeenMap(map);
  if (Object.keys(trimmed).length === 0) {
    storage.removeItem(LEARNING_STAGE_INTRO_POPUP_SEEN_STORAGE_KEY);
    return;
  }
  storage.setItem(LEARNING_STAGE_INTRO_POPUP_SEEN_STORAGE_KEY, JSON.stringify(trimmed));
}

function ensureLearningStageIntroPopupLegacyMigration() {
  if (learningStageIntroPopupLegacyMigrated) return;
  if (typeof window === "undefined") return;
  learningStageIntroPopupLegacyMigrated = true;
  try {
    const storage = window.localStorage;
    const prefix = `${LEARNING_STAGE_INTRO_POPUP_LEGACY_SEEN_STORAGE_KEY_PREFIX}:`;
    const seenMap = readLearningStageIntroPopupSeenMapFromStorage(storage);
    const keysToRemove: string[] = [];
    let didChange = false;

    for (let i = 0; i < storage.length; i += 1) {
      const storageKey = storage.key(i);
      if (!storageKey || !storageKey.startsWith(prefix)) continue;
      keysToRemove.push(storageKey);
      const verseKey = storageKey.slice(prefix.length);
      if (!verseKey) continue;
      if (storage.getItem(storageKey) !== "1") continue;
      if (seenMap[verseKey]) continue;
      seenMap[verseKey] = Date.now();
      didChange = true;
    }

    for (const storageKey of keysToRemove) {
      storage.removeItem(storageKey);
    }

    if (didChange || keysToRemove.length > 0) {
      writeLearningStageIntroPopupSeenMapToStorage(storage, seenMap);
    }
  } catch {
    // ignore migration errors in restricted webviews
  }
}

function readLearningStageIntroPopupSeenMap(): LearningStageIntroPopupSeenMap {
  if (typeof window === "undefined") return {};
  ensureLearningStageIntroPopupLegacyMigration();
  try {
    return readLearningStageIntroPopupSeenMapFromStorage(window.localStorage);
  } catch {
    return {};
  }
}

function hasLearningQuickForgetConfirmBeenSeen(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(LEARNING_QUICK_FORGET_CONFIRM_SEEN_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function markLearningQuickForgetConfirmSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(LEARNING_QUICK_FORGET_CONFIRM_SEEN_STORAGE_KEY, "1");
  } catch {
    // ignore storage write errors in restricted webviews
  }
}

function hasLearningStageIntroPopupBeenSeen(verseKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const seenMap = readLearningStageIntroPopupSeenMap();
    return Boolean(seenMap[verseKey]);
  } catch {
    return false;
  }
}

function markLearningStageIntroPopupSeen(verseKey: string) {
  if (typeof window === "undefined") return;
  try {
    const seenMap = readLearningStageIntroPopupSeenMap();
    seenMap[verseKey] = Date.now();
    writeLearningStageIntroPopupSeenMapToStorage(window.localStorage, seenMap);
  } catch {
    // ignore storage write errors in restricted webviews
  }
}

function clearLearningStageIntroPopupSeen(verseKey: string) {
  if (typeof window === "undefined") return;
  try {
    const seenMap = readLearningStageIntroPopupSeenMap();
    if (!seenMap[verseKey]) return;
    delete seenMap[verseKey];
    writeLearningStageIntroPopupSeenMapToStorage(window.localStorage, seenMap);
  } catch {
    // ignore storage write errors in restricted webviews
  }
}

function cleanupLearningStageIntroPopupSeenForVisibleVerses(verses: Verse[]) {
  if (typeof window === "undefined") return;
  try {
    const seenMap = readLearningStageIntroPopupSeenMap();
    if (Object.keys(seenMap).length === 0) return;

    let didChange = false;
    for (const verse of verses) {
      const verseKey = getVerseIdentity(verse);
      if (!seenMap[verseKey]) continue;

      const shouldKeepFlag = isLearningStageIntroPopupCandidate({
        status: normalizeVerseStatus(verse.status),
        rawMasteryLevel: normalizeRawMasteryLevel(verse.masteryLevel),
        repetitions: Math.max(0, Math.round(Number(verse.repetitions ?? 0))),
        lastReviewedAt: parseDate((verse as Record<string, unknown>).lastReviewedAt),
      });

      if (shouldKeepFlag) continue;
      delete seenMap[verseKey];
      didChange = true;
    }

    if (didChange) {
      writeLearningStageIntroPopupSeenMapToStorage(window.localStorage, seenMap);
    }
  } catch {
    // ignore storage write errors in restricted webviews
  }
}

function pickTrainingSourceVerses(source: Verse[]): Verse[] {
  return sortByCreatedAtDesc(
    source.filter((verse) => {
      const status = normalizeVerseStatus(verse.status);
      return status === VerseStatus.LEARNING || status === "REVIEW";
    })
  );
}

function mergeVersesByIdentity(base: Verse[], incoming: Verse[]): Verse[] {
  if (incoming.length === 0) return base;
  const seen = new Set(base.map((verse) => getVerseIdentity(verse)));
  const additions = incoming.filter((verse) => {
    const key = getVerseIdentity(verse);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return additions.length > 0 ? [...base, ...additions] : base;
}

export type UseTrainingFlowReturn = {
  panelMode: PanelMode;
  trainingActiveVerse: TrainingVerseState | null;
  trainingIndex: number;
  trainingModeId: ModeId | null;
  trainingSubsetFilter: TrainingSubsetFilter;
  trainingEligibleIndices: number[];
  isAutoStartingTraining: boolean;
  trainingRendererRef: RefObject<TrainingModeRendererHandle | null>;
  startTrainingFromActiveVerse: (
    forcedSubset?: "learning" | "review",
    options?: { preservePreviewCard?: boolean }
  ) => Promise<boolean>;
  handleTrainingRate: (rating: Rating) => Promise<void>;
  handleTrainingNavigationStep: (delta: -1 | 1) => void;
  exitTrainingMode: (target?: TrainingVerseState | null) => void;
  handleTrainingBackAction: () => void;
  applyUserTrainingSubsetFilter: (filter: TrainingSubsetFilter) => void;
  quickForgetLabel: string;
  quickForgetConfirmStage: QuickForgetConfirmStage | null;
  requestQuickForget: () => void;
  confirmQuickForget: () => void;
  cancelQuickForget: () => void;
};

export function useTrainingFlow({
  verses,
  previewActiveVerse,
  autoStartInTraining,
  closeTrainingGoesToPreview,
  onClose,
  onVersePatched,
  isActionPending,
  setIsActionPending,
  setPreviewOverride,
  showFeedback,
  showTrainingContactToast,
  showTrainingMilestonePopup,
  setNavActiveIndex,
  setNavDirection,
  onRequestMoreTrainingVerses,
}: Params): UseTrainingFlowReturn {
  const [panelMode, setPanelMode] = useState<PanelMode>("preview");
  const [trainingVerses, setTrainingVerses] = useState<TrainingVerseState[]>([]);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingModeId, setTrainingModeId] = useState<ModeId | null>(null);
  const [trainingSubsetFilter, setTrainingSubsetFilter] = useState<TrainingSubsetFilter>("catalog");
  const [isAutoStartingTraining, setIsAutoStartingTraining] = useState(
    () => autoStartInTraining
  );
  const [quickForgetConfirmStage, setQuickForgetConfirmStage] =
    useState<QuickForgetConfirmStage | null>(null);

  const trainingRendererRef = useRef<TrainingModeRendererHandle | null>(null);
  const autoStartedTrainingRef = useRef(false);
  const hasUserChosenTrainingSubsetRef = useRef(false);
  const preservedPreviewVerseKeyOnTrainingExitRef = useRef<string | null>(null);
  const previousVisibleVerseKeysRef = useRef<Set<string>>(new Set());

  const trainingActiveVerse = panelMode === "training" ? trainingVerses[trainingIndex] ?? null : null;

  const trainingEligibleIndices = useMemo(
    () =>
      trainingVerses
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index),
    [trainingVerses, trainingSubsetFilter]
  );

  // Return to preview if no training verse is available
  useEffect(() => {
    if (panelMode !== "training") return;
    if (!trainingActiveVerse) {
      setPanelMode("preview");
      setTrainingModeId(null);
      setQuickForgetConfirmStage(null);
    }
  }, [panelMode, trainingActiveVerse]);

  // Auto-advance training index when eligible subset changes
  useEffect(() => {
    if (panelMode !== "training") return;
    if (isActionPending) return;
    if (trainingEligibleIndices.length > 0) {
      if (!trainingEligibleIndices.includes(trainingIndex)) {
        const nextIndex = trainingEligibleIndices[0];
        if (nextIndex === undefined) return;
        const nextVerse = trainingVerses[nextIndex];
        if (!nextVerse) return;
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
      return;
    }

    if (trainingSubsetFilter !== "catalog") {
      showFeedback("Нет стихов для выбранного режима. Переключаем обратно в каталог.", "info");
      setTrainingSubsetFilter("catalog");
      return;
    }

    if (trainingVerses.some(isTrainingEligibleVerse)) {
      const nextIndex = trainingVerses.findIndex(isTrainingEligibleVerse);
      if (nextIndex >= 0) {
        const nextVerse = trainingVerses[nextIndex];
        if (!nextVerse) return;
        setTrainingIndex(nextIndex);
        setTrainingModeId(chooseModeId(nextVerse));
      }
    }
  }, [
    panelMode,
    isActionPending,
    trainingEligibleIndices,
    trainingIndex,
    trainingSubsetFilter,
    trainingVerses,
  ]);

  // Clear auto-starting overlay when training starts
  useEffect(() => {
    if (panelMode === "training") {
      setIsAutoStartingTraining(false);
    }
  }, [panelMode]);

  useEffect(() => {
    if (panelMode !== "training") {
      setQuickForgetConfirmStage(null);
    }
  }, [panelMode]);

  useEffect(() => {
    const nextVisibleKeys = new Set<string>();
    for (const verse of verses) {
      nextVisibleKeys.add(getVerseIdentity(verse));
    }

    for (const prevKey of previousVisibleVerseKeysRef.current) {
      if (!nextVisibleKeys.has(prevKey)) {
        clearLearningStageIntroPopupSeen(prevKey);
      }
    }

    cleanupLearningStageIntroPopupSeenForVisibleVerses(verses);
    previousVisibleVerseKeysRef.current = nextVisibleKeys;
  }, [verses]);

  const fetchLearningVersesForTraining = useCallback(async (): Promise<Verse[]> => {
    let source = pickTrainingSourceVerses(verses);
    if (source.length > 0) return source;
    if (!onRequestMoreTrainingVerses) return source;

    // Pull additional chunks lazily until at least one training verse is available.
    for (let attempts = 0; attempts < 8; attempts += 1) {
      const nextChunk = await onRequestMoreTrainingVerses();
      if (nextChunk.length === 0) break;
      source = mergeVersesByIdentity(source, pickTrainingSourceVerses(nextChunk));
      if (source.length > 0) break;
    }

    return source;
  }, [onRequestMoreTrainingVerses, verses]);

  const applyAuthoritativeTrainingVerse = useCallback(
    (currentVerse: TrainingVerseState, authoritativeVerse: TrainingVerseState) => {
      if (
        !isLearningStageIntroPopupCandidate({
          status: authoritativeVerse.status,
          rawMasteryLevel: authoritativeVerse.rawMasteryLevel,
          repetitions: authoritativeVerse.repetitions,
          lastReviewedAt: authoritativeVerse.lastReviewedAt,
        })
      ) {
        clearLearningStageIntroPopupSeen(authoritativeVerse.key);
      }

      setTrainingVerses((prev) => {
        const targetIndex = prev.findIndex((verse) => verse.key === currentVerse.key);
        if (targetIndex < 0) return prev;
        const nextVerses = [...prev];
        nextVerses[targetIndex] = authoritativeVerse;
        return nextVerses;
      });

      setPreviewOverride(currentVerse.raw, {
        status: authoritativeVerse.status,
        masteryLevel: authoritativeVerse.rawMasteryLevel,
        repetitions: authoritativeVerse.repetitions,
        lastReviewedAt: authoritativeVerse.lastReviewedAt ?? null,
        nextReviewAt: authoritativeVerse.nextReviewAt ?? null,
      });

      onVersePatched?.({
        target: {
          id: currentVerse.raw.id,
          externalVerseId: currentVerse.externalVerseId,
        },
        patch: {
          status: authoritativeVerse.status,
          masteryLevel: authoritativeVerse.rawMasteryLevel,
          repetitions: authoritativeVerse.repetitions,
          lastReviewedAt: authoritativeVerse.lastReviewedAt?.toISOString() ?? null,
          nextReviewAt: authoritativeVerse.nextReviewAt?.toISOString() ?? null,
        },
      });
    },
    [onVersePatched, setPreviewOverride]
  );

  const restoreTrainingVerseAfterFailedPatch = useCallback(
    (
      currentVerse: TrainingVerseState,
      previousSubsetFilter: TrainingSubsetFilter,
      didSwitchSubsetToCatalogOptimistically: boolean
    ) => {
      setTrainingVerses((prev) => {
        const targetIndex = prev.findIndex((verse) => verse.key === currentVerse.key);
        if (targetIndex < 0) return prev;
        const nextVerses = [...prev];
        nextVerses[targetIndex] = currentVerse;
        return nextVerses;
      });

      if (didSwitchSubsetToCatalogOptimistically) {
        setTrainingSubsetFilter(previousSubsetFilter);
      }

      setPreviewOverride(currentVerse.raw, {
        status: currentVerse.status,
        masteryLevel: currentVerse.rawMasteryLevel,
        repetitions: currentVerse.repetitions,
        lastReviewedAt: currentVerse.lastReviewedAt ?? null,
        nextReviewAt: currentVerse.nextReviewAt ?? null,
      });
      setTrainingModeId(chooseModeId(currentVerse));
    },
    [setPreviewOverride]
  );

  const refetchAuthoritativeTrainingVerse = useCallback(
    async (externalVerseId: string): Promise<TrainingVerseState | null> => {
      const currentVerse = trainingVerses.find(
        (verse) => verse.externalVerseId === externalVerseId
      );
      if (!currentVerse) return null;

      const snapshot = await fetchTrainingVerseSnapshot(
        externalVerseId,
        currentVerse.telegramId
      );
      if (!snapshot) return null;

      return normalizePersistedTrainingVerseState(currentVerse, snapshot);
    },
    [trainingVerses]
  );

  const verseSync = useVerseSync({
    onDesync: refetchAuthoritativeTrainingVerse,
  });

  const applyUserTrainingSubsetFilter = useCallback(
    (nextFilter: TrainingSubsetFilter) => {
      hasUserChosenTrainingSubsetRef.current = true;
      setTrainingSubsetFilter((prev) => (prev === nextFilter ? prev : nextFilter));
    },
    []
  );

  const exitTrainingMode = useCallback(
    (target?: TrainingVerseState | null) => {
      const preservedKey = preservedPreviewVerseKeyOnTrainingExitRef.current;
      preservedPreviewVerseKeyOnTrainingExitRef.current = null;
      const effectiveTarget = target ?? trainingActiveVerse;

      if (preservedKey) {
        const preservedIndex = verses.findIndex((v) => getVerseIdentity(v) === preservedKey);
        if (preservedIndex >= 0) {
          setNavActiveIndex(preservedIndex);
        } else if (effectiveTarget) {
          const idx = verses.findIndex((v) => getVerseIdentity(v) === effectiveTarget.key);
          if (idx >= 0) setNavActiveIndex(idx);
        }
      } else if (effectiveTarget) {
        const idx = verses.findIndex((v) => getVerseIdentity(v) === effectiveTarget.key);
        if (idx >= 0) setNavActiveIndex(idx);
      }

      setPanelMode("preview");
      setTrainingModeId(null);
    },
    [trainingActiveVerse, verses, setNavActiveIndex]
  );

  const handleTrainingBackAction = useCallback(() => {
    if (trainingRendererRef.current?.handleBackAction()) return;
    if (!closeTrainingGoesToPreview) {
      onClose();
      return;
    }
    exitTrainingMode();
  }, [closeTrainingGoesToPreview, exitTrainingMode, onClose]);

  const jumpToAdjacentTrainingVerse = useCallback(
    (delta: -1 | 1) => {
      if (panelMode !== "training") return;
      if (!trainingActiveVerse) return;
      const loadMoreAndTryNavigate = async () => {
        if (!onRequestMoreTrainingVerses) return;
        const nextChunk = await onRequestMoreTrainingVerses();
        if (nextChunk.length === 0) return;

        const normalizedChunk = pickTrainingSourceVerses(nextChunk)
          .map(toTrainingVerseState)
          .filter((verse): verse is TrainingVerseState => verse !== null);
        if (normalizedChunk.length === 0) return;

        const existingKeys = new Set(trainingVerses.map((verse) => verse.key));
        const additions = normalizedChunk.filter((verse) => !existingKeys.has(verse.key));
        if (additions.length === 0) return;

        const merged = [...trainingVerses, ...additions];
        const mergedEligibleIndices = merged
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
          .map(({ index }) => index);
        if (mergedEligibleIndices.length === 0) {
          setTrainingVerses(merged);
          return;
        }

        const currentPosInMerged = mergedEligibleIndices.indexOf(trainingIndex);
        let nextMergedIndex: number | undefined;
        if (currentPosInMerged >= 0) {
          const nextPos = currentPosInMerged + delta;
          if (nextPos >= 0 && nextPos < mergedEligibleIndices.length) {
            nextMergedIndex = mergedEligibleIndices[nextPos];
          }
        } else if (delta > 0) {
          nextMergedIndex =
            mergedEligibleIndices.find((index) => index > trainingIndex) ??
            mergedEligibleIndices[0];
        } else {
          nextMergedIndex =
            [...mergedEligibleIndices].reverse().find((index) => index < trainingIndex) ??
            mergedEligibleIndices[mergedEligibleIndices.length - 1];
        }

        setTrainingVerses(merged);
        if (nextMergedIndex == null) return;

        const nextVerse = merged[nextMergedIndex];
        if (!nextVerse) return;
        setNavDirection?.(delta);
        setTrainingIndex(nextMergedIndex);
        setTrainingModeId(chooseModeId(nextVerse));
        haptic("medium");
      };

      if (trainingEligibleIndices.length <= 1) {
        if (delta > 0) void loadMoreAndTryNavigate();
        return;
      }

      const currentPos = trainingEligibleIndices.indexOf(trainingIndex);

      let nextIndex: number | undefined;
      if (currentPos >= 0) {
        const nextPos = currentPos + delta;
        if (nextPos < 0) return;
        if (nextPos >= trainingEligibleIndices.length) {
          if (delta > 0) void loadMoreAndTryNavigate();
          return;
        }
        nextIndex = trainingEligibleIndices[nextPos];
      } else {
        if (delta > 0) {
          nextIndex =
            trainingEligibleIndices.find((idx) => idx > trainingIndex) ??
            trainingEligibleIndices[0];
        } else {
          nextIndex =
            [...trainingEligibleIndices].reverse().find((idx) => idx < trainingIndex) ??
            trainingEligibleIndices[trainingEligibleIndices.length - 1];
        }

        if (nextIndex == null && delta > 0) {
          void loadMoreAndTryNavigate();
          return;
        }
      }

      const nextVerse = trainingVerses[nextIndex ?? -1];
      if (!nextVerse) return;
      setNavDirection?.(delta);
      setTrainingIndex(nextIndex!);
      setTrainingModeId(chooseModeId(nextVerse));
      haptic("medium");
    },
    [
      onRequestMoreTrainingVerses,
      panelMode,
      trainingActiveVerse,
      trainingEligibleIndices,
      trainingIndex,
      trainingSubsetFilter,
      trainingVerses,
      setNavDirection,
    ]
  );

  const removeCompletedTrainingVerseAndNavigate = useCallback(
    (delta: -1 | 1) => {
      if (panelMode !== "training") return;
      if (!trainingActiveVerse) return;

      const currentKey = trainingActiveVerse.key;
      const nextList = trainingVerses.filter((verse) => verse.key !== currentKey);

      if (nextList.length === trainingVerses.length) {
        jumpToAdjacentTrainingVerse(delta);
        return;
      }

      if (nextList.length === 0) {
        if (delta > 0 && onRequestMoreTrainingVerses) {
          void (async () => {
            const nextChunk = await onRequestMoreTrainingVerses();
            const normalizedChunk = pickTrainingSourceVerses(nextChunk)
              .map(toTrainingVerseState)
              .filter((verse): verse is TrainingVerseState => verse !== null);

            if (normalizedChunk.length === 0) {
              setTrainingVerses([]);
              setTrainingIndex(0);
              setTrainingModeId(null);
              haptic("light");
              return;
            }

            const candidateIndices = normalizedChunk
              .map((verse, index) => ({ verse, index }))
              .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
              .map(({ index }) => index);
            const fallbackEligibleIndices = normalizedChunk
              .map((verse, index) => ({ verse, index }))
              .filter(({ verse }) => isTrainingEligibleVerse(verse))
              .map(({ index }) => index);

            let nextIndex = candidateIndices[0] ?? fallbackEligibleIndices[0] ?? 0;
            if (
              candidateIndices.length === 0 &&
              fallbackEligibleIndices.length > 0 &&
              trainingSubsetFilter !== "catalog"
            ) {
              setTrainingSubsetFilter("catalog");
            }

            nextIndex = Math.min(Math.max(nextIndex, 0), normalizedChunk.length - 1);
            const nextVerse = normalizedChunk[nextIndex];

            setTrainingVerses(normalizedChunk);
            setTrainingIndex(nextIndex);
            setTrainingModeId(nextVerse ? chooseModeId(nextVerse) : null);
            haptic("light");
          })();
          return;
        }

        setTrainingVerses([]);
        setTrainingIndex(0);
        setTrainingModeId(null);
        haptic("light");
        return;
      }

      const candidateIndices = nextList
        .map((verse, index) => ({ verse, index }))
        .filter(({ verse }) => matchesTrainingSubsetFilter(verse, trainingSubsetFilter))
        .map(({ index }) => index);

      let nextIndex: number | null = null;
      if (candidateIndices.length > 0) {
        const pivot = delta > 0 ? trainingIndex : trainingIndex - 1;
        if (delta > 0) {
          nextIndex =
            candidateIndices.find((idx) => idx >= pivot) ?? candidateIndices[0] ?? null;
        } else {
          nextIndex =
            [...candidateIndices].reverse().find((idx) => idx <= pivot) ??
            candidateIndices[candidateIndices.length - 1] ??
            null;
        }
      } else {
        const fallbackEligible = nextList
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => isTrainingEligibleVerse(verse))
          .map(({ index }) => index);
        if (fallbackEligible.length > 0) {
          nextIndex =
            delta > 0
              ? (fallbackEligible[0] ?? 0)
              : (fallbackEligible[fallbackEligible.length - 1] ?? 0);
          if (trainingSubsetFilter !== "catalog") setTrainingSubsetFilter("catalog");
        } else {
          nextIndex = Math.min(
            Math.max(delta > 0 ? trainingIndex : trainingIndex - 1, 0),
            nextList.length - 1
          );
        }
      }

      const nextVerse = nextIndex != null ? nextList[nextIndex] : nextList[0];
      setNavDirection?.(delta);
      setTrainingVerses(nextList);
      if (nextVerse) {
        const resolvedIndex = nextList.findIndex((verse) => verse.key === nextVerse.key);
        setTrainingIndex(resolvedIndex >= 0 ? resolvedIndex : 0);
        setTrainingModeId(chooseModeId(nextVerse));
      } else {
        setTrainingIndex(0);
        setTrainingModeId(null);
      }
      haptic("light");
    },
    [
      jumpToAdjacentTrainingVerse,
      onRequestMoreTrainingVerses,
      panelMode,
      trainingActiveVerse,
      trainingIndex,
      trainingSubsetFilter,
      trainingVerses,
      setNavDirection,
    ]
  );

  const handleTrainingNavigationStep = useCallback(
    (delta: -1 | 1) => {
      jumpToAdjacentTrainingVerse(delta);
    },
    [jumpToAdjacentTrainingVerse]
  );

  const startTrainingFromActiveVerse = useCallback(
    async (
      forcedSubset?: "learning" | "review",
      options?: { preservePreviewCard?: boolean }
    ): Promise<boolean> => {
      if (isActionPending || !previewActiveVerse) return false;
      const preservePreviewCard = options?.preservePreviewCard === true;
      preservedPreviewVerseKeyOnTrainingExitRef.current = null;

      try {
        setIsActionPending(true);
        const startVerse = previewActiveVerse;
        const activeDisplayStatus = normalizeVerseStatus(previewActiveVerse.status);
        const startKey = getVerseIdentity(startVerse);

        let learningRaw = await fetchLearningVersesForTraining();
        let normalized = learningRaw
          .map(toTrainingVerseState)
          .filter((v): v is TrainingVerseState => v !== null);

        if (!normalized.some((v) => v.key === startKey)) {
          const fallback = toTrainingVerseState(startVerse);
          if (
            fallback &&
            (fallback.status === VerseStatus.LEARNING || fallback.status === "REVIEW")
          ) {
            normalized = [fallback, ...normalized];
          }
        }

        let eligibleIndices = normalized
          .map((verse, index) => ({ verse, index }))
          .filter(({ verse }) => isTrainingEligibleVerse(verse))
          .map(({ index }) => index);

        while (eligibleIndices.length === 0 && onRequestMoreTrainingVerses) {
          const nextChunk = await onRequestMoreTrainingVerses();
          if (nextChunk.length === 0) break;

          learningRaw = mergeVersesByIdentity(learningRaw, pickTrainingSourceVerses(nextChunk));
          normalized = learningRaw
            .map(toTrainingVerseState)
            .filter((verse): verse is TrainingVerseState => verse !== null);

          if (!normalized.some((verse) => verse.key === startKey)) {
            const fallback = toTrainingVerseState(startVerse);
            if (
              fallback &&
              (fallback.status === VerseStatus.LEARNING || fallback.status === "REVIEW")
            ) {
              normalized = [fallback, ...normalized];
            }
          }

          eligibleIndices = normalized
            .map((verse, index) => ({ verse, index }))
            .filter(({ verse }) => isTrainingEligibleVerse(verse))
            .map(({ index }) => index);
        }

        if (eligibleIndices.length === 0) {
          showFeedback("Нет доступных стихов LEARNING/REVIEW", "error");
          return false;
        }

        const selectedSubsetHint: TrainingSubsetFilter =
          activeDisplayStatus === "REVIEW" || activeDisplayStatus === "MASTERED"
            ? "review"
            : activeDisplayStatus === VerseStatus.LEARNING
              ? "learning"
              : "catalog";

        const preferredSubset: TrainingSubsetFilter =
          forcedSubset === "learning" || forcedSubset === "review"
            ? forcedSubset
            : selectedSubsetHint !== "catalog"
              ? selectedSubsetHint
              : "catalog";

        const getEligibleIndicesByFilter = (filter: TrainingSubsetFilter) =>
          normalized
            .map((verse, index) => ({ verse, index }))
            .filter(({ verse }) => matchesTrainingSubsetFilter(verse, filter))
            .map(({ index }) => index);

        let effectiveSubset = preferredSubset;
        let preferredEligibleIndices = getEligibleIndicesByFilter(effectiveSubset);
        if (preferredEligibleIndices.length === 0 && effectiveSubset !== "catalog") {
          effectiveSubset = "catalog";
          preferredEligibleIndices = getEligibleIndicesByFilter("catalog");
        }

        const activePreferredIndex = normalized.findIndex(
          (v) => v.key === startKey && matchesTrainingSubsetFilter(v, effectiveSubset)
        );

        const startIndex =
          activePreferredIndex >= 0
            ? activePreferredIndex
            : (preferredEligibleIndices[0] ?? eligibleIndices[0] ?? -1);
        if (startIndex < 0) {
          showFeedback("Нет доступных стихов LEARNING/REVIEW", "error");
          return false;
        }

        const startState = normalized[startIndex];
        if (!startState) {
          showFeedback("Нет доступных стихов LEARNING/REVIEW", "error");
          return false;
        }

        hasUserChosenTrainingSubsetRef.current = false;

        setTrainingVerses(normalized);
        setTrainingSubsetFilter(effectiveSubset);

        if (preservePreviewCard) {
          preservedPreviewVerseKeyOnTrainingExitRef.current = getVerseIdentity(previewActiveVerse);
        }

        setTrainingIndex(startIndex);
        setTrainingModeId(chooseModeId(startState));
        setPanelMode("training");
        haptic("medium");

        const shouldShowLearningIntroPopup =
          isLearningStageIntroPopupCandidate({
            status: startState.status,
            rawMasteryLevel: startState.rawMasteryLevel,
            repetitions: startState.repetitions,
            lastReviewedAt: startState.lastReviewedAt,
          }) && !hasLearningStageIntroPopupBeenSeen(startState.key);

        if (shouldShowLearningIntroPopup) {
          await showTrainingMilestonePopup(
            getTrainingLearningStartPopupPayload({
              reference: startState.raw.reference,
              rawMasteryLevel: startState.rawMasteryLevel,
              repetitions: startState.repetitions,
            })
          );
          markLearningStageIntroPopupSeen(startState.key);
        }

        return true;
      } catch {
        haptic("error");
        showFeedback("Ошибка — попробуйте ещё раз", "error");
        return false;
      } finally {
        setIsActionPending(false);
      }
    },
    [
      isActionPending,
      fetchLearningVersesForTraining,
      onRequestMoreTrainingVerses,
      previewActiveVerse,
      setIsActionPending,
      showFeedback,
      showTrainingMilestonePopup,
    ]
  );

  const handleTrainingRate = useCallback(
    async (rating: Rating) => {
      if (panelMode !== "training" || trainingModeId === null || isActionPending) return;
      const current = trainingVerses[trainingIndex];
      if (!current) return;
      if (!isTrainingEligibleVerse(current)) {
        haptic("warning");
        showFeedback("Стих сейчас недоступен для тренировки", "error");
        return;
      }

      setIsActionPending(true);
      try {
        const wasReviewExercise = isTrainingReviewVerse(current);
        const rawMasteryBefore = current.rawMasteryLevel;
        const isLearningVerse = current.status === VerseStatus.LEARNING;
        const now = new Date();
        const progressDelta = computeProgressDelta({
          phase: wasReviewExercise ? "review" : "learning",
          rating,
          rawMasteryLevel: rawMasteryBefore,
          repetitions: current.repetitions,
          now,
          trainingModeId,
          isLearningVerse,
        });

        const rawMasteryAfter = progressDelta.rawMasteryLevel;
        const stageMasteryAfter = progressDelta.stageMasteryLevel;
        const graduatesToReview = progressDelta.graduatesToReview;
        const reviewWasSuccessful = progressDelta.reviewWasSuccessful;
        const canUpdateRepetitions = progressDelta.canUpdateRepetitions;
        const nextRepetitions = progressDelta.repetitions;
        const nextReviewAt = progressDelta.nextReviewAt;

        const becameLearned = graduatesToReview;

        const nextStatus =
          current.status === VerseStatus.STOPPED
            ? VerseStatus.STOPPED
            : rawMasteryAfter > 0
              ? computeDisplayStatus(rawMasteryAfter, nextRepetitions)
              : VerseStatus.MY;

        const updated: TrainingVerseState = {
          ...current,
          raw: {
            ...current.raw,
            masteryLevel: rawMasteryAfter,
            repetitions: nextRepetitions,
            status: nextStatus,
          } as Verse,
          rawMasteryLevel: rawMasteryAfter,
          stageMasteryLevel: stageMasteryAfter,
          repetitions: nextRepetitions,
          status: nextStatus,
          // When a verse graduates to REVIEW, reset review rotation to the first review mode.
          lastModeId: !wasReviewExercise && graduatesToReview ? null : trainingModeId,
          lastReviewedAt: now,
          nextReviewAt,
        };

        const optimisticShouldMoveToNextVerse =
          wasReviewExercise || becameLearned || nextStatus === "MASTERED";
        let didSwitchSubsetToCatalogOptimistically = false;

        // Always reflect optimistic state immediately so the card visuals stay in sync
        // while milestone popup is open. Removal still happens only after popup confirm.
        const updatedList = [...trainingVerses];
        updatedList[trainingIndex] = updated;
        setTrainingVerses(updatedList);

        setPreviewOverride(current.raw, {
          status: updated.status,
          masteryLevel: rawMasteryAfter,
          ...(canUpdateRepetitions ? { repetitions: updated.repetitions } : {}),
        });

        if (becameLearned) {
          haptic("success");
          showFeedback("Стих выучен", "success");
        }

        const nextMode = getModeByShiftInProgressOrder(
          trainingModeId,
          MODE_SHIFT_BY_RATING[rating] ?? 1
        );
        const nextModeForCurrentVerse =
          becameLearned
            ? chooseModeId(updated)
            : !wasReviewExercise && nextMode
              ? nextMode
              : chooseModeId(updated);

        if (!optimisticShouldMoveToNextVerse) {
          if (
            trainingSubsetFilter !== "catalog" &&
            !matchesTrainingSubsetFilter(updated, trainingSubsetFilter)
          ) {
            showFeedback(
              "Стих вышел из текущего фильтра. Переключаем на «Каталог».",
              "info"
            );
            setTrainingSubsetFilter("catalog");
            didSwitchSubsetToCatalogOptimistically = true;
          }

          setTrainingModeId(nextModeForCurrentVerse);
        }

        try {
          const persistedResponse = await persistTrainingVerseProgress(updated, {
            includeRepetitions: canUpdateRepetitions,
          });
          const persistedUpdated = await verseSync.reconcile({
            optimistic: updated,
            persistedResponse,
          });

          const finalShouldMoveToNextVerse =
            wasReviewExercise || becameLearned || persistedUpdated.status === "MASTERED";
          applyAuthoritativeTrainingVerse(current, persistedUpdated);

          if (!finalShouldMoveToNextVerse) {
            const persistedNextModeForCurrentVerse =
              becameLearned
                ? chooseModeId(persistedUpdated)
                : !wasReviewExercise && nextMode
                  ? nextMode
                  : chooseModeId(persistedUpdated);

            const shouldSwitchSubsetToCatalog =
              trainingSubsetFilter !== "catalog" &&
              !matchesTrainingSubsetFilter(persistedUpdated, trainingSubsetFilter);

            if (
              shouldSwitchSubsetToCatalog &&
              !didSwitchSubsetToCatalogOptimistically
            ) {
              showFeedback(
                "Стих вышел из текущего фильтра. Переключаем на «Каталог».",
                "info"
              );
              setTrainingSubsetFilter("catalog");
            }

            if (
              didSwitchSubsetToCatalogOptimistically &&
              !shouldSwitchSubsetToCatalog
            ) {
              setTrainingSubsetFilter(trainingSubsetFilter);
            }

            setTrainingModeId(persistedNextModeForCurrentVerse);
          }

          const contactToast = getTrainingContactToastPayload({
            wasReviewExercise,
            reviewWasSuccessful,
            reference: persistedUpdated.raw.reference,
            finalStatus: persistedUpdated.status,
            nextReviewAt: persistedUpdated.nextReviewAt,
            beforeRawMasteryLevel: current.rawMasteryLevel,
            afterRawMasteryLevel: persistedUpdated.rawMasteryLevel,
          });

          const milestonePopup = getTrainingMilestonePopupPayload({
            wasReviewExercise,
            beforeStatus: current.status,
            finalStatus: persistedUpdated.status,
            reference: persistedUpdated.raw.reference,
            nextReviewAt: persistedUpdated.nextReviewAt,
            beforeRawMasteryLevel: current.rawMasteryLevel,
            beforeRepetitions: current.repetitions,
            afterRawMasteryLevel: persistedUpdated.rawMasteryLevel,
            afterRepetitions: persistedUpdated.repetitions,
          });

          showTrainingContactToast(contactToast);
          if (milestonePopup) {
            await showTrainingMilestonePopup(milestonePopup);
          }

          if (finalShouldMoveToNextVerse) {
            removeCompletedTrainingVerseAndNavigate(1);
          }
        } catch (error) {
          console.error("Failed to persist training progress", error);
          const recoveredVerse = await verseSync.recoverFromPatchFailure(
            current.externalVerseId
          );

          if (recoveredVerse) {
            applyAuthoritativeTrainingVerse(current, recoveredVerse);

            const shouldSwitchSubsetToCatalog =
              trainingSubsetFilter !== "catalog" &&
              !matchesTrainingSubsetFilter(recoveredVerse, trainingSubsetFilter);

            if (shouldSwitchSubsetToCatalog && !didSwitchSubsetToCatalogOptimistically) {
              showFeedback(
                "Стих вышел из текущего фильтра. Переключаем на «Каталог».",
                "info"
              );
              setTrainingSubsetFilter("catalog");
            }

            if (
              didSwitchSubsetToCatalogOptimistically &&
              !shouldSwitchSubsetToCatalog
            ) {
              setTrainingSubsetFilter(trainingSubsetFilter);
            }

            setTrainingModeId(chooseModeId(recoveredVerse));
          } else {
            restoreTrainingVerseAfterFailedPatch(
              current,
              trainingSubsetFilter,
              didSwitchSubsetToCatalogOptimistically
            );
          }

          haptic("error");
          showFeedback("Ошибка — попробуйте ещё раз", "error");
        }
      } finally {
        setIsActionPending(false);
      }
    },
    [
      isActionPending,
      setIsActionPending,
      onVersePatched,
      panelMode,
      removeCompletedTrainingVerseAndNavigate,
      setPreviewOverride,
      showFeedback,
      showTrainingContactToast,
      showTrainingMilestonePopup,
      trainingIndex,
      trainingModeId,
      trainingSubsetFilter,
      trainingVerses,
    ]
  );

  const quickForgetLabel =
    trainingActiveVerse && isTrainingReviewVerse(trainingActiveVerse)
      ? "Не вспомнил"
      : "Забыл";

  const requestQuickForget = useCallback(() => {
    if (panelMode !== "training" || trainingModeId === null || isActionPending) return;
    const current = trainingVerses[trainingIndex];
    if (!current) return;
    if (!isTrainingEligibleVerse(current)) return;

    const stage: QuickForgetConfirmStage = isTrainingReviewVerse(current)
      ? "review"
      : "learning";

    if (stage === "review") {
      setQuickForgetConfirmStage("review");
      return;
    }

    if (hasLearningQuickForgetConfirmBeenSeen()) {
      void handleTrainingRate(0);
      return;
    }

    setQuickForgetConfirmStage("learning");
  }, [isActionPending, handleTrainingRate, panelMode, trainingIndex, trainingModeId, trainingVerses]);

  const confirmQuickForget = useCallback(() => {
    const stage = quickForgetConfirmStage;
    if (!stage) return;
    setQuickForgetConfirmStage(null);
    if (stage === "learning") {
      markLearningQuickForgetConfirmSeen();
    }
    void handleTrainingRate(0);
  }, [handleTrainingRate, quickForgetConfirmStage]);

  const cancelQuickForget = useCallback(() => {
    setQuickForgetConfirmStage(null);
  }, []);

  const stableStartTrainingFromActiveVerse = useEventCallback(startTrainingFromActiveVerse);
  const stableHandleTrainingRate = useEventCallback(handleTrainingRate);
  const stableHandleTrainingNavigationStep = useEventCallback(handleTrainingNavigationStep);
  const stableHandleTrainingBackAction = useEventCallback(handleTrainingBackAction);
  const stableRequestQuickForget = useEventCallback(requestQuickForget);
  const stableConfirmQuickForget = useEventCallback(confirmQuickForget);
  const stableCancelQuickForget = useEventCallback(cancelQuickForget);

  // Auto-start training when gallery opens directly in training mode
  useEffect(() => {
    if (!autoStartInTraining) return;
    if (autoStartedTrainingRef.current) return;
    if (panelMode !== "preview") return;
    if (!previewActiveVerse) return;
    if (isActionPending) return;

    autoStartedTrainingRef.current = true;
    setIsAutoStartingTraining(true);
    let cancelled = false;

    void (async () => {
      try {
        await stableStartTrainingFromActiveVerse();
      } finally {
        if (!cancelled) setIsAutoStartingTraining(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    autoStartInTraining,
    panelMode,
    previewActiveVerse,
    isActionPending,
    stableStartTrainingFromActiveVerse,
  ]);

  return {
    panelMode,
    trainingActiveVerse,
    trainingIndex,
    trainingModeId,
    trainingSubsetFilter,
    trainingEligibleIndices,
    isAutoStartingTraining,
    trainingRendererRef,
    startTrainingFromActiveVerse: stableStartTrainingFromActiveVerse,
    handleTrainingRate: stableHandleTrainingRate,
    handleTrainingNavigationStep: stableHandleTrainingNavigationStep,
    exitTrainingMode,
    handleTrainingBackAction: stableHandleTrainingBackAction,
    applyUserTrainingSubsetFilter,
    quickForgetLabel,
    quickForgetConfirmStage,
    requestQuickForget: stableRequestQuickForget,
    confirmQuickForget: stableConfirmQuickForget,
    cancelQuickForget: stableCancelQuickForget,
  };
}
