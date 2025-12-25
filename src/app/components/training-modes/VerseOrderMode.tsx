import { useState, useEffect } from 'react';
import { GripVertical, Check, X } from 'lucide-react';
import { Button } from '../ui/button';
import { motion } from 'motion/react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { Verse } from '../../data/mockData';

interface VerseOrderModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

interface DraggableLineProps {
  line: string;
  index: number;
  moveLine: (fromIndex: number, toIndex: number) => void;
  isChecked: boolean;
  isCorrect: boolean;
}

const DraggableLine = ({ line, index, moveLine, isChecked, isCorrect }: DraggableLineProps) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'line',
    item: { index },
    canDrag: !isChecked,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'line',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveLine(item.index, index);
        item.index = index;
      }
    },
  });

  let cardClass = 'bg-card border-2 border-border';
  if (isChecked) {
    cardClass = isCorrect
      ? 'bg-[#059669]/10 border-[#059669]'
      : 'bg-destructive/10 border-destructive';
  }

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`${cardClass} rounded-lg p-4 cursor-move transition-all ${
        isDragging ? 'opacity-50' : 'opacity-100'
      } ${!isChecked ? 'hover:shadow-md' : ''}`}
    >
      <div className="flex items-center gap-3">
        {!isChecked && (
          <GripVertical className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
        {isChecked && (
          <div className="w-5 h-5 flex-shrink-0">
            {isCorrect ? (
              <Check className="w-5 h-5 text-[#059669]" />
            ) : (
              <X className="w-5 h-5 text-destructive" />
            )}
          </div>
        )}
        <p className="flex-1">{line}</p>
      </div>
    </div>
  );
};

function VerseOrderModeContent({ verse, onRate }: VerseOrderModeProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [correctOrder, setCorrectOrder] = useState<string[]>([]);
  const [isChecked, setIsChecked] = useState(false);

  useEffect(() => {
    // Split verse into phrases/lines
    const phrases = verse.text
      .split(/[.;,]/)
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    setCorrectOrder([...phrases]);
    
    // Shuffle for initial state
    const shuffled = [...phrases].sort(() => Math.random() - 0.5);
    setLines(shuffled);
  }, [verse]);

  const moveLine = (fromIndex: number, toIndex: number) => {
    const newLines = [...lines];
    const [movedLine] = newLines.splice(fromIndex, 1);
    newLines.splice(toIndex, 0, movedLine);
    setLines(newLines);
  };

  const handleCheck = () => {
    setIsChecked(true);
  };

  const isCorrect = (index: number) => {
    return lines[index] === correctOrder[index];
  };

  const allCorrect = lines.every((line, index) => line === correctOrder[index]);

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
              Drag to arrange the phrases in the correct order
            </p>
          </div>

          {/* Draggable Lines */}
          <div className="space-y-3">
            {lines.map((line, index) => (
              <DraggableLine
                key={`${line}-${index}`}
                line={line}
                index={index}
                moveLine={moveLine}
                isChecked={isChecked}
                isCorrect={isCorrect(index)}
              />
            ))}
          </div>

          {/* Success Message */}
          {isChecked && allCorrect && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-[#059669]/10 border-2 border-[#059669] rounded-lg p-4 text-center"
            >
              <div className="flex items-center justify-center gap-2 text-[#059669]">
                <Check className="w-5 h-5" />
                <span className="font-medium">Perfect! Correct order!</span>
              </div>
            </motion.div>
          )}

          {/* Correct Answer Display */}
          {isChecked && !allCorrect && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted/50 rounded-lg p-4"
            >
              <div className="text-sm text-muted-foreground mb-2">Correct order:</div>
              <p className="leading-relaxed">{verse.text}</p>
            </motion.div>
          )}

          {/* Action Buttons */}
          {!isChecked ? (
            <Button
              onClick={handleCheck}
              size="lg"
              className="w-full"
            >
              Check Order
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

export function VerseOrderMode(props: VerseOrderModeProps) {
  return (
    <DndProvider backend={HTML5Backend}>
      <VerseOrderModeContent {...props} />
    </DndProvider>
  );
}
