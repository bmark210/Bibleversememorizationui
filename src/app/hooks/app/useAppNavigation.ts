"use client";

import { useCallback, useState } from "react";
import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type { Verse } from "@/app/domain/verse";
import type { AppRootPage, PendingVerseListReturn } from "@/app/domain/appPages";
import { toDirectLaunchPayload } from "@/app/utils/directLaunch";

export function useAppNavigation() {
  const [pageStack, setPageStack] = useState<AppRootPage[]>(["dashboard"]);
  const [trainingDirectLaunch, setTrainingDirectLaunch] =
    useState<DirectLaunchVerse | null>(null);
  const [pendingVerseListReturn, setPendingVerseListReturn] =
    useState<PendingVerseListReturn | null>(null);

  const currentPage = pageStack[pageStack.length - 1] ?? "dashboard";
  const canGoBackInApp = pageStack.length > 1;

  const pushPage = useCallback((page: AppRootPage) => {
    setPageStack((prev) => {
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage === page) return prev;
      return [...prev, page];
    });
  }, []);

  const handleRootNavigate = useCallback((page: string) => {
    const nextPage = page as AppRootPage;

    setPageStack((prev) => {
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage === nextPage && prev.length === 1) {
        return prev;
      }
      return [nextPage];
    });

    setTrainingDirectLaunch(null);
    setPendingVerseListReturn(null);
  }, []);

  const handleNavigateBackInApp = useCallback(() => {
    setPageStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const handleNavigateToTrainingWithVerse = useCallback(
    (launchOrVerse: DirectLaunchVerse | Verse) => {
      const launch = toDirectLaunchPayload(launchOrVerse);
      setPendingVerseListReturn(null);
      setTrainingDirectLaunch(launch);
      pushPage("training");
    },
    [pushPage]
  );

  const handleDirectLaunchExit = useCallback((launch: DirectLaunchVerse) => {
    setTrainingDirectLaunch(null);
    const returnTarget = launch.returnTarget ?? { kind: "training-hub" as const };

    if (returnTarget.kind !== "verse-list") {
      return;
    }

    setPendingVerseListReturn({
      statusFilter: returnTarget.statusFilter,
    });

    setPageStack((prev) => {
      const activePage = prev[prev.length - 1] ?? "dashboard";
      if (activePage !== "training") {
        return ["verses"];
      }

      const previousPage = prev[prev.length - 2];
      if (previousPage === "verses") {
        return prev.slice(0, -1);
      }

      return ["verses"];
    });
  }, []);

  const handleVerseListReturnHandled = useCallback(() => {
    setPendingVerseListReturn(null);
  }, []);

  return {
    pageStack,
    setPageStack,
    currentPage,
    canGoBackInApp,
    pushPage,
    handleRootNavigate,
    handleNavigateBackInApp,
    trainingDirectLaunch,
    setTrainingDirectLaunch,
    pendingVerseListReturn,
    handleNavigateToTrainingWithVerse,
    handleDirectLaunchExit,
    handleVerseListReturnHandled,
  };
}
