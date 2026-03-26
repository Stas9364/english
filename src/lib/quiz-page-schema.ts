"use client";

import { z } from "zod";

export const quizOptionSchema = z.object({
  option_text: z.string(),
  is_correct: z.boolean(),
  gap_index: z.number().optional(),
});

export const quizQuestionSchema = z.object({
  question_title: z.string().min(1, "Required"),
  explanation: z.string(),
  order_index: z.number(),
  options: z.array(quizOptionSchema),
});

export const quizPageBaseObject = z.object({
  type: z.enum(["single", "multiple", "input", "select_gaps", "matching"]),
  title: z.string().optional(),
  example: z.string().optional(),
  order_index: z.number(),
  questions: z.array(quizQuestionSchema).min(1, "At least one question"),
});

type PageLike = {
  type: string;
  questions: Array<{
    question_title?: string;
    options?: Array<{ gap_index?: number; option_text?: string; is_correct?: boolean }>;
  }>;
};

export function withQuizPageRefine<T extends z.ZodType<PageLike>>(schema: T): T {
  return schema.superRefine((p: PageLike, ctx) => {
    if (p.type === "input") {
      for (let i = 0; i < p.questions.length; i++) {
        const q = p.questions[i];
        const gapCount = Math.max(1, Math.max(0, ((q.question_title ?? "").split("[[]]").length - 1)));
        const missingGaps: number[] = [];
        for (let g = 0; g < gapCount; g++) {
          const hasAnswer = (q.options ?? []).some(
            (o) => (o.gap_index ?? 0) === g && (o.option_text ?? "").trim()
          );
          if (!hasAnswer) missingGaps.push(g + 1);
        }
        if (missingGaps.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              gapCount > 1
                ? `Add at least one correct answer for gap${missingGaps.length > 1 ? "s" : ""} ${missingGaps.join(", ")}`
                : "Add at least one correct answer",
            path: ["questions", i, "root"],
          });
        }
      }
    } else if (p.type === "select_gaps") {
      for (let i = 0; i < p.questions.length; i++) {
        const q = p.questions[i];
        const gapCount = Math.max(1, Math.max(0, ((q.question_title ?? "").split("[[]]").length - 1)));
        const missingGaps: number[] = [];
        const missingCorrect: number[] = [];
        for (let g = 0; g < gapCount; g++) {
          const optsAtGap = (q.options ?? []).filter(
            (o) => (o.gap_index ?? 0) === g && (o.option_text ?? "").trim()
          );
          if (optsAtGap.length === 0) missingGaps.push(g + 1);
          else if (!optsAtGap.some((o) => o.is_correct)) missingCorrect.push(g + 1);
        }
        if (missingGaps.length > 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              gapCount > 1
                ? `Add at least one answer for gap${missingGaps.length > 1 ? "s" : ""} ${missingGaps.join(", ")}`
                : "Add at least one answer",
            path: ["questions", i, "root"],
          });
        }
        if (missingCorrect.length > 0 && missingGaps.length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message:
              gapCount > 1
                ? `Mark at least one correct answer for gap${missingCorrect.length > 1 ? "s" : ""} ${missingCorrect.join(", ")}`
                : "Mark at least one correct answer",
            path: ["questions", i, "root"],
          });
        }
      }
    } else if (p.type === "matching") {
      for (let i = 0; i < p.questions.length; i++) {
        const q = p.questions[i];
        const correctOpt = (q.options ?? []).find(
          (o) => o.is_correct && (o.option_text ?? "").trim()
        );
        if (!correctOpt) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Add a matching item (left column) for this row",
            path: ["questions", i, "root"],
          });
        }
      }
    } else {
      for (const q of p.questions) {
        if ((q.options ?? []).length === 0) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "At least one answer",
            path: ["questions"],
          });
          break;
        }
      }
    }
  }) as T;
}

const createPageSchema = withQuizPageRefine(quizPageBaseObject);

export const createQuizFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  pages: z.array(createPageSchema).min(1, "Add at least one page"),
});

export type CreateQuizFormValues = z.infer<typeof createQuizFormSchema>;

const editOptionSchema = quizOptionSchema.extend({
  id: z.string().uuid().optional(),
});

const editQuestionSchema = quizQuestionSchema.extend({
  id: z.string().uuid().optional(),
  options: z.array(editOptionSchema),
});

const editPageSchema = withQuizPageRefine(
  quizPageBaseObject.extend({
    id: z.string().uuid().optional(),
    questions: z.array(editQuestionSchema).min(1, "At least one question"),
  })
);

export const editQuizFormSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  slug: z.string().min(1, "Slug is required").regex(/^[a-z0-9_-]+$/i, "Slug: letters, numbers, - and _ only"),
  pages: z.array(editPageSchema).min(1, "Add at least one page"),
});

export type EditQuizFormValues = z.infer<typeof editQuizFormSchema>;
