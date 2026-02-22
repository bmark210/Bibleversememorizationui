'use client'

import React, { useState, useEffect } from 'react';
import { Lightbulb, Check } from 'lucide-react';
import { Button } from '../../ui/button';
import { Textarea } from '../../ui/textarea';
import { motion } from 'motion/react';
import { Verse } from '../../../data/mockData';

interface TypingModeProps {
  verse: Verse;
  onRate: (rating: 0 | 1 | 2 | 3) => void;
}

export function ModeFullRecallExercise({ verse, onRate }: TypingModeProps) {
  const [userInput, setUserInput] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [isChecked, setIsChecked] = useState(false);

  const normalizeText = (text: string) => {
    return text.toLowerCase().replace(/[^\w\s]/g, '').trim();
  };

  const calculateAccuracy = () => {
    const normalized = normalizeText(userInput);
    const target = normalizeText(verse.text);
    
    if (normalized === target) return 100;
    
    const words = target.split(/\s+/);
    const userWords = normalized.split(/\s+/);
    const correctWords = words.filter((word, idx) => userWords[idx] === word).length;
    
    return Math.round((correctWords / words.length) * 100);
  };

  const getHighlightedText = () => {
    if (!isChecked) return null;

    const targetWords = verse.text.split(/\s+/);
    const userWords = userInput.split(/\s+/);
    
    return targetWords.map((word, idx) => {
      const userWord = normalizeText(userWords[idx] || '');
      const targetWord = normalizeText(word);
      const isCorrect = userWord === targetWord;
      
      return (
        <span
          key={idx}
          className={
            userWords[idx]
              ? isCorrect
                ? 'text-[#059669]'
                : 'text-destructive'
              : 'text-muted-foreground'
          }
        >
          {word}{' '}
        </span>
      );
    });
  };

  const handleCheck = () => {
    setIsChecked(true);
  };

  const accuracy = isChecked ? calculateAccuracy() : 0;

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
          </div>

          {/* Input Area */}
          <div className="space-y-3">
            <label className="text-sm text-muted-foreground">Напечатайте стих по памяти:</label>
            <Textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Начните печатать..."
              rows={6}
              className="resize-none text-base"
              disabled={isChecked}
            />
          </div>

          {/* Hint Button */}
          {!isChecked && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHint(!showHint)}
                className="gap-2 text-muted-foreground"
              >
                <Lightbulb className="w-4 h-4" />
                {showHint ? 'Скрыть подсказку' : 'Показать подсказку'}
              </Button>
            </div>
          )}

          {/* Hint */}
          {showHint && !isChecked && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-accent/50 rounded-lg p-4 text-sm text-muted-foreground"
            >
              Первые слова: {verse.text.split(' ').slice(0, 5).join(' ')}...
            </motion.div>
          )}

          {/* Comparison */}
          {isChecked && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="text-sm text-muted-foreground mb-2">Правильный стих:</div>
                <p className="leading-relaxed">{getHighlightedText()}</p>
              </div>

              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent rounded-lg">
                  <Check className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">Точность: {accuracy}%</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Action Buttons */}
          {!isChecked ? (
            <Button
              onClick={handleCheck}
              size="lg"
              className="w-full"
              disabled={userInput.trim().length === 0}
            >
              Проверить ответ
            </Button>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-3"
            >
              <p className="text-sm text-muted-foreground text-center">Оцените своё запоминание:</p>
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
                  Норм
                </Button>
                <Button
                  onClick={() => onRate(3)}
                  className="bg-[#059669] hover:bg-[#047857] text-white"
                  size="lg"
                >
                  Отлично
                </Button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
