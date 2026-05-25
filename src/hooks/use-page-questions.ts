"use client";

import type { PageBlockFormValues } from "@/components/page-block/page-block";
import { useCallback } from "react";
import { useFieldArray, type UseFormReturn } from "react-hook-form";

function scrollQuestionCardIntoView(pageIndex: number, questionIndex: number) {
  document
    .querySelector<HTMLElement>(`[data-question-card-id="question-card-${pageIndex}-${questionIndex}"]`)
    ?.scrollIntoView({ behavior: "smooth", block: "center" });
}

/** Scroll after React commits the moved field array (double rAF). */
function scheduleScrollQuestionCardIntoView(pageIndex: number, questionIndex: number) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollQuestionCardIntoView(pageIndex, questionIndex);
    });
  });
}

interface UsePageQuestionsParams {
  form: UseFormReturn<PageBlockFormValues>;
  pageIndex: number;
  onConfirmDeleteQuestion?: (pageIndex: number, qIndex: number) => Promise<boolean>;
}

export function usePageQuestions({ form, pageIndex, onConfirmDeleteQuestion }: UsePageQuestionsParams) {
  const questionsArray = useFieldArray({
    control: form.control,
    name: `pages.${pageIndex}.questions`,
  });

  const handleMoveQuestion = useCallback(
    (qIndex: number, dir: -1 | 1) => {
      const next = qIndex + dir;
      if (next < 0 || next >= questionsArray.fields.length) return;
      questionsArray.move(qIndex, next);
      scheduleScrollQuestionCardIntoView(pageIndex, next);
    },
    [questionsArray, pageIndex]
  );

  const handleRemoveQuestion = useCallback(
    async (qIndex: number) => {
      const ok = onConfirmDeleteQuestion ? await onConfirmDeleteQuestion(pageIndex, qIndex) : true;
      if (ok) questionsArray.remove(qIndex);
      return ok;
    },
    [onConfirmDeleteQuestion, pageIndex, questionsArray]
  );

  return {
    questionsArray,
    handleMoveQuestion,
    handleRemoveQuestion,
  };
}
