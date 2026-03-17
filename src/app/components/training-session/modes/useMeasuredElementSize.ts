'use client'

import { useCallback, useEffect, useState } from 'react';

interface MeasuredElementSize {
  width: number;
  height: number;
}

const EMPTY_SIZE: MeasuredElementSize = { width: 0, height: 0 };

export function useMeasuredElementSize<T extends HTMLElement>(enabled: boolean) {
  const [node, setNode] = useState<T | null>(null);
  const [size, setSize] = useState<MeasuredElementSize>(EMPTY_SIZE);

  const ref = useCallback((nextNode: T | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    if (!enabled || !node) {
      setSize((prev) => (prev.width === 0 && prev.height === 0 ? prev : EMPTY_SIZE));
      return;
    }

    const updateSize = (rect?: { width: number; height: number }) => {
      const width = Math.ceil(rect?.width ?? node.clientWidth);
      // floor для height — консервативно, чтобы не переоценить и не обрезать последний ряд
      const height = Math.floor(rect?.height ?? node.getBoundingClientRect().height);

      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height }
      );
    };

    updateSize();

    if (typeof ResizeObserver === 'undefined') {
      const handleResize = () => updateSize();
      window.addEventListener('resize', handleResize, { passive: true });

      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        updateSize({ width, height });
      } else {
        updateSize();
      }
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [enabled, node]);

  return { ref, size };
}