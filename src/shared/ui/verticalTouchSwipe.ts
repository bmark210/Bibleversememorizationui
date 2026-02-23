import type { TouchEvent as ReactTouchEvent } from 'react';

export type VerticalTouchSwipeStart = {
  x: number;
  y: number;
  ignore: boolean;
};

type VerticalTouchSwipeOptions = {
  minVerticalDistance?: number;
  verticalDominanceRatio?: number;
  ignoreSelector?: string;
};

const DEFAULT_MIN_VERTICAL_DISTANCE = 70;
const DEFAULT_VERTICAL_DOMINANCE_RATIO = 1.2;
const DEFAULT_IGNORE_SELECTOR = 'input, textarea, [contenteditable="true"]';

export function createVerticalTouchSwipeStart(
  e: ReactTouchEvent<HTMLElement>,
  options?: Pick<VerticalTouchSwipeOptions, 'ignoreSelector'>
): VerticalTouchSwipeStart | null {
  const target = e.target as HTMLElement | null;
  const ignoreSelector = options?.ignoreSelector ?? DEFAULT_IGNORE_SELECTOR;
  const ignore = Boolean(target?.closest(ignoreSelector));
  const touch = e.touches[0];
  if (!touch) return null;

  return {
    x: touch.clientX,
    y: touch.clientY,
    ignore,
  };
}

export function getVerticalTouchSwipeStep(
  start: VerticalTouchSwipeStart | null,
  e: ReactTouchEvent<HTMLElement>,
  options?: Omit<VerticalTouchSwipeOptions, 'ignoreSelector'>
): 1 | -1 | null {
  if (!start || start.ignore) return null;

  const touch = e.changedTouches[0];
  if (!touch) return null;

  const minVerticalDistance = options?.minVerticalDistance ?? DEFAULT_MIN_VERTICAL_DISTANCE;
  const verticalDominanceRatio = options?.verticalDominanceRatio ?? DEFAULT_VERTICAL_DOMINANCE_RATIO;

  const dx = touch.clientX - start.x;
  const dy = touch.clientY - start.y;
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  if (absDy < minVerticalDistance) return null;
  if (absDy < absDx * verticalDominanceRatio) return null;

  // Up swipe -> next item; down swipe -> previous item.
  return dy < 0 ? 1 : -1;
}

