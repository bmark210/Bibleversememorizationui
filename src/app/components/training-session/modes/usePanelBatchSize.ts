'use client'

import { type RefObject, useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * Measures how many flex-wrap children fit within a panel's visible bounds.
 * Uses useLayoutEffect to measure BEFORE paint — users never see overflow.
 *
 * Flow:
 * 1. Render all items (invisible — useLayoutEffect blocks paint)
 * 2. Measure which children fit within panel.getBoundingClientRect()
 * 3. Return clipped batch size → re-render with only fitting items
 */
export function usePanelBatchSize(
  panelRef: RefObject<HTMLDivElement | null>,
  itemCount: number,
): number {
  const [batchSize, setBatchSize] = useState(itemCount);
  const pendingMeasure = useRef(true);
  const latestItemCount = useRef(itemCount);
  latestItemCount.current = itemCount;

  // When item count changes, render all items for measurement
  useLayoutEffect(() => {
    pendingMeasure.current = true;
    setBatchSize(itemCount);
  }, [itemCount]);

  // Measure which children fit within the panel after DOM update
  useLayoutEffect(() => {
    if (!pendingMeasure.current) return;
    const panel = panelRef.current;
    if (!panel) return;
    const children = panel.children;
    if (children.length === 0) return;
    // Wait until all items are rendered for accurate measurement
    if (children.length < itemCount) return;

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.height < 1) return; // not laid out yet

    const panelBottom = panelRect.bottom;
    let count = 0;
    for (let i = 0; i < children.length; i++) {
      if ((children[i] as HTMLElement).getBoundingClientRect().bottom > panelBottom + 2) break;
      count = i + 1;
    }

    pendingMeasure.current = false;
    setBatchSize(Math.max(count, 1));
  });

  // Re-measure on container resize (e.g. orientation change, keyboard open/close)
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const ro = new ResizeObserver(() => {
      pendingMeasure.current = true;
      setBatchSize(latestItemCount.current);
    });
    ro.observe(panel);
    return () => ro.disconnect();
  }, [panelRef]);

  return Math.min(batchSize, itemCount);
}
