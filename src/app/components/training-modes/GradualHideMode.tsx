'use client'

import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { Verse } from '../../data/mockData';

interface GradualHideModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

export function GradualHideMode({ verse, onRate }: GradualHideModeProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const words = verse.text.split(/\s+/);
  const totalSteps = 5;

  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= totalSteps) {
          setIsPlaying(false);
          setShowRating(true);
          return prev;
        }
        return prev + 1;
      });
    }, 2000); // 2 seconds per step

    return () => clearInterval(interval);
  }, [isPlaying]);

  const getWordOpacity = (index: number) => {
    const totalWords = words.length;
    const wordsToHidePerStep = totalWords / totalSteps;
    const hiddenWords = currentStep * wordsToHidePerStep;
    
    if (index < hiddenWords) {
      return 0.15; // Faded
    }
    return 1; // Visible
  };

  const handleReset = () => {
    setCurrentStep(0);
    setIsPlaying(false);
    setShowRating(false);
  };

  const handleTogglePlay = () => {
    if (currentStep >= totalSteps) {
      handleReset();
    } else {
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-8 sm:p-12 shadow-sm border border-border"
      >
        <div className="space-y-8">
          {/* Reference */}
          <div className="text-center">
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Слова будут постепенно исчезать. Попробуйте их запомнить!
            </p>
          </div>

          {/* Verse with Gradual Hide */}
          <div className="min-h-[240px] flex items-center justify-center">
            <div className="bg-muted/20 rounded-lg p-8">
              <p className="text-lg leading-relaxed text-center">
                {words.map((word, index) => (
                  <motion.span
                    key={index}
                    animate={{ opacity: getWordOpacity(index) }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="inline-block mr-2"
                  >
                    {word}
                  </motion.span>
                ))}
              </p>
            </div>
          </div>

          {/* Progress Indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={{ width: 0 }}
                animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <span className="text-sm text-muted-foreground min-w-[4rem] text-right">
              {currentStep}/{totalSteps}
            </span>
          </div>

          {/* Controls */}
          {!showRating && (
            <div className="flex justify-center gap-3">
              <Button
                onClick={handleTogglePlay}
                size="lg"
                variant="outline"
                className="gap-2"
              >
                {isPlaying ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Пауза
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    {currentStep >= totalSteps ? 'Перезапустить' : currentStep > 0 ? 'Продолжить' : 'Начать'}
                  </>
                )}
              </Button>
              
              {currentStep > 0 && (
                <Button
                  onClick={handleReset}
                  size="lg"
                  variant="ghost"
                  className="gap-2"
                >
                  <RotateCcw className="w-4 h-4" />
                  Сбросить
                </Button>
              )}
            </div>
          )}

          {/* Rating Buttons */}
          {showRating && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground text-center">
                Насколько хорошо вы смогли вспомнить стих?
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  onClick={() => onRate(0)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  size="lg"
                >
                  Забыл
                </Button>
                <Button
                  onClick={() => onRate(1)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                >
                  Сложно
                </Button>
                <Button
                  onClick={() => onRate(2)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  size="lg"
                >
                  Хорошо
                </Button>
                <Button
                  onClick={() => onRate(3)}
                  className="bg-[#059669] hover:bg-[#047857] text-white"
                  size="lg"
                >
                  Легко
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
