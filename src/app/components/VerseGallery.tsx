"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import { MasteryBadge } from "./MasteryBadge";
import { Verse } from "@/app/App";
import { VerseStatus } from "@/generated/prisma";
import { useTelegramSafeArea } from "../hooks/useTelegramSafeArea";
import { useIsMobile } from "./ui/use-mobile";
import { VerseCard } from "./VerseCard";

/* ===================== TYPES ===================== */

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
  onStartTraining?: (verse: Verse) => void;
};

/* ===================== COMPONENT ===================== */

export function VerseGallery({
  verses,
  initialIndex,
  onClose,
  onStatusChange,
  onDelete,
  onStartTraining,
}: VerseGalleryProps) {
  const isMobile = useIsMobile();

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [spacerHeight, setSpacerHeight] = useState(0);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  /* ============================================================
     IDEAL CENTER GEOMETRY — SPACER CALCULATION
     ============================================================ */

  useEffect(() => {
    const updateSpacer = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const CARD_HEIGHT = 520; // строго как в VerseCard
      const spacer = Math.max(0, container.clientHeight / 2 - CARD_HEIGHT / 2);

      setSpacerHeight(spacer);
    };

    updateSpacer();
    window.addEventListener("resize", updateSpacer);

    return () => window.removeEventListener("resize", updateSpacer);
  }, []);

  /* ============================================================
     ACTIVE INDEX BY CENTER (NO INTERSECTION OBSERVER)
     ============================================================ */

  const updateActiveIndexByScroll = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const containerCenter = containerRect.top + containerRect.height / 2;

    let closestIndex = activeIndex;
    let minDistance = Infinity;

    container.querySelectorAll<HTMLElement>("[data-index]").forEach((card) => {
      const rect = card.getBoundingClientRect();
      const cardCenter = rect.top + rect.height / 2;
      const distance = Math.abs(cardCenter - containerCenter);
      const index = Number(card.dataset.index);

      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (closestIndex !== activeIndex) {
      setActiveIndex(closestIndex);
    }
  }, [activeIndex]);

  /* ============================================================
     SCROLL LISTENER
     ============================================================ */

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    let ticking = false;

    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          updateActiveIndexByScroll();
          ticking = false;
        });
        ticking = true;
      }
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    return () => container.removeEventListener("scroll", onScroll);
  }, [updateActiveIndexByScroll]);

  /* ============================================================
     INITIAL CENTERING
     ============================================================ */

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const targetCard = container.querySelector<HTMLElement>(`[data-index="${initialIndex}"]`);
    if (!targetCard) return;

    const scrollTop =
      targetCard.offsetTop - (container.clientHeight - targetCard.clientHeight) / 2;

    container.scrollTo({ top: scrollTop, behavior: "instant" });
  }, [initialIndex, spacerHeight]);

  /* ============================================================
     HELPERS
     ============================================================ */

  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const navigateTo = useCallback(
    (direction: "prev" | "next") => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const newIndex =
        direction === "prev"
          ? Math.max(0, activeIndex - 1)
          : Math.min(verses.length - 1, activeIndex + 1);

      const targetCard = container.querySelector<HTMLElement>(`[data-index="${newIndex}"]`);
      if (!targetCard) return;

      const scrollTop =
        targetCard.offsetTop - (container.clientHeight - targetCard.clientHeight) / 2;

      container.scrollTo({ top: scrollTop, behavior: "smooth" });
    },
    [activeIndex, verses.length]
  );

  const activeVerse = verses[activeIndex];
  if (!activeVerse) return null;

  /* ============================================================
     RENDER
     ============================================================ */

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-lg">
      {/* HEADER */}
      <div
        className="fixed top-0 left-0 right-0 z-40 backdrop-blur-xl bg-background/80 border-b border-border/50"
        style={{ paddingTop: `${topInset}px` }}
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Стих {activeIndex + 1} из {verses.length}
          </span>
          <MasteryBadge status={activeVerse.status} />
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* SCROLL CONTAINER */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto snap-y snap-mandatory scroll-smooth pb-32"
        style={{
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          paddingTop: `${topInset + 96}px`,
        }}
      >
        {/* TOP SPACER */}
        <div style={{ height: spacerHeight }} />

        {verses.map((verse, index) => (
          <VerseCard
            key={verse.id}
            verse={verse}
            index={index}
            isActive={index === activeIndex}
            onStatusChange={onStatusChange}
            onRequestDelete={() => setDeleteDialogOpen(true)}
            showFeedback={showFeedback}
            topInset={topInset}
          />
        ))}

        {/* BOTTOM SPACER */}
        <div style={{ height: spacerHeight }} />
      </div>

      {/* NAVIGATION */}
      <div className="fixed left-1/2 bottom-32 -translate-x-1/2 flex items-center gap-3 z-40">
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("prev")}
          disabled={activeIndex === 0}
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="px-4 py-2 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg">
          <span className="text-sm font-medium">
            {activeIndex + 1} / {verses.length}
          </span>
        </div>

        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("next")}
          disabled={activeIndex === verses.length - 1}
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* FEEDBACK */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className={`fixed bottom-44 left-1/2 -translate-x-1/2 px-8 py-4 rounded-2xl shadow-2xl font-semibold text-sm ${
              feedback.type === "success"
                ? "bg-emerald-500 text-white"
                : "bg-destructive text-white"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
