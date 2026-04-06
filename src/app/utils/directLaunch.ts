import type { DirectLaunchVerse } from "@/app/components/Training/types";
import type { Verse } from "@/app/domain/verse";

export function toDirectLaunchPayload(launchOrVerse: DirectLaunchVerse | Verse): DirectLaunchVerse {
  if ("verse" in launchOrVerse) {
    return launchOrVerse;
  }

  return { verse: launchOrVerse };
}
