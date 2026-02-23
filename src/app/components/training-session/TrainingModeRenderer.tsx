'use client'

import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Verse as LegacyVerse } from '../../data/mockData';
import { ModeClickChunksExercise } from './modes/ClickChunksExercise';
import { ModeClickWordsHintedExercise } from './modes/ClickWordsHintedExercise';
import { ModeClickWordsExercise } from './modes/ClickWordsExercise';
import { ModeFirstLettersHintedExercise } from './modes/FirstLettersHintedExercise';
import { ModeFirstLettersKeyboardExercise } from './modes/FirstLettersKeyboardExercise';
import { ModeFirstLettersTapExercise } from './modes/FirstLettersTapExercise';
import { ModeFullRecallExercise } from './modes/FullRecallExercise';
import type { TrainingModeRating } from './modes/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

export enum TrainingModeRendererKey {
  ChunksOrder = 'chunks-order',
  OrderHints = 'order-hints',
  LettersTap = 'letters-tap',
  LettersType = 'letters-type',
  Order = 'order',
  LettersHints = 'letters-hints',
  Typing = 'typing',
}

type ModeTutorialSpec = {
  title: string;
  summary: string;
  bullets: string[];
};

const MODE_TUTORIAL_STORAGE_KEY = 'bible-memory.training-mode-tutorials.seen.v1';

const MODE_TUTORIALS: Record<TrainingModeRendererKey, ModeTutorialSpec> = {
  [TrainingModeRendererKey.ChunksOrder]: {
    title: 'Режим: Выбор частей',
    summary: 'Соберите стих, нажимая смысловые части в правильной последовательности.',
    bullets: [
      'Нажимайте куски текста по порядку.',
      'Ошибочный выбор сбрасывает текущую последовательность.',
      'После завершения оцените, насколько легко вы вспомнили стих.',
    ],
  },
  [TrainingModeRendererKey.OrderHints]: {
    title: 'Режим: Выбор слов с подсказками',
    summary: 'Часть слов уже открыта, вы восстанавливаете только скрытые слова по порядку.',
    bullets: [
      'Сначала смотрите на стих с открытыми словами.',
      'Выбирайте скрытые слова строго по последовательности.',
      'Ошибка сбрасывает скрытую последовательность.',
    ],
  },
  [TrainingModeRendererKey.Order]: {
    title: 'Режим: Выбор слов без подсказок',
    summary: 'Нужно собрать стих полностью, нажимая слова в правильном порядке.',
    bullets: [
      'Подсказок по словам нет.',
      'Ориентируйтесь на структуру и память.',
      'После ошибки последовательность начинается заново.',
    ],
  },
  [TrainingModeRendererKey.LettersHints]: {
    title: 'Режим: Первые буквы с подсказками',
    summary: 'Часть слов открыта, для скрытых слов выбирайте первые буквы по порядку.',
    bullets: [
      'Смотрите на стих с открытыми словами и скрытыми масками.',
      'Нажимайте первую букву следующего скрытого слова.',
      'Повторяющиеся буквы могут встречаться несколько раз.',
    ],
  },
  [TrainingModeRendererKey.LettersTap]: {
    title: 'Режим: Первые буквы (тап)',
    summary: 'Нажимайте первые буквы всех слов в правильной последовательности.',
    bullets: [
      'Выбирайте буквы строго по порядку слов в стихе.',
      'Если буква повторяется, одна и та же кнопка может использоваться снова.',
      'Ненужные дальше буквы исчезают из вариантов.',
    ],
  },
  [TrainingModeRendererKey.LettersType]: {
    title: 'Режим: Ввод первых букв',
    summary: 'Введите первые буквы слов с клавиатуры в правильной последовательности.',
    bullets: [
      'Можно вводить с пробелами — они игнорируются при проверке.',
      'Неверная буква сбрасывает текущий ввод.',
      'После завершения оцените сложность для корректного перехода режима.',
    ],
  },
  [TrainingModeRendererKey.Typing]: {
    title: 'Режим: Полный ввод',
    summary: 'Это самый сложный режим: введите стих целиком по памяти.',
    bullets: [
      'Сначала введите стих без подсказок.',
      'Можно открыть подсказку, если застряли.',
      'После проверки оцените, насколько уверенно вы его воспроизвели.',
    ],
  },
};

