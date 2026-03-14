'use client'

import { type ReactNode } from 'react';
import { ScrollShadowContainer } from '@/app/components/ui/ScrollShadowContainer';

interface FixedBottomPanelProps {
  children: ReactNode;
  visible: boolean;
}

export function FixedBottomPanel({ children, visible }: FixedBottomPanelProps) {
  if (!visible) return null;

  return (
    <div className="shrink-0 mt-2 border-t border-border/60 pt-2">
      <ScrollShadowContainer
        className="max-h-[40dvh]"
        shadowSize={20}
      >
        {children}
      </ScrollShadowContainer>
    </div>
  );
}
