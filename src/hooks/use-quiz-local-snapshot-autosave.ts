"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";
import {
  removeQuizLocalSnapshot,
  writeQuizLocalSnapshot,
  type QuizLocalSnapshot,
} from "@/lib/quiz-local-snapshot";

export type QuizSnapshotSaveStatus = "idle" | "pending" | "saved" | "restored" | "error";

type UseQuizLocalSnapshotAutosaveParams<TFormValues extends FieldValues> = {
  storageKey: string;
  form: UseFormReturn<TFormValues>;
  videoUrl: string;
  theoryBlocks: unknown[];
  buildSnapshot: () => QuizLocalSnapshot<TFormValues>;
  debounceMs?: number;
};

export function useQuizLocalSnapshotAutosave<TFormValues extends FieldValues>({
  storageKey,
  form,
  videoUrl,
  theoryBlocks,
  buildSnapshot,
  debounceMs = 900,
}: UseQuizLocalSnapshotAutosaveParams<TFormValues>) {
  const [status, setStatus] = useState<QuizSnapshotSaveStatus>("idle");
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasMountedAuxRef = useRef(false);
  const pauseUntilRef = useRef(0);
  const buildSnapshotRef = useRef(buildSnapshot);

  useEffect(() => {
    buildSnapshotRef.current = buildSnapshot;
  });

  const clearTimer = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
  }, []);

  const saveSnapshot = useCallback(
    (options?: { updateStatus?: boolean }) => {
      const shouldUpdateStatus = options?.updateStatus ?? true;

      try {
        const snapshot = buildSnapshotRef.current();
        writeQuizLocalSnapshot(storageKey, snapshot);

        if (shouldUpdateStatus) {
          setSavedAt(snapshot.updatedAt);
          setStatus("saved");
          setError(null);
        }
      } catch (e) {
        if (shouldUpdateStatus) {
          setStatus("error");
          setError(e instanceof Error ? e.message : "Failed to save local snapshot");
        }
      }
    },
    [storageKey]
  );

  const saveNow = useCallback(() => {
    if (Date.now() < pauseUntilRef.current) return;

    saveSnapshot();
  }, [saveSnapshot]);

  const scheduleSave = useCallback(() => {
    if (Date.now() < pauseUntilRef.current) return;

    clearTimer();
    setStatus("pending");
    timerRef.current = setTimeout(saveNow, debounceMs);
  }, [clearTimer, debounceMs, saveNow]);

  const clearSnapshot = useCallback(
    (options?: { pauseMs?: number }) => {
      clearTimer();
      pauseUntilRef.current = Date.now() + (options?.pauseMs ?? 0);
      removeQuizLocalSnapshot(storageKey);
      setStatus("idle");
      setSavedAt(null);
      setError(null);
    },
    [clearTimer, storageKey]
  );

  const discardSnapshot = useCallback(() => {
    clearSnapshot();
  }, [clearSnapshot]);

  const markRestored = useCallback(() => {
    setStatus("restored");
    setError(null);
  }, []);

  useEffect(() => {
    const subscription = form.watch(() => {
      scheduleSave();
    });

    return () => {
      subscription.unsubscribe();
      clearTimer();
    };
  }, [clearTimer, form, scheduleSave]);

  useEffect(() => {
    if (!hasMountedAuxRef.current) {
      hasMountedAuxRef.current = true;
      return;
    }

    queueMicrotask(scheduleSave);
  }, [scheduleSave, theoryBlocks, videoUrl]);

  useEffect(() => {
    const flushSnapshot = () => {
      if (Date.now() < pauseUntilRef.current) return;

      clearTimer();
      saveSnapshot({ updateStatus: false });
    };

    window.addEventListener("beforeunload", flushSnapshot);
    window.addEventListener("pagehide", flushSnapshot);

    return () => {
      window.removeEventListener("beforeunload", flushSnapshot);
      window.removeEventListener("pagehide", flushSnapshot);
    };
  }, [clearTimer, saveSnapshot]);

  return {
    status,
    savedAt,
    error,
    saveNow,
    clearSnapshot,
    discardSnapshot,
    markRestored,
  };
}
