"use client";

import {
  AnchorTrainingSessionRoot,
  type AnchorTrainingSessionRootProps,
} from "./AnchorTrainingSession.lazy";

export type AnchorSessionProps = AnchorTrainingSessionRootProps;

/** Fullscreen chrome (верхний бар как в Layout) рендерится внутри AnchorTrainingSession. */
export function AnchorSession(props: AnchorSessionProps) {
  return <AnchorTrainingSessionRoot {...props} />;
}
