"use client";

import { useEffect, useMemo, useState, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import type { CrosswordQuiz } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { readCrosswordProgress, removeCrosswordProgress, writeCrosswordProgress } from "@/lib/crossword";
import {
  getCrosswordCellKey,
  getCrosswordEntryCells,
  useCrosswordCellNavigation,
} from "@/hooks/use-crossword-cell-navigation";

export function CrosswordPlayer({
  quiz,
  storageKey,
}: {
  quiz: CrosswordQuiz;
  storageKey?: string;
}) {
  const progressKey = storageKey ?? quiz.id;
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => readCrosswordProgress(progressKey)?.answers ?? {}
  );
  const [checked, setChecked] = useState(false);
  const [incorrectCells, setIncorrectCells] = useState<Set<string>>(new Set());
  const {
    focusEntryStart,
    focusNextCellInActiveEntry,
    handleArrowKeyInActiveEntry,
    backspaceInActiveEntry,
    focusCell,
    handleCellFocus,
    registerInput,
  } = useCrosswordCellNavigation(quiz.crossword.entries);

  const expectedLetters = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of quiz.crossword.entries) {
      for (const cell of getCrosswordEntryCells(entry)) {
        map.set(getCrosswordCellKey(cell.row, cell.col), cell.letter);
      }
    }
    return map;
  }, [quiz.crossword.entries]);

  const across = quiz.crossword.entries
    .filter((entry) => entry.direction === "across")
    .sort((a, b) => a.number - b.number);
  const down = quiz.crossword.entries
    .filter((entry) => entry.direction === "down")
    .sort((a, b) => a.number - b.number);

  useEffect(() => {
    if (checked) return;
    writeCrosswordProgress(progressKey, answers);
  }, [answers, checked, progressKey]);

  function clearCheckState() {
    setChecked(false);
    setIncorrectCells(new Set());
  }

  function updateCell(key: string, value: string) {
    const nextValue = value.replace(/[^a-zA-Z]/g, "").slice(-1).toUpperCase();
    clearCheckState();
    setAnswers((prev) => ({ ...prev, [key]: nextValue }));
    if (nextValue) {
      focusNextCellInActiveEntry(key);
    }
  }

  function handleKeyDown(key: string, event: KeyboardEvent<HTMLInputElement>) {
    if (handleArrowKeyInActiveEntry(key, event.key)) {
      event.preventDefault();
      return;
    }

    if (event.key !== "Backspace") return;

    event.preventDefault();
    clearCheckState();

    const { keysToClear, focusKey } = backspaceInActiveEntry(key, answers);
    if (keysToClear.length === 0) return;

    setAnswers((prev) => {
      const next = { ...prev };
      for (const cellKey of keysToClear) {
        delete next[cellKey];
      }
      return next;
    });

    if (focusKey) {
      queueMicrotask(() => focusCell(focusKey));
    }
  }

  function checkResult() {
    const nextIncorrect = new Set<string>();
    for (const [key, expected] of expectedLetters.entries()) {
      if ((answers[key] ?? "").toUpperCase() !== expected) {
        nextIncorrect.add(key);
      }
    }
    setIncorrectCells(nextIncorrect);
    setChecked(true);
    removeCrosswordProgress(progressKey);
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="overflow-auto">
        <div
          className="grid w-max"
          style={{
            gridTemplateColumns: `repeat(${quiz.crossword.width}, minmax(2rem, 2.5rem))`,
          }}
        >
          {quiz.crossword.grid.cells.flatMap((row, rowIndex) =>
            row.map((cell, colIndex) => {
              const key = getCrosswordCellKey(rowIndex, colIndex);
              const isActive = Boolean(cell.letter);
              const isIncorrect = checked && incorrectCells.has(key);
              const isCorrect = checked && isActive && !isIncorrect;

              return (
                <div
                  key={key}
                  className={cn(
                    "relative flex aspect-square items-center justify-center border border-border",
                    isActive ? "bg-background" : "bg-muted/40",
                    isCorrect && "border-green-600 bg-green-50 dark:bg-green-950/30",
                    isIncorrect && "border-red-600 bg-red-50 dark:bg-red-950/30"
                  )}
                >
                  {cell.number ? (
                    <span className="absolute left-1 top-0.5 text-[10px] leading-none text-muted-foreground">
                      {cell.number}
                    </span>
                  ) : null}
                  {isActive ? (
                    <input
                      ref={(node) => registerInput(key, node)}
                      aria-label={`Cell ${rowIndex + 1}, ${colIndex + 1}`}
                      value={answers[key] ?? ""}
                      onFocus={() => handleCellFocus(key)}
                      onKeyDown={(event) => handleKeyDown(key, event)}
                      onChange={(event) => updateCell(key, event.target.value)}
                      className="size-full bg-transparent text-center text-sm font-semibold uppercase outline-none"
                      maxLength={1}
                    />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <ClueList title="Across" entries={across} onEntrySelect={focusEntryStart} />
        <ClueList title="Down" entries={down} onEntrySelect={focusEntryStart} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" onClick={checkResult}>
          Check result
        </Button>
        {checked ? (
          <span className="text-sm text-muted-foreground">
            {incorrectCells.size === 0 ? "All answers are correct." : "Incorrect cells are highlighted."}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function ClueList({
  title,
  entries,
  onEntrySelect,
}: {
  title: string;
  entries: CrosswordQuiz["crossword"]["entries"];
  onEntrySelect: (entry: CrosswordQuiz["crossword"]["entries"][number]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <h2 className="font-semibold">{title}</h2>
      <ol className="flex flex-col gap-2">
        {entries.map((entry) => (
          <li key={entry.id} className="text-sm">
            <button
              type="button"
              onClick={() => onEntrySelect(entry)}
              className="cursor-pointer text-left hover:text-primary hover:underline"
            >
              <span className="font-medium">{entry.number}. </span>
              {entry.clue}
            </button>
          </li>
        ))}
      </ol>
    </div>
  );
}
