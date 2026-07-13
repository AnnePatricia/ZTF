import { diffWords } from 'diff';

export interface DiffPart {
  value: string;
  added?: boolean;
  removed?: boolean;
  count?: number;
}

export interface DiffResult {
  wordDiff: DiffPart[];
  stats: {
    added: number;
    removed: number;
    changed: number;
  };
  error?: string;
}

export function useDiff() {
  const computeDiff = (oldText: any, newText: any): DiffResult => {
    try {
      // 🔑 Conversion sécurisée en string
      const oldStr = oldText == null ? '' : String(oldText).trim();
      const newStr = newText == null ? '' : String(newText).trim();

      // 🔑 Gestion du cas où les textes sont identiques
      if (oldStr === newStr) {
        return {
          wordDiff: [{ value: oldStr || 'Aucun contenu' }],
          stats: { added: 0, removed: 0, changed: 0 }
        };
      }

      const wordDiff = diffWords(oldStr, newStr);
      
      return {
        wordDiff,
        stats: {
          added: wordDiff.filter(part => part.added).reduce((sum, part) => sum + (part.count || 0), 0),
          removed: wordDiff.filter(part => part.removed).reduce((sum, part) => sum + (part.count || 0), 0),
          changed: wordDiff.length
        }
      };
    } catch (error) {
      console.error('❌ Erreur dans computeDiff:', error);
      return {
        wordDiff: [{ value: `Erreur: ${error instanceof Error ? error.message : 'Inconnue'}` }],
        stats: { added: 0, removed: 0, changed: 0 },
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  };

  return { computeDiff };
}