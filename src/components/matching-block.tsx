"use client";

import { useMemo } from "react";
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent, type DragStartEvent } from "@dnd-kit/core";
import type { QuestionWithOptions } from "@/lib/supabase";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { sanitizeQuestionTitleHtml } from "@/lib/sanitize-question-title-html";
import { cn } from "@/lib/utils";
import { useMediaQuery } from "@/hooks/use-media-query";
import { matchingMarkedRowClassName, useMatchingRowMarks } from "@/hooks/use-matching-row-marks";
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
  const questionsWithCorrectAnswers = useMemo(
    () =>
      questions
        .map((question) => ({
          question,
          correctOptions: (question.options ?? []).filter((option) => option.is_correct),
        }))
        .filter(({ correctOptions }) => correctOptions.length > 0),
    [questions]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  const cellClass =
    "flex min-h-11 min-w-0 items-center rounded-lg border border-input bg-card px-3 py-2.5 text-sm shadow-xs";

  const questionContentClassName =
    "wrap-break-word [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_p]:inline [&_h1]:m-0 [&_h1]:inline [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:inline [&_h2]:text-inherit";

  const isSmUp = useMediaQuery("(min-width: 640px)");
  const { isMarked, toggleMark, handleDragStart, handleDragEnd } = useMatchingRowMarks(selected);

  function onDragStart(event: DragStartEvent) {
    if (typeof event.active.id === "string") {
      handleDragStart(event.active.id);
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const targetQuestionId = over && typeof over.id === "string" ? over.id : null;
    handleDragEnd(targetQuestionId);

    if (over && active.id && typeof over.id === "string" && typeof active.id === "string") {
      onMatch(over.id, active.id);
    }
  }

  function handleQuestionMarkToggle(questionId: string) {
    if (checked) {
      return;
    }
    toggleMark(questionId);
  }

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      {isSmUp ? (
        <div className="min-w-0 space-y-2">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <Label className="text-muted-foreground text-xs uppercase tracking-wide">Question</Label>
              {!checked && (
                <p className="mt-1 text-xs font-normal tracking-normal text-muted-foreground normal-case">
                  Click a question to mark pairs you&apos;ve decided on.
                </p>
              )}
            </div>
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Answers — drag to reorder</Label>
          </div>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => {
              const marked = isMarked(q.id);

              return (
              <li
                key={q.id}
                className="grid min-w-0 gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
              >
                <div
                  role="button"
                  tabIndex={checked ? undefined : 0}
                  className={cn(
                    cellClass,
                    "font-medium transition-[background-color,border-color] duration-300",
                    !checked && "cursor-pointer select-none",
                    marked && matchingMarkedRowClassName
                  )}
                  onClick={() => handleQuestionMarkToggle(q.id)}
                >
                  <span
                    className={questionContentClassName}
                    dangerouslySetInnerHTML={{ __html: sanitizeQuestionTitleHtml(q.question_title ?? "") }}
                  />
                </div>
                <MatchingRightSlot
                  question={q}
                  selectedOptionId={selected[q.id]?.[0]}
                  optionById={optionById}
                  checked={checked}
                  disabled={checked}
                  rowClass={cellClass}
                  highlighted={marked}
                />
              </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="grid gap-4">
          <div className="min-w-0 space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Question</Label>
            <ul className="flex flex-col gap-2">
              {questions.map((q) => (
                <li key={q.id} className={cn(cellClass, "font-medium")}>
                  <span
                    className={questionContentClassName}
                    dangerouslySetInnerHTML={{ __html: sanitizeQuestionTitleHtml(q.question_title ?? "") }}
                  />
                </li>
              ))}
            </ul>
          </div>
          <div className="min-w-0 space-y-2">
            <Label className="text-muted-foreground text-xs uppercase tracking-wide">Answers — drag to reorder</Label>
            <ul className="flex flex-col gap-2">
              {questions.map((q) => (
                <MatchingRightSlot
                  key={q.id}
                  as="li"
                  question={q}
                  selectedOptionId={selected[q.id]?.[0]}
                  optionById={optionById}
                  checked={checked}
                  disabled={checked}
                  rowClass={cellClass}
                />
              ))}
            </ul>
          </div>
        </div>
      )}
      {checked && questionsWithCorrectAnswers.length > 0 && (
        <div className="mt-6 rounded-lg border bg-muted/30 p-4 text-sm">
          <h3 className="font-medium">Correct answers</h3>
          <ul className="mt-3 space-y-3">
            {questionsWithCorrectAnswers.map(({ question, correctOptions }) => (
              <li key={question.id} className="grid gap-1 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] sm:gap-4">
                <span
                  className="wrap-break-word font-medium [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_p]:inline [&_h1]:m-0 [&_h1]:inline [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:inline [&_h2]:text-inherit"
                  dangerouslySetInnerHTML={{ __html: sanitizeQuestionTitleHtml(question.question_title ?? "") }}
                />
                <span className="text-muted-foreground">
                  {correctOptions.map((option) => option.option_text).join(" / ")}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {checked &&
        questions.some((q) => (q.explanation ?? "").trim()) && (
          <div className="mt-6 space-y-4">
            {questions
              .filter((q) => (q.explanation ?? "").trim())
              .map((q) => (
                <Alert key={q.id} variant="default" className="mt-4">
                  <AlertTitle>
                    <span
                      className="wrap-break-word [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_p]:inline [&_h1]:m-0 [&_h1]:inline [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:inline [&_h2]:text-inherit"
                      dangerouslySetInnerHTML={{ __html: sanitizeQuestionTitleHtml(q.question_title ?? "") }}
                    />
                  </AlertTitle>
                  <AlertDescription>{q.explanation}</AlertDescription>
                </Alert>
              ))}
          </div>
        )}
    </DndContext>
  );
}
