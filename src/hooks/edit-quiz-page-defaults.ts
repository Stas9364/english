import type { EditQuizFormValues } from "@/lib/quiz-page-schema";
import type { TestType } from "@/lib/supabase";

type EditQuizPageValue = EditQuizFormValues["pages"][number];
type EditQuizQuestionValue = EditQuizPageValue["questions"][number];
type EditQuizOptionValue = EditQuizQuestionValue["options"][number];

interface DefaultOptionInput {
  id?: string;
  option_text: string;
  is_correct: boolean;
  gap_index?: number | null;
}

interface DefaultQuestionInput {
  id?: string;
  question_title: string;
  question_image_url?: string | null;
  explanation?: string | null;
  options: DefaultOptionInput[];
}

interface DefaultPageInput {
  id?: string;
  type: TestType;
  title?: string | null;
  example?: string | null;
  questions: {
    id?: string;
    question_title: string;
    question_image_url?: string | null;
    explanation?: string | null;
      options: DefaultOptionInput[];
  }[];
  crossword_quiz_id?: string | null;
}

export function defaultOption(option?: DefaultOptionInput, gapIndex?: number | null): EditQuizOptionValue {
  return {
    id: option?.id,
    option_text: option?.option_text ?? "",
    is_correct: option?.is_correct ?? false,
    gap_index: option?.gap_index ?? gapIndex ?? 0,
  };
}

function defaultQuestion(q?: DefaultQuestionInput, orderIndex?: number): EditQuizQuestionValue {
  return {
    id: q?.id,
    question_title: q?.question_title ?? "",
    question_image_url: q?.question_image_url ?? "",
    explanation: q?.explanation ?? "",
    order_index: orderIndex ?? 0,
    options: (q?.options?.length ? q.options : [{ option_text: "", is_correct: true, gap_index: 0 }]).map((o) =>
      defaultOption({
        id: o.id,
        option_text: o.option_text,
        is_correct: o.is_correct ?? true,
        gap_index: o.gap_index,
      }, o.gap_index)
    ),
  };
}

export function defaultQuestionForBlock(orderIndex: number) {
  return defaultQuestion(undefined, orderIndex);
}

export function defaultPage(
  p?: DefaultPageInput,
  pageIndex?: number,
  forcedType?: TestType
): EditQuizPageValue {
  const type = forcedType ?? p?.type ?? "single";
  return {
    id: p?.id,
    type,
    title: p?.title ?? "",
    example: p?.example ?? "",
    order_index: pageIndex ?? 0,
    crossword_quiz_id: p?.crossword_quiz_id ?? null,
    questions: (p?.questions?.length
      ? p.questions
      : [{ question_title: "", question_image_url: "", explanation: "", options: [defaultOption()] }]
    ).map((q, i) => defaultQuestion(q, i)),
  };
}
