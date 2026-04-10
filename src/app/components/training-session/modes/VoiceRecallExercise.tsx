'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, RefreshCcw } from 'lucide-react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { ScrollShadowContainer } from "@/app/components/ui/ScrollShadowContainer";
import { cn } from "@/app/components/ui/utils";
import { TrainingExerciseModeHeader } from './TrainingExerciseModeHeader';
import { FixedBottomPanel } from './FixedBottomPanel';
import { SplitExerciseActionRail } from './SplitExerciseActionRail';
import { TrainingExerciseSection, TrainingMetricBadge } from './TrainingExerciseSection';
import type { TrainingExerciseResolution } from './exerciseResult';
import type { ExerciseInlineActionsProps } from './exerciseInlineActions';
import type { HintState } from './useHintState';
import { Verse } from "@/app/domain/verse";
import { normalizeComparableText } from '@/shared/training/fullRecallTypingAssist';
import { tokenizeWords } from './wordUtils';
import {
  createExerciseProgressSnapshot,
  getCompletedWordCountFromFreeText,
} from '@/modules/training/hints/exerciseProgress';
import type { ExerciseProgressSnapshot } from '@/modules/training/hints/types';
import { getExerciseRecallThreshold } from '@/modules/training/hints/exerciseDifficultyConfig';
import { TrainingModeId } from '@/shared/training/modeEngine';
import { useTrainingFontSize } from './useTrainingFontSize';
import {
  buildRecallResolution,
  calculateRecallMatchPercent,
} from "./recallEvaluation";
import {
  TRAINING_ACTION_BUTTON_MEDIUM_CLASS,
  TRAINING_ACTION_BUTTON_STRONG_CLASS,
  TRAINING_ACTION_ROW_PADDING_CLASS,
  TRAINING_SECTION_SPACING_SM,
  TRAINING_STACK_GAP_SM,
  TRAINING_STACK_GAP_MD,
} from '../trainingActionTokens';
import { useAppViewportStore } from '@/app/stores/appViewportStore';
import { TRAINING_FULL_TEXT_ENTRY_SECTION_STYLE } from './textEntryLayout';

interface VoiceRecallExerciseProps extends ExerciseInlineActionsProps {
  verse: Verse;
  trainingModeId: TrainingModeId;
  onExerciseResolved?: (result: TrainingExerciseResolution) => void;
  hintState?: HintState;
  onProgressChange?: (progress: ExerciseProgressSnapshot) => void;
  isLateStageReview?: boolean;
  onOpenTutorial?: () => void;
  onOpenVerseProgress?: () => void;
}

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: { transcript?: string };
};
type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<SpeechRecognitionResultLike>;
};
type SpeechRecognitionErrorEventLike = {
  error: string;
};
type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
};
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getSpeechRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === 'undefined') return null;
  const maybeWindow = window as Window & {
    webkitSpeechRecognition?: SpeechRecognitionCtor;
    SpeechRecognition?: SpeechRecognitionCtor;
  };
  return maybeWindow.SpeechRecognition ?? maybeWindow.webkitSpeechRecognition ?? null;
}

