'use client'

import { useMemo } from 'react';
import { useMeasuredElementSize } from './useMeasuredElementSize';

interface FittedBatchSizeOptions {
  /** Approximate height of a single item in px. */
  itemHeight: number;
  /** Vertical gap between rows in px. */
  rowGap: number;
  /** Approximate minimum width of a single item in px (for estimating items-per-row). */
  itemMinWidth: number;
  /** Horizontal gap between items in px. */
  columnGap: number;
  /** Hard minimum — always show at least this many. */
  minItems?: number;
  /** Hard maximum — never exceed this. */
  maxItems?: number;
  /** Whether measurement is enabled. */
  enabled?: boolean;
  /**
   * Fixed px to subtract from measured height before fitting calculation.
   * Use for wrapper padding (e.g. py-1 = 8px) that isn't part of items.
   */
  reduceHeightBy?: number;
}

const DEFAULT_MIN = 4;
const DEFAULT_MAX = 40;

/**
 * Measures a container and returns the max number of flex-wrap items
 * that fit without scrolling.
 *
 * Returns `{ ref, batchSize }` — attach `ref` to the container element.
 */
export function useFittedBatchSize<T extends HTMLElement = HTMLDivElement>(
  options: FittedBatchSizeOptions
) {
  const {
    itemHeight,
    rowGap,
    itemMinWidth,
    columnGap,
    minItems = DEFAULT_MIN,
    maxItems = DEFAULT_MAX,
    enabled = true,
    reduceHeightBy = 0,
  } = options;

  const { ref, size } = useMeasuredElementSize<T>(enabled);

  const batchSize = useMemo(() => {
    if (!enabled || size.height <= 0 || size.width <= 0) return maxItems;

    const availableWidth = size.width;
    const availableHeight = Math.max(0, size.height - reduceHeightBy);

    const itemsPerRow = Math.max(
      1,
      Math.floor((availableWidth + columnGap) / (itemMinWidth + columnGap))
    );

    const rows = Math.max(
      1,
      Math.floor((availableHeight + rowGap) / (itemHeight + rowGap))
    );

    const fitted = rows * itemsPerRow;
    return Math.max(minItems, Math.min(maxItems, fitted));
  }, [
    enabled,
    size.height,
    size.width,
    itemHeight,
    rowGap,
    itemMinWidth,
    columnGap,
    minItems,
    maxItems,
    reduceHeightBy,
  ]);

  return { ref, batchSize };
}
