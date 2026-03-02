'use client'

import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { motion } from 'motion/react';
import { createPortal } from 'react-dom';

interface TrainingRatingFooterProps {
  children: ReactNode;
}

export function TrainingRatingFooter({ children }: TrainingRatingFooterProps) {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const body = document.body;
    const hasLegacyLockState =
      body.dataset.trainingRatingLockCount != null ||
      body.dataset.trainingRatingPrevPointerEvents != null;
    if (!hasLegacyLockState) return;

    delete body.dataset.trainingRatingLockCount;
    delete body.dataset.trainingRatingPrevPointerEvents;
    if (body.style.pointerEvents === 'none') {
      body.style.removeProperty('pointer-events');
    }
  }, []);

  const interactionBlocker =
    typeof document !== 'undefined'
      ? createPortal(
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[110] bg-transparent pointer-events-auto"
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
          />,
          document.body
        )
      : null;

  const mobileFooter = (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="pointer-events-auto md:hidden fixed bottom-0 left-0 right-0 z-[120] border-t border-border backdrop-blur-xl bg-card/90"
      style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div className="p-3 pt-2.5">{children}</div>
    </motion.div>
  );

  return (
    <>
      {interactionBlocker}

      <div className="hidden md:block relative z-[121] pointer-events-auto mt-6 pt-6 border-t border-border/60">
        {children}
      </div>

      {/* <div className="md:hidden h-36" aria-hidden="true" /> */}

      {typeof document !== 'undefined' ? createPortal(mobileFooter, document.body) : null}
    </>
  );
}
