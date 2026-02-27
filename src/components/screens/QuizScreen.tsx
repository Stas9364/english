"use client";

import { useState } from "react";
import Link from "next/link";
import type { QuizWithDetails, QuestionWithOptions, Option } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface QuizScreenProps {
  quiz: QuizWithDetails;
}

export function QuizScreen({ quiz }: QuizScreenProps) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState(false);

  const handleSelect = (questionId: string, optionId: string) => {
    if (checked) return;
    setSelected((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleCheck = () => {
    setChecked(true);
  };

  const getScore = () => {
    let correct = 0;
    quiz.questions.forEach((q) => {
      const chosen = selected[q.id];
      const correctOption = q.options.find((o) => o.is_correct);
      if (chosen && correctOption && chosen === correctOption.id) correct++;
    });
    return { correct, total: quiz.questions.length };
  };

  const score = checked ? getScore() : null;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex items-center justify-between gap-4">
          <h1 className="text-2xl font-semibold tracking-tight">{quiz.title}</h1>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Back to quizzes</Link>
          </Button>
        </div>

        {score !== null && (
          <Card className="mb-6 border-primary/30 bg-primary/5">
            <CardContent className="pt-6">
              <p className="text-center text-lg font-medium">
                Your result: {score.correct} of {score.total}
              </p>
            </CardContent>
          </Card>
        )}

        <ul className="space-y-8">
          {quiz.questions.map((q, index) => (
            <QuestionBlock
              key={q.id}
              question={q}
              index={index + 1}
              selectedOptionId={selected[q.id]}
              checked={checked}
              onSelect={(optionId) => handleSelect(q.id, optionId)}
            />
          ))}
        </ul>

        {!checked && (
          <div className="mt-8 flex justify-center">
            <Button
              size="lg"
              onClick={handleCheck}
              disabled={quiz.questions.length === 0 || Object.keys(selected).length < quiz.questions.length}
            >
              Check results
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}

function QuestionBlock({
  question,
  index,
  selectedOptionId,
  checked,
  onSelect,
}: {
  question: QuestionWithOptions;
  index: number;
  selectedOptionId?: string;
  checked: boolean;
  onSelect: (optionId: string) => void;
}) {
  return (
    <li>
      <Card>
        <CardHeader>
          <CardTitle className="text-base font-medium">
            {index}. {question.question_text}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup
            value={selectedOptionId ?? ""}
            onValueChange={onSelect}
            disabled={checked}
            className="grid gap-2"
          >
            {question.options.map((option) => (
              <OptionRow
                key={option.id}
                option={option}
                isSelected={selectedOptionId === option.id}
                checked={checked}
              />
            ))}
          </RadioGroup>

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
}: {
  option: Option;
  isSelected: boolean;
  checked: boolean;
}) {
  const showCorrect = checked && option.is_correct;
  const showIncorrect = checked && isSelected && !option.is_correct;

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg border px-3 py-2 transition-colors",
        showCorrect && "border-green-600 bg-green-50 dark:bg-green-950/30",
        showIncorrect && "border-red-600 bg-red-50 dark:bg-red-950/30"
      )}
    >
      <RadioGroupItem value={option.id} id={option.id} />
      <Label
        htmlFor={option.id}
        className={cn(
          "flex-1 cursor-pointer font-normal",
          showCorrect && "text-green-800 dark:text-green-200",
          showIncorrect && "text-red-800 dark:text-red-200"
        )}
      >
        {option.option_text}
      </Label>
    </div>
  );
}
