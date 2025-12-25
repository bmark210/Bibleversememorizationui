import { useState } from 'react';
import { Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'motion/react';
import { Verse } from '../../data/mockData';

interface FirstLettersModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

export function FirstLettersMode({ verse, onRate }: FirstLettersModeProps) {
  const [isRevealed, setIsRevealed] = useState(false);

  const getFirstLetters = () => {
    return verse.text
      .split(/\s+/)
      .map(word => word.charAt(0))
      .join(' ');
  };

  const getFirstLettersStyled = () => {
    const words = verse.text.split(/\s+/);
    return words.map((word, index) => {
      const firstLetter = word.charAt(0);
      const punctuation = word.match(/[^\w]+$/)?.[0] || '';
      
      return (
        <span key={index} className="inline-block mx-1">
          <span className="font-mono font-medium">{firstLetter}</span>
          <span className="text-muted-foreground">{punctuation}</span>
        </span>
      );
    });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-card rounded-xl p-8 sm:p-12 shadow-sm border border-border"
      >
        <div className="text-center space-y-8">
          {/* Reference */}
          <div>
            <h2 className="text-primary mb-2">{verse.reference}</h2>
            <div className="text-sm text-muted-foreground">{verse.translation}</div>
            <p className="text-sm text-muted-foreground mt-2">
              Вспомните стих, используя первые буквы
            </p>
          </div>

          {/* First Letters Display */}
          <div className="min-h-[240px] flex items-center justify-center">
            <AnimatePresence mode="wait">
              {!isRevealed ? (
                <motion.div
                  key="letters"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="space-y-6"
                >
                  <div className="bg-muted/30 rounded-lg p-8">
                    <p className="text-2xl leading-loose tracking-wider">
                      {getFirstLettersStyled()}
                    </p>
                  </div>
                  
                  <Button
                    onClick={() => setIsRevealed(true)}
                    variant="outline"
                    size="lg"
                    className="gap-2"
                  >
                    <Eye className="w-4 h-4" />
                    Показать ответ
                  </Button>
                </motion.div>
              ) : (
                <motion.div
                  key="verse"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="space-y-4"
                >
                  <div className="bg-accent/30 rounded-lg p-6">
                    <p className="text-lg leading-relaxed">{verse.text}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Rating Buttons */}
          <AnimatePresence>
            {isRevealed && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="space-y-3 pt-4"
              >
                <p className="text-sm text-muted-foreground mb-4">Насколько хорошо вы его знали?</p>
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
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
