"use client";

import type { ReactNode } from "react";
import { BookOpen, MoreHorizontal } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import type { Verse } from "@/app/domain/verse";
import type { TextBoxSummary } from "@/app/types/textBox";

type TextStatItem = {
  label: string;
  value: number;
};

type TextSurfaceCardProps = {
  children: ReactNode;
  className?: string;
};

type TextVerseCardProps = {
  verse: Verse;
  stateLabel: string;
  stateToneClassName: string;
  primaryAction?: ReactNode;
  footerActions?: ReactNode;
  className?: string;
  textClassName?: string;
  onOpen?: () => void;
  tags?: Verse["tags"];
};

type TextBoxCardProps = {
  box: TextBoxSummary;
  summary: string;
  stats: TextStatItem[];
  onOpen: () => void;
  onOpenSettings: () => void;
};

const SURFACE_CARD_CLASS_NAME =
  "group relative overflow-hidden rounded-[2rem] border border-border-default/55 bg-bg-elevated p-5 shadow-[var(--shadow-soft)] before:pointer-events-none before:absolute before:inset-x-8 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-brand-primary/35 before:to-transparent before:content-[''] after:pointer-events-none after:absolute after:-right-12 after:top-[-3.5rem] after:h-28 after:w-28 after:rounded-full after:bg-brand-primary/8 after:blur-3xl after:content-['']";

export function formatRussianCount(count: number, forms: [string, string, string]) {
  const abs = Math.abs(count) % 100;
  const tail = abs % 10;
  if (abs > 10 && abs < 20) return `${count} ${forms[2]}`;
  if (tail > 1 && tail < 5) return `${count} ${forms[1]}`;
  if (tail === 1) return `${count} ${forms[0]}`;
  return `${count} ${forms[2]}`;
}

export function buildTextBoxSummary(box: TextBoxSummary) {
  const parts = [formatRussianCount(box.stats.totalCount, ["стих", "стиха", "стихов"])];

  if (box.stats.queueCount > 0) {
    parts.push(`${box.stats.queueCount} в очереди`);
  }
  if (box.stats.learningCount > 0) {
    parts.push(`${box.stats.learningCount} в изучении`);
  }
  if (box.stats.dueReviewCount > 0) {
    parts.push(`${box.stats.dueReviewCount} на повтор`);
  }
  if (parts.length === 1 && box.stats.masteredCount > 0) {
    parts.push(`${box.stats.masteredCount} закреплено`);
  }

  return parts.join(" · ");
}

export function buildTextBoxStats(box: TextBoxSummary): TextStatItem[] {
  return [
    { label: "Всего", value: box.stats.totalCount },
    { label: "Очередь", value: box.stats.queueCount },
    { label: "Изучение", value: box.stats.learningCount },
    { label: "Повтор", value: box.stats.dueReviewCount },
    { label: "Ожидание", value: box.stats.waitingReviewCount },
    { label: "Пауза", value: box.stats.pausedCount },
  ].filter((item) => item.value > 0 || item.label === "Всего");
}

type DisplayTag = {
  id?: string;
  slug?: string;
  title: string;
};

function normalizeVerseTags(tags?: Verse["tags"]): DisplayTag[] {
  if (!Array.isArray(tags) || tags.length === 0) return [];

  const seen = new Set<string>();
  const normalized: DisplayTag[] = [];

  for (const tag of tags) {
    const title = String(tag?.title ?? "").trim();
    if (!title) continue;

    const key = String(tag?.id ?? tag?.slug ?? title.toLowerCase());
    if (seen.has(key)) continue;
    seen.add(key);

    normalized.push({
      id: tag?.id,
      slug: tag?.slug,
      title,
    });
  }

  return normalized;
}

export function TextSurfaceCard({ children, className }: TextSurfaceCardProps) {
  return <div className={cn(SURFACE_CARD_CLASS_NAME, "verse-card-appear", className)}>{children}</div>;
}

export function TextStatPills({ stats }: { stats: TextStatItem[] }) {
  return (
    <div className="flex flex-wrap gap-2">
      {stats.map((item) => (
        <div
          key={item.label}
          className="inline-flex min-w-fit items-center rounded-full border border-border-subtle bg-bg-surface/80 px-3.5 py-1.5 text-[12px] font-medium text-text-secondary shadow-[var(--shadow-soft)]"
        >
          <span className="mr-1 text-text-primary">{item.value}</span>
          {item.label}
        </div>
      ))}
    </div>
  );
}

