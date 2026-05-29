import { CROSSWORD_MIN_WORDS, type CrosswordWordInput } from "./types";

export type NormalizedCrosswordWord = {
  answer: string;
  clue: string;
};

export function normalizeCrosswordAnswer(value: string): string {
  return value.trim().toUpperCase();
}

export function normalizeCrosswordWords(
  words: CrosswordWordInput[]
): { ok: true; words: NormalizedCrosswordWord[] } | { ok: false; error: string } {
  const normalized = words
    .map((word) => ({
      answer: normalizeCrosswordAnswer(word.answer),
      clue: word.clue.trim(),
    }))
    .filter((word) => word.answer || word.clue);

  if (normalized.length < CROSSWORD_MIN_WORDS) {
    return { ok: false, error: `Crossword requires at least ${CROSSWORD_MIN_WORDS} words` };
  }

  const seen = new Set<string>();
  for (const [index, word] of normalized.entries()) {
    if (!word.answer) return { ok: false, error: `Word ${index + 1} is required` };
    if (!/^[A-Z]+$/.test(word.answer)) {
      return { ok: false, error: `Word ${index + 1} can contain only English letters` };
    }
    if (!word.clue) return { ok: false, error: `Clue ${index + 1} is required` };
    if (seen.has(word.answer)) return { ok: false, error: `Duplicate word: ${word.answer}` };
    seen.add(word.answer);
  }

  return { ok: true, words: normalized };
}
