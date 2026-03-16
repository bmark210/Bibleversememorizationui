"use client";

import { useCallback, useEffect, useMemo, useRef, type MutableRefObject } from "react";
import { flushSync } from "react-dom";
import { driver, type Driver, type PopoverDOM } from "driver.js";
import {
  buildVerseSectionTutorialSteps,
  resolveVerseSectionTutorialElement,
  type VerseSectionTutorialRuntime,
  type VerseSectionTutorialStep,
  type VerseSectionTutorialPage,
  type VerseSectionTutorialElementTarget,
} from "./buildVerseSectionTutorialSteps";
import {
  type VerseSectionTutorialSource,
  writeVerseSectionTutorialPromptSeen,
} from "./storage";
import { useVerseSectionTutorialStore } from "./store";

type DestroyReason = "complete" | "cancel" | "restart" | null;

type UseVerseSectionTutorialDriverOptions = {
  currentPage: VerseSectionTutorialPage;
  isBootstrapping: boolean;
  telegramId: string | null;
  navigateToPage: (page: VerseSectionTutorialPage) => void;
};

type UseVerseSectionTutorialDriverResult = {
  isVerseSectionTutorialActive: boolean;
  startVerseSectionTutorial: (
    source: VerseSectionTutorialSource,
  ) => Promise<void>;
};

