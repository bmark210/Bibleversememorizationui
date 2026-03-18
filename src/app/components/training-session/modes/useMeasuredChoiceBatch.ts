'use client'

import { useCallback, useLayoutEffect, useMemo, useState } from 'react';

export interface MeasuredChoiceBatchItem<T> {
  key: string;
  value: T;
}

interface UseMeasuredChoiceBatchOptions<T> {
  items: readonly MeasuredChoiceBatchItem<T>[];
  enabled?: boolean;
  maxItems?: number;
  requiredItemKey?: string | null;
  preferredRequiredIndex?: number;
  dependencies?: readonly unknown[];
}

interface UseMeasuredChoiceBatchResult<T> {
  containerRef: (node: HTMLDivElement | null) => void;
  measureRef: (node: HTMLDivElement | null) => void;
  measurementItems: MeasuredChoiceBatchItem<T>[];
  displayedItems: MeasuredChoiceBatchItem<T>[];
  batchSize: number;
  hasMeasured: boolean;
}

interface ChoiceMeasurement {
  width: number;
  height: number;
}

interface ChoiceLayout {
  availableWidth: number;
  availableHeight: number;
  paddingTop: number;
  paddingBottom: number;
  rowGap: number;
  columnGap: number;
}

interface ResolvedBatch {
  measureKeys: string[];
  displayKeys: string[];
  batchSize: number;
  hasMeasured: boolean;
}

const DEFAULT_MAX_ITEMS = 40;
const FIT_EPSILON = 0.5;
const FIT_BOTTOM_BUFFER = 1;

function clampIndex(index: number, maxIndex: number) {
  if (maxIndex <= 0) return 0;
  return Math.max(0, Math.min(index, maxIndex));
}

