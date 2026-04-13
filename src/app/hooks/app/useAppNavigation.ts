"use client";

import { useEffect, useRef } from "react";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type { AppRootPage } from "@/app/domain/appPages";
import { useScreenStore, type ScreenStoreSnapshot } from "@/app/stores/screenStore";
import type { TrainingBoxScope } from "@/app/types/textBox";

const ROOT_PAGES: readonly AppRootPage[] = [
  "dashboard",
  "verses",
  "training",
  "community",
  "profile",
] as const;

type HistoryStatePayload = {
  appNavigation: true;
  snapshot: ScreenStoreSnapshot;
};

function isRootPage(value: string | null | undefined): value is AppRootPage {
  return ROOT_PAGES.includes((value ?? "") as AppRootPage);
}

function getHashForPage(page: AppRootPage): string {
  return page === "dashboard" ? "" : `#${page}`;
}

function readPageFromLocation(): AppRootPage | null {
  if (typeof window === "undefined") return null;
  const raw = window.location.hash.replace(/^#/, "").trim().toLowerCase();
  return isRootPage(raw) ? raw : null;
}

function buildHistoryState(snapshot: ScreenStoreSnapshot): HistoryStatePayload {
  return {
    appNavigation: true,
    snapshot,
  };
}

function isHistoryStatePayload(value: unknown): value is HistoryStatePayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<HistoryStatePayload>;
  return payload.appNavigation === true && Boolean(payload.snapshot);
}

function writeHistoryEntry(
  mode: "push" | "replace",
  snapshot: ScreenStoreSnapshot,
) {
  if (typeof window === "undefined") return;
  const method = mode === "push" ? "pushState" : "replaceState";
  const hash = getHashForPage(snapshot.active);
  const nextUrl = `${window.location.pathname}${window.location.search}${hash}`;
  window.history[method](buildHistoryState(snapshot), "", nextUrl);
}

export function useAppNavigation() {
  const active = useScreenStore((s) => s.active);
  const history = useScreenStore((s) => s.history);
  const trainingDirectLaunch = useScreenStore((s) => s.trainingDirectLaunch);
  const trainingBoxScope = useScreenStore((s) => s.trainingBoxScope);
  const pendingTextBoxReturn = useScreenStore((s) => s.pendingTextBoxReturn);
  const go = useScreenStore((s) => s.go);
  const push = useScreenStore((s) => s.push);
  const back = useScreenStore((s) => s.back);
  const navigateToTrainingWithVerse = useScreenStore((s) => s.navigateToTrainingWithVerse);
  const navigateToTrainingHub = useScreenStore((s) => s.navigateToTrainingHub);
  const navigateToTrainingBox = useScreenStore((s) => s.navigateToTrainingBox);
  const replaceSnapshot = useScreenStore((s) => s.replaceSnapshot);
  const getSnapshot = useScreenStore((s) => s.getSnapshot);

  const hasInitializedHistoryRef = useRef(false);
  const isRestoringFromHistoryRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasInitializedHistoryRef.current) {
      return;
    }

    const pageFromUrl = readPageFromLocation();
    if (pageFromUrl && pageFromUrl !== getSnapshot().active) {
      replaceSnapshot({
        ...getSnapshot(),
        active: pageFromUrl,
        history: [],
      });
    }

    writeHistoryEntry("replace", getSnapshot());
    hasInitializedHistoryRef.current = true;

    const handlePopState = (event: PopStateEvent) => {
      const state = event.state;
      isRestoringFromHistoryRef.current = true;

      if (isHistoryStatePayload(state)) {
        replaceSnapshot(state.snapshot);
      } else {
        const fallbackPage = readPageFromLocation() ?? "dashboard";
        replaceSnapshot({
          ...getSnapshot(),
          active: fallbackPage,
          history: [],
          trainingDirectLaunch: null,
          trainingBoxScope: null,
          pendingTextBoxReturn: null,
        });
      }

      window.requestAnimationFrame(() => {
        isRestoringFromHistoryRef.current = false;
      });
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, [getSnapshot, replaceSnapshot]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hasInitializedHistoryRef.current || isRestoringFromHistoryRef.current) {
      return;
    }

    const state = window.history.state;
    const snapshot = getSnapshot();
    if (!isHistoryStatePayload(state)) {
      writeHistoryEntry("replace", snapshot);
      return;
    }

    const previousSnapshot = state.snapshot;
    const hasDifferentActive = previousSnapshot.active !== snapshot.active;
    const hasDifferentHistory =
      JSON.stringify(previousSnapshot.history) !== JSON.stringify(snapshot.history);
    const hasDifferentTrainingScope =
      JSON.stringify(previousSnapshot.trainingBoxScope) !==
      JSON.stringify(snapshot.trainingBoxScope);
    const hasDifferentDirectLaunch =
      JSON.stringify(previousSnapshot.trainingDirectLaunch) !==
      JSON.stringify(snapshot.trainingDirectLaunch);
    const hasDifferentPendingReturn =
      JSON.stringify(previousSnapshot.pendingTextBoxReturn) !==
      JSON.stringify(snapshot.pendingTextBoxReturn);

    if (
      hasDifferentActive ||
      hasDifferentHistory ||
      hasDifferentTrainingScope ||
      hasDifferentDirectLaunch ||
      hasDifferentPendingReturn
    ) {
      writeHistoryEntry("replace", snapshot);
    }
  }, [
    active,
    history,
    trainingDirectLaunch,
    trainingBoxScope,
    pendingTextBoxReturn,
    getSnapshot,
  ]);

  const commitPushState = () => {
    writeHistoryEntry("push", useScreenStore.getState().getSnapshot());
  };

  return {
    active,
    canGoBack: history.length > 0,
    goToRootPage: (page: AppRootPage) => {
      const snapshot = useScreenStore.getState().getSnapshot();
      if (snapshot.active === page && snapshot.history.length === 0) {
        return;
      }
      go(page);
      commitPushState();
    },
    pushPage: (page: AppRootPage) => {
      const snapshot = useScreenStore.getState().getSnapshot();
      if (snapshot.active === page) {
        return;
      }
      push(page);
      commitPushState();
    },
    goBack: () => {
      if (typeof window !== "undefined" && window.history.length > 1) {
        window.history.back();
        return;
      }
      back();
      writeHistoryEntry("replace", useScreenStore.getState().getSnapshot());
    },
    openTrainingWithVerse: (launch: DirectLaunchVerse) => {
      navigateToTrainingWithVerse(launch);
      commitPushState();
    },
    openTrainingHub: () => {
      navigateToTrainingHub();
      commitPushState();
    },
    openTrainingBox: (scope: TrainingBoxScope) => {
      navigateToTrainingBox(scope);
      commitPushState();
    },
  };
}
