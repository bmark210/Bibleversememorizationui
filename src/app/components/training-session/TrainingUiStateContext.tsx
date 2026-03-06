"use client";

import { createContext, useContext, type ReactNode } from "react";

type TrainingUiState = {
  hideRatingFooter: boolean;
};

const TrainingUiStateContext = createContext<TrainingUiState>({
  hideRatingFooter: false,
});

type TrainingUiStateProviderProps = {
  hideRatingFooter?: boolean;
  children: ReactNode;
};

export function TrainingUiStateProvider({
  hideRatingFooter = false,
  children,
}: TrainingUiStateProviderProps) {
  return (
    <TrainingUiStateContext.Provider value={{ hideRatingFooter }}>
      {children}
    </TrainingUiStateContext.Provider>
  );
}

export function useTrainingUiState() {
  return useContext(TrainingUiStateContext);
}