function parsePixelValue(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function areKeysEqual(left: readonly string[], right: readonly string[]) {
  if (left === right) return true;
  if (left.length !== right.length) return false;

  for (let index = 0; index < left.length; index += 1) {
    if (left[index] !== right[index]) return false;
  }

  return true;
}

function moveKeyToIndex(keys: readonly string[], targetKey: string, nextIndex: number) {
  const currentIndex = keys.indexOf(targetKey);
  if (currentIndex < 0) return [...keys];

  const clampedIndex = clampIndex(nextIndex, keys.length - 1);
  if (clampedIndex === currentIndex) return [...keys];

  const nextKeys = [...keys];
  const [movedKey] = nextKeys.splice(currentIndex, 1);
  if (!movedKey) return nextKeys;
  nextKeys.splice(clampedIndex, 0, movedKey);
  return nextKeys;
}

function simulatePrefixFit(
  orderedKeys: readonly string[],
  measurements: ReadonlyMap<string, ChoiceMeasurement>,
  layout: ChoiceLayout,
  maxItems: number
) {
  if (
    layout.availableWidth <= 0 ||
    layout.availableHeight <= 0 ||
    maxItems <= 0
  ) {
    return 0;
  }

  let totalHeight = layout.paddingTop + layout.paddingBottom;
  let rowWidth = 0;
  let rowHeight = 0;
  let rowItemCount = 0;
  let fittedCount = 0;

  for (const key of orderedKeys) {
    if (fittedCount >= maxItems) break;

    const measurement = measurements.get(key);
    if (!measurement) continue;

    const { width, height } = measurement;
    const shouldWrap =
      rowItemCount > 0 &&
      rowWidth + layout.columnGap + width > layout.availableWidth + FIT_EPSILON;

    let nextTotalHeight = totalHeight;
    let nextRowWidth = rowWidth;
    let nextRowHeight = rowHeight;
    let nextRowItemCount = rowItemCount;

    if (shouldWrap) {
      nextTotalHeight += rowHeight + layout.rowGap;
      nextRowWidth = width;
      nextRowHeight = height;
      nextRowItemCount = 1;
    } else {
      nextRowWidth =
        rowItemCount > 0 ? rowWidth + layout.columnGap + width : width;
      nextRowHeight = rowItemCount > 0 ? Math.max(rowHeight, height) : height;
      nextRowItemCount = rowItemCount + 1;
    }

    if (nextTotalHeight + nextRowHeight > layout.availableHeight + FIT_EPSILON) {
      break;
    }

    totalHeight = nextTotalHeight;
    rowWidth = nextRowWidth;
    rowHeight = nextRowHeight;
    rowItemCount = nextRowItemCount;
    fittedCount += 1;
  }

  return fittedCount;
}

export function useMeasuredChoiceBatch<T>({
  items,
  enabled = true,
  maxItems = DEFAULT_MAX_ITEMS,
  requiredItemKey = null,
  preferredRequiredIndex = 0,
  dependencies = [],
}: UseMeasuredChoiceBatchOptions<T>): UseMeasuredChoiceBatchResult<T> {
  const [containerNode, setContainerNode] = useState<HTMLDivElement | null>(null);
  const [measureNode, setMeasureNode] = useState<HTMLDivElement | null>(null);
  const [resolvedBatch, setResolvedBatch] = useState<ResolvedBatch>({
    measureKeys: items.map((item) => item.key),
    displayKeys: enabled ? [] : items.slice(0, maxItems).map((item) => item.key),
    batchSize: enabled ? 0 : Math.min(items.length, maxItems),
    hasMeasured: !enabled,
  });

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainerNode(node);
  }, []);

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    setMeasureNode(node);
  }, []);

  const itemMap = useMemo(
    () => new Map(items.map((item) => [item.key, item])),
    [items]
  );

  const displayedItems = useMemo(
    () =>
      resolvedBatch.displayKeys
        .map((key) => itemMap.get(key))
        .filter((item): item is MeasuredChoiceBatchItem<T> => Boolean(item)),
    [itemMap, resolvedBatch.displayKeys]
  );

  const measurementItems = useMemo(
    () =>
      resolvedBatch.measureKeys
        .map((key) => itemMap.get(key))
        .filter((item): item is MeasuredChoiceBatchItem<T> => Boolean(item)),
    [itemMap, resolvedBatch.measureKeys]
  );

  const recalculate = useCallback(() => {
    if (!enabled) {
      const visibleKeys = items.slice(0, maxItems).map((item) => item.key);
      setResolvedBatch((prev) => {
        if (
          prev.batchSize === visibleKeys.length &&
          prev.hasMeasured &&
          areKeysEqual(prev.measureKeys, visibleKeys) &&
          areKeysEqual(prev.displayKeys, visibleKeys)
        ) {
          return prev;
        }

        return {
          measureKeys: visibleKeys,
          displayKeys: visibleKeys,
          batchSize: visibleKeys.length,
          hasMeasured: true,
        };
      });
      return;
    }

    if (!containerNode || !measureNode) {
      setResolvedBatch((prev) => {
        if (!prev.hasMeasured && prev.batchSize === 0 && prev.displayKeys.length === 0) {
          return prev;
        }

        return {
          measureKeys: items.map((item) => item.key),
          displayKeys: [],
          batchSize: 0,
          hasMeasured: false,
        };
      });
      return;
    }

    const availableWidth = containerNode.clientWidth;
    const availableHeight = containerNode.clientHeight;

    if (availableWidth <= 0 || availableHeight <= 0) {
      setResolvedBatch((prev) => {
        if (!prev.hasMeasured && prev.batchSize === 0 && prev.displayKeys.length === 0) {
          return prev;
        }

        return {
          measureKeys: items.map((item) => item.key),
          displayKeys: [],
          batchSize: 0,
          hasMeasured: false,
        };
      });
      return;
    }

    const measureStyles = window.getComputedStyle(measureNode);
    const layout: ChoiceLayout = {
      availableWidth,
      availableHeight,
      paddingTop: parsePixelValue(measureStyles.paddingTop),
      paddingBottom: parsePixelValue(measureStyles.paddingBottom),
      rowGap: parsePixelValue(measureStyles.rowGap),
      columnGap: parsePixelValue(measureStyles.columnGap),
    };

    const measurements = new Map<string, ChoiceMeasurement>();
    const childNodes = Array.from(measureNode.children) as HTMLElement[];
    const domMeasureKeys: string[] = [];

    for (const childNode of childNodes) {
      const key = childNode.dataset.choiceKey;
      if (!key) continue;
      domMeasureKeys.push(key);

      const rect = childNode.getBoundingClientRect();
      measurements.set(key, {
        width: rect.width,
        height: rect.height,
      });
    }

    const measuredKeys = items
      .map((item) => item.key)
      .filter((key) => measurements.has(key));

    if (measuredKeys.length === 0) {
      setResolvedBatch((prev) => {
        if (!prev.hasMeasured && prev.batchSize === 0 && prev.displayKeys.length === 0) {
          return prev;
        }

        return {
          measureKeys: items.map((item) => item.key),
          displayKeys: [],
          batchSize: 0,
          hasMeasured: false,
        };
      });
      return;
    }

    const safeMaxItems = Math.max(0, Math.min(maxItems, measuredKeys.length));
    const baseCount = simulatePrefixFit(measuredKeys, measurements, layout, safeMaxItems);

    let bestOrder = measuredKeys;
    let bestCount = baseCount;

    if (requiredItemKey && measurements.has(requiredItemKey)) {
      const clampedPreferredIndex = clampIndex(
        preferredRequiredIndex,
        measuredKeys.length - 1
      );
      let bestPositionDistance = Number.POSITIVE_INFINITY;
      let bestRequiredPosition = -1;
      let foundVisibleRequired = false;

      for (let position = 0; position < measuredKeys.length; position += 1) {
        const candidateOrder = moveKeyToIndex(measuredKeys, requiredItemKey, position);
        const candidateCount = simulatePrefixFit(
          candidateOrder,
          measurements,
          layout,
          safeMaxItems
        );

        if (position >= candidateCount) continue;

        const positionDistance = Math.abs(position - clampedPreferredIndex);
        const isBetterCandidate =
          !foundVisibleRequired ||
          candidateCount > bestCount ||
          (candidateCount === bestCount &&
            positionDistance < bestPositionDistance) ||
          (candidateCount === bestCount &&
            positionDistance === bestPositionDistance &&
            position > bestRequiredPosition);

        if (!isBetterCandidate) continue;

        foundVisibleRequired = true;
        bestOrder = candidateOrder;
        bestCount = candidateCount;
        bestPositionDistance = positionDistance;
        bestRequiredPosition = position;
      }

      if (!foundVisibleRequired) {
        bestOrder = moveKeyToIndex(measuredKeys, requiredItemKey, 0);
        bestCount = simulatePrefixFit(bestOrder, measurements, layout, safeMaxItems);
      }
    }

    if (!areKeysEqual(domMeasureKeys, bestOrder)) {
      setResolvedBatch((prev) => {
        const nextDisplayKeys = prev.displayKeys.filter((key) => bestOrder.includes(key));
        if (
          areKeysEqual(prev.measureKeys, bestOrder) &&
          areKeysEqual(prev.displayKeys, nextDisplayKeys) &&
          prev.hasMeasured === false
        ) {
          return prev;
        }

        return {
          measureKeys: bestOrder,
          displayKeys: nextDisplayKeys,
          batchSize: Math.min(nextDisplayKeys.length, maxItems),
          hasMeasured: false,
        };
      });
      return;
    }

    const measureRect = measureNode.getBoundingClientRect();
    const effectiveHeight = Math.max(0, availableHeight - FIT_BOTTOM_BUFFER);
    let fittedCount = 0;

    for (const childNode of childNodes) {
      if (fittedCount >= safeMaxItems) break;

      const key = childNode.dataset.choiceKey;
      if (!key) continue;

      const childRect = childNode.getBoundingClientRect();
      const childBottom =
        childRect.bottom - measureRect.top + layout.paddingBottom;

      if (childBottom > effectiveHeight + FIT_EPSILON) {
        break;
      }

      fittedCount += 1;
    }

    const displayKeys = bestOrder.slice(0, fittedCount);

    setResolvedBatch((prev) => {
      if (
        prev.batchSize === displayKeys.length &&
        prev.hasMeasured &&
        areKeysEqual(prev.measureKeys, bestOrder) &&
        areKeysEqual(prev.displayKeys, displayKeys)
      ) {
        return prev;
      }

      return {
        measureKeys: bestOrder,
        displayKeys,
        batchSize: displayKeys.length,
        hasMeasured: true,
      };
    });
  }, [
    containerNode,
    enabled,
    items,
    maxItems,
    measureNode,
    preferredRequiredIndex,
    requiredItemKey,
  ]);

  useLayoutEffect(() => {
    recalculate();
  }, [recalculate, ...dependencies]);

  useLayoutEffect(() => {
    if (!enabled || !containerNode || !measureNode) return;

    let frameId: number | null = null;
    const scheduleRecalculation = () => {
      if (frameId !== null) return;
      frameId = window.requestAnimationFrame(() => {
        frameId = null;
        recalculate();
      });
    };

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', scheduleRecalculation, { passive: true });
      scheduleRecalculation();

      return () => {
        window.removeEventListener('resize', scheduleRecalculation);
        if (frameId !== null) {
          window.cancelAnimationFrame(frameId);
        }
      };
    }

    const resizeObserver = new ResizeObserver(scheduleRecalculation);
    resizeObserver.observe(containerNode);
    resizeObserver.observe(measureNode);

    for (const childNode of Array.from(measureNode.children) as HTMLElement[]) {
      resizeObserver.observe(childNode);
    }

    scheduleRecalculation();

    return () => {
      resizeObserver.disconnect();
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [containerNode, enabled, items, measureNode, recalculate]);

  return {
    containerRef,
    measureRef,
    measurementItems,
    displayedItems,
    batchSize: resolvedBatch.batchSize,
    hasMeasured: resolvedBatch.hasMeasured,
  };
}
