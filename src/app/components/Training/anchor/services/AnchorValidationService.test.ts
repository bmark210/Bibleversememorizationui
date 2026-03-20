/**
 * AnchorValidationService Tests
 * Demonstrates improved testability with service extraction
 */

import {
  normalizeBookName,
  softenBookName,
  normalizeIncipitText,
  extractWordTokens,
  parseReferenceParts,
  matchesReferenceWithTolerance,
  matchesIncipitWithTolerance,
} from './AnchorValidationService';

describe('AnchorValidationService', () => {
  describe('normalizeBookName', () => {
    it('converts Cyrillic uppercase to lowercase', () => {
      expect(normalizeBookName('ИОАННА')).toBe('иоанна');
    });

    it('replaces ё with е', () => {
      expect(normalizeBookName('ЁВАННА')).toBe('еванна');
    });

    it('removes special characters', () => {
      expect(normalizeBookName('Иоанна I')).toBe('иоанна');
    });

    it('handles mixed case', () => {
      expect(normalizeBookName('Иоанна 3')).toBe('иоанна');
    });
  });

  describe('softenBookName', () => {
    it('removes "ко" prefix', () => {
      expect(softenBookName('колосянам')).toBe('лосянам');
    });

    it('removes "к" prefix', () => {
      expect(softenBookName('кол')).toBe('ол');
    });

    it('removes "от" prefix', () => {
      expect(softenBookName('откровение')).toBe('кровение');
    });

    it('preserves word without prefixes', () => {
      expect(softenBookName('иоанна')).toBe('иоанна');
    });
  });

  describe('normalizeIncipitText', () => {
    it('normalizes Cyrillic and removes punctuation', () => {
      expect(normalizeIncipitText('Ибо так возлюбил Бог мир')).toBe(
        'ибо так возлюбил бог мир'
      );
    });

    it('collapses whitespace', () => {
      expect(normalizeIncipitText('Ибо  так   возлюбил')).toBe(
        'ибо так возлюбил'
      );
    });

    it('removes punctuation', () => {
      expect(normalizeIncipitText('Ибо, так возлюбил!')).toBe(
        'ибо так возлюбил'
      );
    });

    it('trims leading/trailing whitespace', () => {
      expect(normalizeIncipitText('  Ибо так  ')).toBe('ибо так');
    });
  });

  describe('extractWordTokens', () => {
    it('extracts word tokens with Unicode support', () => {
      expect(extractWordTokens('Ибо так возлюбил')).toEqual([
        'Ибо',
        'так',
        'возлюбил',
      ]);
    });

    it('handles words with hyphens', () => {
      expect(extractWordTokens('что-то')).toEqual(['что-то']);
    });

    it('handles words with apostrophes', () => {
      expect(extractWordTokens("что'то")).toEqual(["что'то"]);
    });

    it('filters out empty tokens', () => {
      expect(extractWordTokens('')).toEqual([]);
    });
  });

  describe('parseReferenceParts', () => {
    it('parses valid reference', () => {
      const result = parseReferenceParts('Иоанна 3:16');
      expect(result).toEqual({
        bookName: 'Иоанна',
        chapterVerse: '3:16',
      });
    });

    it('handles reference ranges', () => {
      const result = parseReferenceParts('Иоанна 3:16-17');
      expect(result).toEqual({
        bookName: 'Иоанна',
        chapterVerse: '3:16-17',
      });
    });

    it('returns null for invalid reference', () => {
      expect(parseReferenceParts('invalid')).toBeNull();
    });

    it('handles non-breaking spaces', () => {
      const result = parseReferenceParts('Иоанна\u00A03:16');
      expect(result).toEqual({
        bookName: 'Иоанна',
        chapterVerse: '3:16',
      });
    });
  });

  describe('matchesReferenceWithTolerance', () => {
    it('matches identical references', () => {
      expect(
        matchesReferenceWithTolerance('Иоанна 3:16', 'Иоанна 3:16')
      ).toBe(true);
    });

    it('matches with case differences', () => {
      expect(
        matchesReferenceWithTolerance('ИОАННА 3:16', 'Иоанна 3:16')
      ).toBe(true);
    });

    it('tolerates minor book name differences', () => {
      expect(
        matchesReferenceWithTolerance('Иван 3:16', 'Иоанна 3:16')
      ).toBe(true);
    });

    it('rejects different chapter/verse', () => {
      expect(
        matchesReferenceWithTolerance('Иоанна 3:17', 'Иоанна 3:16')
      ).toBe(false);
    });
  });

  describe('matchesIncipitWithTolerance', () => {
    it('matches identical incipit', () => {
      expect(
        matchesIncipitWithTolerance('Ибо так возлюбил', 'Ибо так возлюбил')
      ).toBe(true);
    });

    it('ignores case', () => {
      expect(
        matchesIncipitWithTolerance('ибо так возлюбил', 'Ибо так возлюбил')
      ).toBe(true);
    });

    it('ignores punctuation', () => {
      expect(
        matchesIncipitWithTolerance(
          'Ибо, так возлюбил',
          'Ибо так возлюбил'
        )
      ).toBe(true);
    });

    it('collapses whitespace differences', () => {
      expect(
        matchesIncipitWithTolerance('Ибо  так  возлюбил', 'Ибо так возлюбил')
      ).toBe(true);
    });
  });
});
