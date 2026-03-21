/**
 * AnchorQuestionBuilderService Tests
 * Demonstrates strategy pattern and testability improvements
 */

import type { ReferenceVerse } from '../anchorTrainingTypes';
import {
  buildReferenceChoiceQuestion,
  buildBookChoiceQuestion,
  buildIncipitChoiceQuestion,
  CONFIG,
} from './AnchorQuestionBuilderService';

// Mock random generator for deterministic tests
function mockRandomInt(values: number[]) {
  let index = 0;
  return (max: number) => {
    const value = values[index % values.length];
    index++;
    return Math.min(value, max - 1);
  };
}

// Test data helpers
function createTestVerse(overrides?: Partial<ReferenceVerse>): ReferenceVerse {
  return {
    externalVerseId: 'John_3:16',
    text: 'Ибо так возлюбил Бог мир',
    reference: 'Иоанна 3:16',
    status: 'LEARNING',
    difficultyLevel: 1,
    masteryLevel: 50,
    repetitions: 5,
    bookName: 'Иоанна',
    chapterVerse: '3:16',
    incipit: 'Ибо так возлюбил',
    incipitWords: ['Ибо', 'так', 'возлюбил'],
    ending: 'Мира',
    endingWords: ['Мира'],
    referenceScore: 75,
    incipitScore: 60,
    contextScore: 40,
    contextPromptText: 'Предыдущий стих: "Так как судил..."',
    contextPromptReference: 'Иоанна 3:15',
    ...overrides,
  };
}

describe('AnchorQuestionBuilderService', () => {
  describe('buildReferenceChoiceQuestion', () => {
    it('builds question with 4 options', () => {
      const verse = createTestVerse();
      const pool = [
        verse,
        createTestVerse({ externalVerseId: 'John_3:17', reference: 'Иоанна 3:17' }),
        createTestVerse({ externalVerseId: 'Rom_3:16', reference: 'Римлянам 3:16' }),
        createTestVerse({ externalVerseId: 'Mat_3:16', reference: 'Матфея 3:16' }),
        createTestVerse({ externalVerseId: 'Mar_3:16', reference: 'Марка 3:16' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildReferenceChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).not.toBeNull();
      expect(question?.interaction).toBe('choice');
      expect(question?.modeId).toBe('reference-choice');
      expect(question?.track).toBe('reference');
      expect(question?.options).toHaveLength(4);
      expect(question?.options).toContain('Иоанна 3:16');
    });

    it('returns null if pool is too small', () => {
      const verse = createTestVerse();
      const pool = [verse]; // Only 1 verse, need at least 4

      const randomInt = mockRandomInt([0]);
      const question = buildReferenceChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).toBeNull();
    });

    it('validates correct option', () => {
      const verse = createTestVerse();
      const pool = [
        verse,
        createTestVerse({ externalVerseId: 'John_3:17', reference: 'Иоанна 3:17' }),
        createTestVerse({ externalVerseId: 'Rom_3:16', reference: 'Римлянам 3:16' }),
        createTestVerse({ externalVerseId: 'Mat_3:16', reference: 'Матфея 3:16' }),
        createTestVerse({ externalVerseId: 'Mar_3:16', reference: 'Марка 3:16' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildReferenceChoiceQuestion(verse, pool, 1, randomInt);

      expect(question?.isCorrectOption('Иоанна 3:16')).toBe(true);
      expect(question?.isCorrectOption('Римлянам 3:16')).toBe(false);
    });
  });

  describe('buildBookChoiceQuestion', () => {
    it('builds question with book name options', () => {
      const verse = createTestVerse();
      const pool = [
        verse,
        createTestVerse({ bookName: 'Римлянам' }),
        createTestVerse({ bookName: 'Матфея' }),
        createTestVerse({ bookName: 'Марка' }),
        createTestVerse({ bookName: 'Лука' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildBookChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).not.toBeNull();
      expect(question?.modeId).toBe('book-choice');
      expect(question?.options).toHaveLength(4);
      expect(question?.options).toContain('Иоанна');
    });

    it('returns null if insufficient distractors', () => {
      const verse = createTestVerse();
      const pool = [verse]; // Only 1 book

      const randomInt = mockRandomInt([0]);
      const question = buildBookChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).toBeNull();
    });

    it('validates correct book name', () => {
      const verse = createTestVerse();
      const pool = [
        verse,
        createTestVerse({ bookName: 'Римлянам' }),
        createTestVerse({ bookName: 'Матфея' }),
        createTestVerse({ bookName: 'Марка' }),
        createTestVerse({ bookName: 'Лука' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildBookChoiceQuestion(verse, pool, 1, randomInt);

      expect(question?.isCorrectOption('Иоанна')).toBe(true);
      expect(question?.isCorrectOption('ИОАННА')).toBe(true); // Case insensitive
      expect(question?.isCorrectOption('Римлянам')).toBe(false);
    });
  });

  describe('buildIncipitChoiceQuestion', () => {
    it('builds question with incipit options', () => {
      const verse = createTestVerse({
        incipitWords: ['Ибо', 'так', 'возлюбил'],
      });
      const pool = [
        verse,
        createTestVerse({ incipit: 'Что касается' }),
        createTestVerse({ incipit: 'Для того' }),
        createTestVerse({ incipit: 'Потому что' }),
        createTestVerse({ incipit: 'Однако' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildIncipitChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).not.toBeNull();
      expect(question?.modeId).toBe('incipit-choice');
      expect(question?.options).toHaveLength(4);
    });

    it('returns null if verse has less than 2 words', () => {
      const verse = createTestVerse({
        incipitWords: ['Ибо'],
        incipit: 'Ибо',
      });
      const pool = [verse];

      const randomInt = mockRandomInt([0]);
      const question = buildIncipitChoiceQuestion(verse, pool, 1, randomInt);

      expect(question).toBeNull();
    });

    it('filters out empty incipits from pool', () => {
      const verse = createTestVerse();
      const pool = [
        verse,
        createTestVerse({ incipit: '', incipitWords: [] }),
        createTestVerse({ incipit: 'Что касается' }),
        createTestVerse({ incipit: 'Для того' }),
        createTestVerse({ incipit: 'Потому что' }),
      ];

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildIncipitChoiceQuestion(verse, pool, 1, randomInt);

      // Should successfully build question despite empty incipit
      expect(question).not.toBeNull();
      expect(question?.options.every((opt) => opt.trim().length > 0)).toBe(true);
    });
  });

  describe('Configuration', () => {
    it('exports configurable constants', () => {
      expect(CONFIG.REFERENCE_OPTIONS_COUNT).toBe(4);
      expect(CONFIG.INCIPIT_OPTIONS_COUNT).toBe(4);
      expect(CONFIG.MAX_TYPING_ATTEMPTS).toBe(2);
      expect(CONFIG.TYPE_INPUT_SIMILARITY_THRESHOLD).toBe(0.8);
    });

    it('constants can be used by question builders', () => {
      const verse = createTestVerse();
      const pool = Array.from({ length: CONFIG.REFERENCE_OPTIONS_COUNT + 2 }, (_, i) =>
        createTestVerse({
          externalVerseId: `John_3:${i}`,
          reference: `Иоанна 3:${i}`,
        })
      );

      const randomInt = mockRandomInt([0, 1, 2, 3]);
      const question = buildReferenceChoiceQuestion(verse, pool, 1, randomInt);

      expect(question?.options).toHaveLength(CONFIG.REFERENCE_OPTIONS_COUNT);
    });
  });
});