function readSeenModeTutorials(): Partial<Record<TrainingModeRendererKey, true>> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(MODE_TUTORIAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Partial<Record<TrainingModeRendererKey, true>>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSeenModeTutorials(value: Partial<Record<TrainingModeRendererKey, true>>) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(MODE_TUTORIAL_STORAGE_KEY, JSON.stringify(value));
  } catch {
    // ignore storage errors
  }
}

interface TrainingModeRendererProps {
  renderer: TrainingModeRendererKey;
  verse: LegacyVerse;
  onRate: (rating: TrainingModeRating) => void;
  topBadge?: ReactNode;
}

export interface TrainingModeRendererHandle {
  handleBackAction: () => boolean;
}

export const TrainingModeRenderer = forwardRef<TrainingModeRendererHandle, TrainingModeRendererProps>(function TrainingModeRenderer({
  renderer,
  verse,
  onRate,
  topBadge,
}, ref) {
  const tutorial = useMemo(() => MODE_TUTORIALS[renderer], [renderer]);
  const [tutorialOpen, setTutorialOpen] = useState(false);

  useEffect(() => {
    const seen = readSeenModeTutorials();
    setTutorialOpen(!seen[renderer]);
  }, [renderer]);

  useImperativeHandle(ref, () => ({
    handleBackAction: () => {
      if (!tutorialOpen) return false;
      setTutorialOpen(false);
      return true;
    },
  }), [tutorialOpen]);

  const handleTutorialComplete = () => {
    const seen = readSeenModeTutorials();
    seen[renderer] = true;
    writeSeenModeTutorials(seen);
    setTutorialOpen(false);
  };

  const modeContent = (() => {
  if (renderer === TrainingModeRendererKey.ChunksOrder) {
    return <ModeClickChunksExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersTap) {
    return <ModeFirstLettersTapExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersType) {
    return <ModeFirstLettersKeyboardExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.OrderHints) {
    return <ModeClickWordsHintedExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.Order) {
    return <ModeClickWordsExercise verse={verse} onRate={onRate} />;
  }

  if (renderer === TrainingModeRendererKey.LettersHints) {
    return <ModeFirstLettersHintedExercise verse={verse} onRate={onRate} />;
  }

  return <ModeFullRecallExercise verse={verse} onRate={onRate} />;
  })();

  return (
    <>
      <div
        className="
          relative w-full
          min-h-[560px] sm:min-h-[620px]
          [&>div]:h-full
          [&>div>div]:min-h-[560px]
          sm:[&>div>div]:min-h-[620px]
        "
      >
        {topBadge && tutorial && (
          <div className="z-10 absolute top-[-30px] left-1/2 -translate-x-1/2 !h-fit">
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="pointer-events-auto rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2"
              aria-label={`Показать обучение для режима: ${tutorial.title}`}
              title="Показать обучение по режиму"
            >
              {topBadge}
            </button>
          </div>
        )}
        {modeContent}
      </div>

      {tutorial && (
        <AlertDialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{tutorial.title}</AlertDialogTitle>
              <AlertDialogDescription>{tutorial.summary}</AlertDialogDescription>
            </AlertDialogHeader>

            <div className="space-y-2 text-sm text-muted-foreground">
              {tutorial.bullets.map((bullet, index) => (
                <div key={index} className="flex gap-2">
                  <span className="mt-0.5 text-primary">•</span>
                  <span>{bullet}</span>
                </div>
              ))}
            </div>

            <AlertDialogFooter>
              <AlertDialogAction
                className="w-full sm:w-auto"
                onClick={(e) => {
                  e.preventDefault();
                  handleTutorialComplete();
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
