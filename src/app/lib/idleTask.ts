const TRAINING_VERSE_PREFETCH_DELAY_MS = 350;
const TRAINING_VERSE_PREFETCH_TIMEOUT_MS = 1500;

export type IdleTaskHandle = number | ReturnType<typeof setTimeout>;

type IdleWindow = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function scheduleIdleTask(callback: () => void): IdleTaskHandle | null {
  if (typeof window === "undefined") return null;

  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.requestIdleCallback === "function") {
    return idleWindow.requestIdleCallback(() => callback(), {
      timeout: TRAINING_VERSE_PREFETCH_TIMEOUT_MS,
    });
  }

  return setTimeout(callback, TRAINING_VERSE_PREFETCH_DELAY_MS);
}

export function cancelIdleTask(handle: IdleTaskHandle | null) {
  if (handle == null || typeof window === "undefined") return;

  const idleWindow = window as IdleWindow;

  if (typeof idleWindow.cancelIdleCallback === "function" && typeof handle === "number") {
    idleWindow.cancelIdleCallback(handle);
    return;
  }

  clearTimeout(handle);
}
