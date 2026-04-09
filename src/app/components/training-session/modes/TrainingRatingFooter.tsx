'use client'

import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTrainingUiState } from '../TrainingUiStateContext';

interface TrainingRatingFooterProps {
  children: ReactNode;
}

type FooterRect = {
  top: number;
  left: number;
  right: number;
  bottom: number;
};

function readFooterRect(element: HTMLElement | null): FooterRect | null {
  if (!element) return null;

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  return {
    top: Math.max(0, rect.top),
    left: Math.max(0, rect.left),
    right: Math.max(0, rect.right),
    bottom: Math.max(0, rect.bottom),
  };
}

function areRectsEqual(left: FooterRect | null, right: FooterRect | null) {
  if (left === right) return true;
  if (!left || !right) return false;

  return (
    Math.abs(left.top - right.top) < 0.5 &&
    Math.abs(left.left - right.left) < 0.5 &&
    Math.abs(left.right - right.right) < 0.5 &&
    Math.abs(left.bottom - right.bottom) < 0.5
  );
}

function stopEventPropagation(event: { stopPropagation: () => void }) {
  event.stopPropagation();
}

export function TrainingRatingFooter({ children }: TrainingRatingFooterProps) {
  const { hideRatingFooter } = useTrainingUiState();
  const desktopFooterRef = useRef<HTMLDivElement | null>(null);
  const [desktopFooterRect, setDesktopFooterRect] = useState<FooterRect | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;

    let rafId: number | null = null;
    const updateRect = () => {
      const nextRect = readFooterRect(desktopFooterRef.current);
      setDesktopFooterRect((prevRect) => (areRectsEqual(prevRect, nextRect) ? prevRect : nextRect));
    };
    const scheduleRectUpdate = () => {
      if (rafId !== null) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = null;
        updateRect();
      });
    };

    scheduleRectUpdate();

    window.addEventListener('resize', scheduleRectUpdate);
    window.addEventListener('scroll', scheduleRectUpdate, true);
    window.visualViewport?.addEventListener('resize', scheduleRectUpdate);
    window.visualViewport?.addEventListener('scroll', scheduleRectUpdate);

    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(scheduleRectUpdate) : null;
    if (desktopFooterRef.current) {
      observer?.observe(desktopFooterRef.current);
    }

    return () => {
      window.removeEventListener('resize', scheduleRectUpdate);
      window.removeEventListener('scroll', scheduleRectUpdate, true);
      window.visualViewport?.removeEventListener('resize', scheduleRectUpdate);
      window.visualViewport?.removeEventListener('scroll', scheduleRectUpdate);
      observer?.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const desktopFooterHeight =
    desktopFooterRect ? Math.max(0, desktopFooterRect.bottom - desktopFooterRect.top) : 0;

  const interactionBlocker =
    typeof document !== 'undefined'
      ? createPortal(
          <>
            <div
              aria-hidden="true"
              className="fixed inset-0 z-[110] bg-transparent pointer-events-auto md:hidden"
              onPointerDown={stopEventPropagation}
              onPointerUp={stopEventPropagation}
              onClick={stopEventPropagation}
              onTouchStart={stopEventPropagation}
              onTouchMove={stopEventPropagation}
              onTouchEnd={stopEventPropagation}
            />

            {desktopFooterRect ? (
              <>
                <div
                  aria-hidden="true"
                  className="hidden md:block fixed left-0 right-0 top-0 z-[110] bg-transparent pointer-events-auto"
                  style={{ height: `${desktopFooterRect.top}px` }}
                  onPointerDown={stopEventPropagation}
                  onPointerUp={stopEventPropagation}
                  onClick={stopEventPropagation}
                  onTouchStart={stopEventPropagation}
                  onTouchMove={stopEventPropagation}
                  onTouchEnd={stopEventPropagation}
                />
                <div
                  aria-hidden="true"
                  className="hidden md:block fixed left-0 z-[110] bg-transparent pointer-events-auto"
                  style={{
                    top: `${desktopFooterRect.top}px`,
                    width: `${desktopFooterRect.left}px`,
                    height: `${desktopFooterHeight}px`,
                  }}
                  onPointerDown={stopEventPropagation}
                  onPointerUp={stopEventPropagation}
                  onClick={stopEventPropagation}
                  onTouchStart={stopEventPropagation}
                  onTouchMove={stopEventPropagation}
                  onTouchEnd={stopEventPropagation}
                />
                <div
                  aria-hidden="true"
                  className="hidden md:block fixed right-0 z-[110] bg-transparent pointer-events-auto"
                  style={{
                    top: `${desktopFooterRect.top}px`,
                    left: `${desktopFooterRect.right}px`,
                    height: `${desktopFooterHeight}px`,
                  }}
                  onPointerDown={stopEventPropagation}
                  onPointerUp={stopEventPropagation}
                  onClick={stopEventPropagation}
                  onTouchStart={stopEventPropagation}
                  onTouchMove={stopEventPropagation}
                  onTouchEnd={stopEventPropagation}
                />
                <div
                  aria-hidden="true"
                  className="hidden md:block fixed left-0 right-0 bottom-0 z-[110] bg-transparent pointer-events-auto"
                  style={{ top: `${desktopFooterRect.bottom}px` }}
                  onPointerDown={stopEventPropagation}
                  onPointerUp={stopEventPropagation}
                  onClick={stopEventPropagation}
                  onTouchStart={stopEventPropagation}
                  onTouchMove={stopEventPropagation}
                  onTouchEnd={stopEventPropagation}
                />
              </>
            ) : (
              <div
                aria-hidden="true"
                className="hidden md:block fixed inset-0 z-[110] bg-transparent pointer-events-auto"
                onPointerDown={stopEventPropagation}
                onPointerUp={stopEventPropagation}
                onClick={stopEventPropagation}
                onTouchStart={stopEventPropagation}
                onTouchMove={stopEventPropagation}
                onTouchEnd={stopEventPropagation}
              />
            )}
          </>,
          document.body
        )
      : null;

  const mobileFooter = (
    <div
      className="pointer-events-auto md:hidden fixed bottom-0 left-0 right-0 z-[120] border-t border-border backdrop-blur-xl bg-card/90"
      style={{
        bottom: 'calc(0px - var(--app-keyboard-offset, 0px))',
        paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)',
      }}
      onTouchStart={stopEventPropagation}
      onTouchMove={stopEventPropagation}
      onTouchEnd={stopEventPropagation}
    >
      <div className="p-3 pt-2.5">{children}</div>
    </div>
  );

  if (hideRatingFooter) return null;

  return (
    <>
      {interactionBlocker}

      <div
        ref={desktopFooterRef}
        className="hidden md:block relative z-[121] pointer-events-auto mt-6 pt-6 border-t border-border/60"
      >
        {children}
      </div>

      {/* <div className="md:hidden h-36" aria-hidden="true" /> */}

      {typeof document !== 'undefined' ? createPortal(mobileFooter, document.body) : null}
    </>
  );
}
