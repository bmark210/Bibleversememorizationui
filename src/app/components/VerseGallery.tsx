"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Plus, Pause, Play, Trash2 } from "lucide-react";

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
import { VerseCard } from "./VerseCard";

/* ===================== TYPES ===================== */

type VerseGalleryProps = {
  verses: Verse[];
  initialIndex: number;
  onClose: () => void;
  onStatusChange: (verse: Verse, status: VerseStatus) => Promise<void>;
  onDelete: (verse: Verse) => Promise<void>;
  onStartTraining?: (verse: Verse) => void | Promise<void>;
};

/* ===================== HAPTIC ===================== */

type HapticStyle = "light" | "medium" | "heavy" | "success" | "error" | "warning";

type GalleryStatusAction = {
  nextStatus: VerseStatus;
  label: string;
  icon: typeof Plus;
  successMessage: string;
};

function haptic(style: HapticStyle) {
  try {
    const tg = (window as any).Telegram?.WebApp?.HapticFeedback;
    if (!tg) return;
    if (style === "success" || style === "error" || style === "warning")
      tg.notificationOccurred(style);
    else
      tg.impactOccurred(style);
  } catch {}
}

function getGalleryStatusAction(status: VerseStatus): GalleryStatusAction | null {
  if (status === VerseStatus.NEW) {
    return {
      nextStatus: VerseStatus.LEARNING,
      label: "Добавить в изучение",
      icon: Plus,
      successMessage: "Добавлено в изучение",
    };
  }
  if (status === VerseStatus.LEARNING) {
    return {
      nextStatus: VerseStatus.STOPPED,
      label: "Поставить на паузу",
      icon: Pause,
      successMessage: "Пауза включена",
    };
  }
  if (status === VerseStatus.STOPPED) {
    return {
      nextStatus: VerseStatus.LEARNING,
      label: "Возобновить изучение",
      icon: Play,
      successMessage: "Возобновлено",
    };
  }
  return null;
}

/* ===================== FOCUS TRAP ===================== */

const FOCUSABLE =
  'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

function trapFocus(container: HTMLElement, e: KeyboardEvent) {
  const nodes = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
    (el) => el.offsetParent !== null
  );
  if (!nodes.length) return;
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

/* ===================== BODY SCROLL LOCK ===================== */

function useBodyScrollLock() {
  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = original; };
  }, []);
}

/* ===================== SWIPE HINT ===================== */

const SWIPE_HINT_KEY = "verse-swipe-hint-seen";