export function ModeVoiceRecallExercise({
  verse,
  trainingModeId,
  onExerciseResolved,
  hintState,
  onProgressChange,
  isLateStageReview: _isLateStageReview = false,
  onOpenTutorial,
  onOpenVerseProgress,
  showInlineQuickForgetAction = false,
  onRequestInlineQuickForget,
  inlineActionsDisabled = false,
}: VoiceRecallExerciseProps) {
  const RECALL_THRESHOLD = getExerciseRecallThreshold(verse.difficultyLevel);
  const fontSizes = useTrainingFontSize();
  const isKeyboardOpen = useAppViewportStore((state) => state.isKeyboardOpen);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const mobileFocusTimeoutRef = useRef<number | null>(null);

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [matchPercent, setMatchPercent] = useState<number | null>(null);
  const [totalMistakes, setTotalMistakes] = useState(0);

  const surrendered = hintState?.surrendered ?? false;

  const speechCtor = useMemo(() => getSpeechRecognitionCtor(), []);
  const isSpeechSupported = speechCtor != null;

  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );

  useEffect(() => {
    setTranscript('');
    setIsListening(false);
    setIsChecked(false);
    setRecognitionError(null);
    setMatchPercent(null);
    setTotalMistakes(0);
    finalTranscriptRef.current = '';

    return () => {
      if (mobileFocusTimeoutRef.current) {
        window.clearTimeout(mobileFocusTimeoutRef.current);
        mobileFocusTimeoutRef.current = null;
      }
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [verse]);

  useEffect(() => {
    if (surrendered && !isChecked) {
      setIsChecked(true);
      onExerciseResolved?.({
        kind: 'revealed',
        message: 'Правильный текст открыт. Оцените, насколько уверенно вы вспоминали стих.',
      });
    }
  }, [isChecked, onExerciseResolved, surrendered]);

  const totalWords = useMemo(() => tokenizeWords(verse.text).length, [verse.text]);
  const completedWords = useMemo(
    () => getCompletedWordCountFromFreeText(transcript),
    [transcript]
  );

  useEffect(() => {
    onProgressChange?.(
      createExerciseProgressSnapshot({
        kind: 'voice-recall',
        unitType: 'spoken-word',
        expectedIndex: completedWords < totalWords ? completedWords : null,
        completedCount: completedWords,
        totalCount: totalWords,
        isCompleted: isChecked || surrendered,
      })
    );
  }, [completedWords, isChecked, onProgressChange, surrendered, totalWords]);

  const ensureRecognition = (): SpeechRecognitionLike | null => {
    if (!speechCtor) return null;
    if (recognitionRef.current) return recognitionRef.current;

    const recognition = new speechCtor();
    recognition.lang = 'ru-RU';
    recognition.interimResults = true;
    recognition.continuous = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEventLike) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        if (!result) continue;
        const piece = result?.[0]?.transcript ?? '';
        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim = `${interim} ${piece}`.trim();
        }
      }
      setTranscript(`${finalTranscriptRef.current} ${interim}`.trim());
      if (recognitionError) setRecognitionError(null);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEventLike) => {
      const message =
        event.error === 'not-allowed'
          ? 'Нет доступа к микрофону'
          : event.error === 'no-speech'
            ? 'Речь не распознана'
            : 'Ошибка распознавания';
      setRecognitionError(message);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    return recognition;
  };

  const handleStartListening = () => {
    const recognition = ensureRecognition();
    if (!recognition) {
      toast.info('Голосовой ввод недоступен в этом браузере', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }
    try {
      setRecognitionError(null);
      recognition.start();
      setIsListening(true);
    } catch {
      setIsListening(true);
    }
  };

  const handleStopListening = () => {
    recognitionRef.current?.stop();
    setIsListening(false);
  };

  const handleResetTranscript = () => {
    handleStopListening();
    finalTranscriptRef.current = '';
    setTranscript('');
    setIsChecked(false);
    setRecognitionError(null);
    setMatchPercent(null);
  };

  const handleInputFocus = () => {
    if (typeof window === 'undefined') return;
    if (!window.matchMedia('(max-width: 767px)').matches) return;

    if (mobileFocusTimeoutRef.current) {
      window.clearTimeout(mobileFocusTimeoutRef.current);
    }

    mobileFocusTimeoutRef.current = window.setTimeout(() => {
      inputRef.current?.scrollIntoView({
        block: 'center',
        inline: 'nearest',
        behavior: 'smooth',
      });
      mobileFocusTimeoutRef.current = null;
    }, 140);
  };

  const handleCheck = () => {
    const comparable = normalizeComparableText(transcript);
    if (!comparable || !targetComparableText) {
      toast.warning('Сначала продиктуйте или введите стих', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    const nextMatchPercent = calculateRecallMatchPercent(
      comparable,
      targetComparableText,
    );
    setMatchPercent(nextMatchPercent);
    const resolution = buildRecallResolution({
      matchPercent: nextMatchPercent,
      recallThreshold: RECALL_THRESHOLD,
    });

    setIsChecked(true);
    if (resolution.kind !== "success") {
      setTotalMistakes((prev) => prev + 1);
    }
    onExerciseResolved?.(resolution);
  };

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col overflow-hidden">
      <TrainingExerciseModeHeader
        modeId={trainingModeId}
        verse={verse}
        onOpenHelp={onOpenTutorial}
        onOpenVerseProgress={onOpenVerseProgress}
      />
      <ScrollShadowContainer
        className="mt-3 flex-1"
        scrollClassName={TRAINING_SECTION_SPACING_SM}
        shadowSize={20}
      >
        <TrainingExerciseSection
          data-hide-on-keyboard="collapse"
          title="Управление записью"
          meta={
            <div className={`flex items-center ${TRAINING_STACK_GAP_SM}`}>
              <TrainingMetricBadge tone={isSpeechSupported ? 'neutral' : 'warning'}>
                {isSpeechSupported ? 'Web Speech' : 'Ручной ввод'}
              </TrainingMetricBadge>
              {isListening ? (
                <TrainingMetricBadge tone="warning">Слушаю</TrainingMetricBadge>
              ) : null}
            </div>
          }
          className={isKeyboardOpen ? 'max-h-0 min-h-0 border-transparent py-0' : undefined}
          contentClassName={`flex flex-col pb-1 ${TRAINING_STACK_GAP_MD}`}
        >
          <div className={`flex flex-wrap ${TRAINING_STACK_GAP_SM} ${TRAINING_ACTION_ROW_PADDING_CLASS}`}>
            <Button
              type="button"
              onClick={isListening ? handleStopListening : handleStartListening}
              className={TRAINING_ACTION_BUTTON_MEDIUM_CLASS}
              variant={isListening ? 'secondary' : 'default'}
            >
              {isListening ? <MicOff className="mr-2 h-4.5 w-4.5" /> : <Mic className="mr-2 h-4.5 w-4.5" />}
              {isListening ? 'Остановить запись' : 'Начать запись'}
            </Button>
            <Button type="button" variant="outline" className={TRAINING_ACTION_BUTTON_MEDIUM_CLASS} onClick={handleResetTranscript}>
              <RefreshCcw className="mr-2 h-4.5 w-4.5" />
              Очистить
            </Button>
          </div>

          {!isSpeechSupported ? (
            <div className="rounded-xl border border-state-warning/30 bg-state-warning/12 px-3 py-2 text-sm text-state-warning">
              Браузер не поддерживает Web Speech API. Введите текст вручную.
            </div>
          ) : null}

          {recognitionError ? (
            <div className="rounded-xl border border-state-error/30 bg-state-error/10 px-3 py-2 text-sm text-state-error">
              {recognitionError}
            </div>
          ) : null}
        </TrainingExerciseSection>

        <TrainingExerciseSection
          title="Распознанный текст"
          meta={
            <div className={`flex items-center ${TRAINING_STACK_GAP_SM}`}>
              <TrainingMetricBadge
                tone={completedWords === totalWords && totalWords > 0 ? 'success' : 'neutral'}
              >
                {completedWords}/{totalWords}
              </TrainingMetricBadge>
              <TrainingMetricBadge>{`Порог ${RECALL_THRESHOLD}%`}</TrainingMetricBadge>
              {totalMistakes > 0 ? (
                <TrainingMetricBadge tone="warning">
                  Проверок {totalMistakes}
                </TrainingMetricBadge>
              ) : null}
            </div>
          }
          className="shrink-0"
          style={TRAINING_FULL_TEXT_ENTRY_SECTION_STYLE}
          contentClassName={cn(
            `flex flex-col pb-1 ${TRAINING_STACK_GAP_MD}`,
            isKeyboardOpen && 'pb-0'
          )}
        >
          <div
            className={cn(
              'rounded-2xl border border-border/40 bg-bg-subtle p-2',
              'flex min-h-0 flex-1'
            )}
          >
            <Textarea
              ref={inputRef}
              value={transcript}
              onChange={(event) => {
                setTranscript(event.target.value);
                if (matchPercent !== null) setMatchPercent(null);
              }}
              onFocus={handleInputFocus}
              className={cn(
                'resize-none border-0 bg-transparent leading-relaxed shadow-none focus-visible:ring-0 focus-visible:ring-offset-0',
                isKeyboardOpen
                  ? 'flex-1 min-h-0'
                  : 'min-h-[clamp(7.5rem,24dvh,10rem)]'
              )}
              style={{ fontSize: `${fontSizes.base}px` }}
              placeholder="Здесь будет распознанный текст..."
              disabled={isChecked || surrendered}
              data-swipe-through="true"
            />
          </div>

          {matchPercent !== null && !isKeyboardOpen && (
            <div
              className={`rounded-xl border px-3 py-2 text-sm ${
                matchPercent === 100
                  ? 'border-status-learning/25 bg-status-learning-soft text-status-learning'
                  : matchPercent >= RECALL_THRESHOLD
                    ? 'border-state-warning/30 bg-state-warning/12 text-state-warning'
                    : 'border-state-error/30 bg-state-error/10 text-state-error'
              }`}
            >
              <p className={`flex items-center justify-between ${TRAINING_STACK_GAP_SM}`}>
                <span className="text-text-muted">Процент соответствия</span>
                <span className="font-semibold tabular-nums">{matchPercent}%</span>
              </p>
            </div>
          )}
        </TrainingExerciseSection>
      </ScrollShadowContainer>

      <SplitExerciseActionRail
        remainingMistakes={Math.max(0, totalMistakes)}
        showRemainingMistakes={false}
        showQuickForgetAction={showInlineQuickForgetAction}
        onRequestQuickForget={onRequestInlineQuickForget}
        disabled={inlineActionsDisabled}
      />

      <FixedBottomPanel visible={!isChecked}>
        <Button type="button" className={`${TRAINING_ACTION_BUTTON_STRONG_CLASS} w-full`} onClick={handleCheck}>
          Проверить
        </Button>
      </FixedBottomPanel>

    </div>
  );
}
