import type { TheoryBlockInput, UpdateQuizInput } from "@/app/admin/actions";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

interface BuildEditQuizUpdatePayloadParams {
  quizId: string;
  data: EditQuizFormValues;
  videoUrl: string;
  theoryBlocks: TheoryBlockInput[];
}

export function buildEditQuizUpdatePayload({
  quizId,
  data,
  videoUrl,
  theoryBlocks,
}: BuildEditQuizUpdatePayloadParams): UpdateQuizInput {
  return {
    quizId,
    topic_id: data.topic_id,
    title: data.title,
    description: data.description,
    slug: data.slug,
    video_url: videoUrl || undefined,
    pages: data.pages.map((p, pi) => ({
      id: p.id,
      type: p.type,
      title: p.title || null,
      example: p.example || null,
      crossword_quiz_id: p.type === "crossword" ? p.crossword_quiz_id ?? null : null,
      order_index: pi,
      questions: p.type === "crossword"
        ? []
        : p.questions.map((q, qi) => ({
          id: q.id,
          question_title: q.question_title,
          question_image_url: q.question_image_url || null,
          explanation: q.explanation || null,
          order_index: qi,
          options:
            p.type === "input"
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({
                id: o.id,
                option_text: o.option_text.trim(),
                is_correct: true,
                gap_index: o.gap_index ?? 0,
              })) ?? [])
              : p.type === "select_gaps"
                ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({
                  id: o.id,
                  option_text: o.option_text.trim(),
                  is_correct: o.is_correct,
                  gap_index: o.gap_index ?? 0,
                })) ?? [])
                : q.options.map((o) => ({
                  id: o.id,
                  option_text: o.option_text,
                  is_correct: o.is_correct,
                })),
        })),
    })),
    theoryBlocks: theoryBlocks.map((b, i) => ({ ...b, order_index: i })),
  };
}
