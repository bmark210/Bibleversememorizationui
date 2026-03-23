'use client'

import {
  forwardRef,
  memo,
  useCallback,
  useImperativeHandle,
  useMemo,
  useState,
  type ComponentType,
} from 'react';
import { ModeClickChunksExercise } from './modes/ClickChunksExercise';
import { ModeClickWordsHintedExercise } from './modes/ClickWordsHintedExercise';
import { ModeClickWordsExercise } from './modes/ClickWordsExercise';
import { ModeFirstLettersHintedExercise } from './modes/FirstLettersHintedExercise';
import { ModeFirstLettersKeyboardExercise } from './modes/FirstLettersKeyboardExercise';
import { ModeFirstLettersTapExercise } from './modes/FirstLettersTapExercise';
import { ModeFullRecallExercise } from './modes/FullRecallExercise';
import { ModeVoiceRecallExercise } from './modes/VoiceRecallExercise';
import type { TrainingExerciseResolution } from './modes/exerciseResult';
import type { HintState } from './modes/useHintState';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '../ui/drawer';
import { Button } from '../ui/button';
import { Verse } from '@/app/App';
import type { TrainingModeId } from '@/shared/training/modeEngine';

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

export interface TrainingModeInlineActionsProps {
  showInlineAssistButton?: boolean;
  onRequestInlineAssist?: () => void;
  showInlineQuickForgetAction?: boolean;
  onRequestInlineQuickForget?: () => void;
  inlineActionsDisabled?: boolean;
}

// Shared exercise props that every mode component accepts
type ExerciseModeSharedProps = {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  isLateStageReview?: boolean;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
} & TrainingModeInlineActionsProps;

// Lookup map: renderer key → component
const MODE_COMPONENT_MAP: Record<
  TrainingModeRendererKey,
  ComponentType<ExerciseModeSharedProps>
> = {
  [TrainingModeRendererKey.ChunksOrder]: ModeClickChunksExercise,
  [TrainingModeRendererKey.OrderHints]: ModeClickWordsHintedExercise,
  [TrainingModeRendererKey.Order]: ModeClickWordsExercise,
  [TrainingModeRendererKey.LettersHints]: ModeFirstLettersHintedExercise,
  [TrainingModeRendererKey.LettersTap]: ModeFirstLettersTapExercise,
  [TrainingModeRendererKey.LettersType]: ModeFirstLettersKeyboardExercise,
  [TrainingModeRendererKey.Typing]: ModeFullRecallExercise,
  [TrainingModeRendererKey.VoiceTyping]: ModeVoiceRecallExercise,
};

interface TrainingModeRendererProps {
  renderer: TrainingModeRendererKey;
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  isLateStageReview?: boolean;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  onOpenVerseProgress?: () => void;
  exerciseInstanceKey?: string | number;
  inlineExerciseActions?: TrainingModeInlineActionsProps;
}

export interface TrainingModeRendererHandle {
  handleBackAction: () => boolean;
  openTutorial: () => boolean;
}

const TrainingModeRendererComponent = forwardRef<TrainingModeRendererHandle, TrainingModeRendererProps>(function TrainingModeRenderer({
  renderer,
  verse,
  trainingModeId,
  onExerciseResolved,
  isLateStageReview = false,
  hintState,
  onProgressChange,
  onOpenVerseProgress,
  exerciseInstanceKey = 0,
  inlineExerciseActions,
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

  const modeInstanceKey = `${renderer}:${verse.id}:${verse.status}:${verse.repetitions}:${verse.lastReviewedAt ?? ''}:${verse.nextReviewAt ?? ''}:${exerciseInstanceKey}`;

  const handleOpenTutorial = useCallback(() => {
    if (!tutorial) return;
    setTutorialOpen(true);
  }, [tutorial]);

  const ModeComponent = MODE_COMPONENT_MAP[renderer] ?? ModeFullRecallExercise;

  return (
    <>
      <ModeComponent
        key={modeInstanceKey}
        verse={verse}
        trainingModeId={trainingModeId}
        onExerciseResolved={onExerciseResolved}
        isLateStageReview={isLateStageReview}
        hintState={hintState}
        onProgressChange={onProgressChange}
        onOpenTutorial={handleOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
        {...inlineExerciseActions}
      />

      {tutorial && (
        <Drawer open={tutorialOpen} onOpenChange={setTutorialOpen}>
          <DrawerContent>
            <DrawerHeader className="pb-1">
              <DrawerTitle className="text-base">{tutorial.title}</DrawerTitle>
              <DrawerDescription>{tutorial.summary}</DrawerDescription>
            </DrawerHeader>

            <div className="space-y-2 px-4 text-sm text-foreground/90">
              {tutorial.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <span className="mt-0.5 text-foreground/90">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <Button
                  className="w-full h-12 rounded-2xl border border-border/60 bg-muted/35 text-sm font-medium text-foreground/90"
                  onClick={() => setTutorialOpen(false)}
                >
                  Понятно, начать
                </Button>
              </DrawerClose>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      )}
    </>
  );
});

TrainingModeRendererComponent.displayName = 'TrainingModeRenderer';

export const TrainingModeRenderer = memo(TrainingModeRendererComponent);
