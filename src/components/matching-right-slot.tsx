"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import type { QuestionWithOptions, Option } from "@/lib/supabase";
import { cn } from "@/lib/utils";

function DraggableOption({
  option,
  disabled,
  as: Tag = "li",
  inSlot,
}: {
  option: Option;
  disabled: boolean;
  as?: "li" | "div";
  inSlot?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: option.id,
    disabled,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <Tag
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "min-w-0 transition-opacity",
        inSlot
          ? "flex-1 rounded border-0 bg-transparent p-0 shadow-none"
          : "rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs",
        isDragging && "opacity-50 z-10",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      <span className="block truncate break-words">{option.option_text}</span>
    </Tag>
  );
}

export function MatchingRightSlot({
  question,
  selectedOptionId,
  optionById,
  checked,
  disabled,
  rowClass,
}: {
  question: QuestionWithOptions;
  selectedOptionId?: string;
  optionById: Map<string, Option>;
  checked: boolean;
  disabled: boolean;
  rowClass: string;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: question.id });
  const selectedOpt = selectedOptionId ? optionById.get(selectedOptionId) : null;
  const isCorrect = selectedOpt ? (question.options ?? []).find((o) => o.id === selectedOptionId)?.is_correct === true : null;

  return (
    <li
      ref={setNodeRef}
      className={cn(
        rowClass,
        "transition-[background-color,border-color] duration-300",
        isOver && "border-primary bg-primary/10",
        checked && isCorrect === true && "animate-quiz-result-reveal border-green-600 bg-green-50 dark:bg-green-950/30",
        checked && isCorrect === false && "animate-quiz-result-reveal border-red-600 bg-red-50 dark:bg-red-950/30",
        !selectedOpt && "border-dashed"
      )}
    >
      {selectedOpt ? (
        <span className="inline-flex min-w-0 flex-1 items-center gap-2">
          <DraggableOption option={selectedOpt} disabled={disabled} as="div" inSlot />
          {checked && isCorrect !== null && (
            <span className={cn("shrink-0 text-sm", isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
              {isCorrect ? " ✓" : " ✗"}
            </span>
          )}
        </span>
      ) : (
        <span className="text-muted-foreground">Drag answer here</span>
      )}
    </li>
  );
}
