export type VerseCardTone = "my" | "catalog" | "learning" | "review" | "mastered" | "stopped";

export type VerseCardStatusToneKey =
  | "learning"
  | "review"
  | "reviewWaiting"
  | "mastered"
  | "stopped";

export type VerseCardPopularityScope = "friends" | "players";

export type VerseCardTonePalette = {
  frameClassName: string;
  surfaceClassName: string;
  glowClassName: string;
  lineClassName: string;
  accentBorderClassName: string;
  accentTextClassName: string;
  progressClassName: string;
};

export type VerseCardStatusPillPalette = {
  pillClassName: string;
  iconClassName: string;
  titleClassName: string;
};

export type VerseCardColorConfig = {
  surfaceBorderClassName: string;
  actionButtonClassName: string;
  actionButtonHoverClassName: string;
  metaPanelClassName: string;
  summaryPanelClassName: string;
  summaryCompactPanelClassName: string;
  waitingPillClassName: string;
  tagClassName: string;
  tagInteractiveClassName: string;
  avatarFallbackClassName: string;
  avatarRingClassName: string;
  tones: Record<VerseCardTone, VerseCardTonePalette>;
  statusPills: Record<VerseCardStatusToneKey, VerseCardStatusPillPalette>;
  popularity: Record<
    VerseCardPopularityScope,
    {
      accentClassName: string;
    }
  >;
};

export const VERSE_CARD_COLOR_CONFIG: VerseCardColorConfig = {
  surfaceBorderClassName: "border-border-subtle/80",
  actionButtonClassName:
    "border bg-bg-overlay/92 text-text-primary shadow-[var(--shadow-soft)] backdrop-blur-sm",
  actionButtonHoverClassName:
    "hover:border-border-default hover:bg-bg-surface/96",
  metaPanelClassName:
    "border-border-subtle/85 bg-bg-overlay/92 text-text-secondary shadow-[var(--shadow-soft)] backdrop-blur-sm",
  summaryPanelClassName:
    "w-full justify-between rounded-[1.7rem] border border-border-subtle/85 bg-bg-overlay/92 px-4 py-3 shadow-[var(--shadow-soft)] backdrop-blur-sm",
  summaryCompactPanelClassName:
    "rounded-full border border-border-subtle/85 bg-bg-overlay/92 px-3 py-1.5 shadow-[var(--shadow-soft)] backdrop-blur-sm",
  waitingPillClassName: "border-border-subtle/85 bg-bg-overlay/92",
  tagClassName:
    "border-border-subtle bg-bg-elevated/95 text-text-secondary shadow-[var(--shadow-soft)]",
  tagInteractiveClassName:
    "hover:border-border-default hover:bg-bg-surface hover:text-text-primary",
  avatarFallbackClassName: "bg-bg-subtle text-text-secondary",
  avatarRingClassName: "border-bg-overlay",
  tones: {
    catalog: {
      frameClassName: "bg-border-default",
      surfaceClassName: "",
      glowClassName: "bg-bg-subtle",
      lineClassName: "from-transparent via-border-default to-transparent",
      accentBorderClassName: "border-border-default/70",
      accentTextClassName: "text-brand-primary",
      progressClassName: "text-brand-primary",
    },
    my: {
      frameClassName: "bg-status-collection",
      surfaceClassName: "",
      glowClassName: "bg-status-collection-soft",
      lineClassName: "from-transparent via-status-collection to-transparent",
      accentBorderClassName: "border-status-collection/28",
      accentTextClassName: "text-status-collection",
      progressClassName: "text-status-collection",
    },
    learning: {
      frameClassName: "bg-status-learning",
      surfaceClassName: "",
      glowClassName: "bg-status-learning-soft",
      lineClassName: "from-transparent via-status-learning to-transparent",
      accentBorderClassName: "border-status-learning/30",
      accentTextClassName: "text-status-learning",
      progressClassName: "text-status-learning",
    },
    review: {
      frameClassName: "bg-status-review",
      surfaceClassName: "",
      glowClassName: "bg-status-review-soft",
      lineClassName: "from-transparent via-status-review to-transparent",
      accentBorderClassName: "border-status-review/30",
      accentTextClassName: "text-status-review",
      progressClassName: "text-status-review",
    },
    mastered: {
      frameClassName: "bg-status-mastered",
      surfaceClassName: "",
      glowClassName: "bg-status-mastered-soft",
      lineClassName: "from-transparent via-status-mastered to-transparent",
      accentBorderClassName: "border-status-mastered/30",
      accentTextClassName: "text-status-mastered",
      progressClassName: "text-status-mastered",
    },
    stopped: {
      frameClassName: "bg-status-paused",
      surfaceClassName: "",
      glowClassName: "bg-status-paused-soft",
      lineClassName: "from-transparent via-status-paused to-transparent",
      accentBorderClassName: "border-status-paused/30",
      accentTextClassName: "text-status-paused",
      progressClassName: "text-status-paused",
    },
  },
  statusPills: {
    learning: {
      pillClassName: "border-status-learning/25 bg-status-learning-soft",
      iconClassName: "text-status-learning",
      titleClassName: "text-status-learning/85",
    },
    review: {
      pillClassName: "border-status-review/25 bg-status-review-soft",
      iconClassName: "text-status-review",
      titleClassName: "text-status-review/85",
    },
    reviewWaiting: {
      pillClassName: "border-status-review/25 bg-status-review-soft",
      iconClassName: "text-status-review",
      titleClassName: "text-status-review/85",
    },
    mastered: {
      pillClassName: "border-status-mastered/25 bg-status-mastered-soft",
      iconClassName: "text-status-mastered",
      titleClassName: "text-status-mastered/85",
    },
    stopped: {
      pillClassName: "border-status-paused/25 bg-status-paused-soft",
      iconClassName: "text-status-paused",
      titleClassName: "text-status-paused/85",
    },
  },
  popularity: {
    friends: {
      accentClassName: "border-status-community/30 text-status-community",
    },
    players: {
      accentClassName: "border-status-collection/30 text-status-collection",
    },
  },
};
