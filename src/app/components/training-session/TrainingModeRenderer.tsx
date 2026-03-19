'use client'

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
} from 'react';
import { ModeClickChunksExercise } from './modes/ClickChunksExercise';
import { ModeClickWordsHintedExercise } from './modes/ClickWordsHintedExercise';
import { ModeClickWordsExercise } from './modes/ClickWordsExercise';
import { ModeFirstLettersHintedExercise } from './modes/FirstLettersHintedExercise';
import { ModeFirstLettersKeyboardExercise } from './modes/FirstLettersKeyboardExercise';
import { ModeFirstLettersTapExercise } from './modes/FirstLettersTapExercise';
import { ModeFullRecallExercise } from './modes/FullRecallExercise';
import { ModeVoiceRecallExercise } from './modes/VoiceRecallExercise';
import type { TrainingModeRating } from './modes/types';
import type { HintState } from './modes/useHintState';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Verse } from '@/app/App';

export enum TrainingModeRendererKey {
  ChunksOrder = 'chunks-order',
  OrderHints = 'order-hints',
  LettersTap = 'letters-tap',
  LettersType = 'letters-type',
  Order = 'order',
  LettersHints = 'letters-hints',
  Typing = 'typing',
  VoiceTyping = 'voice-typing',
}

type ModeTutorialSpec = {
  title: string;
  summary: string;
  bullets: string[];
};

const MODE_TUTORIALS: Record<TrainingModeRendererKey, ModeTutorialSpec> = {
  [TrainingModeRendererKey.ChunksOrder]: {
    title: 'Режим: Выбор частей',
    summary: 'Соберите стих из смысловых частей по порядку.',
    bullets: [
      'Нажимайте части последовательно.',
      '5 ошибок сбрасывают цепочку.',
      'В конце оцените сложность.',
    ],
  },
  [TrainingModeRendererKey.OrderHints]: {
    title: 'Режим: Выбор слов с подсказками',
    summary: 'Восстановите скрытые слова, опираясь на открытые.',
    bullets: [
      'Смотрите на открытые слова.',
      'Выбирайте скрытые слова по порядку.',
      '5 ошибок сбрасывают цепочку.',
    ],
  },
  [TrainingModeRendererKey.Order]: {
    title: 'Режим: Выбор слов без подсказок',
    summary: 'Соберите стих из слов без подсказок.',
    bullets: [
      'Подсказок нет.',
      'Собирайте слова строго по порядку.',
      '5 ошибок сбрасывают цепочку.',
    ],
  },
  [TrainingModeRendererKey.LettersHints]: {
    title: 'Режим: Первые буквы с подсказками',
    summary: 'Для скрытых слов выбирайте первые буквы по порядку.',
    bullets: [
      'Открытые слова помогают ориентироваться.',
      'Жмите первую букву следующего скрытого слова.',
      'Одинаковые буквы могут повторяться.',
    ],
  },
  [TrainingModeRendererKey.LettersTap]: {
    title: 'Режим: Первые буквы (тап)',
    summary: 'Нажимайте первые буквы слов по порядку.',
    bullets: [
      'Собирайте буквы строго по порядку.',
      'Одна и та же буква может использоваться снова.',
      'Лишние варианты исчезают.',
    ],
  },
  [TrainingModeRendererKey.LettersType]: {
    title: 'Режим: Ввод первых букв',
    summary: 'Введите первые буквы слов с клавиатуры.',
    bullets: [
      'Пробелы игнорируются.',
      'Неверная буква сбрасывает ввод.',
      '5 ошибок сбрасывают цепочку.',
    ],
  },
  [TrainingModeRendererKey.Typing]: {
    title: 'Режим: Полный ввод',
    summary: 'Введите стих целиком по памяти.',
    bullets: [
      'Пишите без подсказок.',
      'Проверьте процент совпадения.',
      'Оцените уверенность после проверки.',
    ],
  },
  [TrainingModeRendererKey.VoiceTyping]: {
    title: 'Режим: Голосовой ввод',
    summary: 'Продиктуйте стих и проверьте распознавание.',
    bullets: [
      'Нажмите запись и проговорите стих.',
      'Проверьте текст, при необходимости повторите.',
      'Оценка влияет на следующий интервал.',
    ],
  },
};

interface TrainingModeRendererProps {
  renderer: TrainingModeRendererKey;
  verse: Verse;
  onRate: (rating: TrainingModeRating) => void;
  isLateStageReview?: boolean;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
}

export interface TrainingModeRendererHandle {
  handleBackAction: () => boolean;
  openTutorial: () => boolean;
}

const TrainingModeRendererComponent = forwardRef<TrainingModeRendererHandle, TrainingModeRendererProps>(function TrainingModeRenderer({
  renderer,
  verse,
  onRate,
  isLateStageReview = false,
  hintState,
  onProgressChange,
}, ref) {
  const tutorial = useMemo(() => MODE_TUTORIALS[renderer], [renderer]);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    handleBackAction: () => {
      if (!tutorialOpen) return false;
      setTutorialOpen(false);
      return true;
    },
    openTutorial: () => {
      if (!tutorial) return false;
      setTutorialOpen(true);
      return true;
    },
  }), [tutorial, tutorialOpen]);

  const modeInstanceKey = `${renderer}:${verse.id}:${verse.status}:${verse.repetitions}:${verse.lastReviewedAt ?? ''}:${verse.nextReviewAt ?? ''}`;

  const handleOpenTutorial = useCallback(() => {
    if (!tutorial) return;
    setTutorialOpen(true);
  }, [tutorial]);

  const modeContent = (() => {
  if (renderer === TrainingModeRendererKey.ChunksOrder) {
    return <ModeClickChunksExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.LettersTap) {
    return <ModeFirstLettersTapExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.LettersType) {
    return <ModeFirstLettersKeyboardExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.OrderHints) {
    return <ModeClickWordsHintedExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.Order) {
    return <ModeClickWordsExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.LettersHints) {
    return <ModeFirstLettersHintedExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  if (renderer === TrainingModeRendererKey.VoiceTyping) {
    return <ModeVoiceRecallExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  }

  return <ModeFullRecallExercise key={modeInstanceKey} verse={verse} onRate={onRate} isLateStageReview={isLateStageReview} hintState={hintState} onProgressChange={onProgressChange} onOpenTutorial={handleOpenTutorial} />;
  })();

  return (
    <>
      {modeContent}

      {tutorial && (
        <AlertDialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>{tutorial.title}</AlertDialogTitle>
              <AlertDialogDescription>{tutorial.summary}</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 text-sm text-foreground/90">
              {tutorial.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <span className="mt-0.5 text-foreground/90">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <AlertDialogFooter>
              <AlertDialogAction
                className="w-full sm:w-auto rounded-full border border-border/60 bg-muted/35 text-foreground/90"
                onClick={(e) => {
                  e.preventDefault();
                  setTutorialOpen(false);
                }}
              >
                Понятно, начать
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
});

TrainingModeRendererComponent.displayName = 'TrainingModeRenderer';

export const TrainingModeRenderer = memo(TrainingModeRendererComponent);
