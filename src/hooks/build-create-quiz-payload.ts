import type { CreateQuizInput, TheoryBlockInput } from "@/app/admin/actions";
import type { Chapter } from "@/lib/chapters";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";

interface BuildCreateQuizPayloadParams {
  chapter: Chapter;
  data: CreateQuizFormValues;
  videoUrl: string;
  theoryBlocks: TheoryBlockInput[];
}

function slugify(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9_-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || "quiz";
}

export function buildCreateQuizPayload({
  chapter,
  data,
  videoUrl,
  theoryBlocks,
}: BuildCreateQuizPayloadParams): CreateQuizInput {
  return {
    chapter,
    topic_id: data.topic_id,
    title: data.title,
    description: data.description,
    slug: slugify(data.title),
    video_url: videoUrl || undefined,
    pages: data.pages.map((p, pi) => ({
      type: p.type,
      title: p.title || null,
      example: p.example || null,
      crossword_quiz_id: p.type === "crossword" ? p.crossword_quiz_id ?? null : null,
      order_index: pi,
      questions: p.type === "crossword"
        ? []
        : p.questions.map((q, qi) => ({
          question_title: q.question_title,
          question_image_url: q.question_image_url || null,
          explanation: q.explanation || null,
          order_index: qi,
          options:
            p.type === "input"
              ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({
                option_text: o.option_text.trim(),
                is_correct: true,
                gap_index: o.gap_index ?? 0,
              })) ?? [])
              : p.type === "select_gaps"
                ? (q.options?.filter((o) => (o.option_text ?? "").trim()).map((o) => ({
                  option_text: o.option_text.trim(),
                  is_correct: o.is_correct,
                  gap_index: o.gap_index ?? 0,
                })) ?? [])
                : q.options,
        })),
    })),
    theoryBlocks: theoryBlocks.map((b, i) => ({
      type: b.type,
      content: b.content,
      order_index: i,
    })),
  };
}