function waitForAnimationFrame() {
  return new Promise<void>((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForPagePaint(frameCount = 2) {
  for (let index = 0; index < frameCount; index += 1) {
    await waitForAnimationFrame();
  }
}

async function waitForStepSettle() {
  await waitForPagePaint(2);
  await waitForPagePaint(1);
}

function waitForPage(
  pageRef: MutableRefObject<VerseSectionTutorialPage>,
  page: VerseSectionTutorialPage,
  timeoutMs = 4000,
) {
  return new Promise<boolean>((resolve) => {
    const startedAt = Date.now();

    const check = () => {
      if (pageRef.current === page) {
        resolve(true);
        return;
      }

      if (Date.now() - startedAt >= timeoutMs) {
        resolve(false);
        return;
      }

      window.requestAnimationFrame(check);
    };

    check();
  });
}

function isElementVisible(element: Element | null): element is HTMLElement {
  if (!(element instanceof HTMLElement)) return false;

  const styles = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    styles.display !== "none" &&
    styles.visibility !== "hidden" &&
    Number(styles.opacity) > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function setPopoverButtonDisabled(button: HTMLButtonElement, disabled: boolean) {
  button.disabled = disabled;
  button.classList.toggle("driver-popover-btn-disabled", disabled);
}

export function useVerseSectionTutorialDriver({
  currentPage,
  isBootstrapping,
  telegramId,
  navigateToPage,
}: UseVerseSectionTutorialDriverOptions): UseVerseSectionTutorialDriverResult {
  const currentPageRef = useRef(currentPage);
  const driverRef = useRef<Driver | null>(null);
  const destroyReasonRef = useRef<DestroyReason>(null);
  const sourceRef = useRef<VerseSectionTutorialSource | null>(null);
  const stepsRef = useRef<VerseSectionTutorialStep[]>([]);
  const stepCleanupRef = useRef<(() => void) | null>(null);
  const transitionInFlightRef = useRef(false);

  const isVerseSectionTutorialActive = useVerseSectionTutorialStore(
    (state) => state.isActive,
  );

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const cleanupStepEffect = useCallback(() => {
    const cleanup = stepCleanupRef.current;
    stepCleanupRef.current = null;
    cleanup?.();
  }, []);

  const waitForCondition = useCallback(
    (
      predicate: () => boolean,
      options?: { timeoutMs?: number; signal?: AbortSignal },
    ): Promise<boolean> => {
      if (typeof window === "undefined" || typeof document === "undefined") {
        return Promise.resolve(false);
      }

      const timeoutMs = options?.timeoutMs ?? 12000;
      const abortSignal = options?.signal;

      if (abortSignal?.aborted) {
        return Promise.resolve(false);
      }

      try {
        if (predicate()) {
          return Promise.resolve(true);
        }
      } catch {
        // Ignore predicate errors until DOM settles.
      }

      return new Promise<boolean>((resolve) => {
        let settled = false;
        let observer: MutationObserver | null = null;
        let timeoutId: number | null = null;
        let handleAbort: (() => void) | null = null;

        const finish = (value: boolean) => {
          if (settled) return;
          settled = true;
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }
          observer?.disconnect();
          if (handleAbort) {
            abortSignal?.removeEventListener("abort", handleAbort);
          }
          resolve(value);
        };

        const check = () => {
          try {
            if (predicate()) {
              finish(true);
            }
          } catch {
            // DOM can be mid-transition; keep observing.
          }
        };

        observer = new MutationObserver(() => {
          window.requestAnimationFrame(check);
        });

        observer.observe(document.body, {
          childList: true,
          subtree: true,
          attributes: true,
          characterData: true,
          attributeFilter: [
            "class",
            "style",
            "data-state",
            "data-tour-state",
            "data-tour-filter",
            "aria-hidden",
            "hidden",
          ],
        });

        if (timeoutMs > 0) {
          timeoutId = window.setTimeout(() => {
            finish(false);
          }, timeoutMs);
        }

        if (abortSignal) {
          handleAbort = () => {
            finish(false);
          };
          abortSignal.addEventListener("abort", handleAbort, { once: true });
        }

        check();
      });
    },
    [],
  );

  const waitForElement = useCallback(
    async (
      target?: VerseSectionTutorialElementTarget,
      options?: { timeoutMs?: number },
    ): Promise<Element | null> => {
      if (!target) return null;

      const existing = resolveVerseSectionTutorialElement(target);
      if (isElementVisible(existing)) {
        return existing;
      }

      const matched = await waitForCondition(
        () => {
          const nextElement = resolveVerseSectionTutorialElement(target);
          return isElementVisible(nextElement);
        },
        options,
      );

      if (!matched) return null;
      return resolveVerseSectionTutorialElement(target);
    },
    [waitForCondition],
  );

  const navigateToTutorialPage = useCallback(
    (page: VerseSectionTutorialPage) => {
      flushSync(() => {
        navigateToPage(page);
      });
      currentPageRef.current = page;
    },
    [navigateToPage],
  );

  const transitionToStep = useRef<
    ((targetIndex: number, direction?: 1 | -1) => Promise<void>) | null
  >(null);

  const createRuntime = useCallback((): VerseSectionTutorialRuntime => {
    return {
      source: sourceRef.current ?? "prompt",
      goNext: async () => {
        const activeIndex = driverRef.current?.getActiveIndex();
        if (activeIndex == null) return;
        await transitionToStep.current?.(activeIndex + 1, 1);
      },
      goPrevious: async () => {
        const activeIndex = driverRef.current?.getActiveIndex();
        if (activeIndex == null) return;
        await transitionToStep.current?.(activeIndex - 1, -1);
      },
      goToStep: async (index, direction = 1) => {
        await transitionToStep.current?.(index, direction);
      },
      waitForElement,
      waitForCondition,
    };
  }, [waitForCondition, waitForElement]);

  const finishTutorial = useCallback(() => {
    destroyReasonRef.current = "complete";
    driverRef.current?.destroy();
  }, []);

  const cancelReplay = useCallback(() => {
    destroyReasonRef.current = "cancel";
    driverRef.current?.destroy();
  }, []);

  const renderTransitioningPopover = useCallback(
    (step: VerseSectionTutorialStep, stepIndex: number) => {
      const popover = driverRef.current?.getState("popover") as PopoverDOM | undefined;
      if (!popover) return;

      popover.wrapper.setAttribute("aria-busy", "true");

      popover.title.textContent = step.title;
      popover.title.style.display = step.title ? "block" : "none";

      popover.description.textContent = step.description;
      popover.description.style.display = step.description ? "block" : "none";

      popover.progress.textContent = `${stepIndex + 1} / ${stepsRef.current.length}`;
      popover.progress.style.display = "block";

      popover.previousButton.textContent = "Назад";
      popover.nextButton.textContent =
        stepIndex >= stepsRef.current.length - 1 ? "Завершить" : "Далее";

      setPopoverButtonDisabled(popover.previousButton, true);
      setPopoverButtonDisabled(popover.nextButton, true);
    },
    [],
  );

  const transitionToStepImpl = useCallback(
    async (targetIndex: number, direction: 1 | -1 = 1) => {
      if (transitionInFlightRef.current) return;
      transitionInFlightRef.current = true;

      const steps = stepsRef.current;
      let candidateIndex = targetIndex;

      cleanupStepEffect();

      try {
        while (candidateIndex >= 0 && candidateIndex < steps.length) {
          const step = steps[candidateIndex];
          const runtime = createRuntime();

          renderTransitioningPopover(step, candidateIndex);

          if (currentPageRef.current !== step.page) {
            navigateToTutorialPage(step.page);
            await waitForPage(currentPageRef, step.page);
            await waitForPagePaint(2);
          }

          await step.prepare?.(runtime);
          await waitForStepSettle();

          const shouldSkip = (await step.skipWhen?.(runtime)) ?? false;
          if (shouldSkip) {
            candidateIndex += direction;
            continue;
          }

          if (step.element) {
            const resolvedElement = await runtime.waitForElement(step.element, {
              timeoutMs: 8000,
            });
            if (!resolvedElement) {
              candidateIndex += direction;
              continue;
            }
          }

          await waitForStepSettle();
          driverRef.current?.moveTo(candidateIndex);
          return;
        }

        if (direction > 0) {
          finishTutorial();
        }
      } finally {
        transitionInFlightRef.current = false;
      }
    },
    [
      cleanupStepEffect,
      createRuntime,
      finishTutorial,
      navigateToTutorialPage,
      renderTransitioningPopover,
    ],
  );

  useEffect(() => {
    transitionToStep.current = transitionToStepImpl;
  }, [transitionToStepImpl]);

  const buildDriverInstance = useCallback(
    (source: VerseSectionTutorialSource) => {
      const steps = stepsRef.current;
      const allowClose = source === "profile";

      return driver({
        allowClose,
        allowKeyboardControl: allowClose,
        animate: false,
        disableActiveInteraction: true,
        doneBtnText: "Завершить",
        nextBtnText: "Далее",
        overlayClickBehavior: allowClose ? "close" : (() => {}),
        overlayOpacity: 0.7,
        popoverClass: `bible-memory-onboarding-popover ${
          allowClose
            ? "bible-memory-onboarding-popover--closable"
            : "bible-memory-onboarding-popover--forced"
        }`,
        prevBtnText: "Назад",
        progressText: "{{current}} / {{total}}",
        showButtons: allowClose ? ["previous", "next", "close"] : ["previous", "next"],
        showProgress: true,
        smoothScroll: false,
        stagePadding: 10,
        stageRadius: 20,
        steps: steps.map((step, index) => ({
          disableActiveInteraction: step.disableActiveInteraction,
          element: step.element
            ? () => resolveVerseSectionTutorialElement(step.element) ?? undefined
            : undefined,
          onDeselected: () => {
            cleanupStepEffect();
          },
          onHighlighted: async () => {
            cleanupStepEffect();
            const runtime = createRuntime();
            const cleanup = await step.onHighlighted?.(runtime);
            stepCleanupRef.current =
              typeof cleanup === "function" ? cleanup : null;
          },
          onPopoverRender: step.onPopoverRender
            ? (popover: PopoverDOM, opts: { driver: Driver }) => {
                step.onPopoverRender?.(popover, opts.driver);
              }
            : undefined,
          popover: {
            align: step.align ?? "center",
            description: step.description,
            showButtons: step.showButtons,
            showProgress: step.showProgress,
            side: step.side ?? "bottom",
            title: step.title,
            onPrevClick: () => {
              void transitionToStep.current?.(index - 1, -1);
            },
            onNextClick: () => {
              if (step.autoAction) {
                void step.autoAction(createRuntime());
                return;
              }

              const nextIndex = index + 1;
              if (nextIndex >= steps.length) {
                finishTutorial();
                return;
              }

              void transitionToStep.current?.(nextIndex, 1);
            },
            onCloseClick: allowClose
              ? () => {
                  cancelReplay();
                }
              : undefined,
          },
        })),
        onDestroyed: () => {
          const destroyReason = destroyReasonRef.current;
          const sourceValue = sourceRef.current;

          cleanupStepEffect();
          destroyReasonRef.current = null;
          sourceRef.current = null;
          driverRef.current = null;
          transitionInFlightRef.current = false;

          if (destroyReason === "complete") {
            useVerseSectionTutorialStore
              .getState()
              .completeVerseSectionTutorial(telegramId);
            navigateToPage("verses");
            return;
          }

          if (destroyReason === "cancel" && sourceValue === "profile") {
            useVerseSectionTutorialStore
              .getState()
              .cancelVerseSectionTutorial();
            navigateToPage("profile");
            return;
          }

          useVerseSectionTutorialStore.getState().cancelVerseSectionTutorial();
        },
      });
    },
    [
      cancelReplay,
      cleanupStepEffect,
      createRuntime,
      finishTutorial,
      navigateToPage,
      telegramId,
    ],
  );

  const startVerseSectionTutorial = useCallback(
    async (source: VerseSectionTutorialSource) => {
      if (typeof window === "undefined" || isBootstrapping) return;

      if (driverRef.current?.isActive()) {
        destroyReasonRef.current = "restart";
        driverRef.current.destroy();
      }

      sourceRef.current = source;
      writeVerseSectionTutorialPromptSeen(telegramId);
      useVerseSectionTutorialStore
        .getState()
        .startVerseSectionTutorial(source);

      stepsRef.current = buildVerseSectionTutorialSteps({ source });

      if (currentPageRef.current !== "verses") {
        navigateToTutorialPage("verses");
        await waitForPage(currentPageRef, "verses");
        await waitForPagePaint(2);
      }

      const initialRuntime = createRuntime();
      await stepsRef.current[0]?.prepare?.(initialRuntime);
      await waitForStepSettle();

      const nextDriver = buildDriverInstance(source);
      driverRef.current = nextDriver;
      nextDriver.drive(0);
    },
    [
      buildDriverInstance,
      createRuntime,
      isBootstrapping,
      navigateToTutorialPage,
      telegramId,
    ],
  );

  useEffect(() => {
    return () => {
      destroyReasonRef.current = "restart";
      cleanupStepEffect();
      driverRef.current?.destroy();
    };
  }, [cleanupStepEffect]);

  return useMemo(
    () => ({
      isVerseSectionTutorialActive,
      startVerseSectionTutorial,
    }),
    [isVerseSectionTutorialActive, startVerseSectionTutorial],
  );
}
