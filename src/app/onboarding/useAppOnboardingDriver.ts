"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import { flushSync } from "react-dom";
import { driver, type Driver, type PopoverDOM } from "driver.js";
import {
  buildOnboardingSteps,
  resolveOnboardingElement,
  type AppOnboardingRuntime,
  type AppOnboardingStep,
  type OnboardingPage,
  type StepElementTarget,
} from "./buildOnboardingSteps";
import {
  clearOnboardingReplayState,
  readOnboardingCompletion,
  writeOnboardingCompletion,
  writeOnboardingReplayState,
  type OnboardingSource,
} from "./onboardingStorage";

type DestroyReason = "complete" | "cancel" | "restart" | null;

type UseAppOnboardingDriverOptions = {
  currentPage: OnboardingPage;
  isBootstrapping: boolean;
  telegramId: string | null;
  hasOwnedVerses: boolean;
  hasProgressVerse: boolean;
  useMockVerseFlow: boolean;
  navigateToPage: (page: OnboardingPage) => void;
};

type UseAppOnboardingDriverResult = {
  hasHydratedCompletion: boolean;
  hasCompletedOnboarding: boolean;
  isOnboardingActive: boolean;
  startOnboarding: (source: OnboardingSource) => Promise<void>;
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

function waitForPage(pageRef: MutableRefObject<OnboardingPage>, page: OnboardingPage, timeoutMs = 4000) {
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

export function useAppOnboardingDriver({
  currentPage,
  isBootstrapping,
  telegramId,
  hasOwnedVerses,
  hasProgressVerse,
  useMockVerseFlow,
  navigateToPage,
}: UseAppOnboardingDriverOptions): UseAppOnboardingDriverResult {
  const currentPageRef = useRef(currentPage);
  const driverRef = useRef<Driver | null>(null);
  const destroyReasonRef = useRef<DestroyReason>(null);
  const sourceRef = useRef<OnboardingSource | null>(null);
  const autoStartAttemptedRef = useRef(false);
  const stepsRef = useRef<AppOnboardingStep[]>([]);
  const stepCleanupRef = useRef<(() => void) | null>(null);
  const transitionInFlightRef = useRef(false);
  const [hasCompletedOnboarding, setHasCompletedOnboarding] = useState(false);
  const [hasHydratedCompletion, setHasHydratedCompletion] = useState(false);
  const [isOnboardingActive, setIsOnboardingActive] = useState(false);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  useEffect(() => {
    if (isBootstrapping) {
      setHasHydratedCompletion(false);
      return;
    }

    setHasCompletedOnboarding(readOnboardingCompletion(telegramId));
    setHasHydratedCompletion(true);
  }, [isBootstrapping, telegramId]);

  useEffect(() => {
    autoStartAttemptedRef.current = false;
  }, [telegramId]);

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
        let pollTimeoutId: number | null = null;
        let timeoutId: number | null = null;
        let handleAbort: (() => void) | null = null;

        const finish = (value: boolean) => {
          if (settled) return;
          settled = true;
          if (timeoutId !== null) {
            window.clearTimeout(timeoutId);
          }
          if (pollTimeoutId !== null) {
            window.clearTimeout(pollTimeoutId);
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

        if (useMockVerseFlow) {
          const poll = () => {
            check();
            if (settled) return;
            pollTimeoutId = window.setTimeout(poll, 16);
          };
          poll();
        } else {
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
        }

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
    [useMockVerseFlow],
  );

  const waitForElement = useCallback(
    async (
      target?: StepElementTarget,
      options?: { timeoutMs?: number },
    ): Promise<Element | null> => {
      if (!target) return null;

      const existing = resolveOnboardingElement(target);
      if (isElementVisible(existing)) {
        return existing;
      }

      const matched = await waitForCondition(
        () => {
          const nextElement = resolveOnboardingElement(target);
          return isElementVisible(nextElement);
        },
        options,
      );

      if (!matched) return null;
      return resolveOnboardingElement(target);
    },
    [waitForCondition],
  );

  const dispatchAppEvent = useCallback((eventName: string) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(eventName));
  }, []);

  const navigateToOnboardingPage = useCallback(
    (page: OnboardingPage) => {
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

  const createRuntime = useCallback((): AppOnboardingRuntime => {
    return {
      source: sourceRef.current ?? "auto",
      isMockVerseFlow: useMockVerseFlow,
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
      goToStep: async (index: number, direction = 1) => {
        await transitionToStep.current?.(index, direction);
      },
      waitForElement,
      waitForCondition,
      dispatchAppEvent,
    };
  }, [dispatchAppEvent, useMockVerseFlow, waitForCondition, waitForElement]);

  const finishOnboarding = useCallback(() => {
    destroyReasonRef.current = "complete";
    driverRef.current?.destroy();
  }, []);

  const cancelReplay = useCallback(() => {
    destroyReasonRef.current = "cancel";
    driverRef.current?.destroy();
  }, []);

  const renderTransitioningPopover = useCallback(
    (step: AppOnboardingStep, stepIndex: number) => {
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
            navigateToOnboardingPage(step.page);
            await waitForPage(currentPageRef, step.page);
            await waitForPagePaint(useMockVerseFlow ? 1 : 2);
          }

          await step.prepare?.(runtime);
          await waitForPagePaint(useMockVerseFlow ? 1 : 2);

          const shouldSkip = (await step.skipWhen?.(runtime)) ?? false;
          if (shouldSkip) {
            candidateIndex += direction;
            continue;
          }

          if (step.element) {
            const resolvedElement = await runtime.waitForElement(step.element, { timeoutMs: 12000 });
            if (!resolvedElement) {
              // Element didn't appear in time — skip this step instead of
              // silently stopping the onboarding.
              candidateIndex += direction;
              continue;
            }
          }

          driverRef.current?.moveTo(candidateIndex);
          return;
        }

        if (direction > 0) {
          finishOnboarding();
        }
      } finally {
        transitionInFlightRef.current = false;
      }
    },
    [
      cleanupStepEffect,
      createRuntime,
      finishOnboarding,
      navigateToOnboardingPage,
      renderTransitioningPopover,
    ],
  );

  useEffect(() => {
    transitionToStep.current = transitionToStepImpl;
  }, [transitionToStepImpl]);

  const buildDriverInstance = useCallback(
    (source: OnboardingSource) => {
      const steps = stepsRef.current;
      const allowClose = source === "profile";

      return driver({
        allowClose,
        allowKeyboardControl: allowClose,
        animate: !useMockVerseFlow,
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
        smoothScroll: !useMockVerseFlow,
        stagePadding: 10,
        stageRadius: 20,
        steps: steps.map((step, index) => ({
          disableActiveInteraction: step.disableActiveInteraction,
          element: step.element
            ? () => resolveOnboardingElement(step.element) ?? undefined
            : undefined,
          onDeselected: () => {
            cleanupStepEffect();
          },
          onHighlighted: async () => {
            cleanupStepEffect();
            const runtime = createRuntime();
            const cleanup = await step.onHighlighted?.(runtime);
            stepCleanupRef.current = typeof cleanup === "function" ? cleanup : null;
          },
          onPopoverRender: step.onPopoverRender
            ? (popover, opts) => {
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
                finishOnboarding();
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
          clearOnboardingReplayState();
          setIsOnboardingActive(false);

          if (destroyReason === "complete") {
            writeOnboardingCompletion(telegramId);
            setHasCompletedOnboarding(true);
            navigateToPage(sourceValue === "auto" ? "verses" : "profile");
            return;
          }

          if (destroyReason === "cancel" && sourceValue === "profile") {
            navigateToPage("profile");
          }
        },
      });
    },
    [
      cancelReplay,
      cleanupStepEffect,
      createRuntime,
      finishOnboarding,
      navigateToPage,
      telegramId,
      useMockVerseFlow,
    ],
  );

  const startOnboarding = useCallback(
    async (source: OnboardingSource) => {
      if (typeof window === "undefined" || isBootstrapping) return;

      if (driverRef.current?.isActive()) {
        destroyReasonRef.current = "restart";
        driverRef.current.destroy();
      }

      sourceRef.current = source;
      stepsRef.current = buildOnboardingSteps({
        source,
        hasOwnedVerses,
        hasProgressVerse,
        useMockVerseFlow,
      });
      writeOnboardingReplayState(source);
      setIsOnboardingActive(true);

      if (currentPageRef.current !== "dashboard") {
        navigateToOnboardingPage("dashboard");
        await waitForPage(currentPageRef, "dashboard");
        await waitForPagePaint(useMockVerseFlow ? 1 : 2);
      }

      const initialRuntime = createRuntime();
      await stepsRef.current[0]?.prepare?.(initialRuntime);
      await waitForPagePaint(useMockVerseFlow ? 1 : 2);

      const nextDriver = buildDriverInstance(source);
      driverRef.current = nextDriver;

      let initialIndex = 0;
      while (initialIndex < stepsRef.current.length) {
        const step = stepsRef.current[initialIndex];
        const shouldSkip = (await step.skipWhen?.(createRuntime())) ?? false;
        if (!shouldSkip) break;
        initialIndex += 1;
      }

      nextDriver.drive(initialIndex);
    },
    [
      buildDriverInstance,
      createRuntime,
      hasOwnedVerses,
      hasProgressVerse,
      isBootstrapping,
      navigateToOnboardingPage,
      useMockVerseFlow,
    ],
  );

  useEffect(() => {
    if (isBootstrapping) return;
    if (!hasHydratedCompletion) return;
    if (hasCompletedOnboarding) return;
    if (autoStartAttemptedRef.current) return;

    autoStartAttemptedRef.current = true;
    void startOnboarding("auto");
  }, [hasCompletedOnboarding, hasHydratedCompletion, isBootstrapping, startOnboarding]);

  useEffect(() => {
    return () => {
      destroyReasonRef.current = "restart";
      cleanupStepEffect();
      driverRef.current?.destroy();
      clearOnboardingReplayState();
    };
  }, [cleanupStepEffect]);

  return useMemo(
    () => ({
      hasHydratedCompletion,
      hasCompletedOnboarding,
      isOnboardingActive,
      startOnboarding,
    }),
    [hasCompletedOnboarding, hasHydratedCompletion, isOnboardingActive, startOnboarding],
  );
}
