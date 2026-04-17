"use client";

import { create } from "zustand";

const STORAGE_KEY = "app.bible-translation";

export type AppTranslation = "SYNOD" | "KJV";

export interface TranslationOption {
  value: AppTranslation;
  /** Короткий ярлык для UI */
  label: string;
  /** Полное название */
  fullLabel: string;
  /** Язык текста */
  lang: "ru" | "en";
}

export const TRANSLATION_OPTIONS: TranslationOption[] = [
  { value: "SYNOD", label: "Синодальный", fullLabel: "Синодальный перевод",       lang: "ru" },
  { value: "KJV",   label: "KJV",         fullLabel: "King James Version (1611)", lang: "en" },
];

function isValidTranslation(v: string | null): v is AppTranslation {
  return v === "SYNOD" || v === "KJV";
}

function read(): AppTranslation {
  if (typeof window === "undefined") return "SYNOD";
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isValidTranslation(stored) ? stored : "SYNOD";
  } catch {
    return "SYNOD";
  }
}

function write(t: AppTranslation) {
  if (typeof window === "undefined") return;
  try {
    if (t === "SYNOD") {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, t);
    }
  } catch {
    // ignore storage errors in restricted webviews
  }
}

interface TranslationStore {
  translation: AppTranslation;
  hydrateTranslation: () => AppTranslation;
  setTranslation: (t: AppTranslation) => void;
}

export const useTranslationStore = create<TranslationStore>((set) => ({
  translation: "SYNOD",
  hydrateTranslation: () => {
    const translation = read();
    set({ translation });
    return translation;
  },
  setTranslation: (translation) => {
    write(translation);
    set({ translation });
  },
}));
