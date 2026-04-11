'use client'

import { type ReactNode } from 'react';
import { useAppViewportStore } from '@/app/stores/appViewportStore';

interface FixedBottomPanelProps {
  children: ReactNode;
  visible: boolean;
}

export function FixedBottomPanel({ children, visible }: FixedBottomPanelProps) {
  const isKeyboardOpen = useAppViewportStore((state) => state.isKeyboardOpen);

  if (!visible || isKeyboardOpen) return null;

  return (
    <div className="shrink-0 mt-2 pt-2">
      {children}
    </div>
  );
}
