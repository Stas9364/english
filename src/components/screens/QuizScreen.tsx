"use client";

import { useState } from "react";
import Link from "next/link";
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

interface QuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
}

export function QuizScreen({ quiz, theoryBlocks = [] }: QuizScreenProps) {
  const [viewTab, setViewTab] = useState<ViewTab>("quiz");
  /** Выбранные ID вариантов по вопросу: для single — один элемент, для multiple — несколько */
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  /** Текстовые ответы по question_id */
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
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

  const handleSelect = (questionId: string, optionId: string, type: "single" | "multiple" | "input") => {
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
        const user = (textAnswers[q.id] ?? "").trim().toLowerCase();
        const correctTexts = (q.options ?? []).map((o) => (o.option_text ?? "").trim().toLowerCase()).filter(Boolean);
        if (user && correctTexts.length > 0 && correctTexts.includes(user)) {
          correct++;
        }
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
    textQuestions.every((q) => (textAnswers[q.id] ?? "").trim().length > 0);

  const score = isCurrentPageChecked ? getScore() : null;
  const hasNextPage = pageIndex < totalPages - 1;
  const hasPrevPage = pageIndex > 0;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          </div>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to quizzes</Link>
          </Button>
        </div>

        {hasTheory && (
          <div className="mb-6 flex border-b">
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

        {(currentPage.title || quiz.description || totalPages > 1) && (
          <Card className="mb-6">
            <CardHeader className="flex flex-row items-center justify-between gap-4">
              <CardTitle className="text-base font-medium">Instruction</CardTitle>
              {totalPages > 1 && (
                <span className="text-sm text-muted-foreground shrink-0">
                  Page {pageIndex + 1} of {totalPages}
                </span>
              )}
            </CardHeader>
            <CardContent>
              {(currentPage.title || quiz.description) && (
                <p className="text-sm text-muted-foreground whitespace-pre-line">
                  {[currentPage.title, quiz.description].filter(Boolean).join("\n\n")}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <ul className="space-y-8">
          {currentPage.questions.map((q, index) => (
            <QuestionBlock
              key={q.id}
              question={q}
              pageType={pageType}
              index={index + 1}
              selectedOptionIds={selected[q.id] ?? []}
              checked={isCurrentPageChecked}
              textAnswer={textAnswers[q.id] ?? ""}
              onChangeText={(value) => {
                if (isCurrentPageChecked) return;
                setTextAnswers((prev) => ({ ...prev, [q.id]: value }));
              }}
              onSelect={(optionId) => handleSelect(q.id, optionId, pageType)}
            />
          ))}
        </ul>

        <div className="mt-8 flex flex-col items-center gap-4">
          {!isCurrentPageChecked ? (
            <Button
              size="lg"
              onClick={handleCheck}
              disabled={currentPage.questions.length === 0 || !allChoiceAnswered || !allTextAnswered}
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

function isTextAnswerCorrect(question: QuestionWithOptions, textAnswer: string): boolean {
  const user = (textAnswer ?? "").trim().toLowerCase();
  const correctTexts = (question.options ?? []).map((o) => (o.option_text ?? "").trim().toLowerCase()).filter(Boolean);
  return !!user && correctTexts.length > 0 && correctTexts.includes(user);
}

function QuestionBlock({
  question,
  pageType,
  index,
  selectedOptionIds,
  checked,
  textAnswer,
  onChangeText,
  onSelect,
}: {
  question: QuestionWithOptions;
  pageType: "single" | "multiple" | "input";
  index: number;
  selectedOptionIds: string[];
  checked: boolean;
  textAnswer: string;
  onChangeText?: (value: string) => void;
  onSelect: (optionId: string) => void;
}) {
  const isMultiple = pageType === "multiple";
  const isText = pageType === "input";
  const textCorrect = isText && checked ? isTextAnswerCorrect(question, textAnswer) : null;
  const textIncorrect = isText && checked && textCorrect === false;

  return (
    <li>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {index}. {question.question_title}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isText ? (
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
                  value={textAnswer}
                  onChange={(e) => onChangeText?.(e.target.value)}
                  disabled={checked}
                  placeholder="Type your answer"
                  className={cn(
                    "min-w-0 flex-1 border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-300 ease-out",
                    textCorrect === true && "text-green-800 dark:text-green-200",
                    textIncorrect && "text-red-800 dark:text-red-200"
                  )}
                />
              </div>
            </div>
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
        "flex-1 font-normal transition-colors duration-300 ease-out",
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
