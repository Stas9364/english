"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { updateQuiz } from "@/app/admin/actions";
import type { QuizWithDetails } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

const optionSchema = z.object({
  id: z.string().uuid().optional(),
  option_text: z.string().min(1, "Required"),
  is_correct: z.boolean(),
});

const questionSchema = z.object({
  id: z.string().uuid().optional(),
  question_text: z.string().min(1, "Required"),
  explanation: z.string(),
  options: z.array(optionSchema).min(1, "At least one option"),
});

const formSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string(),
  questions: z.array(questionSchema).min(1, "At least one question"),
});

type FormValues = z.infer<typeof formSchema>;

function defaultOption(option?: { id?: string; option_text: string; is_correct: boolean }) {
  return {
    id: option?.id,
    option_text: option?.option_text ?? "",
    is_correct: option?.is_correct ?? false,
  };
}

function defaultQuestion(question?: {
  id?: string;
  question_text: string;
  explanation: string | null;
  options: { id: string; option_text: string; is_correct: boolean }[];
}) {
  return {
    id: question?.id,
    question_text: question?.question_text ?? "",
    explanation: question?.explanation ?? "",
    options: (question?.options?.length ? question.options : [{ id: undefined, option_text: "", is_correct: false }]).map((o) =>
      defaultOption({ id: o.id, option_text: o.option_text, is_correct: o.is_correct })
    ),
  };
}

interface EditQuizScreenProps {
  quiz: QuizWithDetails;
}

export function EditQuizScreen({ quiz }: EditQuizScreenProps) {
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: quiz.title,
      description: quiz.description ?? "",
      questions: quiz.questions.length
        ? quiz.questions.map((q) => defaultQuestion(q))
        : [defaultQuestion()],
    },
  });

  const questionsArray = useFieldArray({
    control: form.control,
    name: "questions",
  });

  async function onSubmit(data: FormValues) {
    setResult(null);
    const res = await updateQuiz({
      quizId: quiz.id,
      title: data.title,
      description: data.description,
      questions: data.questions.map((q) => ({
        id: q.id,
        question_text: q.question_text,
        explanation: q.explanation,
        options: q.options.map((o) => ({
          id: o.id,
          option_text: o.option_text,
          is_correct: o.is_correct,
        })),
      })),
    });
    setResult(res);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 px-4 py-8">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-lg font-semibold">Edit quiz</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={`/quiz/${quiz.id}`} target="_blank" rel="noopener noreferrer">
              View quiz
            </Link>
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/admin">Back to admin</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quiz details</CardTitle>
          <CardDescription>
            Change title, description, questions and options. Add or remove items as needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="space-y-2">
              <Label htmlFor="title">Quiz title</Label>
              <Input
                id="title"
                {...form.register("title")}
                placeholder="e.g. Present Simple"
                className={cn(form.formState.errors.title && "border-destructive")}
              />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">{form.formState.errors.title.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description (optional)</Label>
              <Input
                id="description"
                {...form.register("description")}
                placeholder="Short description"
              />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Questions</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => questionsArray.append(defaultQuestion())}
                >
                  <Plus className="size-4" /> Add question
                </Button>
              </div>

              {questionsArray.fields.map((field, qIndex) => (
                <Card key={field.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">Question {qIndex + 1}</CardTitle>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => questionsArray.remove(qIndex)}
                        disabled={questionsArray.fields.length === 1}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Question text</Label>
                      <Input
                        {...form.register(`questions.${qIndex}.question_text`)}
                        placeholder="Enter the question"
                        className={cn(
                          form.formState.errors.questions?.[qIndex]?.question_text && "border-destructive"
                        )}
                      />
                      {form.formState.errors.questions?.[qIndex]?.question_text && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.questions[qIndex]?.question_text?.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Explanation (optional)</Label>
                      <Input
                        {...form.register(`questions.${qIndex}.explanation`)}
                        placeholder="Shown after the user answers"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Options</Label>
                      {form.watch(`questions.${qIndex}.options`).map((_, oIndex) => (
                        <div key={oIndex} className="flex items-center gap-2">
                          <Input
                            {...form.register(`questions.${qIndex}.options.${oIndex}.option_text`)}
                            placeholder={`Option ${oIndex + 1}`}
                            className={cn(
                              form.formState.errors.questions?.[qIndex]?.options?.[oIndex]?.option_text &&
                                "border-destructive"
                            )}
                          />
                          <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm">
                            <Checkbox
                              checked={form.watch(`questions.${qIndex}.options.${oIndex}.is_correct`)}
                              onCheckedChange={(checked) =>
                                form.setValue(
                                  `questions.${qIndex}.options.${oIndex}.is_correct`,
                                  checked === true
                                )
                              }
                            />
                            Correct
                          </label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const opts = form.getValues(`questions.${qIndex}.options`);
                              if (opts.length > 1) {
                                form.setValue(
                                  `questions.${qIndex}.options`,
                                  opts.filter((_, i) => i !== oIndex)
                                );
                              }
                            }}
                            disabled={form.watch(`questions.${qIndex}.options`).length <= 1}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const opts = form.getValues(`questions.${qIndex}.options`);
                          form.setValue(`questions.${qIndex}.options`, [...opts, defaultOption()]);
                        }}
                      >
                        <Plus className="size-4" /> Add option
                      </Button>
                      {form.formState.errors.questions?.[qIndex]?.options && (
                        <p className="text-sm text-destructive">
                          {(form.formState.errors.questions[qIndex]?.options as { message?: string })?.message ??
                            "At least one option required"}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}

              {form.formState.errors.questions?.root && (
                <p className="text-sm text-destructive">{form.formState.errors.questions.root.message}</p>
              )}
            </div>

            {result && (
              <Alert variant={result.ok ? "default" : "destructive"}>
                <AlertDescription>
                  {result.ok ? "Quiz updated successfully." : result.error}
                </AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
