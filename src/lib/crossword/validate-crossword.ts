import { buildCrosswordGrid, getEntryCells, numberCrosswordEntries } from "./grid";
import {
  CROSSWORD_MAX_SIZE,
  CROSSWORD_MIN_WORDS,
  type CrosswordLayout,
  type CrosswordPlacedEntry,
  type CrosswordValidationResult,
} from "./types";

type CellInfo = {
  letter: string;
  directions: Set<CrosswordPlacedEntry["direction"]>;
};

function cellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

function nextCell(
  entry: Pick<CrosswordPlacedEntry, "direction" | "row" | "col">,
  offset: number
) {
  return {
    row: entry.direction === "down" ? entry.row + offset : entry.row,
    col: entry.direction === "across" ? entry.col + offset : entry.col,
  };
}

function validateEntryInputs(
  entries: CrosswordPlacedEntry[],
  enforceMinWords: boolean
): { ok: true } | { ok: false; error: string } {
  if (enforceMinWords && entries.length < CROSSWORD_MIN_WORDS) {
    return { ok: false, error: `Crossword requires at least ${CROSSWORD_MIN_WORDS} words` };
  }

  const seen = new Set<string>();
  for (const [index, entry] of entries.entries()) {
    if (!/^[A-Z]+$/.test(entry.answer)) {
      return { ok: false, error: `Word ${index + 1} can contain only English letters` };
    }
    if (!entry.clue.trim()) {
      return { ok: false, error: `Clue ${index + 1} is required` };
    }
    if (seen.has(entry.answer)) {
      return { ok: false, error: `Duplicate word: ${entry.answer}` };
    }
    seen.add(entry.answer);
  }

  return { ok: true };
}

function normalizeEntriesWithPadding(entries: CrosswordPlacedEntry[]) {
  const cells = entries.flatMap(getEntryCells);
  const minRow = Math.min(...cells.map((cell) => cell.row));
  const minCol = Math.min(...cells.map((cell) => cell.col));
  const rowOffset = 1 - minRow;
  const colOffset = 1 - minCol;

  return entries.map((entry) => ({
    ...entry,
    row: entry.row + rowOffset,
    col: entry.col + colOffset,
  }));
}

export function validateCrosswordLayout(
  entries: CrosswordPlacedEntry[],
  options: { enforceMinWords?: boolean } = {}
): CrosswordValidationResult {
  const inputValidation = validateEntryInputs(entries, options.enforceMinWords ?? true);
  if (!inputValidation.ok) return inputValidation;

  const conflictCells = new Set<string>();
  const grid = new Map<string, CellInfo>();

  for (const entry of entries) {
    if (entry.row < 0 || entry.col < 0) {
      return { ok: false, error: "Words cannot be outside the grid" };
    }

    const before = nextCell(entry, -1);
    const after = nextCell(entry, entry.answer.length);
    if (grid.has(cellKey(before.row, before.col)) || grid.has(cellKey(after.row, after.col))) {
      conflictCells.add(cellKey(entry.row, entry.col));
    }

    for (const cell of getEntryCells(entry)) {
      const key = cellKey(cell.row, cell.col);
      const existing = grid.get(key);
      if (existing) {
        if (existing.letter !== cell.letter || existing.directions.has(entry.direction)) {
          conflictCells.add(key);
        }
        existing.directions.add(entry.direction);
        continue;
      }

      const perpendicularBefore =
        entry.direction === "across"
          ? cellKey(cell.row - 1, cell.col)
          : cellKey(cell.row, cell.col - 1);
      const perpendicularAfter =
        entry.direction === "across"
          ? cellKey(cell.row + 1, cell.col)
          : cellKey(cell.row, cell.col + 1);

      if (grid.has(perpendicularBefore) || grid.has(perpendicularAfter)) {
        conflictCells.add(key);
      }

      grid.set(key, { letter: cell.letter, directions: new Set([entry.direction]) });
    }
  }

  if (conflictCells.size > 0) {
    return { ok: false, error: "Crossword layout has conflicts", conflictCells };
  }

  const normalizedEntries = normalizeEntriesWithPadding(entries);
  const allCells = normalizedEntries.flatMap(getEntryCells);
  const maxRow = Math.max(...allCells.map((cell) => cell.row));
  const maxCol = Math.max(...allCells.map((cell) => cell.col));
  const width = maxCol + 2;
  const height = maxRow + 2;

  if (width > CROSSWORD_MAX_SIZE || height > CROSSWORD_MAX_SIZE) {
    return { ok: false, error: `Crossword must fit into ${CROSSWORD_MAX_SIZE}x${CROSSWORD_MAX_SIZE}` };
  }

  const numbered = numberCrosswordEntries(normalizedEntries);
  const layout: CrosswordLayout = {
    width,
    height,
    entries: numbered,
    grid: buildCrosswordGrid(numbered, width, height),
  };

  return { ok: true, layout };
}
