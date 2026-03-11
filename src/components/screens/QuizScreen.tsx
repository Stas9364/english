"use client";

import { useState, useMemo, type ReactNode } from "react";
import Link from "next/link";
import {
  DndContext,
  PointerSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/core";
import { TheoryImage } from "@/components/theory-image";
import type { QuizWithPages, QuizPageWithDetails, QuestionWithOptions, Option, TheoryBlock } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type ViewTab = "quiz" | "theory";

/** Number of [[]] gaps in the question title. 0 if none. */
function getGapCount(title: string): number {
  if (!title?.includes("[[]]")) return 0;
  return Math.max(0, title.split("[[]]").length - 1);
}

/** For input questions: stored answers length = Math.max(1, getGapCount). */
function getEffectiveGapCount(title: string): number {
  return Math.max(1, getGapCount(title));
}

interface QuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
  isAdmin?: boolean;
}

export function QuizScreen({ quiz, theoryBlocks = [], isAdmin = false }: QuizScreenProps) {
  const [viewTab, setViewTab] = useState<ViewTab>("quiz");
  /** Выбранные ID вариантов по вопросу: для single — один элемент, для multiple — несколько */
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  /** Текстовые ответы по question_id (массив по одному элементу на каждый пропуск) */
  const [textAnswers, setTextAnswers] = useState<Record<string, string[]>>({});
  /** По какой странице уже нажали «Проверить результаты» (id страницы → true) */
  const [checkedPages, setCheckedPages] = useState<Record<string, boolean>>({});
  const [pageIndex, setPageIndex] = useState(0);

  const hasTheory = theoryBlocks.length > 0;

  const pages: QuizPageWithDetails[] = quiz.pages ?? [];
  const totalPages = pages.length || 1;
  const currentPage = pages[pageIndex] ?? ({
    type: "single" as const,
    questions: [] as QuestionWithOptions[],
  } as QuizPageWithDetails);
  const pageType = currentPage.type;
  const isCurrentPageChecked = currentPage.id ? !!checkedPages[currentPage.id] : false;

  const handleSelect = (questionId: string, optionId: string, type: "single" | "multiple" | "input" | "select_gaps") => {
    if (isCurrentPageChecked) return;
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
  };

  const handleSelectGap = (questionId: string, gapIndex: number, optionId: string) => {
    if (isCurrentPageChecked) return;
    setSelected((prev) => {
      const arr = [...(prev[questionId] ?? [])];
      while (arr.length <= gapIndex) arr.push("");
      arr[gapIndex] = optionId;
      return { ...prev, [questionId]: arr };
    });
  };

  const handleCheck = () => {
    if (currentPage.id) {
      setCheckedPages((prev) => ({ ...prev, [currentPage.id]: true }));
    }
  };

  const getScore = () => {
    let correct = 0;
    currentPage.questions.forEach((q) => {
      const chosen = selected[q.id] ?? [];
      if (pageType === "single") {
        const correctOption = q.options.find((o) => o.is_correct);
        if (chosen.length === 1 && correctOption && chosen[0] === correctOption.id) correct++;
      } else if (pageType === "multiple") {
        const correctIds = q.options.filter((o) => o.is_correct).map((o) => o.id).sort();
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
        const chosen = (selected[q.id] ?? []).slice(0, gapCount);
        if (chosen.length !== gapCount || chosen.some((id) => !id)) return;
        const optionById = new Map((q.options ?? []).map((o) => [o.id, o]));
        const allCorrect = chosen.every((optId) => optionById.get(optId)?.is_correct === true);
        if (allCorrect) correct++;
      } else if (pageType === "matching") {
        const chosen = selected[q.id]?.[0];
        if (!chosen) return;
        const opt = (q.options ?? []).find((o) => o.id === chosen);
        if (opt?.is_correct) correct++;
      }
    });
    return { correct, total: currentPage.questions.length };
  };

  const choiceQuestions = currentPage.questions.filter(
    () => pageType === "single" || pageType === "multiple"
  );
  const allChoiceAnswered =
    choiceQuestions.length === 0 ||
    choiceQuestions.every((q) => (selected[q.id]?.length ?? 0) >= 1);

  const textQuestions = currentPage.questions.filter(() => pageType === "input");
  const allTextAnswered =
    textQuestions.length === 0 ||
    textQuestions.every((q) => {
      const gapCount = getEffectiveGapCount(q.question_title);
      const arr = textAnswers[q.id] ?? [];
      return arr.length >= gapCount && Array.from({ length: gapCount }, (_, i) => (arr[i] ?? "").trim()).every((s) => s.length > 0);
    });

  const selectGapsQuestions = currentPage.questions.filter(() => pageType === "select_gaps");
  const allSelectGapsAnswered =
    selectGapsQuestions.length === 0 ||
    selectGapsQuestions.every((q) => {
      const gapCount = getEffectiveGapCount(q.question_title);
      const arr = selected[q.id] ?? [];
      return arr.length >= gapCount && Array.from({ length: gapCount }, (_, i) => arr[i] ?? "").every((id) => id.length > 0);
    });

  const matchingQuestions = currentPage.questions.filter(() => pageType === "matching");
  const allMatchingAnswered =
    matchingQuestions.length === 0 ||
    matchingQuestions.every((q) => (selected[q.id]?.[0] ?? "").length > 0);

  const score = isCurrentPageChecked ? getScore() : null;
  const hasNextPage = pageIndex < totalPages - 1;
  const hasPrevPage = pageIndex > 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/">Back to quizzes</Link>
            </Button>
          )}
        </div>

        {(hasTheory || totalPages > 1) && (
          <div className="mb-6 flex items-center justify-between gap-4 border-b">
            <div className="flex">
              {hasTheory && (
                <>
                  <button
                    type="button"
                    onClick={() => setViewTab("quiz")}
                    className={cn(
                      "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                      viewTab === "quiz"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Quiz
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewTab("theory")}
                    className={cn(
                      "cursor-pointer border-b-2 px-4 py-2 text-sm font-medium transition-colors",
                      viewTab === "theory"
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Theory
                  </button>
                </>
              )}
            </div>
            {totalPages > 1 && (
              <span className="text-sm text-muted-foreground shrink-0">
                Page {pageIndex + 1} of {totalPages}
              </span>
            )}
          </div>
        )}

        {viewTab === "theory" ? (
          <div className="space-y-6">
            {theoryBlocks.map((block) => (
              <Card key={block.id}>
                <CardContent>
                  {block.type === "text" ? (
                    <div className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {block.content}
                    </div>
                  ) : (
                    <TheoryImage src={block.content} maxHeight="70vh" />
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <>
        {score !== null && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-center text-lg font-medium">
                Your result for this page: {score.correct} of {score.total}
              </p>
            </CardContent>
          </Card>
        )}

        {(currentPage.title || totalPages > 1) && (
          <Card className="mb-6">
            <CardContent>
              {(currentPage.title) && (
                <p className="text-2xl font-semibold whitespace-pre-line">
                  {currentPage.title}
                  {/* {[quiz.description, currentPage.title].filter(Boolean).join("\n\n")} */}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {pageType === "matching" ? (
          <MatchingBlock
            questions={currentPage.questions}
            selected={selected}
            checked={isCurrentPageChecked}
            onMatch={(questionId, optionId) => {
              setSelected((prev) => ({ ...prev, [questionId]: [optionId] }));
            }}
          />
        ) : (
          <ul className="space-y-8">
            {currentPage.questions.map((q, index) => (
              <QuestionBlock
                key={q.id}
                question={q}
                pageType={pageType}
                index={index + 1}
                totalQuestionsOnPage={currentPage.questions.length}
                selectedOptionIds={selected[q.id] ?? []}
                checked={isCurrentPageChecked}
                textAnswers={textAnswers[q.id] ?? Array(getEffectiveGapCount(q.question_title)).fill("")}
                onInputChange={(gapIndex, value) => {
                  if (isCurrentPageChecked) return;
                  const gapCount = getEffectiveGapCount(q.question_title);
                  setTextAnswers((prev) => {
                    const prevArr = prev[q.id] ?? Array(gapCount).fill("");
                    const next = [...prevArr.slice(0, gapCount)];
                    if (gapIndex >= 0 && gapIndex < next.length) next[gapIndex] = value;
                    return { ...prev, [q.id]: next };
                  });
                }}
                onSelect={(optionId) => handleSelect(q.id, optionId, pageType)}
                onSelectGap={pageType === "select_gaps" ? (gapIndex, optionId) => handleSelectGap(q.id, gapIndex, optionId) : undefined}
              />
            ))}
          </ul>
        )}

        <div className="mt-8 flex flex-col items-center gap-4">
          {!isCurrentPageChecked ? (
            <Button
              size="lg"
              onClick={handleCheck}
              disabled={currentPage.questions.length === 0 || !allChoiceAnswered || !allTextAnswered || !allSelectGapsAnswered || !allMatchingAnswered}
            >
              Check results
            </Button>
          ) : (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {hasNextPage && (
                <Button
                  size="lg"
                  onClick={() => setPageIndex((i) => i + 1)}
                >
                  Next page
                </Button>
              )}
              {!hasNextPage && hasTheory && (
                <Button size="lg" variant="outline" onClick={() => setViewTab("theory")}>
                  Back to theory
                </Button>
              )}
            </div>
          )}
        </div>

        {totalPages > 1 && (
          <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Quiz pages">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((i) => i - 1)}
              disabled={!hasPrevPage}
            >
              Previous page
            </Button>
            <span className="flex items-center gap-1 px-2">
              {pages.map((_, i) => (
                <Button
                  key={pages[i].id}
                  variant={pageIndex === i ? "default" : "outline"}
                  size="sm"
                  className="min-w-9"
                  onClick={() => setPageIndex(i)}
                  aria-label={`Page ${i + 1}`}
                  aria-current={pageIndex === i ? "true" : undefined}
                >
                  {i + 1}
                </Button>
              ))}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPageIndex((i) => i + 1)}
              disabled={!hasNextPage}
            >
              Next page
            </Button>
          </nav>
        )}
          </>
        )}
      </main>
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function MatchingBlock({
  questions,
  selected,
  checked,
  onMatch,
}: {
  questions: QuestionWithOptions[];
  selected: Record<string, string[]>;
  checked: boolean;
  onMatch: (questionId: string, optionId: string) => void;
}) {
  const shuffledOptions = useMemo(
    () => shuffle(questions.flatMap((q) => q.options ?? [])),
    [questions]
  );
  const optionById = useMemo(
    () => new Map(questions.flatMap((q) => (q.options ?? []).map((o) => [o.id, o]))),
    [questions]
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id && typeof over.id === "string" && typeof active.id === "string") {
      onMatch(over.id, active.id);
    }
  }

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Drag from here</Label>
          <ul className="flex flex-col gap-2">
            {shuffledOptions.map((option) => (
              <DraggableOption key={option.id} option={option} disabled={checked} />
            ))}
          </ul>
        </div>
        <div className="space-y-2">
          <Label className="text-muted-foreground">Drop here</Label>
          <ul className="flex flex-col gap-2">
            {questions.map((q) => (
              <DroppableQuestionSlot
                key={q.id}
                question={q}
                selectedOptionId={selected[q.id]?.[0]}
                optionById={optionById}
                checked={checked}
              />
            ))}
          </ul>
        </div>
      </div>
      {checked &&
        questions.some((q) => (q.explanation ?? "").trim()) && (
          <div className="mt-6 space-y-4">
            {questions
              .filter((q) => (q.explanation ?? "").trim())
              .map((q) => (
                <Alert key={q.id} variant="default" className="mt-4">
                  <AlertTitle>{q.question_title}</AlertTitle>
                  <AlertDescription>{q.explanation}</AlertDescription>
                </Alert>
              ))}
          </div>
        )}
    </DndContext>
  );
}

function DraggableOption({ option, disabled }: { option: Option; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: option.id,
    disabled,
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "rounded-lg border border-input bg-card px-3 py-2 text-sm shadow-xs transition-opacity",
        isDragging && "opacity-50 z-10",
        !disabled && "cursor-grab active:cursor-grabbing"
      )}
    >
      {option.option_text}
    </li>
  );
}

function DroppableQuestionSlot({
  question,
  selectedOptionId,
  optionById,
  checked,
}: {
  question: QuestionWithOptions;
  selectedOptionId?: string;
  optionById: Map<string, Option>;
  checked: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: question.id });
  const selectedOpt = selectedOptionId ? optionById.get(selectedOptionId) : null;
  const isCorrect = selectedOpt ? (question.options ?? []).find((o) => o.id === selectedOptionId)?.is_correct === true : null;

  return (
    <li
      ref={setNodeRef}
      className={cn(
        "min-h-[2.75rem] rounded-lg border px-3 py-2 text-lg transition-[background-color,border-color] duration-300",
        isOver && "border-primary bg-primary/10",
        checked && isCorrect === true && "animate-quiz-result-reveal border-green-600 bg-green-50 dark:bg-green-950/30",
        checked && isCorrect === false && "animate-quiz-result-reveal border-red-600 bg-red-50 dark:bg-red-950/30"
      )}
    >
      <span className="text-lg font-medium text-muted-foreground">{question.question_title}</span>
      {selectedOpt && (
        <span className="ml-2 text-lg">
          — {selectedOpt.option_text}
          {checked && isCorrect !== null && (
            <span className={cn("ml-1", isCorrect ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300")}>
              {isCorrect ? " ✓" : " ✗"}
            </span>
          )}
        </span>
      )}
    </li>
  );
}

function isTextAnswerCorrect(question: QuestionWithOptions, textAnswers: string[]): boolean {
  const gapCount = getEffectiveGapCount(question.question_title);
  const userArr = (textAnswers ?? []).slice(0, gapCount).map((s) => (s ?? "").trim().toLowerCase());
  if (userArr.length !== gapCount || userArr.some((s) => !s)) return false;
  const options = (question.options ?? []).filter((o) => (o.option_text ?? "").trim());
  return Array.from({ length: gapCount }, (_, i) => {
    const correctTexts = new Set(
      options.filter((o) => (o.gap_index ?? 0) === i).map((o) => o.option_text!.trim().toLowerCase())
    );
    return correctTexts.has(userArr[i] ?? "");
  }).every(Boolean);
}

/** For inline [[]] gaps: returns whether each gap's answer is correct (matches at least one option for that gap_index). */
function getPerGapCorrectness(question: QuestionWithOptions, textAnswers: string[]): (boolean | null)[] {
  const gapCount = getEffectiveGapCount(question.question_title);
  const userArr = (textAnswers ?? []).slice(0, gapCount).map((s) => (s ?? "").trim().toLowerCase());
  const options = (question.options ?? []).filter((o) => (o.option_text ?? "").trim());
  return Array.from({ length: gapCount }, (_, i) => {
    const userVal = userArr[i] ?? "";
    if (!userVal) return null;
    const correctAtI = new Set(
      options.filter((o) => (o.gap_index ?? 0) === i).map((o) => o.option_text!.trim().toLowerCase())
    );
    return correctAtI.has(userVal);
  });
}

/** For select_gaps: returns whether each gap's selected option is correct. */
function getPerGapCorrectnessSelectGaps(question: QuestionWithOptions, selectedOptionIds: string[]): (boolean | null)[] {
  const gapCount = getEffectiveGapCount(question.question_title);
  const optionById = new Map((question.options ?? []).map((o) => [o.id, o]));
  return Array.from({ length: gapCount }, (_, i) => {
    const optId = selectedOptionIds[i];
    if (!optId) return null;
    const opt = optionById.get(optId);
    return opt ? opt.is_correct : null;
  });
}

function QuestionBlock({
  question,
  pageType,
  index,
  totalQuestionsOnPage,
  selectedOptionIds,
  checked,
  textAnswers,
  onInputChange,
  onSelect,
  onSelectGap,
}: {
  question: QuestionWithOptions;
  pageType: "single" | "multiple" | "input" | "select_gaps";
  index: number;
  totalQuestionsOnPage: number;
  selectedOptionIds: string[];
  checked: boolean;
  textAnswers: string[];
  onInputChange?: (gapIndex: number, value: string) => void;
  onSelect: (optionId: string) => void;
  onSelectGap?: (gapIndex: number, optionId: string) => void;
}) {
  const isMultiple = pageType === "multiple";
  const isText = pageType === "input";
  const isSelectGaps = pageType === "select_gaps";
  const textCorrect = isText && checked ? isTextAnswerCorrect(question, textAnswers) : null;
  const textIncorrect = isText && checked && textCorrect === false;

  const title = question.question_title ?? "";
  const gapCount = getGapCount(title);
  const hasInlineGaps = gapCount >= 1 && title.includes("[[]]");
  const parts = hasInlineGaps ? title.split("[[]]") : [];
  const perGapCorrectness = isText && checked && hasInlineGaps ? getPerGapCorrectness(question, textAnswers) : null;
  const perGapCorrectnessSelect = isSelectGaps && checked && hasInlineGaps ? getPerGapCorrectnessSelectGaps(question, selectedOptionIds) : null;

  const showQuestionNumber = !(isText && totalQuestionsOnPage === 1);

  return (
    <li>
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">
            {showQuestionNumber ? `${index}. ` : ""}{hasInlineGaps && (isText || isSelectGaps) ? "" : title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSelectGaps && hasInlineGaps ? (
            <div className="space-y-2">
              <div
                className={cn(
                  "rounded-lg border border-input px-3 py-2 text-lg leading-relaxed transition-[background-color,border-color] duration-300 ease-out [&_.gap-control]:ml-1.5",
                  perGapCorrectnessSelect && "animate-quiz-result-reveal"
                )}
              >
                {parts.flatMap((part, i) => {
                  const nodes: ReactNode[] = [<span key={`t-${i}`}>{part}</span>];
                  if (i < parts.length - 1) {
                    nodes.push(
                      <select
                        key={`s-${i}`}
                        value={selectedOptionIds[i] ?? ""}
                        onChange={(e) => onSelectGap?.(i, e.target.value)}
                        disabled={checked}
                        className={cn(
                          "gap-control inline-block min-w-0 align-baseline rounded border bg-background px-2 py-1.5 text-lg shadow-none outline-none transition-colors duration-300 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:w-40",
                          perGapCorrectnessSelect?.[i] === true &&
                            "border-green-600 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200",
                          perGapCorrectnessSelect?.[i] === false &&
                            "border-red-600 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
                        )}
                      >
                        <option value="">—</option>
                        {(question.options ?? [])
                          .filter((o) => (o.gap_index ?? 0) === i)
                          .map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.option_text}
                            </option>
                          ))}
                      </select>
                    );
                  }
                  return nodes;
                })}
              </div>
            </div>
          ) : isText ? (
            hasInlineGaps ? (
              <div className="space-y-2">
                <div
                  className={cn(
                    "rounded-lg border border-input px-3 py-2 text-lg leading-relaxed transition-[background-color,border-color] duration-300 ease-out [&_.gap-control]:ml-1.5",
                    perGapCorrectness && "animate-quiz-result-reveal"
                  )}
                >
                {parts.flatMap((part, i) => {
                  const nodes: ReactNode[] = [<span key={`t-${i}`}>{part}</span>];
                  if (i < parts.length - 1) {
                    nodes.push(
                      <Input
                        key={`i-${i}`}
                        value={textAnswers[i] ?? ""}
                        onChange={(e) => onInputChange?.(i, e.target.value)}
                        disabled={checked}
                        placeholder="…"
                        className={cn(
                          "gap-control inline-block w-32 min-w-0 align-baseline rounded-none border-0 border-b border-border/60 bg-transparent px-2 py-1.5 text-lg shadow-none outline-none transition-colors duration-200 ease-out focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-40",
                          perGapCorrectness?.[i] === true &&
                            "border-b-green-600 bg-green-50 text-green-800 dark:bg-green-950/30 dark:text-green-200",
                          perGapCorrectness?.[i] === false &&
                            "border-b-red-600 bg-red-50 text-red-800 dark:bg-red-950/30 dark:text-red-200"
                        )}
                      />
                    );
                  }
                  return nodes;
                })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Your answer</Label>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-[background-color,border-color] duration-300 ease-out",
                    (textCorrect === true || textIncorrect) && "animate-quiz-result-reveal",
                    textCorrect === true && "border-green-600 bg-green-50 dark:bg-green-950/30",
                    textIncorrect && "border-red-600 bg-red-50 dark:bg-red-950/30"
                  )}
                >
                  <Input
                    value={textAnswers[0] ?? ""}
                    onChange={(e) => onInputChange?.(0, e.target.value)}
                    disabled={checked}
                    placeholder="Type your answer"
                    className={cn(
                      "min-w-0 flex-1 text-lg border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-300 ease-out",
                      textCorrect === true && "text-green-800 dark:text-green-200",
                      textIncorrect && "text-red-800 dark:text-red-200"
                    )}
                  />
                </div>
              </div>
            )
          ) : isMultiple ? (
            <div className="grid gap-2">
              {question.options.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  isSelected={selectedOptionIds.includes(option.id)}
                  checked={checked}
                  multiple
                  onSelect={onSelect}
                />
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptionIds[0] ?? ""}
              onValueChange={onSelect}
              disabled={checked}
              className="grid gap-2"
            >
              {question.options.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  isSelected={selectedOptionIds.includes(option.id)}
                  checked={checked}
                  multiple={false}
                  onSelect={onSelect}
                />
              ))}
            </RadioGroup>
          )}

          {checked && question.explanation && (
            <Alert variant="default" className="mt-4">
              <AlertTitle>Explanation</AlertTitle>
              <AlertDescription>{question.explanation}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </li>
  );
}

function OptionRow({
  option,
  isSelected,
  checked,
  multiple,
  onSelect,
}: {
  option: Option;
  isSelected: boolean;
  checked: boolean;
  multiple: boolean;
  onSelect?: (optionId: string) => void;
}) {
  const showCorrect = checked && option.is_correct;
  const showIncorrect = checked && isSelected && !option.is_correct;

  const content = (
    <span
      className={cn(
        "flex-1 text-lg font-normal transition-colors duration-300 ease-out",
        !multiple && "cursor-pointer",
        showCorrect && "text-green-800 dark:text-green-200",
        showIncorrect && "text-red-800 dark:text-red-200"
      )}
    >
      {option.option_text}
    </span>
  );

  const wrapperClassName = cn(
    "flex items-center gap-3 rounded-lg border px-3 py-2 min-h-[2.75rem] transition-[background-color,border-color] duration-300 ease-out",
    (showCorrect || showIncorrect) && "animate-quiz-result-reveal",
    showCorrect && "border-green-600 bg-green-50 dark:bg-green-950/30",
    showIncorrect && "border-red-600 bg-red-50 dark:bg-red-950/30",
    !checked && "cursor-pointer"
  );

  if (multiple) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={checked ? undefined : () => onSelect?.(option.id)}
        onKeyDown={
          checked
            ? undefined
            : (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelect?.(option.id);
                }
              }
        }
        className={wrapperClassName}
      >
        <span className="-m-2 flex shrink-0 p-2 pointer-events-none">
          <Checkbox id={option.id} checked={isSelected} disabled={checked} className="pointer-events-none" />
        </span>
        <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal py-1 pointer-events-none">
          {content}
        </Label>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={checked ? undefined : () => onSelect?.(option.id)}
      onKeyDown={
        checked
          ? undefined
          : (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.(option.id);
              }
            }
      }
      className={wrapperClassName}
    >
      <RadioGroupItem value={option.id} id={option.id} className="pointer-events-none" />
      <Label htmlFor={option.id} className="flex-1 cursor-pointer font-normal">
        {content}
      </Label>
    </div>
  );
}
