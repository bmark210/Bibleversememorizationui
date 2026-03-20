"use client";

import {
  AnchorTrainingSessionRoot,
  type AnchorTrainingSessionRootProps,
} from "./AnchorTrainingSession.lazy";

export type AnchorSessionProps = AnchorTrainingSessionRootProps;

export function AnchorSession(props: AnchorSessionProps) {
  return <AnchorTrainingSessionRoot {...props} />;
}
