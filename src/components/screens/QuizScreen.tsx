"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { PageContainer } from "@/components/page-container";
import { TheoryImageDialog } from "@/components/theory-image-dialog";
import type { QuizWithPages, TheoryBlock } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MatchingBlock } from "@/components/matching-block";
import { QuizVideoPlayer } from "@/components/quiz-video-player";
import { CrosswordPlayer } from "@/components/crossword/crossword-player";
import { QuestionBlock } from "../question-block/question-block";
import { useQuizProgress } from "@/hooks/use-quiz-progress";
import { getEffectiveGapCount } from '@/lib/question-block-utils';
import { sanitizeQuestionTitleHtml } from "@/lib/sanitize-question-title-html";
import { QuizScreenViewSwitcher } from "./quiz-screen/quiz-screen-view-switcher";

type ViewTab = "quiz" | "theory";

interface QuizScreenProps {
  quiz: QuizWithPages;
  theoryBlocks?: TheoryBlock[];
  isAdmin?: boolean;
  /** Куда вести из админского режима (по умолчанию хаб `/admin`) */
  adminBackHref?: string;
}

export function QuizScreen({
  quiz,
  theoryBlocks = [],
  isAdmin = false,
  adminBackHref = "/admin",
}: QuizScreenProps) {
  const [viewTab, setViewTab] = useState<ViewTab>("quiz");
  const emptySelectedOptionIds = useMemo(() => [] as string[], []);
  const emptyTextAnswers = useMemo(() => [] as string[], []);

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

  const hasVideo = Boolean(quiz.video?.url?.trim());
  const safePageTitleHtml = sanitizeQuestionTitleHtml(currentPage.title ?? "");
  const isCrosswordPage = pageType === "crossword";

  const quizMainContent = (
    <>
      {(hasTheory || totalPages > 1) && (
        <QuizScreenViewSwitcher
          hasTheory={hasTheory}
          viewTab={viewTab}
          setViewTab={setViewTab}
          pageIndex={pageIndex}
          totalPages={totalPages}
        />
      )}

      {viewTab === "theory" ? (
        <div className="space-y-6">
          {theoryBlocks.map((block) => (
            <Card key={block.id}>
              <CardContent>
                {block.type === "text" ? (
                  <div
                    className="wrap-break-word text-sm text-muted-foreground [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_h1]:m-0 [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:text-inherit [&_ul]:my-0 [&_ul]:pl-5 [&_ol]:my-0 [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: sanitizeQuestionTitleHtml(block.content ?? "") }}
                  />
                ) : (
                  <TheoryImageDialog src={block.content} />
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

          {((currentPage.title || currentPage.example) && totalPages > 1) && (
            <Card className="mb-6">
              <CardContent>
                {(currentPage.title) && (
                  <div
                    className="text-2xl font-semibold wrap-break-word [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_h1]:m-0 [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:text-inherit [&_ul]:my-0 [&_ul]:pl-5 [&_ol]:my-0 [&_ol]:pl-5"
                    dangerouslySetInnerHTML={{ __html: safePageTitleHtml }}
                  />
                )}
                {currentPage.example && (
                  <p className="mt-3 whitespace-pre-line text-sm text-muted-foreground">
                    Example: {currentPage.example}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {isCrosswordPage ? (
            currentPage.crossword ? (
              <div className="flex flex-col gap-4">
                {isAdmin ? (
                  <div>
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/admin/quiz/${currentPage.crossword.quiz.slug}`} target="_blank" rel="noopener noreferrer">
                        Open crossword
                      </Link>
                    </Button>
                  </div>
                ) : null}
                <CrosswordPlayer
                  quiz={currentPage.crossword.quiz}
                  storageKey={`${quiz.id}:${currentPage.id}`}
                />
              </div>
            ) : (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">Crossword is not configured for this page.</p>
                </CardContent>
              </Card>
            )
          ) : pageType === "matching" ? (
            <MatchingBlock
              questions={currentPage.questions}
              selected={selected}
              checked={isCurrentPageChecked}
              onMatch={(questionId, optionId) => {
                setSelected((prev) => {
                  const prevHolder = Object.entries(prev).find(([, opts]) => opts[0] === optionId)?.[0];
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
                  textAnswers={
                    pageType === "input"
                      ? getTextAnswersForQuestion(q.id, q.question_title)
                      : emptyTextAnswers
                  }
                  onInputChange={handleQuestionInputChange}
                  onSelect={handleSelect}
                  onSelectGap={pageType === "select_gaps" ? handleSelectGap : undefined}
                />
              ))}
            </ul>
          )}

          {!isCrosswordPage && (
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
          )}

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
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <PageContainer className="sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          </div>
          {isAdmin && (
            <div>
              <Button asChild>
              <Link href={`/admin/quiz/${quiz.slug}`}>Edit quiz</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link href={adminBackHref}>Back to topics</Link>
              </Button>
            </div>
          )}
        </div>

        {hasVideo ? (
          <div className="grid items-start gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
            <div className="lg:sticky lg:top-14">
              <QuizVideoPlayer url={quiz.video?.url} title={quiz.title} />
            </div>
            <div className="min-w-0">
              {quizMainContent}
            </div>
          </div>
        ) : (
          quizMainContent
        )}
      </PageContainer>
    </div>
  );
}


