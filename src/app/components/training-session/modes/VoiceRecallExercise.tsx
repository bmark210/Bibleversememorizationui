'use client'

import { useEffect, useMemo, useRef, useState } from 'react';
import { Mic, MicOff, Lightbulb, RefreshCcw } from 'lucide-react';
import { GALLERY_TOASTER_ID, toast } from '@/app/lib/toast';

import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { TrainingRatingFooter } from './TrainingRatingFooter';
import {
  TrainingRatingButtons,
  resolveTrainingRatingStage,
} from './TrainingRatingButtons';
import { Verse } from '@/app/App';
import {
  normalizeComparableText,
  tokenizeComparableWords,
} from '@/shared/training/fullRecallTypingAssist';

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

export function ModeVoiceRecallExercise({ verse, onRate }: VoiceRecallExerciseProps) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalTranscriptRef = useRef('');

  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isChecked, setIsChecked] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const speechCtor = useMemo(() => getSpeechRecognitionCtor(), []);
  const isSpeechSupported = speechCtor != null;
  const ratingStage = resolveTrainingRatingStage(verse.status);

  const targetComparableText = useMemo(
    () => normalizeComparableText(verse.text),
    [verse.text]
  );
  const targetWordsCount = useMemo(
    () => tokenizeComparableWords(verse.text).length,
    [verse.text]
  );

  useEffect(() => {
    setTranscript('');
    setIsListening(false);
    setIsChecked(false);
    setShowHint(false);
    setRecognitionError(null);
    finalTranscriptRef.current = '';

    return () => {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
    };
  }, [verse.id, verse.text]);

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
        const piece = result?.[0]?.transcript ?? '';
        if (result.isFinal) {
          finalTranscriptRef.current = `${finalTranscriptRef.current} ${piece}`.trim();
        } else {
          interim = `${interim} ${piece}`.trim();
        }
      }
      const next = `${finalTranscriptRef.current} ${interim}`.trim();
      setTranscript(next);
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
      toast.error('Голосовой ввод недоступен в этом браузере', {
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
      // start() throws if called twice in a row.
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
    setShowHint(false);
    setRecognitionError(null);
  };

  const handleCheck = () => {
    const comparable = normalizeComparableText(transcript);
    if (!comparable || !targetComparableText) {
      toast.error('Сначала продиктуйте стих', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    if (comparable === targetComparableText) {
      setIsChecked(true);
      toast.success('Отлично! Стих распознан верно', {
        toasterId: GALLERY_TOASTER_ID,
        size: 'compact',
      });
      return;
    }

    toast.error('Есть расхождения, попробуйте ещё раз или откройте подсказку', {
      toasterId: GALLERY_TOASTER_ID,
      size: 'compact',
    });
  };

  const transcriptWordsCount = tokenizeComparableWords(transcript).length;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border/60 bg-muted/20 p-3 space-y-2">
        <div className="text-sm font-medium">Голосовой набор всего стиха</div>
        <div className="text-xs text-muted-foreground">
          Проговорите стих целиком. После остановки проверьте распознанный текст.
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            onClick={isListening ? handleStopListening : handleStartListening}
            className="rounded-xl"
            variant={isListening ? 'secondary' : 'default'}
          >
            {isListening ? <MicOff className="w-4 h-4 mr-2" /> : <Mic className="w-4 h-4 mr-2" />}
            {isListening ? 'Остановить запись' : 'Начать запись'}
          </Button>
          <Button type="button" variant="outline" className="rounded-xl" onClick={handleResetTranscript}>
            <RefreshCcw className="w-4 h-4 mr-2" />
            Очистить
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setShowHint((prev) => !prev)}
          >
            <Lightbulb className="w-4 h-4 mr-2" />
            {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
          </Button>
        </div>
      </div>

      {!isSpeechSupported ? (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
          Браузер не поддерживает Web Speech API. Можно вставить распознанный текст вручную.
        </div>
      ) : null}

      {recognitionError ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
          {recognitionError}
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>Распознано слов: {transcriptWordsCount}</span>
          <span>Ожидается слов: {targetWordsCount}</span>
        </div>
        <Textarea
          value={transcript}
          onChange={(event) => setTranscript(event.target.value)}
          className="min-h-[140px] text-sm sm:text-base"
          placeholder="Здесь появится распознанный текст..."
        />
      </div>

      {showHint ? (
        <div className="rounded-xl border border-border/60 bg-muted/25 p-3 text-sm sm:text-base leading-relaxed">
          {verse.text}
        </div>
      ) : null}

      {!isChecked ? (
        <Button type="button" className="w-full rounded-2xl" onClick={handleCheck}>
          Проверить распознавание
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
