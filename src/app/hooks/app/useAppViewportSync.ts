"use client";

import { useEffect } from "react";
import {
  getTelegramWebApp,
  type TelegramWebApp,
} from "@/app/lib/telegramWebApp";
import { useAppViewportStore } from "@/app/stores/appViewportStore";

const KEYBOARD_OPEN_THRESHOLD_PX = 100;
const FOCUS_SETTLE_DELAY_MS = 120;
const FULL_TEXT_ENTRY_HEIGHT_MIN_PX = 192;
const FULL_TEXT_ENTRY_HEIGHT_MAX_PX = 248;
const FULL_TEXT_ENTRY_HEIGHT_RATIO = 0.3;
const COMPACT_TEXT_ENTRY_HEIGHT_MIN_PX = 160;
const COMPACT_TEXT_ENTRY_HEIGHT_MAX_PX = 208;
const COMPACT_TEXT_ENTRY_HEIGHT_RATIO = 0.24;

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function roundViewportValue(value: number | undefined | null) {
  if (!value || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function isEditableElement(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) {
    return true;
  }

  if (target instanceof HTMLTextAreaElement) {
    return !target.disabled && !target.readOnly;
  }

  if (target instanceof HTMLInputElement) {
    if (target.disabled || target.readOnly) return false;
    return !NON_TEXT_INPUT_TYPES.has(target.type);
  }

  return false;
}

function readViewportCandidates(webApp: TelegramWebApp | undefined) {
  const visualViewport = window.visualViewport;
  const candidates = [
    roundViewportValue(webApp?.viewportHeight),
    roundViewportValue(window.innerHeight),
    roundViewportValue(document.documentElement.clientHeight),
    roundViewportValue(visualViewport?.height),
  ].filter((value) => value > 0);

  return {
    stableCandidate: Math.max(
      roundViewportValue(webApp?.viewportStableHeight),
      ...candidates,
    ),
    visibleViewportHeight:
      candidates.length > 0 ? Math.min(...candidates) : 0,
  };
}

function syncRootViewportState(
  isKeyboardOpen: boolean,
  keyboardOffset: number,
  stableViewportHeight: number,
  visibleViewportHeight: number,
) {
  const root = document.documentElement;
  const fullTextEntryHeight = clampNumber(
    Math.round(stableViewportHeight * FULL_TEXT_ENTRY_HEIGHT_RATIO),
    FULL_TEXT_ENTRY_HEIGHT_MIN_PX,
    FULL_TEXT_ENTRY_HEIGHT_MAX_PX,
  );
  const compactTextEntryHeight = clampNumber(
    Math.round(stableViewportHeight * COMPACT_TEXT_ENTRY_HEIGHT_RATIO),
    COMPACT_TEXT_ENTRY_HEIGHT_MIN_PX,
    COMPACT_TEXT_ENTRY_HEIGHT_MAX_PX,
  );

  root.dataset.appKeyboardOpen = isKeyboardOpen ? "true" : "false";
  root.style.setProperty("--app-keyboard-offset", `${keyboardOffset}px`);
  root.style.setProperty(
    "--app-stable-viewport-height",
    `${stableViewportHeight}px`,
  );
  root.style.setProperty(
    "--app-visible-viewport-height",
    `${visibleViewportHeight}px`,
  );
  root.style.setProperty(
    "--app-training-text-entry-height",
    `${fullTextEntryHeight}px`,
  );
  root.style.setProperty(
    "--app-training-text-entry-compact-height",
    `${compactTextEntryHeight}px`,
  );
}

function resetRootViewportState() {
  const root = document.documentElement;
  root.dataset.appKeyboardOpen = "false";
  root.style.setProperty("--app-keyboard-offset", "0px");
  root.style.removeProperty("--app-stable-viewport-height");
  root.style.removeProperty("--app-visible-viewport-height");
  root.style.removeProperty("--app-training-text-entry-height");
  root.style.removeProperty("--app-training-text-entry-compact-height");
}

export function useAppViewportSync() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const webApp = getTelegramWebApp();
    let blurTimeoutId: number | null = null;
    let animationFrameId: number | null = null;
    let stableViewportHeight = 0;

    const updateViewportState = () => {
      const hasEditableFocus = isEditableElement(document.activeElement);
      const { stableCandidate, visibleViewportHeight } =
        readViewportCandidates(webApp);

      if (!hasEditableFocus) {
        stableViewportHeight = stableCandidate;
      } else if (stableViewportHeight === 0) {
        stableViewportHeight = stableCandidate;
      } else {
        stableViewportHeight = Math.max(
          stableViewportHeight,
          roundViewportValue(webApp?.viewportStableHeight),
        );
      }

      const keyboardOffset =
        stableViewportHeight > 0 && hasEditableFocus
          ? Math.max(0, stableViewportHeight - visibleViewportHeight)
          : 0;
      const isKeyboardOpen =
        hasEditableFocus && keyboardOffset >= KEYBOARD_OPEN_THRESHOLD_PX;

      syncRootViewportState(
        isKeyboardOpen,
        keyboardOffset,
        stableViewportHeight,
        visibleViewportHeight,
      );
      useAppViewportStore.getState().setViewportRuntime({
        hasEditableFocus,
        isKeyboardOpen,
        keyboardOffset,
        stableViewportHeight,
        visibleViewportHeight,
      });
    };

    const scheduleViewportUpdate = () => {
      if (animationFrameId !== null) return;

      animationFrameId = window.requestAnimationFrame(() => {
        animationFrameId = null;
        updateViewportState();
      });
    };

    const handleFocusOut = () => {
      if (blurTimeoutId !== null) {
        window.clearTimeout(blurTimeoutId);
      }

      blurTimeoutId = window.setTimeout(() => {
        blurTimeoutId = null;
        scheduleViewportUpdate();
      }, FOCUS_SETTLE_DELAY_MS);
    };

    const handleOrientationChange = () => {
      stableViewportHeight = 0;
      scheduleViewportUpdate();
    };

    scheduleViewportUpdate();

    document.addEventListener("focusin", scheduleViewportUpdate, true);
    document.addEventListener("focusout", handleFocusOut, true);
    window.addEventListener("resize", scheduleViewportUpdate);
    window.addEventListener("orientationchange", handleOrientationChange);
    window.visualViewport?.addEventListener("resize", scheduleViewportUpdate);
    window.visualViewport?.addEventListener("scroll", scheduleViewportUpdate);
    webApp?.onEvent?.("viewportChanged", scheduleViewportUpdate);

    return () => {
      document.removeEventListener("focusin", scheduleViewportUpdate, true);
      document.removeEventListener("focusout", handleFocusOut, true);
      window.removeEventListener("resize", scheduleViewportUpdate);
      window.removeEventListener("orientationchange", handleOrientationChange);
      window.visualViewport?.removeEventListener(
        "resize",
        scheduleViewportUpdate,
      );
      window.visualViewport?.removeEventListener(
        "scroll",
        scheduleViewportUpdate,
      );
      webApp?.offEvent?.("viewportChanged", scheduleViewportUpdate);

      if (blurTimeoutId !== null) {
        window.clearTimeout(blurTimeoutId);
      }
      if (animationFrameId !== null) {
        window.cancelAnimationFrame(animationFrameId);
      }

      resetRootViewportState();
      useAppViewportStore.getState().resetViewportRuntime();
    };
  }, []);
}
