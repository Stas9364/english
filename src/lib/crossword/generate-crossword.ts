import { getEntryCells } from "./grid";
import { normalizeCrosswordWords } from "./normalize";
import { validateCrosswordLayout } from "./validate-crossword";
import {
  CROSSWORD_MAX_SIZE,
  type CrosswordLayout,
  type CrosswordPlacedEntry,
  type CrosswordWordInput,
} from "./types";

type DraftEntry = Omit<CrosswordPlacedEntry, "number" | "order_index">;

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function shiftToOrigin(entries: DraftEntry[]): DraftEntry[] {
  const cells = entries.flatMap(getEntryCells);
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));

  return entries.map((entry) => ({
    ...entry,
    row: entry.row - minRow,
    col: entry.col - minCol,
  }));
}

function getPlacedLetters(entries: DraftEntry[]) {
  return entries.flatMap((entry) =>
    getEntryCells(entry).map((cell, index) => ({
      ...cell,
      entry,
      index,
    }))
  );
}

function countIntersections(candidate: DraftEntry, placed: DraftEntry[]): number {
  const placedLetters = new Map(getPlacedLetters(placed).map((cell) => [`${cell.row}:${cell.col}`, cell.letter]));
  return getEntryCells(candidate).filter((cell) => placedLetters.get(`${cell.row}:${cell.col}`) === cell.letter).length;
}

function scoreLayout(layout: CrosswordLayout, candidate: DraftEntry, placed: DraftEntry[]): number {
  const area = layout.width * layout.height;
  const intersections = countIntersections(candidate, placed);
  const centerRow = layout.height / 2;
  const centerCol = layout.width / 2;
  const distanceFromCenter = Math.abs(candidate.row - centerRow) + Math.abs(candidate.col - centerCol);

  return intersections * 100 - area - distanceFromCenter;
}

function findBestCandidate(word: DraftEntry, placed: DraftEntry[]) {
  const candidates: Array<{ entries: DraftEntry[]; layout: CrosswordLayout; score: number }> = [];

  for (const placedCell of shuffle(getPlacedLetters(placed))) {
    for (const [letterIndex, letter] of Array.from(word.answer).entries()) {
      if (letter !== placedCell.letter) continue;

      const direction = placedCell.entry.direction === "across" ? "down" : "across";
      const candidate: DraftEntry = {
        ...word,
        direction,
        row: direction === "down" ? placedCell.row - letterIndex : placedCell.row,
        col: direction === "across" ? placedCell.col - letterIndex : placedCell.col,
      };
      const shifted = shiftToOrigin([...placed, candidate]);
      const shiftedCandidate = shifted[shifted.length - 1];
      const validation = validateCrosswordLayout(
        shifted.map((entry) => ({ ...entry, number: 1, order_index: 0 })),
        { enforceMinWords: false }
      );

      if (!validation.ok) continue;
      if (validation.layout.width > CROSSWORD_MAX_SIZE || validation.layout.height > CROSSWORD_MAX_SIZE) continue;

      candidates.push({
        entries: shifted,
        layout: validation.layout,
        score: scoreLayout(validation.layout, shiftedCandidate, shifted.slice(0, -1)),
      });
    }
  }

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  return shuffle(candidates.slice(0, 3))[0];
}

export function generateCrossword(
  inputWords: CrosswordWordInput[]
): { ok: true; layout: CrosswordLayout } | { ok: false; error: string } {
  const normalized = normalizeCrosswordWords(inputWords);
  if (!normalized.ok) return normalized;

  const sortedWords = normalized.words.sort((a, b) => b.answer.length - a.answer.length);

  for (let attempt = 0; attempt < 40; attempt++) {
    const [first, ...rest] = shuffle(sortedWords.slice(0, 2)).concat(sortedWords.slice(2));
    let placed: DraftEntry[] = [
      {
        answer: first.answer,
        clue: first.clue,
        direction: Math.random() > 0.5 ? "across" : "down",
        row: 0,
        col: 0,
      },
    ];

    let failed = false;
    for (const word of rest) {
      const best = findBestCandidate(
        {
          answer: word.answer,
          clue: word.clue,
          direction: "across",
          row: 0,
          col: 0,
        },
        placed
      );

      if (!best) {
        failed = true;
        break;
      }

      placed = best.entries;
    }

    if (failed) continue;

    const validation = validateCrosswordLayout(
      placed.map((entry) => ({ ...entry, number: 1, order_index: 0 }))
    );
    if (validation.ok) return { ok: true, layout: validation.layout };
  }

  return {
    ok: false,
    error: "Failed to generate a valid crossword. Change the words or try generating again.",
  };
}
