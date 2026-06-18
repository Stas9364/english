"use client";

import { useCallback, useState } from "react";
import type { UseFieldArrayReturn, UseFormReturn } from "react-hook-form";
import type { CreateQuizGenerationStatus } from "@/components/create-quiz-screen/create-quiz-details-section";
import {
  isGenerateCancelled,
  type GenerateQuizSuccess,
  type useQuizAiGeneration,
} from "@/hooks/use-quiz-ai-generation";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";

function isDefaultEmptyPage(page: CreateQuizFormValues["pages"][number] | undefined): boolean {
  if (!page) return false;
  if ((page.title ?? "").trim() !== "") return false;
  if ((page.example ?? "").trim() !== "") return false;
  if (!page.questions || page.questions.length !== 1) return false;
  const q = page.questions[0];
  if ((q.question_title ?? "").trim() !== "") return false;
  if ((q.explanation ?? "").trim() !== "") return false;
  if (q.question_image_url && q.question_image_url.trim() !== "") return false;
  if (!q.options || q.options.length === 0) return true;
  const hasAnyFilledOption = q.options.some((o) => (o.option_text ?? "").trim() !== "");
  if (hasAnyFilledOption) return false;
  return true;
}

function mapGeneratedPagesToForm(pages: GenerateQuizSuccess["pages"]) {
  return pages.map((p, pi) => ({
    type: p.type,
    title: p.title ?? "",
    example: "",
    order_index: pi,
    questions: (p.questions ?? []).map((q, qi) => ({
      question_title: q.question_title ?? "",
      question_image_url: "",
      explanation: (q.explanation ?? "")?.toString?.() ?? "",
      order_index: qi,
      options: (q.options ?? []).map((o) => ({
        option_text: o.option_text ?? "",
        is_correct: !!o.is_correct,
        ...(typeof o.gap_index === "number" ? { gap_index: o.gap_index } : {}),
      })),
    })),
  })) satisfies CreateQuizFormValues["pages"];
}

interface UseCreateQuizGenerateParams {
  ai: ReturnType<typeof useQuizAiGeneration>;
  form: UseFormReturn<CreateQuizFormValues>;
  pagesArray: UseFieldArrayReturn<CreateQuizFormValues, "pages", "id">;
  setActivePageIndex: (index: number) => void;
}

export function useCreateQuizGenerate({
  ai,
  form,
  pagesArray,
  setActivePageIndex,
}: UseCreateQuizGenerateParams) {
  const [genStatus, setGenStatus] = useState<CreateQuizGenerationStatus>({ state: "idle" });
  const [hasGeneratedOnce, setHasGeneratedOnce] = useState(false);

  const handleGeneratePages = useCallback(async (topicOverride: string) => {
    ai.setTopic(topicOverride);
    setGenStatus({ state: "loading" });
    try {
      const res = await ai.generate(topicOverride);
      if (isGenerateCancelled(res)) {
        setGenStatus({ state: "idle" });
        return;
      }
      if (!res.ok) {
        setGenStatus({ state: "error", message: res.error });
        return;
      }

      const mapped = mapGeneratedPagesToForm(res.pages);
      const current = form.getValues("pages") ?? [];
      const shouldReplaceFirst =
        !hasGeneratedOnce && current.length === 1 && isDefaultEmptyPage(current[0] as CreateQuizFormValues["pages"][number]);

      if (shouldReplaceFirst) {
        pagesArray.replace(mapped);
        setActivePageIndex(Math.max(0, mapped.length - 1));
      } else {
        const appended = [
          ...current.map((p, i) => ({ ...p, order_index: i })),
          ...mapped.map((p, i) => ({ ...p, order_index: current.length + i })),
        ] as CreateQuizFormValues["pages"];
        pagesArray.replace(appended);
        setActivePageIndex(current.length + mapped.length - 1);
      }
      setHasGeneratedOnce(true);

      setGenStatus({
        state: "success",
        message: `Сгенерировано страниц: ${res.pages.length}. Проверьте/отредактируйте вопросы ниже перед сохранением квиза.`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Unknown error";
      setGenStatus({ state: "error", message: msg });
    }
  }, [ai, form, hasGeneratedOnce, pagesArray, setActivePageIndex]);

  return {
    genStatus,
    handleGeneratePages,
  };
}
