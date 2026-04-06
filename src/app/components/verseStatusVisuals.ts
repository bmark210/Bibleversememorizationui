import {
  BookMarked,
  Brain,
  Clock,
  Pause,
  RefreshCw,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { VerseCardTonePalette } from "@/app/components/verseCardColorConfig";

export type VerseSectionStatusKey =
  | "learning"
  | "queue"
  | "review"
  | "mastered"
  | "stopped"
  | "my";

export const VERSE_STATUS_ICONS: Record<VerseSectionStatusKey, LucideIcon> = {
  learning: Brain,
  queue: Clock,
  review: RefreshCw,
  mastered: Trophy,
  stopped: Pause,
  my: BookMarked,
};

export const OWNED_COLLECTION_CARD_TONE: VerseCardTonePalette = {
  frameClassName: "bg-[#8c6a3b]/85",
  surfaceClassName: "",
  surfaceTintClassName: "bg-[#8c6a3b]/14",
  glowClassName: "bg-[#8c6a3b]/22",
  lineClassName: "from-transparent via-[#8c6a3b]/60 to-transparent",
  accentBorderClassName: "border-[#8c6a3b]/40",
  accentTextClassName: "text-[#c49a6c]",
  progressClassName: "text-[#c49a6c]",
};

export const OWNED_COLLECTION_BADGE_CLASS_NAME =
  "border-[#8c6a3b]/45 bg-[#8c6a3b]/16 text-[#c49a6c]";

export const OWNED_COLLECTION_FILTER_THEME = {
  dotClassName: "bg-[#c49a6c]",
  activeTabClassName:
    "border-[#8c6a3b]/45 bg-[#8c6a3b]/16 text-[#c49a6c] shadow-[var(--shadow-soft)]",
  currentBadgeClassName:
    "border-[#8c6a3b]/45 bg-[#8c6a3b]/16 text-[#c49a6c]",
  statusBadgeClassName:
    "border-[#8c6a3b]/45 bg-[#8c6a3b]/16 text-[#c49a6c]",
  cardClassName: "bg-gradient-to-br from-[#8c6a3b]/14 via-bg-surface to-bg-elevated",
} as const;

export const OWNED_COLLECTION_SECTION_THEME = {
  dotClass: "bg-[#c49a6c]",
  accentClass: "text-[#c49a6c]",
  softBgClass: "bg-[#8c6a3b]/16",
  tintBgClass: "bg-[#8c6a3b]/22",
  borderClass: "border-[#8c6a3b]/45",
} as const;
