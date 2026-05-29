"use client";

import { useMemo, useRef, useState } from "react";
import type { CrosswordQuiz } from "@/lib/supabase";

type CrosswordEntry = CrosswordQuiz["crossword"]["entries"][number];

export function getCrosswordCellKey(row: number, col: number): string {
  return `${row}:${col}`;
}

export function getCrosswordEntryCells(entry: CrosswordEntry) {
  return Array.from(entry.answer).map((letter, index) => ({
    letter,
    row: entry.direction === "down" ? entry.row + index : entry.row,
    col: entry.direction === "across" ? entry.col + index : entry.col,
  }));
}

export function useCrosswordCellNavigation(entries: CrosswordEntry[]) {
  const inputRefs = useRef(new Map<string, HTMLInputElement>());
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);

  const entryCellKeys = useMemo(
    () =>
      new Map(
        entries.map((entry) => [
          entry.id,
          getCrosswordEntryCells(entry).map((cell) => getCrosswordCellKey(cell.row, cell.col)),
        ])
      ),
    [entries]
  );

  const entriesByCellKey = useMemo(() => {
    const map = new Map<string, CrosswordEntry[]>();
    for (const entry of entries) {
      for (const cell of getCrosswordEntryCells(entry)) {
        const key = getCrosswordCellKey(cell.row, cell.col);
        map.set(key, [...(map.get(key) ?? []), entry]);
      }
    }
    return map;
  }, [entries]);

  function selectEntryForCell(key: string) {
    const cellEntries = entriesByCellKey.get(key) ?? [];
    const currentEntryKeys = activeEntryId ? entryCellKeys.get(activeEntryId) : null;
    if (currentEntryKeys?.includes(key)) return activeEntryId;

    return cellEntries[0]?.id ?? null;
  }

  function registerInput(key: string, node: HTMLInputElement | null) {
    if (node) {
      inputRefs.current.set(key, node);
    } else {
      inputRefs.current.delete(key);
    }
  }

  function focusEntryStart(entry: CrosswordEntry) {
    const keys = entryCellKeys.get(entry.id);
    setActiveEntryId(entry.id);
    if (keys?.[0]) inputRefs.current.get(keys[0])?.focus();
  }

  function handleCellFocus(key: string) {
    const nextEntryId = selectEntryForCell(key);
    if (nextEntryId) setActiveEntryId(nextEntryId);
  }

  function focusNextCellInActiveEntry(key: string) {
    const entryId = selectEntryForCell(key);
    if (!entryId) return;

    setActiveEntryId(entryId);
    const keys = entryCellKeys.get(entryId) ?? [];
    const nextKey = keys[keys.indexOf(key) + 1];
    if (nextKey) inputRefs.current.get(nextKey)?.focus();
  }

  return {
    focusEntryStart,
    focusNextCellInActiveEntry,
    handleCellFocus,
    registerInput,
  };
}
