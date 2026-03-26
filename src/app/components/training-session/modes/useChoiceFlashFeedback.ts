'use client'

import { useCallback, useEffect, useMemo } from 'react';

import { useFlashTimeout } from './useFlashTimeout';

export type ChoiceFlashKind = 'idle' | 'error' | 'success';

const CHOICE_ERROR_CLASS_NAME =
  'border-destructive text-destructive bg-destructive/10';
const CHOICE_SUCCESS_CLASS_NAME =
  'border-status-learning text-status-learning bg-status-learning-soft';
const CHOICE_DISABLED_CLASS_NAME =
  'border-border-subtle bg-bg-subtle text-text-muted opacity-55';

interface GetChoiceButtonFlashClassNameOptions<T> {
  choiceKey: T;
  disabled?: boolean;
  idleClassName: string;
  disabledClassName?: string;
  getChoiceFlashKind: (choiceKey: T) => ChoiceFlashKind;
}

export function useChoiceFlashFeedback<T = string>() {
  const {
    value: errorValue,
    flash: flashErrorValue,
    clear: clearErrorFlash,
    cleanup: cleanupErrorFlash,
  } = useFlashTimeout<T>();
  const {
    value: successValue,
    flash: flashSuccessValue,
    clear: clearSuccessFlash,
    cleanup: cleanupSuccessFlash,
  } = useFlashTimeout<T>();

  useEffect(() => {
    return () => {
      cleanupErrorFlash();
      cleanupSuccessFlash();
    };
  }, [cleanupErrorFlash, cleanupSuccessFlash]);

  const clear = useCallback(() => {
    clearErrorFlash();
    clearSuccessFlash();
  }, [clearErrorFlash, clearSuccessFlash]);

  const flashError = useCallback(
    (value: T) => {
      flashErrorValue(value);
    },
    [flashErrorValue],
  );

  const flashSuccess = useCallback(
    (value: T) => {
      flashSuccessValue(value);
    },
    [flashSuccessValue],
  );

  const getChoiceFlashKind = useCallback(
    (choiceKey: T): ChoiceFlashKind => {
      if (errorValue === choiceKey) return 'error';
      if (successValue === choiceKey) return 'success';
      return 'idle';
    },
    [errorValue, successValue],
  );

  return useMemo(
    () =>
      ({
        clear,
        flashError,
        flashSuccess,
        getChoiceFlashKind,
      }) as const,
    [clear, flashError, flashSuccess, getChoiceFlashKind],
  );
}

export function getChoiceButtonFlashClassName<T>({
  choiceKey,
  disabled = false,
  idleClassName,
  disabledClassName = CHOICE_DISABLED_CLASS_NAME,
  getChoiceFlashKind,
}: GetChoiceButtonFlashClassNameOptions<T>) {
  const flashKind = getChoiceFlashKind(choiceKey);
  if (flashKind === 'error') return CHOICE_ERROR_CLASS_NAME;
  if (flashKind === 'success') return CHOICE_SUCCESS_CLASS_NAME;
  if (disabled) return disabledClassName;
  return idleClassName;
}
