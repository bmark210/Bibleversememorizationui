import { useEffect, useRef } from "react";
import { getTelegramWebApp } from "@/app/lib/telegramWebApp";

type TelegramBackButtonEntry = {
  id: string;
  enabled: boolean;
  order: number;
  priority: number;
  onBack: () => void;
};

type UseTelegramBackButtonParams = {
  enabled: boolean;
  onBack: () => void;
  priority?: number;
};

const backButtonEntries = new Map<string, TelegramBackButtonEntry>();
let backButtonSequence = 0;
let activeBackHandler: (() => void) | null = null;

function getActiveBackButtonEntry(): TelegramBackButtonEntry | null {
  let activeEntry: TelegramBackButtonEntry | null = null;

  for (const entry of backButtonEntries.values()) {
    if (!entry.enabled) continue;

    if (
      activeEntry === null ||
      entry.priority > activeEntry.priority ||
      (entry.priority === activeEntry.priority && entry.order > activeEntry.order)
    ) {
      activeEntry = entry;
    }
  }

  return activeEntry;
}

function syncTelegramBackButton() {
  const backButton = getTelegramWebApp()?.BackButton;
  const activeEntry = getActiveBackButtonEntry();

  if (!backButton) {
    activeBackHandler = null;
    return;
  }

  if (activeBackHandler && activeBackHandler !== activeEntry?.onBack) {
    backButton.offClick?.(activeBackHandler);
    activeBackHandler = null;
  }

  if (!activeEntry) {
    backButton.hide?.();
    return;
  }

  if (activeBackHandler !== activeEntry.onBack) {
    backButton.offClick?.(activeEntry.onBack);
    backButton.onClick?.(activeEntry.onBack);
    activeBackHandler = activeEntry.onBack;
  }

  backButton.show?.();
}

export function useTelegramBackButton({
  enabled,
  onBack,
  priority = 0,
}: UseTelegramBackButtonParams) {
  const entryIdRef = useRef<string>(`tg-back-${++backButtonSequence}`);
  const entryOrderRef = useRef<number>(backButtonSequence);
  const onBackRef = useRef(onBack);
  const stableOnBackRef = useRef<() => void>(() => {
    onBackRef.current();
  });

  onBackRef.current = onBack;

  useEffect(() => {
    const entry: TelegramBackButtonEntry = {
      id: entryIdRef.current,
      enabled,
      order: entryOrderRef.current,
      priority,
      onBack: stableOnBackRef.current,
    };

    backButtonEntries.set(entry.id, entry);
    syncTelegramBackButton();

    return () => {
      backButtonEntries.delete(entry.id);
      syncTelegramBackButton();
    };
  }, [enabled, priority]);
}
