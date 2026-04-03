"use client";

import { create } from "zustand";
import type { MyVersesSectionKey } from "@/app/components/verse-list/constants";

const STORAGE_KEY = "my-verses:ui-prefs:v1";

type StoredShape = {
  v: 1;
  collapsed: MyVersesSectionKey[];
  hidden: MyVersesSectionKey[];
};

const VALID_KEYS: ReadonlySet<string> = new Set<MyVersesSectionKey>([
  "learning",
  "queue",
  "review",
  "mastered",
  "stopped",
  "my",
]);

function isValidKey(value: string): value is MyVersesSectionKey {
  return VALID_KEYS.has(value);
}

function readFromStorage(): { collapsed: Set<MyVersesSectionKey>; hidden: Set<MyVersesSectionKey> } {
  if (typeof window === "undefined") return { collapsed: new Set(), hidden: new Set() };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { collapsed: new Set(), hidden: new Set() };

    const parsed: StoredShape = JSON.parse(raw);
    if (parsed.v !== 1) return { collapsed: new Set(), hidden: new Set() };

    return {
      collapsed: new Set((parsed.collapsed ?? []).filter(isValidKey)),
      hidden: new Set((parsed.hidden ?? []).filter(isValidKey)),
    };
  } catch {
    return { collapsed: new Set(), hidden: new Set() };
  }
}

function writeToStorage(collapsed: Set<MyVersesSectionKey>, hidden: Set<MyVersesSectionKey>) {
  if (typeof window === "undefined") return;

  try {
    const data: StoredShape = {
      v: 1,
      collapsed: [...collapsed],
      hidden: [...hidden],
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage write errors in restricted webviews.
  }
}

type MyVersesUiStore = {
  collapsedSections: Set<MyVersesSectionKey>;
  hiddenSections: Set<MyVersesSectionKey>;
  toggleCollapsed: (key: MyVersesSectionKey) => void;
  toggleHidden: (key: MyVersesSectionKey) => void;
  hydrateFromStorage: () => void;
};

export const useMyVersesUiStore = create<MyVersesUiStore>((set, get) => ({
  collapsedSections: new Set(),
  hiddenSections: new Set(),

  toggleCollapsed: (key) => {
    const next = new Set(get().collapsedSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    set({ collapsedSections: next });
    writeToStorage(next, get().hiddenSections);
  },

  toggleHidden: (key) => {
    const next = new Set(get().hiddenSections);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    set({ hiddenSections: next });
    writeToStorage(get().collapsedSections, next);
  },

  hydrateFromStorage: () => {
    const { collapsed, hidden } = readFromStorage();
    set({ collapsedSections: collapsed, hiddenSections: hidden });
  },
}));
