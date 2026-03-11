'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, RefreshCcw } from 'lucide-react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from "@/app/components/ui/button";
import { Textarea } from "@/app/components/ui/textarea";
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';
import { normalizeComparableText } from '@/shared/training/fullRecallTypingAssist';
import { similarityRatio } from '@/shared/utils/levenshtein';

interface VoiceRecallExerciseProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
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

function calculateTextMatchPercent(userText: string, targetText: string) {
  return Math.max(0, Math.min(100, Math.round(similarityRatio(userText, targetText) * 100)));
}

export function ModeVoiceRecallExercise({ verse, onRate }: VoiceRecallExerciseProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  const [matchPercent, setMatchPercent] = useState<number | null>(null);

  const speechCtor = useMemo(() => getSpeechRecognitionCtor(), []);
  const isSpeechSupported = speechCtor != null;
  const ratingStage = resolveTrainingRatingStage(verse.status);

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
    finalTranscriptRef.current = '';

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [verse]);

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

  const handleCheck = () => {
    const comparable = normalizeComparableText(transcript);
    if (!comparable || !targetComparableText) {
      toast.warning('Сначала продиктуйте или введите стих', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    const nextMatchPercent = calculateTextMatchPercent(comparable, targetComparableText);
    setMatchPercent(nextMatchPercent);

    if (nextMatchPercent >= 80) {
      setIsChecked(true);
      toast.success(`Совпадение ${nextMatchPercent}%. Отлично!`, {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    toast.warning(`Совпадение ${nextMatchPercent}%. Попробуйте ещё раз.`, {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
  };

  return (
    <div className="space-y-3">
      <label className="block text-center text-sm font-medium text-foreground/90">
        Голосовой ввод стиха
      </label>

      <div className="rounded-2xl border border-border/60 bg-background/70 p-3">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={isListening ? handleStopListening : handleStartListening}
            className="rounded-xl"
            variant={isListening ? 'secondary' : 'default'}
          >
            {isListening ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
            {isListening ? 'Остановить запись' : 'Начать запись'}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleResetTranscript}>
            <RefreshCcw className="mr-2 h-4 w-4" />
            Очистить
          </Button>
        </div>
      </div>

      {!isSpeechSupported ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Браузер не поддерживает Web Speech API. Введите текст вручную.
        </div>
      ) : null}

      {recognitionError ? (
        <div className="rounded-xl border border-destructive/45 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {recognitionError}
        </div>
      ) : null}

      <div className="rounded-2xl border border-border/60 bg-background/70 p-2">
        <Textarea
          value={transcript}
          onChange={(event) => {
            setTranscript(event.target.value);
            if (matchPercent !== null) setMatchPercent(null);
          }}
          className="min-h-[clamp(7.5rem,24dvh,10rem)] resize-none border-0 bg-transparent text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 sm:text-base"
          placeholder="Здесь будет распознанный текст..."
          disabled={isChecked}
        />
      </div>

      {matchPercent !== null && (
        <div
          className={`rounded-xl border px-3 py-2 text-sm ${
            matchPercent === 100
              ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : matchPercent >= 80
                ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                : 'border-destructive/45 bg-destructive/10 text-destructive'
          }`}
        >
          <p className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">Процент соответствия</span>
            <span className="font-semibold tabular-nums">{matchPercent}%</span>
          </p>
        </div>
      )}

      {!isChecked ? (
        <Button type="button" className="w-full rounded-xl border border-border/60 bg-background/20 text-foreground/80" onClick={handleCheck}>
          Проверить
        </Button>
      ) : (
        <TrainingRatingFooter>
          <TrainingRatingButtons
            stage={ratingStage}
            mode="voice-recall"
            onRate={onRate}
          />
        </TrainingRatingFooter>
      )}
    </div>
  );
}
