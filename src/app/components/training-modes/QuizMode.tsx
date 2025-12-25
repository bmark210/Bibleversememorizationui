import { useState, useEffect } from 'react';
import { Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { Verse } from '../../data/mockData';

interface QuizModeProps {
  verse: Verse;
  allVerses: Verse[];
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

type QuizType = 'continuation' | 'reference' | 'full-text';

export function QuizMode({ verse, allVerses, onRate }: QuizModeProps) {
  const [quizType] = useState<QuizType>('full-text');
  const [options, setOptions] = useState<string[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  useEffect(() => {
    generateOptions();
  }, [verse]);

  const generateOptions = () => {
    const correctAnswer = verse.text;
    const wrongVerses = allVerses
      .filter(v => v.id !== verse.id)
      .sort(() => Math.random() - 0.5)
      .slice(0, 3);

    const allOptions = [
      correctAnswer,
      ...wrongVerses.map(v => v.text)
    ];

    // Shuffle options
    const shuffled = allOptions.sort(() => Math.random() - 0.5);
    setOptions(shuffled);
  };

  const handleSelectAnswer = (index: number) => {
    if (selectedAnswer !== null) return;

    setSelectedAnswer(index);
    const correct = options[index] === verse.text;
    setIsCorrect(correct);
  };

  const handleContinue = () => {
    if (isCorrect) {
      onRate(3); // Easy if correct
    } else {
      onRate(0); // Forgot if wrong
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-8 sm:p-12 shadow-sm border border-border"
      >
        <div className="space-y-6">
          {/* Question */}
          <div className="text-center space-y-2">
            <h3 className="text-primary">{verse.reference}</h3>
            <p className="text-sm text-muted-foreground">
              Select the correct verse text:
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrectOption = option === verse.text;
              const showResult = selectedAnswer !== null;

              let buttonClass = 'bg-card hover:bg-accent border-2 border-border text-foreground';
              
              if (showResult) {
                if (isCorrectOption) {
                  buttonClass = 'bg-[#059669]/10 border-2 border-[#059669] text-foreground';
                } else if (isSelected && !isCorrect) {
                  buttonClass = 'bg-destructive/10 border-2 border-destructive text-foreground';
                }
              } else if (isSelected) {
                buttonClass = 'bg-primary/10 border-2 border-primary text-foreground';
              }

              return (
                <motion.button
                  key={index}
                  whileHover={selectedAnswer === null ? { scale: 1.01 } : {}}
                  whileTap={selectedAnswer === null ? { scale: 0.99 } : {}}
                  onClick={() => handleSelectAnswer(index)}
                  disabled={selectedAnswer !== null}
                  className={`w-full p-4 rounded-lg text-left transition-all relative ${buttonClass}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 mt-1 flex items-center justify-center ${
                      showResult && isCorrectOption
                        ? 'bg-[#059669] border-[#059669]'
                        : showResult && isSelected && !isCorrect
                        ? 'bg-destructive border-destructive'
                        : isSelected
                        ? 'bg-primary border-primary'
                        : 'border-border'
                    }`}>
                      {showResult && isCorrectOption && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                      {showResult && isSelected && !isCorrect && (
                        <X className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <p className="flex-1 leading-relaxed pr-2">{option}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Feedback */}
          {selectedAnswer !== null && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className={`p-4 rounded-lg text-center ${
                isCorrect
                  ? 'bg-[#059669]/10 text-[#059669]'
                  : 'bg-destructive/10 text-destructive'
              }`}>
                {isCorrect ? (
                  <div className="flex items-center justify-center gap-2">
                    <Check className="w-5 h-5" />
                    <span className="font-medium">Correct!</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-2">
                    <X className="w-5 h-5" />
                    <span className="font-medium">Not quite right</span>
                  </div>
                )}
              </div>

              <Button
                onClick={handleContinue}
                size="lg"
                className="w-full"
              >
                Continue
              </Button>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
