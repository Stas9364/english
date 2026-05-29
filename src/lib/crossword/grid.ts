import type { CrosswordGridCell, CrosswordGridSnapshot } from "@/lib/supabase";
import type { CrosswordPlacedEntry } from "./types";

export function getEntryCells(entry: Pick<CrosswordPlacedEntry, "answer" | "direction" | "row" | "col">) {
  return Array.from(entry.answer).map((letter, index) => ({
    letter,
    row: entry.direction === "down" ? entry.row + index : entry.row,
    col: entry.direction === "across" ? entry.col + index : entry.col,
  }));
}

export function buildCrosswordGrid(
  entries: CrosswordPlacedEntry[],
  width: number,
  height: number
): CrosswordGridSnapshot {
  const cells: CrosswordGridCell[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ({ letter: null as string | null }))
  );

  for (const entry of entries) {
    for (const cell of getEntryCells(entry)) {
      if (!cells[cell.row]?.[cell.col]) continue;
      cells[cell.row][cell.col].letter = cell.letter;
    }
    if (cells[entry.row]?.[entry.col]) {
      cells[entry.row][entry.col].number = entry.number;
    }
  }

  return { width, height, cells };
}

export function numberCrosswordEntries(entries: Omit<CrosswordPlacedEntry, "number" | "order_index">[]) {
  const startKeys = new Set(entries.map((entry) => `${entry.row}:${entry.col}`));
  const numberedStarts = Array.from(startKeys)
    .map((key) => {
      const [row, col] = key.split(":").map(Number);
      return { key, row, col };
    })
    .sort((a, b) => a.row - b.row || a.col - b.col);

  const numberByStart = new Map(numberedStarts.map((start, index) => [start.key, index + 1]));

  return entries
    .map((entry) => ({
      ...entry,
      number: numberByStart.get(`${entry.row}:${entry.col}`) ?? 1,
    }))
    .sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction))
    .map((entry, orderIndex) => ({ ...entry, order_index: orderIndex }));
}
