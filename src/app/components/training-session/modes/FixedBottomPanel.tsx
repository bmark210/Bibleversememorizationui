'use client'

import { type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface FixedBottomPanelProps {
  children: ReactNode;
  visible: boolean;
}

function stopEventPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function FixedBottomPanel({ children, visible }: FixedBottomPanelProps) {
  if (!visible) return null;

  const panel = (
    <div
      className="pointer-events-auto md:hidden fixed bottom-0 left-0 right-0 z-[100] border-t border-border backdrop-blur-xl bg-card/90"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      onTouchStart={stopEventPropagation}
      onTouchMove={stopEventPropagation}
      onTouchEnd={stopEventPropagation}
      data-card-swipe-ignore="true"
    >
      <div className="max-h-[45dvh] overflow-y-auto overscroll-contain p-3">
        {children}
      </div>
    </div>
  );

  const desktopPanel = (
    <div className="hidden md:block shrink-0 mt-3">
      {children}
    </div>
  );

  return (
    <>
      {desktopPanel}
      {typeof document !== 'undefined' ? createPortal(panel, document.body) : null}
    </>
  );
}
