'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Search, Plus, MoveLeft, MoveRight, Pause, Play } from 'lucide-react';
import { AnimatePresence, PanInfo, motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { UserVersesService } from '@/api/services/UserVersesService';
import { Verse } from '@/app/App';
import { VerseStatus } from '@/generated/prisma';
import { MasteryBadge } from './MasteryBadge';
import { VerseGallery } from './VerseGallery';

const SWIPE_TRIGGER = 80;

type ColumnType = "backlog" | "learning";

type SwipeCardProps = {
  verse: Verse;
  onOpen: () => void;
  onSwipeLeft?: () => Promise<void> | void;
  onSwipeRight?: () => Promise<void> | void;
  leftLabel?: string;
  rightLabel?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  accent?: "green" | "amber";
};

const SwipeableVerseCard = ({
  verse,
  onOpen,
  onSwipeLeft,
  onSwipeRight,
  leftLabel,
  rightLabel,
  leftIcon,
  rightIcon,
  accent = "green",
}: SwipeCardProps) => {
  const dragX = useMotionValue(0);
  const springX = useSpring(dragX, { stiffness: 500, damping: 45 });

  const bgColor = useTransform(
    dragX,
    [-SWIPE_TRIGGER * 1.4, 0, SWIPE_TRIGGER * 1.4],
    [
      "rgba(239,68,68,0.08)",
      "transparent",
      accent === "green" ? "rgba(16,185,129,0.08)" : "rgba(251,191,36,0.12)"
    ]
  );

  const hintOpacity = useTransform(
    dragX,
    [-SWIPE_TRIGGER, -30, 0, 30, SWIPE_TRIGGER],
    [1, 0.6, 0, 0.6, 1]
  );

  const resetPosition = () => {
    dragX.set(0);
  };

  const handleDragEnd = async (_: any, info: PanInfo) => {
    const offsetX = info.offset.x;

    if (offsetX > SWIPE_TRIGGER && onSwipeRight) {
      await onSwipeRight();
      resetPosition();
      return;
    }

    if (offsetX < -SWIPE_TRIGGER && onSwipeLeft) {
      await onSwipeLeft();
      resetPosition();
      return;
    }

    resetPosition();
  };

  return (
    <motion.div layout className="relative">
      <motion.div
        style={{ backgroundColor: bgColor, opacity: hintOpacity }}
        className="absolute inset-0 rounded-2xl border border-dashed border-border/60 flex items-center justify-between px-4 pointer-events-none"
      >
        <div className="flex items-center gap-2 text-destructive">
          {leftIcon}
          <span className="text-xs font-medium">{leftLabel}</span>
        </div>
        <div className="flex items-center gap-2 text-emerald-600">
          <span className="text-xs font-medium">{rightLabel}</span>
          {rightIcon}
        </div>
      </motion.div>

      <motion.div
        layout
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: onSwipeLeft ? 0.25 : 0, right: onSwipeRight ? 0.25 : 0 }}
        dragMomentum={false}
        style={{ x: springX }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        className="relative bg-card border border-border/70 rounded-2xl p-4 shadow-sm active:shadow-md transition-shadow"
        onClick={onOpen}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-2 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-semibold">{verse.reference}</h3>
              <Badge variant="secondary" className="text-[11px]">SYNOD</Badge>
              <MasteryBadge status={verse.status} />
            </div>
            <p className="text-sm text-muted-foreground line-clamp-2">{verse.text}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{verse.masteryLevel}%</span>
              <div className="h-1 w-24 bg-muted rounded-full overflow-hidden">
                <motion.div
                  className={`h-full ${accent === "green" ? "bg-emerald-500" : "bg-amber-500"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${verse.masteryLevel}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <span>{verse.repetitions} повт.</span>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

interface VerseListProps {
  onAddVerse: () => void;
  onStartTraining: (verseId: string) => void;
}

export function VerseList({ onAddVerse, onStartTraining }: VerseListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [testamentFilter, setTestamentFilter] = useState<'all' | 'OT' | 'NT'>('all');
  const [masteryFilter, setMasteryFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [activeColumn, setActiveColumn] = useState<ColumnType>("backlog");

  const [telegramId, setTelegramId] = useState<string | undefined>();
  const [verses, setVerses] = useState<Array<Verse>>([]);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  const resolveTelegramId = (): string | undefined => {
    if (typeof window === "undefined") return undefined;
    return (
      (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() ??
      process.env.NEXT_PUBLIC_DEV_TELEGRAM_ID ??
      localStorage.getItem("telegramId") ??
      undefined
    );
  };

  const fetchVerses = async (telegramId: string) => {
    try {
      const verses = await UserVersesService.getApiUsersVerses(telegramId);
      setVerses(verses as Array<Verse>);
    } catch (err) {
      console.error("Не удалось получить стихи:", err);
      setVerses([] as Array<Verse>);
    }
  };

  useEffect(() => {
    const id = resolveTelegramId();
    if (!id) {
      setVerses([]);
      return;
    }
    setTelegramId(id);
    localStorage.setItem("telegramId", id);
    fetchVerses(id);
  }, []);

  const handleStatusChange = async (verse: Verse, status: VerseStatus) => {
    if (!telegramId) return;

    try {
      await UserVersesService.patchApiUsersVerses(telegramId, verse.externalVerseId, {
        status,
      });
      setVerses((previous) =>
        previous.map((item) =>
          item.id === verse.id ? { ...item, status } : item
        )
      );
    } catch (error) {
      console.error("Не удалось обновить статус стиха:", error);
    }
  };

  const handleDeleteVerse = async (verse: Verse) => {
    if (!telegramId) return;

    try {
      await UserVersesService.deleteApiUsersVerses(telegramId, verse.externalVerseId);
      setVerses((previous) => {
        const updated = previous.filter((item) => item.id !== verse.id);
        setGalleryIndex((current) => {
          if (updated.length === 0) return null;
          if (current === null) return null;
          if (current >= updated.length) return updated.length - 1;
          return current;
        });
        return updated;
      });
    } catch (error) {
      console.error("Не удалось удалить стих:", error);
    }
  };

  const filteredVerses = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const matchesSearch = (verse: Verse) =>
      normalizedQuery.length === 0 ||
      verse.reference.toLowerCase().includes(normalizedQuery) ||
      verse.text.toLowerCase().includes(normalizedQuery);

    const matchesTestament = (verse: Verse) =>
      testamentFilter === "all" || (verse as any).testament === testamentFilter;

    const matchesMastery = (verse: Verse) =>
      masteryFilter === "all" ||
      (masteryFilter === "low" && (verse as any).masteryLevel < 40) ||
      (masteryFilter === "medium" && (verse as any).masteryLevel >= 40 && (verse as any).masteryLevel < 75) ||
      (masteryFilter === "high" && (verse as any).masteryLevel >= 75);

    return verses.filter((verse) => matchesSearch(verse) && matchesTestament(verse) && matchesMastery(verse));
  }, [verses, searchQuery, testamentFilter, masteryFilter]);

  const backlogVerses = filteredVerses.filter(
    (verse) => verse.status === VerseStatus.NEW || verse.status === VerseStatus.STOPPED
  );
  const learningVerses = filteredVerses.filter((verse) => verse.status === VerseStatus.LEARNING);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="mb-1">Мои стихи</h1>
          <p className="text-muted-foreground text-sm">
            Управляйте стихами свайпами: вправо — начать учить, влево — вернуть в ожидание.
          </p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button onClick={onAddVerse} className="shrink-0">
            <Plus className="w-4 h-4 mr-2" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          <div className="flex-1 sm:flex-none bg-muted/60 rounded-full p-1 flex items-center gap-1">
            <Button
              size="sm"
              variant={activeColumn === "backlog" ? "default" : "ghost"}
              className="flex-1 rounded-full"
              onClick={() => setActiveColumn("backlog")}
            >
              Ожидание
            </Button>
            <Button
              size="sm"
              variant={activeColumn === "learning" ? "default" : "ghost"}
              className="flex-1 rounded-full"
              onClick={() => setActiveColumn("learning")}
            >
              Изучаю
            </Button>
          </div>
        {/* <div className="relative sm:col-span-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Поиск стихов..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div> */}
        
        {/* <Select value={testamentFilter} onValueChange={(value: any) => setTestamentFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Завет" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все заветы</SelectItem>
            <SelectItem value="OT">Ветхий Завет</SelectItem>
            <SelectItem value="NT">Новый Завет</SelectItem>
          </SelectContent>
        </Select> */}

        {/* <Select value={masteryFilter} onValueChange={(value: any) => setMasteryFilter(value)}>
          <SelectTrigger>
            <SelectValue placeholder="Освоение" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все уровни</SelectItem>
            <SelectItem value="low">Изучение (0-39%)</SelectItem>
            <SelectItem value="medium">Практика (40-74%)</SelectItem>
            <SelectItem value="high">Освоено (75-100%)</SelectItem>
          </SelectContent>
        </Select> */}
      </div>

      {/* Verse List */}
      {filteredVerses.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            Стихи, соответствующие вашим фильтрам, не найдены.
          </p>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className={`${activeColumn === "backlog" ? "block" : "hidden"} lg:block space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-amber-500" />
                <span>Новые / Пауза</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {backlogVerses.length} шт.
              </span>
            </div>
            <AnimatePresence initial={false}>
              {backlogVerses.map((verse) => (
                <SwipeableVerseCard
                  key={verse.id}
                  verse={verse}
                  accent="amber"
              leftLabel="Оставить здесь"
              rightLabel="В изучение"
              leftIcon={<Pause className="w-4 h-4" />}
              rightIcon={<MoveRight className="w-4 h-4" />}
              onOpen={() => {
                const index = verses.findIndex((v) => v.id === verse.id);
                if (index !== -1) setGalleryIndex(index);
              }}
              onSwipeRight={() => handleStatusChange(verse, VerseStatus.LEARNING)}
            />
          ))}
        </AnimatePresence>
      </div>

          <div className={`${activeColumn === "learning" ? "block" : "hidden"} lg:block space-y-3`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Изучаю</span>
              </div>
              <span className="text-xs text-muted-foreground">
                {learningVerses.length} шт.
              </span>
            </div>
            <AnimatePresence initial={false}>
              {learningVerses.map((verse) => (
                <SwipeableVerseCard
                  key={verse.id}
                  verse={verse}
                  accent="green"
              leftLabel="Поставить на паузу"
              rightLabel="Оставить здесь"
              leftIcon={<MoveLeft className="w-4 h-4" />}
              rightIcon={<Play className="w-4 h-4" />}
              onOpen={() => {
                const index = verses.findIndex((v) => v.id === verse.id);
                if (index !== -1) setGalleryIndex(index);
              }}
              onSwipeLeft={() => handleStatusChange(verse, VerseStatus.STOPPED)}
            />
          ))}
        </AnimatePresence>
      </div>
        </div>
      )}
      {galleryIndex !== null && verses[galleryIndex] && (
        <VerseGallery
          verses={verses}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDeleteVerse}
          onStartTraining={(verse) => onStartTraining(verse.id)}
        />
      )}
    </div>
  );
}
