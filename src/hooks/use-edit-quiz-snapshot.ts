"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { TheoryBlockInput } from "@/app/admin/actions";
import type { Chapter } from "@/lib/chapters";
import { useQuizLocalSnapshotAutosave } from "@/hooks/use-quiz-local-snapshot-autosave";
import {
  getEditQuizSnapshotKey,
  QUIZ_LOCAL_SNAPSHOT_VERSION,
  readQuizLocalSnapshot,
  type QuizLocalSnapshot,
} from "@/lib/quiz-local-snapshot";
import type { EditQuizFormValues } from "@/lib/quiz-page-schema";

interface UseEditQuizSnapshotParams {
  quizId: string;
  chapter?: Chapter;
  form: UseFormReturn<EditQuizFormValues>;
  videoUrl: string;
  setVideoUrl: (value: string) => void;
  theoryBlocks: TheoryBlockInput[];
  replaceTheoryBlocks: (blocks: TheoryBlockInput[]) => void;
}

export function useEditQuizSnapshot({
  quizId,
  chapter,
  form,
  videoUrl,
  setVideoUrl,
  theoryBlocks,
  replaceTheoryBlocks,
}: UseEditQuizSnapshotParams) {
  const [pendingSnapshot, setPendingSnapshot] = useState<QuizLocalSnapshot<EditQuizFormValues> | null>(null);
  const snapshotKey = useMemo(() => getEditQuizSnapshotKey(quizId), [quizId]);
  const snapshotAutosave = useQuizLocalSnapshotAutosave<EditQuizFormValues>({
    storageKey: snapshotKey,
    form,
    videoUrl,
    theoryBlocks,
    buildSnapshot: () => ({
      version: QUIZ_LOCAL_SNAPSHOT_VERSION,
      mode: "edit",
      chapter,
      quizId,
      updatedAt: Date.now(),
      formValues: form.getValues(),
      videoUrl,
      theoryBlocks,
    }),
  });

  useEffect(() => {
    const snapshot = readQuizLocalSnapshot<EditQuizFormValues>(snapshotKey, {
      mode: "edit",
      quizId,
    });

    if (snapshot) {
      queueMicrotask(() => setPendingSnapshot(snapshot));
    }
  }, [quizId, snapshotKey]);

  const keepDatabaseVersion = useCallback(() => {
    setPendingSnapshot(null);
  }, []);

  const applyPendingSnapshot = useCallback(() => {
    if (!pendingSnapshot) return;

    form.reset(pendingSnapshot.formValues);
    setVideoUrl(pendingSnapshot.videoUrl ?? "");
    replaceTheoryBlocks(pendingSnapshot.theoryBlocks ?? []);
    setPendingSnapshot(null);
    snapshotAutosave.markRestored();
  }, [form, pendingSnapshot, replaceTheoryBlocks, setVideoUrl, snapshotAutosave]);

  return {
    snapshotAutosave,
    pendingSnapshot,
    keepDatabaseVersion,
    applyPendingSnapshot,
  };
}
