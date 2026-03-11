"use client";

import { useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import type { QuestionWithOptions } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MatchingRightSlot } from "@/components/matching-right-slot";

export function MatchingBlock({
  questions,
  selected,
  checked,
  onMatch,
}: {
  questions: QuestionWithOptions[];
  selected: Record<string, string[]>;
  checked: boolean;
  onMatch: (questionId: string, optionId: string) => void;
}) {
  const allOptions = useMemo(
    () => questions.flatMap((q) => q.options ?? []),
    [questions]
  );
  const optionById = useMemo(
    () => new Map(allOptions.map((o) => [o.id, o])),
    [allOptions]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id && typeof over.id === "string" && typeof active.id === "string") {
      onMatch(over.id, active.id);
    }
  }

  const rowClass =
    "flex min-h-11 min-w-0 items-center rounded-lg border border-input bg-card px-3 py-2.5 text-sm shadow-xs";

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Question</Label>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => (
              <li key={q.id} className={cn(rowClass, "font-medium")}>
                <span className="break-words">{q.question_title}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">Answers — drag to reorder</Label>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => (
              <MatchingRightSlot
                key={q.id}
                question={q}
                selectedOptionId={selected[q.id]?.[0]}
                optionById={optionById}
                checked={checked}
                disabled={checked}
                rowClass={rowClass}
              />
            ))}
          </ul>
        </div>
      </div>
      {checked &&
        questions.some((q) => (q.explanation ?? "").trim()) && (
          <div className="mt-6 space-y-4">
            {questions
              .filter((q) => (q.explanation ?? "").trim())
              .map((q) => (
                <Alert key={q.id} variant="default" className="mt-4">
                  <AlertTitle>{q.question_title}</AlertTitle>
                  <AlertDescription>{q.explanation}</AlertDescription>
                </Alert>
              ))}
          </div>
        )}
    </DndContext>
  );
}
