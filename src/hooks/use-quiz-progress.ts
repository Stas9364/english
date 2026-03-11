"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { QuizWithPages, QuizPageWithDetails, QuestionWithOptions } from "@/lib/supabase";
import { getEffectiveGapCount } from "@/components/question-block";

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function useQuizProgress(quiz: QuizWithPages) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string[]>>({});
  const [checkedPages, setCheckedPages] = useState<Record<string, boolean>>({});
  const [pageIndex, setPageIndex] = useState(0);

  const pages: QuizPageWithDetails[] = quiz.pages ?? [];
  const totalPages = pages.length || 1;
  const currentPage = useMemo(
    () =>
      pages[pageIndex] ??
      ({
        type: "single" as const,
        questions: [] as QuestionWithOptions[],
      } as QuizPageWithDetails),
    [pages, pageIndex]
  );
  const pageType = currentPage.type;
  const isCurrentPageChecked = currentPage.id ? !!checkedPages[currentPage.id] : false;

  const handleSelect = useCallback(
    (questionId: string, optionId: string, type: "single" | "multiple" | "input" | "select_gaps") => {
      if (currentPage.id ? !!checkedPages[currentPage.id] : false) return;
      if (type === "single") {
        setSelected((prev) => ({ ...prev, [questionId]: [optionId] }));
        return;
      }
      if (type === "multiple") {
        setSelected((prev) => {
          const current = prev[questionId] ?? [];
          const next = current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];
          return { ...prev, [questionId]: next };
        });
      }
    },
    [currentPage.id, checkedPages]
  );

  const handleSelectGap = useCallback(
    (questionId: string, gapIndex: number, optionId: string) => {
      if (currentPage.id ? !!checkedPages[currentPage.id] : false) return;
      setSelected((prev) => {
        const arr = [...(prev[questionId] ?? [])];
        while (arr.length <= gapIndex) arr.push("");
        arr[gapIndex] = optionId;
        return { ...prev, [questionId]: arr };
      });
    },
    [currentPage.id, checkedPages]
  );

  const handleCheck = useCallback(() => {
    if (currentPage.id) {
      setCheckedPages((prev) => ({ ...prev, [currentPage.id]: true }));
    }
  }, [currentPage.id]);

  useEffect(() => {
    if (pageType !== "matching") return;
    const questions = currentPage.questions;
    if (questions.length === 0) return;
    const hasAny = questions.some((q) => selected[q.id]?.[0]);
    if (hasAny) return;
    const allOptions = questions.flatMap((q) => q.options ?? []);
    if (allOptions.length < questions.length) return;
    const shuffled = shuffle([...allOptions]);
    setSelected((prev) => {
      const next = { ...prev };
      questions.forEach((q, i) => {
        next[q.id] = shuffled[i] ? [shuffled[i].id] : [];
      });
      return next;
    });
  }, [pageIndex, pageType, currentPage.questions, selected]);

  const getScore = useCallback(() => {
    let correct = 0;
    currentPage.questions.forEach((q) => {
      const chosen = selected[q.id] ?? [];
      if (pageType === "single") {
        const correctOption = q.options?.find((o) => o.is_correct);
        if (chosen.length === 1 && correctOption && chosen[0] === correctOption.id) correct++;
      } else if (pageType === "multiple") {
        const correctIds = (q.options ?? []).filter((o) => o.is_correct).map((o) => o.id).sort();
        const chosenIds = [...chosen].sort();
        if (correctIds.length === chosenIds.length && correctIds.every((id, i) => id === chosenIds[i])) correct++;
      } else if (pageType === "input") {
        const gapCount = getEffectiveGapCount(q.question_title);
        const userArr = (textAnswers[q.id] ?? []).slice(0, gapCount).map((s) => (s ?? "").trim().toLowerCase());
        if (userArr.length !== gapCount || userArr.some((s) => !s)) return;
        const options = (q.options ?? []).filter((o) => (o.option_text ?? "").trim());
        const allGapsCorrect = Array.from({ length: gapCount }, (_, i) => {
          const correctTexts = new Set(
            options.filter((o) => (o.gap_index ?? 0) === i).map((o) => o.option_text!.trim().toLowerCase())
          );
          return correctTexts.has(userArr[i] ?? "");
        }).every(Boolean);
        if (allGapsCorrect) correct++;
      } else if (pageType === "select_gaps") {
        const gapCount = getEffectiveGapCount(q.question_title);
        const chosenForGaps = (selected[q.id] ?? []).slice(0, gapCount);
        if (chosenForGaps.length !== gapCount || chosenForGaps.some((id) => !id)) return;
        const optionById = new Map((q.options ?? []).map((o) => [o.id, o]));
        const allCorrect = chosenForGaps.every((optId) => optionById.get(optId)?.is_correct === true);
        if (allCorrect) correct++;
      } else if (pageType === "matching") {
        const chosen = selected[q.id]?.[0];
        if (!chosen) return;
        const opt = (q.options ?? []).find((o) => o.id === chosen);
        if (opt?.is_correct) correct++;
      }
    });
    return { correct, total: currentPage.questions.length };
  }, [currentPage.questions, currentPage.type, pageType, selected, textAnswers]);

  const allChoiceAnswered =
    currentPage.questions.filter(() => pageType === "single" || pageType === "multiple").length === 0 ||
    currentPage.questions
      .filter(() => pageType === "single" || pageType === "multiple")
      .every((q) => (selected[q.id]?.length ?? 0) >= 1);

  const allTextAnswered =
    currentPage.questions.filter(() => pageType === "input").length === 0 ||
    currentPage.questions
      .filter(() => pageType === "input")
      .every((q) => {
        const gapCount = getEffectiveGapCount(q.question_title);
        const arr = textAnswers[q.id] ?? [];
        return arr.length >= gapCount && Array.from({ length: gapCount }, (_, i) => (arr[i] ?? "").trim()).every((s) => s.length > 0);
      });

  const allSelectGapsAnswered =
    currentPage.questions.filter(() => pageType === "select_gaps").length === 0 ||
    currentPage.questions
      .filter(() => pageType === "select_gaps")
      .every((q) => {
        const gapCount = getEffectiveGapCount(q.question_title);
        const arr = selected[q.id] ?? [];
        return arr.length >= gapCount && Array.from({ length: gapCount }, (_, i) => arr[i] ?? "").every((id) => id.length > 0);
      });

  const allMatchingAnswered =
    currentPage.questions.filter(() => pageType === "matching").length === 0 ||
    currentPage.questions.filter(() => pageType === "matching").every((q) => (selected[q.id]?.[0] ?? "").length > 0);

  const score = isCurrentPageChecked ? getScore() : null;
  const hasNextPage = pageIndex < totalPages - 1;
  const hasPrevPage = pageIndex > 0;

  return {
    pages,
    totalPages,
    pageIndex,
    setPageIndex,
    currentPage,
    pageType,
    selected,
    setSelected,
    textAnswers,
    setTextAnswers,
    isCurrentPageChecked,
    handleSelect,
    handleSelectGap,
    handleCheck,
    allChoiceAnswered,
    allTextAnswered,
    allSelectGapsAnswered,
    allMatchingAnswered,
    score,
    hasNextPage,
    hasPrevPage,
  };
}