export function VerseTagPills({
  tags,
  limit = 3,
  onPress,
  className,
}: {
  tags?: Verse["tags"];
  limit?: number;
  onPress?: () => void;
  className?: string;
}) {
  const normalized = normalizeVerseTags(tags);
  if (normalized.length === 0) return null;

  const visible = normalized.slice(0, limit);
  const overflow = Math.max(0, normalized.length - visible.length);

  return (
    <div className={cn("mt-4 flex flex-wrap gap-2", className)}>
      {visible.map((tag, index) => {
        const content = (
          <span className="truncate">#{tag.title}</span>
        );

        if (onPress) {
          return (
            <button
              key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
              type="button"
              onClick={onPress}
              className="inline-flex max-w-full items-center rounded-full border border-border-subtle bg-bg-surface/80 px-3 py-1 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface hover:text-text-primary"
            >
              {content}
            </button>
          );
        }

        return (
          <span
            key={tag.id ?? tag.slug ?? `${tag.title}-${index}`}
            className="inline-flex max-w-full items-center rounded-full border border-border-subtle bg-bg-surface/80 px-3 py-1 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-soft)]"
          >
            {content}
          </span>
        );
      })}

      {overflow > 0 ? (
        onPress ? (
          <button
            type="button"
            onClick={onPress}
            className="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface/80 px-3 py-1 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-soft)] transition-colors hover:bg-bg-surface hover:text-text-primary"
          >
            +{overflow}
          </button>
        ) : (
          <span className="inline-flex items-center rounded-full border border-border-subtle bg-bg-surface/80 px-3 py-1 text-[11px] font-medium text-text-secondary shadow-[var(--shadow-soft)]">
            +{overflow}
          </span>
        )
      ) : null}
    </div>
  );
}

export function VerseStatePill({
  label,
  toneClassName,
}: {
  label: string;
  toneClassName: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.02em] shadow-[var(--shadow-soft)]",
        toneClassName,
      )}
    >
      {label}
    </span>
  );
}

export function TextVerseCard({
  verse,
  stateLabel,
  stateToneClassName,
  primaryAction,
  footerActions,
  className,
  textClassName,
  onOpen,
  tags,
}: TextVerseCardProps) {
  const ContentTag = onOpen ? "button" : "div";

  return (
    <TextSurfaceCard className={cn(className)}>
      <div className="flex items-start justify-between gap-3">
        <ContentTag
          {...(onOpen
            ? {
                type: "button" as const,
                onClick: onOpen,
                "aria-label": `Открыть стих ${verse.reference}`,
              }
            : {})}
          className={cn(
            "min-w-0 flex-1 text-left",
            onOpen && "cursor-pointer transition-opacity hover:opacity-90",
          )}
        >
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="min-w-0 truncate [font-family:var(--font-heading)] text-[1.45rem] font-semibold tracking-tight text-text-primary sm:text-[1.55rem]">
              {verse.reference}
            </h3>
            <VerseStatePill label={stateLabel} toneClassName={stateToneClassName} />
          </div>
        
          <p
            className={cn(
              "mt-4 max-w-[34ch] whitespace-pre-line text-[1.05rem] leading-8 text-text-secondary sm:text-[1.12rem] sm:leading-8",
              textClassName,
            )}
          >
            {verse.text}
          </p>

          <VerseTagPills tags={tags} />
        </ContentTag>
        {primaryAction ? <div className="shrink-0">{primaryAction}</div> : null}
      </div>

      {footerActions ? <div className="mt-5 flex flex-wrap gap-2">{footerActions}</div> : null}
    </TextSurfaceCard>
  );
}

export function TextBoxCard({ box, summary, stats, onOpen, onOpenSettings }: TextBoxCardProps) {
  return (
    <TextSurfaceCard>
      <div className="flex items-start justify-between gap-3">
        <button type="button" className="min-w-0 flex-1 text-left" onClick={onOpen}>
          <div className="flex flex-wrap items-center gap-2.5">
            <BookOpen className="h-4 w-4 shrink-0 text-brand-primary" />
            <h3 className="truncate [font-family:var(--font-heading)] text-[1.4rem] font-semibold tracking-tight text-text-primary sm:text-[1.5rem]">
              {box.title}
            </h3>
            {box.isDefault ? (
              <span className="inline-flex items-center rounded-full border border-brand-primary/20 bg-brand-primary/10 px-3 py-1 text-[11px] font-semibold text-brand-primary shadow-[var(--shadow-soft)]">
                Основная
              </span>
            ) : null}
          </div>

          <p className="mt-3 text-[1rem] leading-7 text-text-secondary">{summary}</p>

          <div className="mt-4">
            <TextStatPills stats={stats} />
          </div>
        </button>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="relative z-10 mt-0.5 shrink-0 rounded-full text-text-muted hover:text-text-primary"
          onClick={onOpenSettings}
          aria-label={`Настройки коробки ${box.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>
    </TextSurfaceCard>
  );
}
