'use client';

import { useMemo } from 'react';
import { Check, Hash } from 'lucide-react';
import type { Verse } from "@/app/domain/verse";
import { Badge } from '@/app/components/ui/badge';
import { cn } from '@/app/components/ui/utils';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/app/components/ui/drawer';

type VerseTagsDrawerTarget = Pick<Verse, 'reference' | 'tags'>;

type VerseTagsDrawerProps = {
  target: VerseTagsDrawerTarget | null;
  open: boolean;
  selectedTagSlugs: Set<string>;
  onOpenChange: (open: boolean) => void;
  onSelectTag: (slug: string) => void;
};

type NormalizedTag = {
  id?: string;
  slug?: string;
  title: string;
};

export function VerseTagsDrawer({
  target,
  open,
  selectedTagSlugs,
  onOpenChange,
  onSelectTag,
}: VerseTagsDrawerProps) {
  const normalizedTags = useMemo<NormalizedTag[]>(() => {
    if (!target?.tags?.length) return [];

    const seen = new Set<string>();
    const next: NormalizedTag[] = [];

    for (const tag of target.tags) {
      const title = String(tag?.title ?? '').trim();
      if (!title) continue;

      const key = String(tag?.id ?? tag?.slug ?? title.toLowerCase());
      if (seen.has(key)) continue;
      seen.add(key);

      next.push({
        id: tag?.id,
        slug: tag?.slug,
        title,
      });
    }

    return next;
  }, [target]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
      <DrawerContent className="rounded-t-[32px] border-border/70 bg-card/95 px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-2xl backdrop-blur-xl sm:px-6">
        <DrawerHeader className="px-0 pb-0 pt-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DrawerTitle className="truncate text-xl tracking-tight text-foreground/88">
                Теги стиха
              </DrawerTitle>
              <DrawerDescription className="mt-1 text-sm text-foreground/56">
                {target?.reference
                  ? `${target.reference} · нажмите на тег, чтобы добавить его в фильтр списка.`
                  : 'Нажмите на тег, чтобы добавить его в фильтр списка.'}
              </DrawerDescription>
            </div>

            <Badge
              variant="outline"
              className="shrink-0 rounded-full border-border/60 bg-background/60 px-2.5 py-1 text-[11px] font-medium text-foreground/72"
            >
              {normalizedTags.length} шт.
            </Badge>
          </div>
        </DrawerHeader>

        <div className="mt-5">
          {normalizedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {normalizedTags.map((tag) => {
                const slug = String(tag.slug ?? '').trim();
                const isActive = slug.length > 0 && selectedTagSlugs.has(slug);
                const canSelect = slug.length > 0;

                return (
                  <button
                    key={tag.id ?? tag.slug ?? tag.title}
                    type="button"
                    disabled={!canSelect}
                    onClick={() => {
                      if (!slug) return;
                      onSelectTag(slug);
                    }}
                    className={cn(
                      'inline-flex min-h-10 items-center gap-2 rounded-2xl border px-3 py-2 text-sm transition-colors',
                      isActive
                        ? 'border-primary/30 bg-primary/12 text-primary'
                        : 'border-border/60 bg-background/55 text-foreground/78 hover:bg-background/80',
                      !canSelect && 'cursor-not-allowed opacity-45',
                    )}
                  >
                    {isActive ? (
                      <Check className="h-4 w-4 shrink-0" />
                    ) : (
                      <Hash className="h-4 w-4 shrink-0 opacity-55" />
                    )}
                    <span>{tag.title}</span>
                    {isActive ? (
                      <span className="text-[11px] text-primary/72">в фильтре</span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="rounded-3xl border border-border/60 bg-background/55 px-4 py-4 text-sm text-foreground/56">
              У этого стиха пока нет тегов.
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
