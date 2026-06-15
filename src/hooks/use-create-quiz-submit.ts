"use client";

import { useCallback } from "react";
import { createQuiz, type TheoryBlockInput } from "@/app/admin/actions";
import { toast } from "sonner";
import { buildCreateQuizPayload } from "@/hooks/build-create-quiz-payload";
import type { Chapter } from "@/lib/chapters";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";

interface SaveResult {
  ok: boolean;
  error?: string;
}

interface UseCreateQuizSubmitParams {
  chapter: Chapter;
  isListeningChapter: boolean;
  videoUrl: string;
  theoryBlocks: TheoryBlockInput[];
  setResult: (result: SaveResult | null) => void;
  clearSnapshot: () => void;
  onSuccess: () => void;
}

export function useCreateQuizSubmit({
  chapter,
  isListeningChapter,
  videoUrl,
  theoryBlocks,
  setResult,
  clearSnapshot,
  onSuccess,
}: UseCreateQuizSubmitParams) {
  return useCallback(async (data: CreateQuizFormValues) => {
    setResult(null);
    const normalizedVideoUrl = videoUrl.trim();
    if (isListeningChapter && !normalizedVideoUrl) {
      const message = "YouTube video URL is required for listening quizzes.";
      setResult({ ok: false, error: message });
      toast.error("Failed to create quiz", {
        description: message,
      });
      return;
    }

    const payload = buildCreateQuizPayload({
      chapter,
      data,
      videoUrl: normalizedVideoUrl,
      theoryBlocks,
    });
    const res = await createQuiz(payload);
    if (process.env.NODE_ENV === "development") {
      console.log("[Admin] createQuiz response:", res);
    }

    setResult(res);
    if (res.ok) {
      clearSnapshot();
      onSuccess();
      toast.success("Quiz created");
      return;
    }

    toast.error("Failed to create quiz", {
      description: res.error ?? "Please try again.",
    });
  }, [chapter, clearSnapshot, isListeningChapter, onSuccess, setResult, theoryBlocks, videoUrl]);
}
