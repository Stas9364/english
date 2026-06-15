"use client";

import { useEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { TheoryBlockInput } from "@/app/admin/actions";
import type { Chapter } from "@/lib/chapters";
import { useQuizLocalSnapshotAutosave } from "@/hooks/use-quiz-local-snapshot-autosave";
import {
  getCreateQuizSnapshotKey,
  QUIZ_LOCAL_SNAPSHOT_VERSION,
  readQuizLocalSnapshot,
  removeStaleCreateQuizSnapshots,
} from "@/lib/quiz-local-snapshot";
import type { CreateQuizFormValues } from "@/lib/quiz-page-schema";

interface UseCreateQuizSnapshotParams {
  chapter: Chapter;
  topicSlug?: string;
  initialTopicId?: string;
  topics: { id: string; name: string }[];
  form: UseFormReturn<CreateQuizFormValues>;
  videoUrl: string;
  setVideoUrl: (value: string) => void;
  theoryBlocks: TheoryBlockInput[];
  replaceTheoryBlocks: (blocks: TheoryBlockInput[]) => void;
}

export function useCreateQuizSnapshot({
  chapter,
  topicSlug,
  initialTopicId,
  topics,
  form,
  videoUrl,
  setVideoUrl,
  theoryBlocks,
  replaceTheoryBlocks,
}: UseCreateQuizSnapshotParams) {
  const snapshotKey = useMemo(
    () => getCreateQuizSnapshotKey(chapter, topicSlug),
    [chapter, topicSlug]
  );
  const resolvedTopicId = useMemo(
    () => (initialTopicId && topics.some((t) => t.id === initialTopicId) ? initialTopicId : undefined),
    [initialTopicId, topics]
  );
  const snapshotAutosave = useQuizLocalSnapshotAutosave<CreateQuizFormValues>({
    storageKey: snapshotKey,
    form,
    videoUrl,
    theoryBlocks,
    buildSnapshot: () => ({
      version: QUIZ_LOCAL_SNAPSHOT_VERSION,
      mode: "create",
      chapter,
      updatedAt: Date.now(),
      formValues: form.getValues(),
      videoUrl,
      theoryBlocks,
    }),
  });
  const markSnapshotRestored = snapshotAutosave.markRestored;

  useEffect(() => {
    removeStaleCreateQuizSnapshots();

    const snapshot = readQuizLocalSnapshot<CreateQuizFormValues>(snapshotKey, {
      mode: "create",
      chapter,
    });

    if (!snapshot) {
      if (resolvedTopicId && form.getValues("topic_id") !== resolvedTopicId) {
        form.setValue("topic_id", resolvedTopicId, { shouldValidate: true });
      }
      return;
    }

    queueMicrotask(() => {
      form.reset({
        ...snapshot.formValues,
        ...(resolvedTopicId ? { topic_id: resolvedTopicId } : {}),
      });
      setVideoUrl(snapshot.videoUrl ?? "");
      replaceTheoryBlocks(snapshot.theoryBlocks ?? []);
      markSnapshotRestored();
    });
  }, [chapter, form, markSnapshotRestored, replaceTheoryBlocks, resolvedTopicId, setVideoUrl, snapshotKey]);

  return {
    snapshotAutosave,
  };
}
