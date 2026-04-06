import { useCallback, useRef, useState } from 'react';

const FLASH_DURATION_MS = 260;

/**
 * Manages a flash-state indicator (error / success) with auto-clear timeout.
 * Replaces the duplicated pattern of `useState + useRef<number|null> + clearTimeout`
 * found in every exercise mode component.
 */
export function useFlashTimeout<T = string>(
  durationMs: number = FLASH_DURATION_MS,
) {
  const [value, setValue] = useState<T | null>(null);
  const timeoutRef = useRef<number | null>(null);

  const flash = useCallback(
    (next: T) => {
      if (timeoutRef.current !== null) {
        window.clearTimeout(timeoutRef.current);
      }
      setValue(next);
      timeoutRef.current = window.setTimeout(() => {
        setValue(null);
        timeoutRef.current = null;
      }, durationMs);
    },
    [durationMs],
  );

  const clear = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    setValue(null);
  }, []);

  const cleanup = useCallback(() => {
    if (timeoutRef.current !== null) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return { value, flash, clear, cleanup } as const;
}
