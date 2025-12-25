import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { motion } from 'motion/react';
import { Verse } from '../../data/mockData';

interface FillBlanksModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface BlankWord {
  word: string;
  isBlank: boolean;
  index: number;
}

export function FillBlanksMode({ verse, onRate }: FillBlanksModeProps) {
  const [blankWords, setBlankWords] = useState<BlankWord[]>([]);
  const [userAnswers, setUserAnswers] = useState<{ [key: number]: string }>({});
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    generateBlanks();
  }, [verse]);

  const generateBlanks = () => {
    const words = verse.text.split(/\s+/);
    const numBlanks = Math.max(3, Math.floor(words.length * 0.25)); // 25% of words
    
    // Select random indices to blank out
    const indices = new Set<number>();
    while (indices.size < numBlanks) {
      const randomIndex = Math.floor(Math.random() * words.length);
      // Avoid blanking very short words (articles, etc.)
      if (words[randomIndex].length > 3) {
        indices.add(randomIndex);
      }
    }

    const blanks: BlankWord[] = words.map((word, index) => ({
      word: word.replace(/[^\w]/g, ''), // Remove punctuation for comparison
      isBlank: indices.has(index),
      index,
    }));

    setBlankWords(blanks);
    
    // Initialize user answers
    const answers: { [key: number]: string } = {};
    blanks.forEach((blank) => {
      if (blank.isBlank) {
        answers[blank.index] = '';
      }
    });
    setUserAnswers(answers);
  };

  const handleAnswerChange = (index: number, value: string) => {
    setUserAnswers({
      ...userAnswers,
      [index]: value,
    });
  };

  const checkAnswer = (index: number): boolean => {
    const userAnswer = userAnswers[index]?.toLowerCase().trim();
    const correctAnswer = blankWords[index].word.toLowerCase();
    return userAnswer === correctAnswer;
  };

  const handleCheck = () => {
    setIsChecked(true);
  };

  const calculateScore = () => {
    const totalBlanks = blankWords.filter(w => w.isBlank).length;
    const correctBlanks = blankWords
      .filter(w => w.isBlank)
      .filter(w => checkAnswer(w.index))
      .length;
    return Math.round((correctBlanks / totalBlanks) * 100);
  };

  const allFilled = Object.values(userAnswers).every(answer => answer.trim().length > 0);
  const score = isChecked ? calculateScore() : 0;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-8 sm:p-12 shadow-sm border border-border"
      >
        <div className="space-y-6">
          {/* Reference */}
          <div className="text-center">
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Fill in the missing words
            </p>
          </div>

          {/* Verse with Blanks */}
          <div className="bg-muted/30 rounded-lg p-6">
            <div className="leading-relaxed flex flex-wrap gap-2 items-baseline justify-center">
              {verse.text.split(/\s+/).map((originalWord, index) => {
                const blankWord = blankWords.find(b => b.index === index);
                
                if (!blankWord || !blankWord.isBlank) {
                  return (
                    <span key={index} className="inline-block">
                      {originalWord}
                    </span>
                  );
                }

                const isCorrect = isChecked ? checkAnswer(index) : null;
                
                return (
                  <span key={index} className="inline-block relative">
                    <Input
                      value={userAnswers[index] || ''}
                      onChange={(e) => handleAnswerChange(index, e.target.value)}
                      disabled={isChecked}
                      className={`inline-block w-32 h-9 text-center px-2 ${
                        isChecked
                          ? isCorrect
                            ? 'bg-[#059669]/10 border-[#059669] text-[#059669]'
                            : 'bg-destructive/10 border-destructive text-destructive'
                          : ''
                      }`}
                      placeholder="___"
                    />
                    {isChecked && !isCorrect && (
                      <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-[#059669] whitespace-nowrap">
                        {blankWord.word}
                      </div>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Score Display */}
          {isChecked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Score: {score}%</span>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {!isChecked ? (
            <Button
              onClick={handleCheck}
              size="lg"
              className="w-full"
              disabled={!allFilled}
            >
              Check Answers
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground text-center">Rate your recall:</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Button
                  onClick={() => onRate(0)}
                  className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
                  size="lg"
                >
                  Forgot
                </Button>
                <Button
                  onClick={() => onRate(1)}
                  className="bg-orange-500 hover:bg-orange-600 text-white"
                  size="lg"
                >
                  Hard
                </Button>
                <Button
                  onClick={() => onRate(2)}
                  className="bg-blue-500 hover:bg-blue-600 text-white"
                  size="lg"
                >
                  Good
                </Button>
                <Button
                  onClick={() => onRate(3)}
                  className="bg-[#059669] hover:bg-[#047857] text-white"
                  size="lg"
                >
                  Easy
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
