"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { TheoryImage } from "@/components/theory-image";
import { getCorrectTextsByGap, getGapCount, getPerGapCorrectness, getPerGapCorrectnessSelectGaps, isTextAnswerCorrect } from '@/lib/question-block-utils';
import { sanitizeQuestionTitleHtml } from "@/lib/sanitize-question-title-html";
import type { QuestionWithOptions } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { memo } from "react";
import { CorrectAnswers } from './correct-answers';
import { GapTitleSegment } from './gap-title-segment';
import { OptionRow } from './option-row';

const correctSurfaceClassName =
  "border-success bg-success-soft text-success-foreground dark:bg-success-soft/80";
const incorrectSurfaceClassName =
  "border-error bg-error-soft text-error-foreground dark:bg-error-soft/80";
const correctUnderlineClassName =
  "border-b-success bg-success-soft text-success-foreground dark:bg-success-soft/80";
const incorrectUnderlineClassName =
  "border-b-error bg-error-soft text-error-foreground dark:bg-error-soft/80";

function QuestionBlockImpl({
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
  onInputChange?: (questionId: string, title: string, gapIndex: number, value: string) => void;
  onSelect: (questionId: string, optionId: string, pageType: "single" | "multiple" | "input" | "select_gaps") => void;
  onSelectGap?: (questionId: string, gapIndex: number, optionId: string) => void;
}) {
  const isMultiple = pageType === "multiple";
  const isText = pageType === "input";
  const isSelectGaps = pageType === "select_gaps";
  const textCorrect = isText && checked ? isTextAnswerCorrect(question, textAnswers) : null;
  const textIncorrect = isText && checked && textCorrect === false;

  const title = question.question_title ?? "";
  const safeTitleHtml = sanitizeQuestionTitleHtml(title);
  const gapCount = getGapCount(title);
  const hasInlineGaps = gapCount >= 1 && title.includes("[[]]");
  const parts = hasInlineGaps ? title.split("[[]]") : [];
  const perGapCorrectness = isText && checked && hasInlineGaps ? getPerGapCorrectness(question, textAnswers) : null;
  const perGapCorrectnessSelect = isSelectGaps && checked && hasInlineGaps ? getPerGapCorrectnessSelectGaps(question, selectedOptionIds) : null;
  const correctTextsByGap =
    (isText || isSelectGaps) && checked ? getCorrectTextsByGap(question, isSelectGaps) : null;
  const questionOptions = question.options ?? [];

  const showQuestionNumber = totalQuestionsOnPage > 2;

  return (
    <li>
      <Card>
        {hasInlineGaps && (isText || isSelectGaps) ? "" : (
          <CardHeader>
            <CardTitle className="text-lg font-medium">
              <>
                {showQuestionNumber ? `${index}. ` : ""}
                <span
                  className="wrap-break-word [&_a]:text-primary [&_a]:underline [&_p]:m-0 [&_p]:inline [&_h1]:m-0 [&_h1]:inline [&_h1]:text-inherit [&_h2]:m-0 [&_h2]:inline [&_h2]:text-inherit [&_ul]:my-0 [&_ul]:pl-5 [&_ol]:my-0 [&_ol]:pl-5"
                  dangerouslySetInnerHTML={{ __html: safeTitleHtml }}
                />
              </>
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className="space-y-4">
          {question.question_image_url ? (
            <TheoryImage src={question.question_image_url} alt={`Question ${index}`} />
          ) : null}
          {isSelectGaps && hasInlineGaps ? (
            <div className="space-y-2">
              {showQuestionNumber ? <span className="text-sm text-muted-foreground">Question {index}:</span> : null}
              <div
                className={cn(
                  "block w-full max-w-full rounded-lg  border border-input px-3 py-2 text-lg/[45px]   transition-[background-color,border-color] duration-300 ease-out [&_.gap-control]:ml-1.5",
                  perGapCorrectnessSelect && "animate-quiz-result-reveal"
                )}
              >
                {parts.flatMap((part, i) => {
                  const nodes: ReactNode[] = [<GapTitleSegment key={`t-${i}`} part={part} />];
                  if (i < parts.length - 1) {
                    nodes.push(
                      <select
                        key={`s-${i}`}
                        value={selectedOptionIds[i] ?? ""}
                        onChange={(e) => onSelectGap?.(question.id, i, e.target.value)}
                        disabled={checked}
                        className={cn(
                          "gap-control inline-block w-auto min-w-0 max-w-full align-baseline rounded border bg-background px-2 py-1.5 text-lg shadow-none outline-none transition-colors duration-300 ease-out focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:appearance-none disabled:bg-none",
                          perGapCorrectnessSelect?.[i] === true && correctSurfaceClassName,
                          perGapCorrectnessSelect?.[i] === false && incorrectSurfaceClassName
                        )}
                      >
                        <option value="">—</option>
                        {questionOptions
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
              {checked && correctTextsByGap && (
                <CorrectAnswers correctTextByGap={correctTextsByGap} />
              )}
            </div>
          ) : isText ? (
            hasInlineGaps ? (
              <div className="space-y-2">
                {showQuestionNumber ? <span className="text-sm text-muted-foreground">Question {index}:</span> : null}
                <div
                  className={cn(
                    "block w-full max-w-full rounded-lg border border-input px-3 py-2 text-lg/[45px] transition-[background-color,border-color] duration-300 ease-out [&_.gap-control]:ml-1.5",
                    perGapCorrectness && "animate-quiz-result-reveal"
                  )}
                >
                  {parts.flatMap((part, i) => {
                    const nodes: ReactNode[] = [<GapTitleSegment key={`t-${i}`} part={part} />];
                    if (i < parts.length - 1) {
                      nodes.push(
                        <Input
                          key={`i-${i}`}
                          value={textAnswers[i] ?? ""}
                          onChange={(e) => onInputChange?.(question.id, question.question_title, i, e.target.value)}
                          disabled={checked}
                          placeholder="…"
                          size={Math.max(2, (textAnswers[i] ?? "").length || 1)}
                          className={cn(
                            "inline-block w-auto min-w-32 max-w-full field-sizing-content align-baseline rounded-none border-0 border-b border-border/60 bg-cyan-100/50 px-2 py-1.5 text-lg shadow-none outline-none transition-colors duration-200 ease-out focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 sm:min-w-40",
                            perGapCorrectness?.[i] === true && correctUnderlineClassName,
                            perGapCorrectness?.[i] === false && incorrectUnderlineClassName
                          )}
                        />
                      );
                    }
                    return nodes;
                  })}
                </div>
                {checked && correctTextsByGap && (
                  <CorrectAnswers correctTextByGap={correctTextsByGap} />
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Your answer</Label>
                <div
                  className={cn(
                    "flex items-center gap-3 rounded-lg border px-3 py-2 transition-[background-color,border-color] duration-300 ease-out",
                    (textCorrect === true || textIncorrect) && "animate-quiz-result-reveal",
                    textCorrect === true && correctSurfaceClassName,
                    textIncorrect && incorrectSurfaceClassName
                  )}
                >
                  <Input
                    value={textAnswers[0] ?? ""}
                    onChange={(e) => onInputChange?.(question.id, question.question_title, 0, e.target.value)}
                    disabled={checked}
                    placeholder="Type your answer"
                    className={cn(
                      "min-w-0 flex-1 text-lg border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-300 ease-out",
                      textCorrect === true && "text-success-foreground",
                      textIncorrect && "text-error-foreground"
                    )}
                  />
                </div>
                {checked && correctTextsByGap && (
                  <div className="text-sm text-muted-foreground">
                    <p className="mb-1">Correct answer:</p>
                    <ul className="list-disc pl-5">
                      <li>{correctTextsByGap[0]?.join(" / ") || "—"}</li>
                    </ul>
                  </div>
                )}
              </div>
            )
          ) : isMultiple ? (
            <div className="grid gap-2">
              {questionOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  isSelected={selectedOptionIds.includes(option.id)}
                  checked={checked}
                  multiple
                  onSelect={(optionId) => onSelect(question.id, optionId, pageType)}
                />
              ))}
            </div>
          ) : (
            <RadioGroup
              value={selectedOptionIds[0] ?? ""}
              onValueChange={(optionId) => onSelect(question.id, optionId, pageType)}
              disabled={checked}
              className="grid gap-2"
            >
              {questionOptions.map((option) => (
                <OptionRow
                  key={option.id}
                  option={option}
                  isSelected={selectedOptionIds.includes(option.id)}
                  checked={checked}
                  multiple={false}
                  onSelect={(optionId) => onSelect(question.id, optionId, pageType)}
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

export const QuestionBlock = memo(QuestionBlockImpl);


