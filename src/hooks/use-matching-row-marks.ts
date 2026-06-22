"use client";

import { useCallback, useState } from "react";

export const matchingMarkedRowClassName = "border-primary/30 bg-primary/10";

function findQuestionIdByOptionId(
  selected: Record<string, string[]>,
  optionId: string
): string | undefined {
  return Object.entries(selected).find(([, optionIds]) => optionIds[0] === optionId)?.[0];
}

export function useMatchingRowMarks(selected: Record<string, string[]>) {
  const [markedQuestionIds, setMarkedQuestionIds] = useState<Set<string>>(() => new Set());

  const isMarked = useCallback(
    (questionId: string) => markedQuestionIds.has(questionId),
    [markedQuestionIds]
  );

  const toggleMark = useCallback((questionId: string) => {
    setMarkedQuestionIds((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  }, []);

  const clearMark = useCallback((questionId: string) => {
    setMarkedQuestionIds((prev) => {
      if (!prev.has(questionId)) {
        return prev;
      }
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  }, []);

  const handleDragStart = useCallback(
    (optionId: string) => {
      const questionId = findQuestionIdByOptionId(selected, optionId);
      if (questionId) {
        clearMark(questionId);
      }
    },
    [selected, clearMark]
  );

  const handleDragEnd = useCallback(
    (targetQuestionId: string | null) => {
      if (targetQuestionId) {
        clearMark(targetQuestionId);
      }
    },
    [clearMark]
  );

  return {
    isMarked,
    toggleMark,
    handleDragStart,
    handleDragEnd,
  };
}