function SwipeHint() {
  const [visible, setVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const isTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      return isTouch && !sessionStorage.getItem(SWIPE_HINT_KEY);
    } catch {
      return false;
    }
  });

  useEffect(() => {
    if (!visible) return;
    const t = setTimeout(() => {
      setVisible(false);
      try { sessionStorage.setItem(SWIPE_HINT_KEY, "1"); } catch {}
    }, 4000);
    return () => clearTimeout(t);
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          transition={{ duration: 0.35 }}
          className="absolute bottom-36 left-1/2 -translate-x-1/2 z-30 pointer-events-none"
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{ repeat: 2, duration: 0.8, ease: "easeInOut", delay: 0.3 }}
            className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl bg-foreground/10 backdrop-blur-sm border border-border/30"
          >
            <div className="flex flex-col items-center gap-0">
              <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <span className="text-[11px] font-medium text-muted-foreground whitespace-nowrap">
              Свайп ↑↓ — листать · кнопки — действия
            </span>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ===================== DOT PROGRESS ===================== */

const MAX_DOTS = 20;

function DotProgress({ total, active }: { total: number; active: number }) {
  if (total > MAX_DOTS) {
    return (
      <div
        role="status"
        aria-label={`Стих ${active + 1} из ${total}`}
        className="px-4 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg"
      >
        <span className="text-sm font-semibold tabular-nums">{active + 1} / {total}</span>
      </div>
    );
  }
  return (
    <div
      role="status"
      aria-label={`Стих ${active + 1} из ${total}`}
      className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-background/90 backdrop-blur-md border border-border/50 shadow-lg"
    >
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="relative flex items-center justify-center">
          <motion.div
            layout
            animate={{
              width: i === active ? 28 : 8,
              opacity: i === active ? 1 : 0.3,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`h-2 rounded-full transition-colors duration-300 ${
              i === active ? "bg-primary" : "bg-muted-foreground/40"
            }`}
          />
          {i === active && (
            <motion.span
              aria-hidden="true"
              className="absolute inset-0 rounded-full bg-primary pointer-events-none"
              animate={{ scaleX: [1, 2.4], scaleY: [1, 2], opacity: [0.45, 0] }}
              transition={{
                duration: 1.15,
                repeat: Infinity,
                ease: "easeOut",
                repeatDelay: 0.55,
              }}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/* ===================== SLIDE VARIANTS ===================== */

// direction > 0  → going NEXT: new card rises from bottom, old slides up-out
// direction < 0  → going PREV: new card drops from top, old slides down-out
const slideVariants = {
  enter: (dir: number) => ({
    y: dir > 0 ? "100%" : "-100%",
    opacity: 0,
    scale: 0.88,
  }),
  center: {
    y: 0,
    opacity: 1,
    scale: 1,
    transition: { type: "spring", stiffness: 320, damping: 32 } as const,
  },
  exit: (dir: number) => ({
    y: dir > 0 ? "-18%" : "18%",
    opacity: 0,
    scale: 0.86,
    transition: { duration: 0.2, ease: "easeIn" } as const,
  }),
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
  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [direction, setDirection] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; type: "success" | "error" } | null>(null);
  const [actionPending, setActionPending] = useState(false);

  const dialogRef    = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  const { contentSafeAreaInset } = useTelegramSafeArea();
  const topInset    = contentSafeAreaInset.top;
  const bottomInset = contentSafeAreaInset.bottom;

  const [slideAnnouncement, setSlideAnnouncement] = useState("");

  useBodyScrollLock();

  /* ── initial focus ── */
  useEffect(() => { closeButtonRef.current?.focus(); }, []);

  /* ── announce slide changes for screen readers ── */
  useEffect(() => {
    const v = verses[activeIndex];
    if (v) setSlideAnnouncement(`Стих ${activeIndex + 1} из ${verses.length}: ${v.reference}`);
  }, [activeIndex, verses]);

  /* ── helpers ── */
  const showFeedback = useCallback((message: string, type: "success" | "error" = "success") => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback(null), 2000);
  }, []);

  const navigateTo = useCallback(
    (dir: "prev" | "next") => {
      const newDir = dir === "next" ? 1 : -1;
      const newIndex =
        dir === "next"
          ? Math.min(verses.length - 1, activeIndex + 1)
          : Math.max(0, activeIndex - 1);
      if (newIndex === activeIndex) return;
      haptic("light");
      setDirection(newDir);
      setActiveIndex(newIndex);
    },
    [activeIndex, verses.length]
  );

  const onHaptic = useCallback((style: HapticStyle) => haptic(style), []);

  /* ── keyboard ── */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (deleteDialogOpen) return;
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown" || e.key === "PageDown") { e.preventDefault(); navigateTo("next"); return; }
      if (e.key === "ArrowUp"   || e.key === "PageUp")   { e.preventDefault(); navigateTo("prev"); return; }
      if (e.key === "Tab" && dialogRef.current) trapFocus(dialogRef.current, e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, navigateTo, deleteDialogOpen]);

  const activeVerse = verses[activeIndex];
  if (!activeVerse) return null;

  const statusAction = getGalleryStatusAction(activeVerse.status);

  const handleStatusAction = async () => {
    if (!statusAction || actionPending) return;
    try {
      setActionPending(true);
      await onStatusChange(activeVerse, statusAction.nextStatus);
      haptic("success");
      showFeedback(statusAction.successMessage, "success");
    } catch {
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
    } finally {
      setActionPending(false);
    }
  };

  const handleStartTrainingClick = async () => {
    if (!onStartTraining || actionPending) return;

    try {
      setActionPending(true);
      if (activeVerse.status !== VerseStatus.LEARNING) {
        await onStatusChange(activeVerse, VerseStatus.LEARNING);
      }
      haptic("medium");
      await Promise.resolve(onStartTraining(activeVerse));
      setActionPending(false);
    } catch {
      haptic("error");
      showFeedback("Ошибка — попробуйте ещё раз", "error");
      setActionPending(false);
      return;
    }
  };

  /* ── render ── */
  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Просмотр стиха"
      className="fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-md"
    >
      {/* aria-live for screen readers */}
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {feedback?.message ?? ""}
      </div>
      <div aria-live="polite" aria-atomic="true" className="sr-only">
        {slideAnnouncement}
      </div>

      {/* HEADER */}
      <div
        className="shrink-0 backdrop-blur-xl bg-background/80 border-b border-border/50 z-40"
        style={{ paddingTop: `${topInset}px` }}
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
            Стих {activeIndex + 1} из {verses.length}
          </span>
          <MasteryBadge status={activeVerse.status} />
          <Button
            ref={closeButtonRef}
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Закрыть галерею"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* CARD AREA — flex-1, overflow hidden so AnimatePresence clips cleanly */}
      <div 
        className="flex-1 relative flex items-center justify-center overflow-hidden px-4 sm:px-6"
        role="region"
        aria-roledescription="carousel"
        aria-label="Карточки со стихами"
      >
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={activeVerse.id}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            className="w-full max-w-2xl focus-visible:outline-none"
            tabIndex={-1}
          >
            <VerseCard
              verse={activeVerse}
              isActive
              isFirst={activeIndex === 0}
              isLast={activeIndex === verses.length - 1}
              onStatusChange={onStatusChange}
              onRequestDelete={() => { haptic("warning"); setDeleteDialogOpen(true); }}
              showFeedback={showFeedback}
              onNavigate={navigateTo}
              onHaptic={onHaptic}
              horizontalActionsEnabled={false}
            />
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ACTIONS */}
      <div className="shrink-0 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-2xl flex items-center gap-3">
          {onStartTraining && (
            <Button
              className="flex-1 gap-2"
              onClick={() => void handleStartTrainingClick()}
              disabled={actionPending}
              aria-label="Учить этот стих"
            >
              <Play className="h-4 w-4" />
              УЧИТЬ
            </Button>
          )}
          {statusAction && (
            <Button
              variant="secondary"
              className={`${onStartTraining ? "" : "flex-1"} gap-2`}
              onClick={() => void handleStatusAction()}
              disabled={actionPending}
              aria-label={statusAction.label}
            >
              <statusAction.icon className="h-4 w-4" />
              {statusAction.label}
            </Button>
          )}
          <Button
            variant="outline"
            className={`gap-2 text-destructive hover:text-destructive ${
              statusAction || onStartTraining ? "" : "flex-1"
            }`}
            onClick={() => {
              if (actionPending) return;
              haptic("warning");
              setDeleteDialogOpen(true);
            }}
            disabled={actionPending}
            aria-label="Удалить стих"
          >
            <Trash2 className="h-4 w-4" />
            Удалить
          </Button>
        </div>
      </div>

      {/* NAVIGATION */}
      <div
        className="shrink-0 flex items-center justify-center gap-3 pb-6 pt-3"
        style={{ paddingBottom: `${Math.max(24, bottomInset + 16)}px` }}
      >
        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("prev")}
          disabled={activeIndex === 0}
          aria-label="Предыдущий стих"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <DotProgress total={verses.length} active={activeIndex} />

        <Button
          variant="secondary"
          size="icon"
          onClick={() => navigateTo("next")}
          disabled={activeIndex === verses.length - 1}
          aria-label="Следующий стих"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>

      {/* SWIPE HINT */}
      <SwipeHint />

      {/* FEEDBACK TOAST */}
      <AnimatePresence>
        {feedback && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 30 }}
            style={{ bottom: Math.max(112, bottomInset + 88) }}
          className={`fixed left-1/2 -translate-x-1/2 px-8 py-3.5 rounded-2xl shadow-2xl font-semibold text-sm pointer-events-none ${
              feedback.type === "success" ? "bg-emerald-500 text-white" : "bg-destructive text-white"
            }`}
          >
            {feedback.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* DELETE DIALOG */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить стих?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Стих будет удалён из вашей коллекции.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionPending}
              className="bg-destructive hover:bg-destructive/90 text-white"
              onClick={async () => {
                try {
                  setActionPending(true);
                  await onDelete(activeVerse);
                  haptic("success");
                  showFeedback("Стих удалён", "success");
                  if (verses.length <= 1) {
                    onClose();
                  } else {
                    const newDir = activeIndex > 0 ? -1 : 1;
                    setDirection(newDir);
                    setActiveIndex(activeIndex > 0 ? activeIndex - 1 : 0);
                  }
                } catch {
                  haptic("error");
                  showFeedback("Ошибка удаления", "error");
                } finally {
                  setActionPending(false);
                }
                setDeleteDialogOpen(false);
              }}
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
