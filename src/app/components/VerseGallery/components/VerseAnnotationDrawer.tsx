"use client";

import { BookOpen, Loader2 } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/app/components/ui/drawer";
import { Button } from "@/app/components/ui/button";
import { cn } from "@/app/components/ui/utils";
import type { VerseAnnotationData } from "@/app/domain/verse";

type Props = {
  open: boolean;
  reference: string;
  annotation: VerseAnnotationData | null | undefined;
  isLoading?: boolean;
  onOpenChange: (open: boolean) => void;
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <BookOpen className="h-3.5 w-3.5 shrink-0 text-brand-primary" />
      <span className="text-xs font-semibold uppercase tracking-[0.08em] text-text-muted">
        {children}
      </span>
    </div>
  );
}

function Section({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-[1.5rem] border border-border-default/55 bg-bg-elevated px-4 py-3.5 shadow-[var(--shadow-soft)]",
        className,
      )}
    >
      <SectionLabel>{label}</SectionLabel>
      {children}
    </div>
  );
}

export function VerseAnnotationDrawer({
  open,
  reference,
  annotation,
  isLoading = false,
  onOpenChange,
}: Props) {
  const hasData =
    annotation &&
    (annotation.context || annotation.meaning || (annotation.keyPoints?.length ?? 0) > 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh]">
        <DrawerHeader className="px-4 pb-2 pt-2">
          <DrawerTitle className="text-[1.2rem]">{reference}</DrawerTitle>
          <p className="mt-0.5 text-sm text-text-muted">Полная информация о стихе</p>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-primary/60" />
              <p className="text-sm text-text-muted">Генерируем аннотацию…</p>
            </div>
          ) : !hasData ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
              <BookOpen className="h-10 w-10 text-text-muted/40" />
              <p className="text-sm text-text-muted">
                Не удалось загрузить аннотацию.
                <br />
                Попробуйте закрыть и открыть снова.
              </p>
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {annotation.context ? (
                <Section label="Контекст отрывка">
                  <p className="text-[0.95rem] leading-7 text-text-secondary">
                    {annotation.context}
                  </p>
                </Section>
              ) : null}

              {annotation.meaning ? (
                <Section label="Смысл стиха">
                  <p className="text-[0.95rem] leading-7 text-text-secondary">
                    {annotation.meaning}
                  </p>
                </Section>
              ) : null}

              {annotation.keyPoints && annotation.keyPoints.length > 0 ? (
                <Section label="Ключевые тезисы">
                  <ul className="space-y-2.5">
                    {annotation.keyPoints.map((point, idx) => (
                      <li
                        key={idx}
                        className="flex items-start gap-3 text-[0.95rem] leading-6 text-text-secondary"
                      >
                        <span
                          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-primary/15 text-[10px] font-bold text-brand-primary"
                          aria-hidden="true"
                        >
                          {idx + 1}
                        </span>
                        {point}
                      </li>
                    ))}
                  </ul>
                </Section>
              ) : null}
            </div>
          )}
        </div>

        <DrawerFooter className="px-4">
          <Button
            type="button"
            variant="ghost"
            className="rounded-[1.2rem]"
            onClick={() => onOpenChange(false)}
          >
            Закрыть
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
