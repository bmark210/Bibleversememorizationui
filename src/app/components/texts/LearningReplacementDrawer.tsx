"use client";

import { ArrowRightLeft, Loader2 } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import type { Verse } from "@/app/domain/verse";
import { cn } from "@/app/components/ui/utils";
import { TextSurfaceCard, VerseStatePill } from "./TextCards";
import { resolveTextVersePresentation } from "./resolveTextVersePresentation";

type LearningReplacementSection = {
  key: "queue" | "paused";
  title: string;
  verses: Verse[];
};

type LearningReplacementDrawerProps = {
  open: boolean;
  currentVerse: Verse | null;
  sections: LearningReplacementSection[];
  submittingVerseId?: string | null;
  onSelect: (verse: Verse) => void;
  onOpenChange: (open: boolean) => void;
};

function CandidateRow({
  verse,
  isSubmitting,
  onSelect,
}: {
  verse: Verse;
  isSubmitting: boolean;
  onSelect: (verse: Verse) => void;
}) {
  const presentation = resolveTextVersePresentation(verse);
  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() => onSelect(verse)}
      className={cn(
        "w-full rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3 text-left shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface",
        isSubmitting && "pointer-events-none opacity-70",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate [font-family:var(--font-heading)] text-[1.05rem] font-semibold tracking-tight text-text-primary">
              {verse.reference}
            </span>
            <VerseStatePill
              label={presentation.label}
              toneClassName={presentation.toneClassName}
            />
            {typeof verse.queuePosition === "number" && verse.queuePosition > 0 ? (
              <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface/80 px-2.5 py-1 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-soft)]">
                #{verse.queuePosition}
              </span>
            ) : null}
          </div>
          <p className="mt-2 line-clamp-2 whitespace-pre-line text-[0.98rem] leading-7 text-text-secondary">
            {verse.text}
          </p>
        </div>

        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-surface/80 text-text-secondary shadow-[var(--shadow-soft)]">
          {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRightLeft className="h-4 w-4" />}
        </div>
      </div>
    </button>
  );
}

export function LearningReplacementDrawer({
  open,
  currentVerse,
  sections,
  submittingVerseId = null,
  onSelect,
  onOpenChange,
}: LearningReplacementDrawerProps) {
  const currentPresentation = currentVerse ? resolveTextVersePresentation(currentVerse) : null;
  const hasCandidates = sections.some((section) => section.verses.length > 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="px-4">
        <DrawerHeader className="px-0">
          <DrawerTitle>Заменить в изучении</DrawerTitle>
        </DrawerHeader>

        <div className="max-h-[68vh] space-y-4 overflow-y-auto pb-2">
          {currentVerse ? (
            <TextSurfaceCard className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate [font-family:var(--font-heading)] text-[1.15rem] font-semibold tracking-tight text-text-primary">
                  {currentVerse.reference}
                </h3>
                {currentPresentation ? (
                  <VerseStatePill
                    label={currentPresentation.label}
                    toneClassName={currentPresentation.toneClassName}
                  />
                ) : null}
              </div>
              <p className="mt-2 line-clamp-3 whitespace-pre-line text-[0.98rem] leading-7 text-text-secondary">
                {currentVerse.text}
              </p>
            </TextSurfaceCard>
          ) : null}

          {hasCandidates ? (
            sections.map((section) =>
              section.verses.length > 0 ? (
                <div key={section.key} className="space-y-2">
                  <div className="px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-text-muted">
                    {section.title}
                  </div>
                  <div className="space-y-2">
                    {section.verses.map((verse) => (
                      <CandidateRow
                        key={verse.externalVerseId}
                        verse={verse}
                        isSubmitting={submittingVerseId === verse.externalVerseId}
                        onSelect={onSelect}
                      />
                    ))}
                  </div>
                </div>
              ) : null,
            )
          ) : (
            <TextSurfaceCard className="p-4 text-sm text-text-secondary">
              В этой коробке пока нет стихов, которые можно поднять в изучение.
            </TextSurfaceCard>
          )}
        </div>

        <DrawerFooter className="px-0">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Закрыть
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}

