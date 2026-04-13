"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { TheoryImage } from "@/components/theory-image";
import type { QuizWithPages, TheoryBlock } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MatchingBlock } from "@/components/matching-block";
import { QuestionBlock } from "../question-block/question-block";
import { useQuizProgress } from "@/hooks/use-quiz-progress";
import { getEffectiveGapCount } from '@/lib/question-block-utils';

type ViewTab = "quiz" | "theory";

interface QuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
  isAdmin?: boolean;
}

export function QuizScreen({ quiz, theoryBlocks = [], isAdmin = false }: QuizScreenProps) {
  const [viewTab, setViewTab] = useState<ViewTab>("quiz");
  const emptySelectedOptionIds = useMemo(() => [] as string[], []);

  const {
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
  } = useQuizProgress(quiz);

  const hasTheory = theoryBlocks.length > 0;
  const totalQuestionsOnPage = currentPage.questions.length;

  const getTextAnswersForQuestion = useCallback(
    (questionId: string, title: string) => textAnswers[questionId] ?? Array(getEffectiveGapCount(title)).fill(""),
    [textAnswers]
  );

  const handleQuestionInputChange = useCallback(
    (questionId: string, title: string, gapIndex: number, value: string) => {
      if (isCurrentPageChecked) return;
      const gapCount = getEffectiveGapCount(title);
      setTextAnswers((prev) => {
        const prevArr = prev[questionId] ?? Array(gapCount).fill("");
        const next = [...prevArr.slice(0, gapCount)];
        if (gapIndex >= 0 && gapIndex < next.length) next[gapIndex] = value;
        return { ...prev, [questionId]: next };
      });
    },
    [isCurrentPageChecked, setTextAnswers]
  );

  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          </div>
          {isAdmin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin">Back to topics</Link>
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
                    <div className="whitespace-pre-wrap wrap-break-word text-sm text-muted-foreground">
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

            {(currentPage.title || currentPage.example || totalPages > 1) && (
              <Card className="mb-6">
                <CardContent>
                  {(currentPage.title) && (
                    <p className="text-2xl font-semibold whitespace-pre-line">
                      {currentPage.title}
                      {/* {[quiz.description, currentPage.title].filter(Boolean).join("\n\n")} */}
                    </p>
                  )}
                  {currentPage.example && (
                    <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                      Example: {currentPage.example}
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
                  setSelected((prev) => {
                    const prevHolder = Object.entries(prev).find(([_, opts]) => opts[0] === optionId)?.[0];
                    const prevInTarget = prev[questionId]?.[0];
                    const next = { ...prev, [questionId]: [optionId] };
                    if (prevHolder && prevHolder !== questionId) {
                      next[prevHolder] = prevInTarget ? [prevInTarget] : [];
                    }
                    return next;
                  });
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
                    totalQuestionsOnPage={totalQuestionsOnPage}
                    selectedOptionIds={selected[q.id] ?? emptySelectedOptionIds}
                    checked={isCurrentPageChecked}
                    textAnswers={getTextAnswersForQuestion(q.id, q.question_title)}
                    onInputChange={handleQuestionInputChange}
                    onSelect={handleSelect}
                    onSelectGap={pageType === "select_gaps" ? handleSelectGap : undefined}
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
                  {pages.map((page, i) => (
                    <Button
                      key={page.id}
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
      </PageContainer>
    </div>
  );
}


