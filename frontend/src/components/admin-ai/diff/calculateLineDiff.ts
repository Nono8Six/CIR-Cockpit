export type DiffLineType = 'equal' | 'add' | 'delete';

export type DiffLine = {
  type: DiffLineType;
  originalLineNumber: number | null;
  modifiedLineNumber: number | null;
  content: string;
};

export type LineDiffResult = {
  lines: DiffLine[];
  additionsCount: number;
  deletionsCount: number;
  isIdentical: boolean;
};

/**
 * Calcule la différence ligne par ligne entre deux textes (version originale et version modifiée).
 *
 * @param original - Texte de base (ex: prompt publié).
 * @param modified - Texte cible (ex: brouillon).
 * @returns Le résultat détaillé contenant les lignes de diff, le décompte d'ajouts et de suppressions.
 */
export const calculateLineDiff = (original: string, modified: string): LineDiffResult => {
  if (original === modified) {
    if (original.length === 0) {
      return {
        lines: [],
        additionsCount: 0,
        deletionsCount: 0,
        isIdentical: true,
      };
    }
    const lines = original.split('\n').map<DiffLine>((content, index) => ({
      type: 'equal',
      originalLineNumber: index + 1,
      modifiedLineNumber: index + 1,
      content,
    }));
    return {
      lines,
      additionsCount: 0,
      deletionsCount: 0,
      isIdentical: true,
    };
  }

  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  const n = originalLines.length;
  const m = modifiedLines.length;

  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));

  for (let i = 0; i < n; i++) {
    for (let j = 0; j < m; j++) {
      if (originalLines[i] === modifiedLines[j]) {
        dp[i + 1][j + 1] = dp[i][j] + 1;
      } else {
        dp[i + 1][j + 1] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  type RawDiff = {
    type: DiffLineType;
    content: string;
  };

  const rawDiff: RawDiff[] = [];
  let i = n;
  let j = m;

  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && originalLines[i - 1] === modifiedLines[j - 1]) {
      rawDiff.push({
        type: 'equal',
        content: originalLines[i - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      rawDiff.push({
        type: 'add',
        content: modifiedLines[j - 1],
      });
      j--;
    } else if (i > 0 && (j === 0 || dp[i - 1][j] > dp[i][j - 1])) {
      rawDiff.push({
        type: 'delete',
        content: originalLines[i - 1],
      });
      i--;
    }
  }

  rawDiff.reverse();

  let origNum = 1;
  let modNum = 1;
  let additionsCount = 0;
  let deletionsCount = 0;

  const lines: DiffLine[] = rawDiff.map((item) => {
    if (item.type === 'equal') {
      const line: DiffLine = {
        type: 'equal',
        originalLineNumber: origNum,
        modifiedLineNumber: modNum,
        content: item.content,
      };
      origNum++;
      modNum++;
      return line;
    }
    if (item.type === 'add') {
      additionsCount++;
      const line: DiffLine = {
        type: 'add',
        originalLineNumber: null,
        modifiedLineNumber: modNum,
        content: item.content,
      };
      modNum++;
      return line;
    }
    deletionsCount++;
    const line: DiffLine = {
      type: 'delete',
      originalLineNumber: origNum,
      modifiedLineNumber: null,
      content: item.content,
    };
    origNum++;
    return line;
  });

  return {
    lines,
    additionsCount,
    deletionsCount,
    isIdentical: additionsCount === 0 && deletionsCount === 0,
  };
};
