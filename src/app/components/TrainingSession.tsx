import React, { useState } from 'react';
import { X, ChevronLeft } from 'lucide-react';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Verse } from '../data/mockData';
import { FlashcardMode } from './training-modes/FlashcardMode';
import { TypingMode } from './training-modes/TypingMode';
import { QuizMode } from './training-modes/QuizMode';
import { FillBlanksMode } from './training-modes/FillBlanksMode';
import { FirstLettersMode } from './training-modes/FirstLettersMode';
import { GradualHideMode } from './training-modes/GradualHideMode';
import { VerseOrderMode } from './training-modes/VerseOrderMode';

interface TrainingSessionProps {
  verses: Verse[];
  allVerses?: Verse[];
  onComplete: () => void;
  onExit: () => void;
}

type TrainingMode = 
  | 'flashcard' 
  | 'typing' 
  | 'quiz' 
  | 'fill-blanks' 
  | 'first-letters' 
  | 'gradual-hide' 
  | 'verse-order';

type Rating = 0 | 1 | 2 | 3;

export function TrainingSession({ verses, allVerses = [], onComplete, onExit }: TrainingSessionProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedMode, setSelectedMode] = useState<TrainingMode | null>(null);
  const [showModeSelect, setShowModeSelect] = useState(true);

  const currentVerse = verses[currentIndex];
  const progress = ((currentIndex + 1) / verses.length) * 100;

  const modes: { id: TrainingMode; label: string; description: string }[] = [
    { id: 'flashcard', label: 'Flashcard', description: 'See reference, recall verse' },
    { id: 'typing', label: 'Typing', description: 'Type the full verse' },
    { id: 'fill-blanks', label: 'Fill Blanks', description: 'Complete missing words' },
    { id: 'first-letters', label: 'First Letters', description: 'Recall from first letters' },
    { id: 'quiz', label: 'Quiz', description: 'Multiple choice questions' },
    { id: 'gradual-hide', label: 'Gradual Hide', description: 'Words fade progressively' },
    { id: 'verse-order', label: 'Verse Order', description: 'Arrange phrases correctly' },
  ];

  const handleModeSelect = (mode: TrainingMode) => {
    setSelectedMode(mode);
    setShowModeSelect(false);
  };

  const handleBackToModeSelect = () => {
    setShowModeSelect(true);
  };

  const handleRating = (rating: Rating) => {
    if (currentIndex < verses.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      onComplete();
    }
  };

  // Mode Selection Screen
  if (showModeSelect) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        {/* Header */}
        <div className="bg-card border-b border-border">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <div className="pt-20 md:pt-0 flex items-center justify-between">
              <h2>Choose Training Mode</h2>
              <Button variant="ghost" size="sm" onClick={onExit}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Mode Selection Grid */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <div className="w-full max-w-4xl">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => handleModeSelect(mode.id)}
                  className="bg-card border-2 border-border hover:border-primary hover:shadow-md transition-all rounded-xl p-6 text-left group"
                >
                  <h3 className="mb-2 group-hover:text-primary transition-colors">
                    {mode.label}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Training Screen
  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header with Progress */}
      <div className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="pt-20 md:pt-0 flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBackToModeSelect}
                className="gap-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Mode
              </Button>
              <Badge variant="secondary">
                {modes.find(m => m.id === selectedMode)?.label}
              </Badge>
            </div>

            <div className="flex items-center gap-3">
              <span className="text-sm font-medium">
                {currentIndex + 1} / {verses.length}
              </span>
              <Button variant="ghost" size="sm" onClick={onExit}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Mode Content */}
      <div className="flex-1 flex items-center justify-center p-4 pb-20">
        {selectedMode === 'flashcard' && (
          <FlashcardMode verse={currentVerse} onRate={handleRating} />
        )}
        {selectedMode === 'typing' && (
          <TypingMode verse={currentVerse} onRate={handleRating} />
        )}
        {selectedMode === 'quiz' && (
          <QuizMode 
            verse={currentVerse} 
            allVerses={allVerses.length > 0 ? allVerses : verses}
            onRate={handleRating} 
          />
        )}
        {selectedMode === 'fill-blanks' && (
          <FillBlanksMode verse={currentVerse} onRate={handleRating} />
        )}
        {selectedMode === 'first-letters' && (
          <FirstLettersMode verse={currentVerse} onRate={handleRating} />
        )}
        {selectedMode === 'gradual-hide' && (
          <GradualHideMode verse={currentVerse} onRate={handleRating} />
        )}
        {selectedMode === 'verse-order' && (
          <VerseOrderMode verse={currentVerse} onRate={handleRating} />
        )}
      </div>

      {/* Helper Text */}
      <div className="text-center py-4 text-sm text-muted-foreground bg-card border-t border-border">
        <p className="hidden sm:block">
          Complete the exercise and rate your recall to continue
        </p>
      </div>
    </div>
  );
}
