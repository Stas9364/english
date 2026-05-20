import { useMemo } from "react";
import { getEffectiveGapCount } from "@/lib/question-block-utils";
import type { QuestionWithOptions } from "@/lib/supabase";

interface SelectGapsScore {
  correct: number;
  total: number;
}

export function useSelectGapsScore(
  questions: QuestionWithOptions[],
  selected: Record<string, string[]>
): SelectGapsScore {
  return useMemo(() => {
    let correct = 0;
    let total = 0;

    questions.forEach((question) => {
      const gapCount = getEffectiveGapCount(question.question_title);
      total += gapCount;

      const selectedByGap = selected[question.id] ?? [];
      const optionById = new Map((question.options ?? []).map((option) => [option.id, option]));

      for (let gapIndex = 0; gapIndex < gapCount; gapIndex += 1) {
        const selectedOptionId = selectedByGap[gapIndex];
        if (!selectedOptionId) continue;
        if (optionById.get(selectedOptionId)?.is_correct === true) {
          correct += 1;
        }
      }
    });

    return { correct, total };
  }, [questions, selected]);
}
