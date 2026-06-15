import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";
import type { TestType } from "@/lib/supabase";

type CreateQuizPageValue = CreateQuizFormValues["pages"][number];
type CreateQuizQuestionValue = CreateQuizPageValue["questions"][number];
type CreateQuizOptionValue = CreateQuizQuestionValue["options"][number];

export function defaultOption(gapIndex?: number): CreateQuizOptionValue {
  return {
    option_text: "",
    is_correct: false,
    gap_index: gapIndex ?? 0,
  };
}

export function defaultQuestion(orderIndex: number, pageType?: TestType): CreateQuizQuestionValue {
  const options =
    pageType === "matching"
      ? [{ option_text: "", is_correct: true, gap_index: 0 }]
      : [defaultOption()];
  return {
    question_title: "",
    question_image_url: "",
    explanation: "",
    order_index: orderIndex,
    options,
  };
}

export function defaultPage(pageIndex: number, forcedType: TestType = "single"): CreateQuizPageValue {
  return {
    type: forcedType,
    title: "",
    example: "",
    crossword_quiz_id: null,
    order_index: pageIndex,
    questions: [defaultQuestion(0, forcedType)],
  };
}
