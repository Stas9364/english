"use client";

import { useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import {
  pickPageAnswers,
  readQuizPageProgress,
  removeQuizPageProgress,
  writeQuizPageProgress,
} from "@/lib/quiz-page-progress-storage";

export type PersistableQuizPage = {
  pageId: string;
  questionIds: string[];
};

type UseQuizPageAnswerPersistenceParams = {
  quizId: string;
  pageId: string;
  questionIds: string[];
  persistablePages: PersistableQuizPage[];
  selected: Record<string, string[]>;
  textAnswers: Record<string, string[]>;
  setSelected: Dispatch<SetStateAction<Record<string, string[]>>>;
  setTextAnswers: Dispatch<SetStateAction<Record<string, string[]>>>;
  onCheck: () => void;
  enabled: boolean;
};

type PersistenceContext = {
  quizId: string;
  pageId: string;
  questionIds: string[];
  persistablePages: PersistableQuizPage[];
  enabled: boolean;
};

export function useQuizPageAnswerPersistence({
  quizId,
  pageId,
  questionIds,
  persistablePages,
  selected,
  textAnswers,
  setSelected,
  setTextAnswers,
  onCheck,
  enabled,
}: UseQuizPageAnswerPersistenceParams) {
  const selectedRef = useRef(selected);
  const textAnswersRef = useRef(textAnswers);
  const contextRef = useRef<PersistenceContext>({
    quizId,
    pageId,
    questionIds,
    persistablePages,
    enabled,
  });

  useEffect(() => {
    contextRef.current = { quizId, pageId, questionIds, persistablePages, enabled };
  }, [enabled, pageId, persistablePages, questionIds, quizId]);

  useEffect(() => {
    selectedRef.current = selected;
    textAnswersRef.current = textAnswers;
  }, [selected, textAnswers]);

  const flushAllPages = useCallback(() => {
    const { quizId: currentQuizId, persistablePages: pages, enabled: isEnabled } = contextRef.current;
    if (!isEnabled) return;

    for (const page of pages) {
      const data = pickPageAnswers(page.questionIds, selectedRef.current, textAnswersRef.current);
      writeQuizPageProgress(currentQuizId, page.pageId, data);
    }
  }, []);

  useEffect(() => {
    if (!enabled || !pageId) return;
    if (!persistablePages.some((page) => page.pageId === pageId)) return;

    const snapshot = readQuizPageProgress(quizId, pageId);
    if (!snapshot) return;

    const idSet = new Set(questionIds);

    setSelected((prev) => {
      const next = { ...prev };
      for (const id of idSet) {
        if (snapshot.selected[id]) next[id] = snapshot.selected[id];
      }
      return next;
    });

    setTextAnswers((prev) => {
      const next = { ...prev };
      for (const id of idSet) {
        if (snapshot.textAnswers[id]) next[id] = snapshot.textAnswers[id];
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- questionIds are tied to pageId
  }, [enabled, pageId, persistablePages, quizId, setSelected, setTextAnswers]);

  useEffect(() => {
    if (!enabled) return;

    const handleLeave = () => flushAllPages();

    window.addEventListener("beforeunload", handleLeave);
    window.addEventListener("pagehide", handleLeave);

    return () => {
      window.removeEventListener("beforeunload", handleLeave);
      window.removeEventListener("pagehide", handleLeave);
      flushAllPages();
    };
  }, [enabled, flushAllPages]);

  const handleCheckWithPersistence = useCallback(() => {
    if (enabled && pageId && persistablePages.some((page) => page.pageId === pageId)) {
      removeQuizPageProgress(quizId, pageId);
    }
    onCheck();
  }, [enabled, onCheck, pageId, persistablePages, quizId]);

  return { handleCheckWithPersistence };
}
