import { describe, expect, it } from 'vitest';
import { calculateLineDiff } from '../calculateLineDiff';

describe('calculateLineDiff', () => {
  it('gère les textes vides', () => {
    const result = calculateLineDiff('', '');
    expect(result.isIdentical).toBe(true);
    expect(result.lines).toHaveLength(0);
    expect(result.additionsCount).toBe(0);
    expect(result.deletionsCount).toBe(0);
  });

  it('gère des textes identiques', () => {
    const text = 'Ligne 1\nLigne 2\nLigne 3';
    const result = calculateLineDiff(text, text);
    expect(result.isIdentical).toBe(true);
    expect(result.lines).toHaveLength(3);
    expect(result.additionsCount).toBe(0);
    expect(result.deletionsCount).toBe(0);
    expect(result.lines.every((l) => l.type === 'equal')).toBe(true);
    expect(result.lines[0]).toEqual({
      type: 'equal',
      originalLineNumber: 1,
      modifiedLineNumber: 1,
      content: 'Ligne 1',
    });
  });

  it('détecte les ajouts de lignes', () => {
    const original = 'Ligne 1\nLigne 3';
    const modified = 'Ligne 1\nLigne 2\nLigne 3';
    const result = calculateLineDiff(original, modified);
    expect(result.isIdentical).toBe(false);
    expect(result.additionsCount).toBe(1);
    expect(result.deletionsCount).toBe(0);
    expect(result.lines).toEqual([
      { type: 'equal', originalLineNumber: 1, modifiedLineNumber: 1, content: 'Ligne 1' },
      { type: 'add', originalLineNumber: null, modifiedLineNumber: 2, content: 'Ligne 2' },
      { type: 'equal', originalLineNumber: 2, modifiedLineNumber: 3, content: 'Ligne 3' },
    ]);
  });

  it('détecte les suppressions de lignes', () => {
    const original = 'Ligne 1\nLigne 2\nLigne 3';
    const modified = 'Ligne 1\nLigne 3';
    const result = calculateLineDiff(original, modified);
    expect(result.isIdentical).toBe(false);
    expect(result.additionsCount).toBe(0);
    expect(result.deletionsCount).toBe(1);
    expect(result.lines).toEqual([
      { type: 'equal', originalLineNumber: 1, modifiedLineNumber: 1, content: 'Ligne 1' },
      { type: 'delete', originalLineNumber: 2, modifiedLineNumber: null, content: 'Ligne 2' },
      { type: 'equal', originalLineNumber: 3, modifiedLineNumber: 2, content: 'Ligne 3' },
    ]);
  });

  it('détecte les modifications avec ajouts et suppressions mélangés', () => {
    const original = 'Alpha\nBeta\nGamma';
    const modified = 'Alpha\nBeta Prime\nDelta\nGamma';
    const result = calculateLineDiff(original, modified);
    expect(result.isIdentical).toBe(false);
    expect(result.deletionsCount).toBe(1);
    expect(result.additionsCount).toBe(2);
    expect(result.lines[0]).toEqual({
      type: 'equal',
      originalLineNumber: 1,
      modifiedLineNumber: 1,
      content: 'Alpha',
    });
    expect(result.lines[result.lines.length - 1]).toEqual({
      type: 'equal',
      originalLineNumber: 3,
      modifiedLineNumber: 4,
      content: 'Gamma',
    });
  });
});
