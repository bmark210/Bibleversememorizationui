'use client'

import type { SyntheticEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';

import { RU_KEYBOARD_ROWS } from '@/shared/ui/ruKeyboardLayout';
import { Button } from '../../ui/button';

interface MobileRuKeyboardOverlayProps {
  open: boolean;
  disabled?: boolean;
  onKeyPress: (letter: string) => void;
}

export const MOBILE_RU_KEYBOARD_OVERLAY_SPACER_HEIGHT =
  'calc(8.5rem + env(safe-area-inset-bottom, 0px))';

function stopTouchPropagation(event: SyntheticEvent) {
  event.stopPropagation();
}

function triggerKeyboardHaptic(kind: 'light' | 'medium' = 'light') {
  if (typeof window === 'undefined') return;

  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (tg?.impactOccurred) {
      tg.impactOccurred(kind);
      return;
    }
  } catch {
    // continue to browser fallback
  }

  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(kind === 'medium' ? 14 : 8);
    }
  } catch {
    // ignore unsupported vibration APIs
  }
}

export function MobileRuKeyboardOverlay({
  open,
  disabled = false,
  onKeyPress,
}: MobileRuKeyboardOverlayProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="mobile-ru-keyboard-overlay"
          initial={{ opacity: 0, y: 22, scale: 0.985 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 14, scale: 0.99 }}
          transition={{
            y: { type: 'spring', stiffness: 360, damping: 34, mass: 0.75 },
            opacity: { duration: 0.18, ease: 'easeOut' },
            scale: { duration: 0.2, ease: [0.22, 1, 0.36, 1] },
          }}
          className="md:hidden fixed bottom-0 left-0 right-0 z-[70] isolate overflow-hidden border-t border-border bg-card"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
            transformOrigin: 'bottom center',
            willChange: 'transform, opacity',
          }}
          onTouchStart={stopTouchPropagation}
          onTouchMove={stopTouchPropagation}
          onTouchEnd={stopTouchPropagation}
        >
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-card"
          />
          <div className="relative z-[1] w-full p-2 pt-2.5 space-y-2">
            <div className="space-y-1.5">
              {RU_KEYBOARD_ROWS.map((row, rowIndex) => (
                <div
                  key={`row-${rowIndex}`}
                  className={
                    rowIndex === 0
                      ? 'grid gap-1 px-0.5'
                      : rowIndex === 1
                        ? 'grid gap-1 px-3'
                        : 'grid gap-1 px-7'
                  }
                  style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
                >
                  {row.map((letter) => (
                    <Button
                      key={letter}
                      type="button"
                      variant="outline"
                      className="h-10 min-w-0 px-0 font-mono text-[13px] uppercase rounded-md"
                      onClick={() => {
                        triggerKeyboardHaptic('light');
                        onKeyPress(letter);
                      }}
                      disabled={disabled}
                      aria-label={`Ввести букву ${letter.toUpperCase()}`}
                    >
                      {letter.toUpperCase()}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
