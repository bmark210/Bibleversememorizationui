'use client'

import { type ReactNode } from 'react';

interface FixedBottomPanelProps {
  children: ReactNode;
  visible: boolean;
}

function stopEventPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function FixedBottomPanel({ children, visible }: FixedBottomPanelProps) {
  if (!visible) return null;

  return (
    <div
      className="shrink-0 mt-2 border-t border-border/60 pt-2"
      data-card-swipe-ignore="true"
      onTouchStart={stopEventPropagation}
      onTouchMove={stopEventPropagation}
      onTouchEnd={stopEventPropagation}
    >
      <div className="max-h-full overflow-y-auto overscroll-contain">
        {children}
      </div>
    </div>
  );
}
