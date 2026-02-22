'use client'

import type { ReactNode } from 'react';
import { motion } from 'motion/react';

interface TrainingRatingFooterProps {
  children: ReactNode;
}

export function TrainingRatingFooter({ children }: TrainingRatingFooterProps) {
  return (
    <>
      <div className="hidden md:block mt-6 pt-6 border-t border-border/60">
        {children}
      </div>

      <div className="md:hidden h-36" aria-hidden="true" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="md:hidden fixed bottom-0 left-0 right-0 z-[70] border-t border-border backdrop-blur-xl bg-card/90"
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        <div className="p-3 pt-2.5">{children}</div>
      </motion.div>
    </>
  );
}
