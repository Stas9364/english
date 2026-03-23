"use client";

import type { ReactNode } from "react";
import type { QuestionWithOptions, Option } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/** Number of [[]] gaps in the question title. 0 if none. */
function getGapCount(title: string): number {
  if (!title?.includes("[[]]")) return 0;
  return Math.max(0, title.split("[[]]").length - 1);
}

/** For input questions: stored answers length = Math.max(1, getGapCount). */
export function getEffectiveGapCount(title: string): number {
  return Math.max(1, getGapCount(title));
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

export function QuestionBlock({
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
