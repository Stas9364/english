"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup } from "@/components/ui/radio-group";
import { getCorrectTextsByGap, getGapCount, getPerGapCorrectness, getPerGapCorrectnessSelectGaps, isTextAnswerCorrect } from '@/lib/question-block-utils';
import type { QuestionWithOptions } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { memo } from "react";
import { CorrectAnswers } from './correct-answers';
import { GapTitleSegment } from './gap-title-segment';
import { OptionRow } from './option-row';

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
  const gapCount = getGapCount(title);
  const hasInlineGaps = gapCount >= 1 && title.includes("[[]]");
  const parts = hasInlineGaps ? title.split("[[]]") : [];
  const perGapCorrectness = isText && checked && hasInlineGaps ? getPerGapCorrectness(question, textAnswers) : null;
  const perGapCorrectnessSelect = isSelectGaps && checked && hasInlineGaps ? getPerGapCorrectnessSelectGaps(question, selectedOptionIds) : null;
  const correctTextsByGap =
    (isText || isSelectGaps) && checked ? getCorrectTextsByGap(question, isSelectGaps) : null;

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
              {checked && correctTextsByGap && (
                <CorrectAnswers correctTextByGap={correctTextsByGap} />
              )}
            </div>
          ) : isText ? (
            hasInlineGaps ? (
              <div className="space-y-2">
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
                          className={cn(
                            "inline-block w-32 min-w-0 align-baseline rounded-none border-0 border-b border-border/60 bg-transparent px-2 py-1.5 text-lg shadow-none outline-none transition-colors duration-200 ease-out focus-visible:border-b-2 focus-visible:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 sm:w-40",
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
                    textCorrect === true && "border-green-600 bg-green-50 dark:bg-green-950/30",
                    textIncorrect && "border-red-600 bg-red-50 dark:bg-red-950/30"
                  )}
                >
                  <Input
                    value={textAnswers[0] ?? ""}
                    onChange={(e) => onInputChange?.(question.id, question.question_title, 0, e.target.value)}
                    disabled={checked}
                    placeholder="Type your answer"
                    className={cn(
                      "min-w-0 flex-1 text-lg border-0 bg-transparent shadow-none outline-none focus-visible:ring-0 focus-visible:ring-offset-0 transition-colors duration-300 ease-out",
                      textCorrect === true && "text-green-800 dark:text-green-200",
                      textIncorrect && "text-red-800 dark:text-red-200"
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
              {question.options.map((option) => (
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
              {question.options.map((option) => (
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


