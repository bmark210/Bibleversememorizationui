import type { AnchorModeGroup, CoreTrainingMode, TrainingScenario } from "./types";
import { ALL_ANCHOR_MODE_GROUPS } from "./types";
import type { ChapterFilter } from "@/app/types/chapter";

export const TRAINING_HUB_PREFERENCES_KEY = "training.hub-preferences";
export const CHAPTER_FILTER_KEY = "training.chapterFilter";

const PREFS_VERSION = 1 as const;

type StoredShape = {
  v: typeof PREFS_VERSION;
  scenario: TrainingScenario;
  coreModes: CoreTrainingMode[];
  anchorModes: AnchorModeGroup[];
};

const ANCHOR_SET = new Set<string>(ALL_ANCHOR_MODE_GROUPS);

function isScenario(v: unknown): v is TrainingScenario {
  return v === "core" || v === "anchor";
}

function normalizeCoreModes(raw: unknown): CoreTrainingMode[] | null {
  if (!Array.isArray(raw)) return null;
  const hasLearning = raw.includes("learning");
  const hasReview = raw.includes("review");
  if (hasLearning && hasReview) return ["learning", "review"];
  if (hasLearning) return ["learning"];
  if (hasReview) return ["review"];
  return null;
}

function normalizeAnchorModes(raw: unknown): AnchorModeGroup[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const next: AnchorModeGroup[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== "string" || !ANCHOR_SET.has(item) || seen.has(item)) continue;
    seen.add(item);
    next.push(item as AnchorModeGroup);
  }
  return next.length > 0 ? next : null;
}

export type TrainingHubPreferences = {
  scenario: TrainingScenario;
  coreModes: CoreTrainingMode[];
  anchorModes: AnchorModeGroup[];
};

export function readTrainingHubPreferences(): TrainingHubPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(TRAINING_HUB_PREFERENCES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredShape>;
    if (parsed.v !== PREFS_VERSION) return null;
    if (!isScenario(parsed.scenario)) return null;
    const coreModes = normalizeCoreModes(parsed.coreModes);
    const anchorModes = normalizeAnchorModes(parsed.anchorModes);
    if (!coreModes || !anchorModes) return null;
    return {
      scenario: parsed.scenario,
      coreModes,
      anchorModes,
    };
  } catch {
    return null;
  }
}

export function writeTrainingHubPreferences(prefs: TrainingHubPreferences): void {
  if (typeof window === "undefined") return;
  try {
    const payload: StoredShape = {
      v: PREFS_VERSION,
      scenario: prefs.scenario,
      coreModes: prefs.coreModes,
      anchorModes: prefs.anchorModes,
    };
    window.localStorage.setItem(
      TRAINING_HUB_PREFERENCES_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // ignore quota / private mode
  }
}

export function readChapterFilter(): ChapterFilter {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CHAPTER_FILTER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "bookId" in parsed &&
      "chapterNo" in parsed &&
      typeof (parsed as Record<string, unknown>).bookId === "number" &&
      typeof (parsed as Record<string, unknown>).chapterNo === "number"
    ) {
      return {
        bookId: (parsed as { bookId: number; chapterNo: number }).bookId,
        chapterNo: (parsed as { bookId: number; chapterNo: number }).chapterNo,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function writeChapterFilter(filter: ChapterFilter): void {
  if (typeof window === "undefined") return;
  try {
    if (filter === null) {
      window.localStorage.removeItem(CHAPTER_FILTER_KEY);
    } else {
      window.localStorage.setItem(CHAPTER_FILTER_KEY, JSON.stringify(filter));
    }
  } catch {
    // ignore
  }
}
