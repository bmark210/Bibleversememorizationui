import { useEffect, useRef } from 'react';
import type { TrainingExerciseResolution } from './exerciseResult';

const REVEALED_MESSAGE =
  'Правильный текст открыт. Оцените, насколько уверенно вы вспоминали стих.';

/**
 * Watches `surrendered` flag and fires `onExerciseResolved` with a 'revealed'
 * result exactly once. Returns a stable `resolvedRef` so callers can also guard
 * their own completion paths against double-fire.
 */
export function useSurrenderEffect(params: {
  surrendered: boolean;
  isCompleted: boolean;
  setIsCompleted: (v: boolean) => void;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
}) {
  const { surrendered, isCompleted, setIsCompleted, onExerciseResolved } =
    params;
  const resolvedRef = useRef(false);

  useEffect(() => {
    if (surrendered && !isCompleted && !resolvedRef.current) {
      resolvedRef.current = true;
      setIsCompleted(true);
      onExerciseResolved?.({
        kind: 'revealed',
        message: REVEALED_MESSAGE,
      });
    }
  }, [isCompleted, onExerciseResolved, setIsCompleted, surrendered]);

  // Reset when exercise remounts (new verse)
  useEffect(() => {
    return () => {
      resolvedRef.current = false;
    };
  }, []);

  return resolvedRef;
}
