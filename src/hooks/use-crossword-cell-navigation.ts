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

  const entriesById = useMemo(() => new Map(entries.map((entry) => [entry.id, entry])), [entries]);

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

  function moveCursorInActiveEntry(key: string, delta: -1 | 1): boolean {
    const entryId = selectEntryForCell(key);
    if (!entryId) return false;

    setActiveEntryId(entryId);
    const keys = entryCellKeys.get(entryId) ?? [];
    const nextIndex = keys.indexOf(key) + delta;
    if (nextIndex < 0 || nextIndex >= keys.length) return true;

    const nextKey = keys[nextIndex];
    if (nextKey) inputRefs.current.get(nextKey)?.focus();
    return true;
  }

  function focusNextCellInActiveEntry(key: string) {
    moveCursorInActiveEntry(key, 1);
  }

  /** Arrow keys along active word: Left/Right for across, Up/Down for down. */
  function handleArrowKeyInActiveEntry(cellKey: string, keyName: string): boolean {
    const entryId = selectEntryForCell(cellKey);
    if (!entryId) return false;

    const entry = entriesById.get(entryId);
    if (!entry) return false;

    let delta: -1 | 1 | null = null;
    if (entry.direction === "across") {
      if (keyName === "ArrowLeft") delta = -1;
      else if (keyName === "ArrowRight") delta = 1;
    } else {
      if (keyName === "ArrowUp") delta = -1;
      else if (keyName === "ArrowDown") delta = 1;
    }

    if (delta === null) return false;
    return moveCursorInActiveEntry(cellKey, delta);
  }

  function focusCell(focusKey: string) {
    inputRefs.current.get(focusKey)?.focus();
  }

  /** Backspace: clear letter and move focus toward word start within active entry. */
  function backspaceInActiveEntry(key: string, answers: Record<string, string>) {
    const entryId = selectEntryForCell(key);
    if (!entryId) return { keysToClear: [] as string[], focusKey: null as string | null };

    setActiveEntryId(entryId);
    const keys = entryCellKeys.get(entryId) ?? [];
    const index = keys.indexOf(key);
    if (index < 0) return { keysToClear: [], focusKey: null };

    const hasLetter = Boolean((answers[key] ?? "").trim());
    if (hasLetter) {
      return {
        keysToClear: [key],
        focusKey: index > 0 ? keys[index - 1]! : key,
      };
    }

    if (index > 0) {
      const prevKey = keys[index - 1]!;
      return { keysToClear: [prevKey], focusKey: prevKey };
    }

    return { keysToClear: [], focusKey: null };
  }

  return {
    focusEntryStart,
    focusNextCellInActiveEntry,
    handleArrowKeyInActiveEntry,
    backspaceInActiveEntry,
    focusCell,
    handleCellFocus,
    registerInput,
  };
}
