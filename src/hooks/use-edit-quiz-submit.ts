"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { updateQuiz, type TheoryBlockInput } from "@/app/admin/actions";
import { buildEditQuizUpdatePayload } from "@/hooks/build-edit-quiz-update-payload";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

interface SaveResult {
  ok: boolean;
  error?: string;
}

interface UseEditQuizSubmitParams {
  quizId: string;
  isListeningChapter: boolean;
  videoUrl: string;
  theoryBlocks: TheoryBlockInput[];
  setResult: (result: SaveResult | null) => void;
  clearSnapshot: () => void;
}

export function useEditQuizSubmit({
  quizId,
  isListeningChapter,
  videoUrl,
  theoryBlocks,
  setResult,
  clearSnapshot,
}: UseEditQuizSubmitParams) {
  return useCallback(async (data: EditQuizFormValues) => {
    setResult(null);
    const normalizedVideoUrl = videoUrl.trim();
    if (isListeningChapter && !normalizedVideoUrl) {
      const message = "YouTube video URL is required for listening quizzes.";
      setResult({ ok: false, error: message });
      toast.error("Failed to save quiz", {
        description: message,
      });
      return;
    }

    const payload = buildEditQuizUpdatePayload({
      quizId,
      data,
      videoUrl: normalizedVideoUrl,
      theoryBlocks,
    });
    const res = await updateQuiz(payload);
    if (process.env.NODE_ENV === "development") {
      console.log("[EditQuiz] updateQuiz response:", res);
    }

    setResult(res);
    if (res.ok) {
      clearSnapshot();
      toast.success("Changes saved", {
        description: "Quiz updated successfully.",
      });
      return;
    }

    toast.error("Failed to save quiz", {
      description: res.error ?? "An error occurred while saving.",
    });
  }, [clearSnapshot, isListeningChapter, quizId, setResult, theoryBlocks, videoUrl]);
}
