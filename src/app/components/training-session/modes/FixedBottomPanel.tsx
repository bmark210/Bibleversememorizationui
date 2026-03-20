'use client'

import { type ReactNode } from 'react';

interface FixedBottomPanelProps {
  children: ReactNode;
  visible: boolean;
}

export function FixedBottomPanel({ children, visible }: FixedBottomPanelProps) {
  if (!visible) return null;

  return (
    <div className="shrink-0 mt-2 pt-2">
      {children}
    </div>
  );
}
